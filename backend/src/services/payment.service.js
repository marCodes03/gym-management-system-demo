const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  isValidUuid,
  isValidIsoDate,
  computeVatBreakdown,
  parsePagination,
  buildPaginationMeta,
  formatPhp,
} = require('../utils/validators');
const { validateMemberPayload, generateMemberCode } = require('./member.service');

const VALID_PAYMENT_METHODS = new Set(['CASH', 'DIGITAL_WALLET', 'CARD']);
const VALID_PAYMENT_STATUSES = new Set(['COMPLETED', 'VOIDED']);

async function generateInvoiceNumber(client) {
  const { rows } = await client.query(
    `SELECT
       'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0') AS invoice_number`
  );
  return rows[0].invoice_number;
}

async function createPayment(payload, cashierUser) {
  const {
    member_id,
    walk_in_member,
    plan_id,
    payment_method_code,
    discount_pct = 0,
    amount_tendered,
    payment_ref = null,
    auto_check_in,
  } = payload || {};

  // 1. Validate Member Selection or Walk-In Payload
  const hasMemberId = Boolean(member_id);
  const hasWalkIn = Boolean(walk_in_member && typeof walk_in_member === 'object');
  if (!hasMemberId && !hasWalkIn) {
    throw new AppError(
      'Please select a member or enter walk-in member details before completing payment.',
      400,
      'VALIDATION_ERROR'
    );
  }

  // 2. Validate Plan ID format
  if (!isValidUuid(plan_id)) {
    throw new AppError('Please select an active membership plan.', 400, 'VALIDATION_ERROR');
  }

  // 3. Validate Payment Method
  const normalizedMethod =
    typeof payment_method_code === 'string'
      ? payment_method_code.trim().toUpperCase()
      : '';
  if (!VALID_PAYMENT_METHODS.has(normalizedMethod)) {
    throw new AppError('Please select a valid payment method.', 400, 'VALIDATION_ERROR');
  }

  // 4. Validate Discount Percentage
  const parsedDiscount = Number(discount_pct ?? 0);
  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
    throw new AppError(
      'Discount percentage must be between 0% and 100%.',
      400,
      'VALIDATION_ERROR'
    );
  }

  // 5. Validate Payment Reference
  let normalizedRef = null;
  if (payment_ref !== null && payment_ref !== undefined && String(payment_ref).trim() !== '') {
    normalizedRef = String(payment_ref).trim();
    if (normalizedRef.length > 100) {
      throw new AppError(
        'Payment reference cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  return db.withTransaction(async (client) => {
    // Verify active plan
    const planRes = await client.query(
      'SELECT * FROM membership_plans WHERE id = $1 AND is_active = TRUE',
      [plan_id]
    );
    if (planRes.rows.length === 0) {
      throw new AppError('Please select an active membership plan.', 400, 'VALIDATION_ERROR');
    }
    const plan = planRes.rows[0];

    // Fetch store settings for tax_rate_pct and receipt metadata
    const settingsRes = await client.query('SELECT * FROM store_settings WHERE id = 1');
    const settings = settingsRes.rows[0] || {
      gym_name: 'Mad Max Gym',
      tax_rate_pct: 12.0,
    };

    // Compute 12% BIR VAT-inclusive math
    const vat = computeVatBreakdown(
      Number(plan.price),
      parsedDiscount,
      Number(settings.tax_rate_pct ?? 12)
    );

    // Validate Amount Tendered
    let parsedTendered;
    if (
      (normalizedMethod === 'DIGITAL_WALLET' || normalizedMethod === 'CARD') &&
      (amount_tendered === undefined || amount_tendered === null || amount_tendered === '')
    ) {
      parsedTendered = vat.totalAmount;
    } else {
      parsedTendered = Number(amount_tendered);
    }

    if (
      !Number.isFinite(parsedTendered) ||
      parsedTendered < 0 ||
      parsedTendered > 999999.99
    ) {
      throw new AppError(
        `Amount tendered (₱${formatPhp(parsedTendered || 0)}) cannot be less than the total payable (₱${formatPhp(vat.totalAmount)}).`,
        400,
        'INSUFFICIENT_TENDER'
      );
    }

    if (parsedTendered < vat.totalAmount) {
      throw new AppError(
        `Amount tendered (₱${formatPhp(parsedTendered)}) cannot be less than the total payable (₱${formatPhp(vat.totalAmount)}).`,
        400,
        'INSUFFICIENT_TENDER'
      );
    }

    const changeAmount = Number((parsedTendered - vat.totalAmount).toFixed(2));

    // Resolve existing member OR create 1-step Walk-In Guest atomically
    let member;
    let isNewWalkIn = false;

    if (hasMemberId) {
      if (!isValidUuid(member_id)) {
        throw new AppError(
          'Please select a member or enter walk-in member details before completing payment.',
          400,
          'VALIDATION_ERROR'
        );
      }
      const memberRes = await client.query(
        'SELECT * FROM members WHERE id = $1 AND is_active = TRUE FOR UPDATE',
        [member_id]
      );
      if (memberRes.rows.length === 0) {
        throw new AppError('Selected member not found or inactive.', 404, 'MEMBER_NOT_FOUND');
      }
      member = memberRes.rows[0];
    } else {
      const walkInInput = {
        name: walk_in_member.name,
        phone: walk_in_member.phone,
        email: walk_in_member.email || null,
        gender_code: walk_in_member.gender_code || 'PREFER_NOT_TO_SAY',
        emergency_contact_name: walk_in_member.emergency_contact_name || null,
        emergency_contact_phone: walk_in_member.emergency_contact_phone || null,
        notes: walk_in_member.notes || 'Registered via Quick Walk-In Checkout',
      };
      const validatedWalkIn = validateMemberPayload(walkInInput);

      const dupPhone = await client.query('SELECT id FROM members WHERE phone = $1', [
        validatedWalkIn.phone,
      ]);
      if (dupPhone.rows.length > 0) {
        throw new AppError(
          `A member with phone number '${validatedWalkIn.phone}' is already registered.`,
          409,
          'DUPLICATE_PHONE'
        );
      }

      const newMemberCode = await generateMemberCode(client);
      const insertedMember = await client.query(
        `INSERT INTO members
           (member_code, name, phone, email, gender_code, emergency_contact_name, emergency_contact_phone, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         RETURNING *`,
        [
          newMemberCode,
          validatedWalkIn.name,
          validatedWalkIn.phone,
          validatedWalkIn.email,
          validatedWalkIn.gender_code,
          validatedWalkIn.emergency_contact_name,
          validatedWalkIn.emergency_contact_phone,
          validatedWalkIn.notes,
        ]
      );
      member = insertedMember.rows[0];
      isNewWalkIn = true;
    }

    // Date-Stacked Renewal Logic:
    // Lock any active subscriptions for this member first
    const activeSubsRes = await client.query(
      `SELECT ms.id, ms.end_date, mp.plan_type_code
       FROM member_subscriptions ms
       JOIN membership_plans mp ON mp.id = ms.plan_id
       WHERE ms.member_id = $1
         AND ms.status_code = 'ACTIVE'
         AND ms.end_date >= CURRENT_DATE
       ORDER BY ms.end_date DESC
       FOR UPDATE OF ms`,
      [member.id]
    );

    const activeTimeBasedSub = activeSubsRes.rows.find(
      (s) => s.plan_type_code === 'RECURRING' || s.plan_type_code === 'DAY_PASS'
    );

    let startDateSql;
    let dateParams;
    if (plan.plan_type_code !== 'SESSION_PACK' && activeTimeBasedSub) {
      startDateSql = `($1::DATE + INTERVAL '1 day')::DATE`;
      dateParams = [activeTimeBasedSub.end_date, Number(plan.duration_days) - 1];
    } else {
      startDateSql = `CURRENT_DATE`;
      dateParams = [Number(plan.duration_days) - 1];
    }

    const totalSessions =
      plan.plan_type_code === 'SESSION_PACK' ? Number(plan.included_sessions) : null;
    const remainingSessions = totalSessions;

    // Insert member_subscriptions (freezing plan_price_at_purchase)
    let subRows;
    if (plan.plan_type_code !== 'SESSION_PACK' && activeTimeBasedSub) {
      const res = await client.query(
        `INSERT INTO member_subscriptions
           (member_id, plan_id, status_code, start_date, end_date, total_sessions, remaining_sessions, plan_price_at_purchase, created_by)
         VALUES (
           $1, $2, 'ACTIVE',
           ${startDateSql.replace('$1', '$3')},
           (${startDateSql.replace('$1', '$3')} + ($4 * INTERVAL '1 day'))::DATE,
           $5, $6, $7, $8
         )
         RETURNING *`,
        [
          member.id,
          plan.id,
          dateParams[0],
          dateParams[1],
          totalSessions,
          remainingSessions,
          Number(plan.price),
          cashierUser.id,
        ]
      );
      subRows = res.rows;
    } else {
      const res = await client.query(
        `INSERT INTO member_subscriptions
           (member_id, plan_id, status_code, start_date, end_date, total_sessions, remaining_sessions, plan_price_at_purchase, created_by)
         VALUES (
           $1, $2, 'ACTIVE',
           CURRENT_DATE,
           (CURRENT_DATE + ($3 * INTERVAL '1 day'))::DATE,
           $4, $5, $6, $7
         )
         RETURNING *`,
        [
          member.id,
          plan.id,
          dateParams[0],
          totalSessions,
          remainingSessions,
          Number(plan.price),
          cashierUser.id,
        ]
      );
      subRows = res.rows;
    }

    let subscription = subRows[0];

    // Generate concurrency-safe INV-YYYYMMDD-XXXX
    const invoiceNumber = await generateInvoiceNumber(client);

    // Insert payments (freezing plan_name_snapshot)
    const paymentRes = await client.query(
      `INSERT INTO payments
         (invoice_number, member_id, subscription_id, plan_name_snapshot, cashier_id,
          payment_method_code, subtotal_amount, discount_pct, discount_amount, tax_amount,
          total_amount, amount_tendered, change_amount, payment_ref, status_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'COMPLETED')
       RETURNING *`,
      [
        invoiceNumber,
        member.id,
        subscription.id,
        plan.name,
        cashierUser.id,
        normalizedMethod,
        vat.subtotalAmount,
        vat.discountPct,
        vat.discountAmount,
        vat.taxAmount,
        vat.totalAmount,
        parsedTendered,
        changeAmount,
        normalizedRef,
      ]
    );
    const payment = paymentRes.rows[0];

    // Optional Auto Check-In (default true for DAY_PASS if not explicitly false)
    const shouldAutoCheckIn =
      auto_check_in !== undefined ? Boolean(auto_check_in) : plan.plan_type_code === 'DAY_PASS';

    let autoCheckInLog = null;
    if (shouldAutoCheckIn) {
      let remSessionsAfter = subscription.remaining_sessions;
      let nextSubStatus = subscription.status_code;

      if (plan.plan_type_code === 'SESSION_PACK' && remSessionsAfter !== null) {
        remSessionsAfter = Math.max(0, remSessionsAfter - 1);
        if (remSessionsAfter === 0) {
          nextSubStatus = 'EXPIRED';
        }
        const subUpdate = await client.query(
          `UPDATE member_subscriptions
           SET remaining_sessions = $1, status_code = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [remSessionsAfter, nextSubStatus, subscription.id]
        );
        subscription = subUpdate.rows[0];
      }

      const { rows: remDaysRows } = await client.query(
        'SELECT GREATEST(0, ($1::DATE - CURRENT_DATE))::INT AS remaining_days',
        [subscription.end_date]
      );
      const remainingDaysAtCheckin = remDaysRows[0].remaining_days;

      const updatedMemberRes = await client.query(
        `UPDATE members
         SET total_visits = total_visits + 1,
             last_check_in_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [member.id]
      );
      member = updatedMemberRes.rows[0];

      const logRes = await client.query(
        `INSERT INTO attendance_logs
           (member_id, subscription_id, check_in_method, access_status,
            remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, notes)
         VALUES ($1, $2, 'STAFF_LOOKUP', 'GRANTED', $3, $4, $5, $6)
         RETURNING *`,
        [
          member.id,
          subscription.id,
          remainingDaysAtCheckin,
          remSessionsAfter,
          cashierUser.id,
          isNewWalkIn ? 'Walk-in Day Pass auto check-in' : 'Auto check-in on payment',
        ]
      );
      autoCheckInLog = logRes.rows[0];
    }

    return {
      payment: {
        ...payment,
        subtotal_amount: Number(payment.subtotal_amount),
        discount_pct: Number(payment.discount_pct),
        discount_amount: Number(payment.discount_amount),
        tax_amount: Number(payment.tax_amount),
        total_amount: Number(payment.total_amount),
        amount_tendered: Number(payment.amount_tendered),
        change_amount: Number(payment.change_amount),
      },
      member,
      subscription: {
        ...subscription,
        plan_code: plan.code,
        plan_name: plan.name,
        plan_type_code: plan.plan_type_code,
      },
      cashier: {
        id: cashierUser.id,
        name: cashierUser.name,
      },
      store_settings: {
        gym_name: settings.gym_name,
        address: settings.address,
        phone: settings.phone,
        tin_number: settings.tin_number,
        tax_rate_pct: Number(settings.tax_rate_pct ?? 12),
        receipt_header: settings.receipt_header,
        receipt_footer: settings.receipt_footer,
      },
      auto_check_in_log: autoCheckInLog,
    };
  });
}

async function listPayments(query = {}) {
  const { page, limit, offset } = parsePagination(query, 20, 100);
  const conditions = [];
  const params = [];

  if (query.start_date) {
    if (!isValidIsoDate(query.start_date)) {
      throw new AppError('Invalid start date format (use YYYY-MM-DD).', 400, 'VALIDATION_ERROR');
    }
  }
  if (query.end_date) {
    if (!isValidIsoDate(query.end_date)) {
      throw new AppError('Invalid end date format (use YYYY-MM-DD).', 400, 'VALIDATION_ERROR');
    }
  }
  if (query.start_date && query.end_date && query.end_date < query.start_date) {
    throw new AppError(
      'End date cannot be earlier than start date.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (query.start_date) {
    params.push(query.start_date);
    conditions.push(`p.created_at >= $${params.length}::DATE`);
  }
  if (query.end_date) {
    params.push(query.end_date);
    conditions.push(`p.created_at < ($${params.length}::DATE + INTERVAL '1 day')`);
  }

  if (query.status_code && VALID_PAYMENT_STATUSES.has(String(query.status_code).toUpperCase())) {
    params.push(String(query.status_code).toUpperCase());
    conditions.push(`p.status_code = $${params.length}`);
  }

  if (
    query.payment_method_code &&
    VALID_PAYMENT_METHODS.has(String(query.payment_method_code).toUpperCase())
  ) {
    params.push(String(query.payment_method_code).toUpperCase());
    conditions.push(`p.payment_method_code = $${params.length}`);
  }

  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim()}%`);
    conditions.push(
      `(p.invoice_number ILIKE $${params.length} OR m.name ILIKE $${params.length} OR m.member_code ILIKE $${params.length} OR p.plan_name_snapshot ILIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*)::INT AS total
     FROM payments p
     JOIN members m ON m.id = p.member_id
     ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT
        p.id,
        p.invoice_number,
        p.member_id,
        m.member_code,
        m.name AS member_name,
        m.phone AS member_phone,
        p.subscription_id,
        p.plan_name_snapshot,
        p.cashier_id,
        u.name AS cashier_name,
        p.payment_method_code,
        pm.name AS payment_method_name,
        p.subtotal_amount,
        p.discount_pct,
        p.discount_amount,
        p.tax_amount,
        p.total_amount,
        p.amount_tendered,
        p.change_amount,
        p.payment_ref,
        p.status_code,
        p.void_reason,
        p.voided_by,
        vu.name AS voided_by_name,
        p.voided_at,
        p.created_at
     FROM payments p
     JOIN members m ON m.id = p.member_id
     JOIN users u ON u.id = p.cashier_id
     JOIN payment_methods pm ON pm.code = p.payment_method_code
     LEFT JOIN users vu ON vu.id = p.voided_by
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rows.map((row) => ({
      ...row,
      subtotal_amount: Number(row.subtotal_amount),
      discount_pct: Number(row.discount_pct),
      discount_amount: Number(row.discount_amount),
      tax_amount: Number(row.tax_amount),
      total_amount: Number(row.total_amount),
      amount_tendered: Number(row.amount_tendered),
      change_amount: Number(row.change_amount),
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getPaymentById(id) {
  if (!isValidUuid(id)) {
    throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  }

  const { rows } = await db.query(
    `SELECT
        p.*,
        pm.name AS payment_method_name,
        m.member_code,
        m.name AS member_name,
        m.phone AS member_phone,
        ms.start_date,
        ms.end_date,
        ms.total_sessions,
        ms.remaining_sessions,
        ms.status_code AS subscription_status,
        mp.code AS plan_code,
        mp.plan_type_code,
        u.name AS cashier_name,
        vu.name AS voided_by_name
     FROM payments p
     JOIN payment_methods pm ON pm.code = p.payment_method_code
     JOIN members m ON m.id = p.member_id
     JOIN member_subscriptions ms ON ms.id = p.subscription_id
     JOIN membership_plans mp ON mp.id = ms.plan_id
     JOIN users u ON u.id = p.cashier_id
     LEFT JOIN users vu ON vu.id = p.voided_by
     WHERE p.id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  }

  const row = rows[0];
  const settingsRes = await db.query('SELECT * FROM store_settings WHERE id = 1');
  const settings = settingsRes.rows[0] || {};

  return {
    payment: {
      id: row.id,
      invoice_number: row.invoice_number,
      plan_name_snapshot: row.plan_name_snapshot,
      payment_method_code: row.payment_method_code,
      payment_method_name: row.payment_method_name,
      subtotal_amount: Number(row.subtotal_amount),
      discount_pct: Number(row.discount_pct),
      discount_amount: Number(row.discount_amount),
      tax_amount: Number(row.tax_amount),
      total_amount: Number(row.total_amount),
      amount_tendered: Number(row.amount_tendered),
      change_amount: Number(row.change_amount),
      payment_ref: row.payment_ref,
      status_code: row.status_code,
      void_reason: row.void_reason,
      voided_by: row.voided_by,
      voided_by_name: row.voided_by_name,
      voided_at: row.voided_at,
      created_at: row.created_at,
    },
    member: {
      id: row.member_id,
      member_code: row.member_code,
      name: row.member_name,
      phone: row.member_phone,
    },
    subscription: {
      id: row.subscription_id,
      plan_code: row.plan_code,
      plan_name: row.plan_name_snapshot,
      plan_type_code: row.plan_type_code,
      start_date: row.start_date,
      end_date: row.end_date,
      total_sessions: row.total_sessions,
      remaining_sessions: row.remaining_sessions,
      status_code: row.subscription_status,
    },
    cashier: {
      id: row.cashier_id,
      name: row.cashier_name,
    },
    store_settings: {
      gym_name: settings.gym_name,
      address: settings.address,
      phone: settings.phone,
      tin_number: settings.tin_number,
      tax_rate_pct: Number(settings.tax_rate_pct ?? 12),
      receipt_header: settings.receipt_header,
      receipt_footer: settings.receipt_footer,
    },
  };
}

async function voidPayment(id, { void_reason }, adminUser) {
  if (!isValidUuid(id)) {
    throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
  }

  const trimmedReason = typeof void_reason === 'string' ? void_reason.trim() : '';
  if (trimmedReason.length < 5 || trimmedReason.length > 300) {
    throw new AppError(
      'Please provide a valid void reason of at least 5 characters for the audit log.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM payments WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (rows.length === 0) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    const payment = rows[0];
    if (payment.status_code === 'VOIDED') {
      throw new AppError('This payment has already been voided.', 400, 'ALREADY_VOIDED');
    }

    const updatedPayRes = await client.query(
      `UPDATE payments
       SET status_code = 'VOIDED',
           void_reason = $1,
           voided_by = $2,
           voided_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [trimmedReason, adminUser.id, id]
    );

    const updatedSubRes = await client.query(
      `UPDATE member_subscriptions
       SET status_code = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status_code, updated_at`,
      [payment.subscription_id]
    );

    return {
      payment: updatedPayRes.rows[0],
      subscription: updatedSubRes.rows[0],
      message: `Payment ${payment.invoice_number} has been voided and its linked membership cancelled.`,
    };
  });
}

module.exports = {
  createPayment,
  listPayments,
  getPaymentById,
  voidPayment,
};
