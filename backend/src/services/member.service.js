const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  isValidEmail,
  isValidPhone,
  normalizePhone,
  isValidUuid,
  parsePagination,
  buildPaginationMeta,
} = require('../utils/validators');
const { expireStaleSubscriptions } = require('./subscription.service');

const VALID_GENDERS = new Set(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']);
const VALID_STATUS_FILTERS = new Set([
  'ALL',
  'ACTIVE',
  'EXPIRING_SOON',
  'FROZEN',
  'EXPIRED',
  'NO_PLAN',
]);

function validateMemberPayload(payload, existing = null) {
  const rawName = payload.name !== undefined ? payload.name : existing?.name;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new AppError(
      'Member name must be between 2 and 100 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawPhone = payload.phone !== undefined ? payload.phone : existing?.phone;
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    throw new AppError(
      'Please enter a valid phone number (7 to 15 digits, e.g., 09171234567).',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawEmail = payload.email !== undefined ? payload.email : existing?.email ?? null;
  let email = null;
  if (rawEmail !== null && rawEmail !== undefined && String(rawEmail).trim() !== '') {
    email = String(rawEmail).trim().toLowerCase();
    if (!isValidEmail(email)) {
      throw new AppError(
        'Please enter a valid email address or leave it blank.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const rawGender =
    payload.gender_code !== undefined ? payload.gender_code : existing?.gender_code;
  const gender_code = typeof rawGender === 'string' ? rawGender.trim().toUpperCase() : '';
  if (!VALID_GENDERS.has(gender_code)) {
    throw new AppError('Please select a gender option.', 400, 'VALIDATION_ERROR');
  }

  const rawEmergencyName =
    payload.emergency_contact_name !== undefined
      ? payload.emergency_contact_name
      : existing?.emergency_contact_name ?? null;
  let emergency_contact_name = null;
  if (
    rawEmergencyName !== null &&
    rawEmergencyName !== undefined &&
    String(rawEmergencyName).trim() !== ''
  ) {
    emergency_contact_name = String(rawEmergencyName).trim();
    if (emergency_contact_name.length > 100) {
      throw new AppError(
        'Emergency contact name cannot exceed 100 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const rawEmergencyPhone =
    payload.emergency_contact_phone !== undefined
      ? payload.emergency_contact_phone
      : existing?.emergency_contact_phone ?? null;
  let emergency_contact_phone = null;
  if (
    rawEmergencyPhone !== null &&
    rawEmergencyPhone !== undefined &&
    String(rawEmergencyPhone).trim() !== ''
  ) {
    emergency_contact_phone = normalizePhone(rawEmergencyPhone);
    if (!isValidPhone(emergency_contact_phone)) {
      throw new AppError(
        'Please enter a valid emergency contact phone number.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const rawNotes = payload.notes !== undefined ? payload.notes : existing?.notes ?? null;
  let notes = null;
  if (rawNotes !== null && rawNotes !== undefined && String(rawNotes).trim() !== '') {
    notes = String(rawNotes).trim();
    if (notes.length > 500) {
      throw new AppError('Notes cannot exceed 500 characters.', 400, 'VALIDATION_ERROR');
    }
  }

  const is_active =
    payload.is_active !== undefined
      ? Boolean(payload.is_active)
      : existing
        ? existing.is_active
        : true;

  return {
    name,
    phone,
    email,
    gender_code,
    emergency_contact_name,
    emergency_contact_phone,
    notes,
    is_active,
  };
}

/**
 * Generate a concurrency-safe member code: MEM-YYYY-XXXX using PostgreSQL sequence.
 */
async function generateMemberCode(client) {
  const { rows } = await client.query(
    `SELECT
       'MEM-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('member_code_seq')::TEXT, 4, '0') AS member_code`
  );
  return rows[0].member_code;
}

async function listMembers(query = {}) {
  await expireStaleSubscriptions(db);

  const { page, limit, offset } = parsePagination(query, 20, 100);
  const statusFilter = query.status ? String(query.status).trim().toUpperCase() : 'ALL';
  const effectiveStatus = VALID_STATUS_FILTERS.has(statusFilter) ? statusFilter : 'ALL';

  const baseCte = `
    WITH member_latest AS (
      SELECT
        m.id,
        m.member_code,
        m.name,
        m.phone,
        m.email,
        m.gender_code,
        m.emergency_contact_name,
        m.emergency_contact_phone,
        m.notes,
        m.total_visits,
        m.last_check_in_at,
        m.is_active,
        m.created_at,
        m.updated_at,
        sub.id AS subscription_id,
        sub.plan_id,
        sub.plan_code,
        sub.plan_name,
        sub.plan_type_code,
        sub.badge_color_hex,
        sub.status_code AS subscription_status,
        sub.start_date,
        sub.end_date,
        sub.total_sessions,
        sub.remaining_sessions,
        sub.frozen_at,
        CASE
          WHEN sub.end_date IS NOT NULL THEN GREATEST(0, (sub.end_date - CURRENT_DATE))::INT
          ELSE NULL
        END AS remaining_days,
        CASE
          WHEN sub.id IS NULL THEN 'NO_PLAN'
          WHEN sub.status_code = 'FROZEN' THEN 'FROZEN'
          WHEN sub.status_code = 'EXPIRED' OR sub.status_code = 'CANCELLED' THEN 'EXPIRED'
          WHEN sub.status_code = 'ACTIVE' AND (
            (sub.end_date - CURRENT_DATE) <= 7
            OR (sub.remaining_sessions IS NOT NULL AND sub.remaining_sessions <= 2)
          ) THEN 'EXPIRING_SOON'
          WHEN sub.status_code = 'ACTIVE' THEN 'ACTIVE'
          ELSE 'NO_PLAN'
        END AS computed_status
      FROM members m
      LEFT JOIN LATERAL (
        SELECT
          ms.id,
          ms.plan_id,
          mp.code AS plan_code,
          mp.name AS plan_name,
          mp.plan_type_code,
          mp.badge_color_hex,
          ms.status_code,
          ms.start_date,
          ms.end_date,
          ms.total_sessions,
          ms.remaining_sessions,
          ms.frozen_at
        FROM member_subscriptions ms
        JOIN membership_plans mp ON mp.id = ms.plan_id
        WHERE ms.member_id = m.id
          AND ms.status_code <> 'CANCELLED'
        ORDER BY
          CASE ms.status_code
            WHEN 'ACTIVE' THEN 1
            WHEN 'FROZEN' THEN 2
            WHEN 'EXPIRED' THEN 3
            ELSE 4
          END,
          ms.end_date DESC,
          ms.created_at DESC
        LIMIT 1
      ) sub ON TRUE
    )
  `;

  const conditions = [];
  const params = [];

  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim()}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR phone ILIKE $${params.length} OR member_code ILIKE $${params.length})`
    );
  }

  if (effectiveStatus === 'ACTIVE') {
    conditions.push(`computed_status IN ('ACTIVE', 'EXPIRING_SOON')`);
  } else if (effectiveStatus !== 'ALL') {
    params.push(effectiveStatus);
    conditions.push(`computed_status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `${baseCte} SELECT COUNT(*)::INT AS total FROM member_latest ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const { rows } = await db.query(
    `${baseCte}
     SELECT *
     FROM member_latest
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getMemberById(id) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid member identifier.', 400, 'INVALID_IDENTIFIER');
  }

  await expireStaleSubscriptions(db, id);

  const memberResult = await db.query(
    `SELECT
        m.*,
        g.name AS gender_name
     FROM members m
     JOIN genders g ON g.code = m.gender_code
     WHERE m.id = $1`,
    [id]
  );

  if (memberResult.rows.length === 0) {
    throw new AppError('Member not found.', 404, 'MEMBER_NOT_FOUND');
  }

  const member = memberResult.rows[0];

  const [subsResult, checkinsResult, paymentsResult] = await Promise.all([
    db.query(
      `SELECT
          ms.*,
          mp.code AS plan_code,
          mp.name AS plan_name,
          mp.plan_type_code,
          mp.badge_color_hex,
          GREATEST(0, (ms.end_date - CURRENT_DATE))::INT AS remaining_days
       FROM member_subscriptions ms
       JOIN membership_plans mp ON mp.id = ms.plan_id
       WHERE ms.member_id = $1
       ORDER BY
         CASE ms.status_code
           WHEN 'ACTIVE' THEN 1
           WHEN 'FROZEN' THEN 2
           WHEN 'EXPIRED' THEN 3
           ELSE 4
         END,
         ms.end_date DESC,
         ms.created_at DESC`,
      [id]
    ),
    db.query(
      `SELECT
          al.id,
          al.subscription_id,
          al.check_in_method,
          al.access_status,
          al.remaining_days_at_checkin,
          al.remaining_sessions_at_checkin,
          al.check_in_at,
          al.notes,
          u.name AS checked_in_by_name
       FROM attendance_logs al
       LEFT JOIN users u ON u.id = al.checked_in_by
       WHERE al.member_id = $1
       ORDER BY al.check_in_at DESC
       LIMIT 15`,
      [id]
    ),
    db.query(
      `SELECT
          p.id,
          p.invoice_number,
          p.plan_name_snapshot,
          p.payment_method_code,
          p.subtotal_amount,
          p.discount_pct,
          p.discount_amount,
          p.tax_amount,
          p.total_amount,
          p.status_code,
          p.created_at,
          u.name AS cashier_name
       FROM payments p
       JOIN users u ON u.id = p.cashier_id
       WHERE p.member_id = $1
       ORDER BY p.created_at DESC
       LIMIT 15`,
      [id]
    ),
  ]);

  const latestSubscription =
    subsResult.rows.find((s) => s.status_code !== 'CANCELLED') || subsResult.rows[0] || null;

  return {
    ...member,
    latest_subscription: latestSubscription,
    subscriptions: subsResult.rows,
    recent_check_ins: checkinsResult.rows,
    recent_payments: paymentsResult.rows,
  };
}

async function createMember(payload) {
  const validated = validateMemberPayload(payload);

  return db.withTransaction(async (client) => {
    const dup = await client.query('SELECT id FROM members WHERE phone = $1', [
      validated.phone,
    ]);
    if (dup.rows.length > 0) {
      throw new AppError(
        `A member with phone number '${validated.phone}' is already registered.`,
        409,
        'DUPLICATE_PHONE'
      );
    }

    const memberCode = await generateMemberCode(client);

    const { rows } = await client.query(
      `INSERT INTO members
         (member_code, name, phone, email, gender_code, emergency_contact_name, emergency_contact_phone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        memberCode,
        validated.name,
        validated.phone,
        validated.email,
        validated.gender_code,
        validated.emergency_contact_name,
        validated.emergency_contact_phone,
        validated.notes,
        validated.is_active,
      ]
    );

    return rows[0];
  });
}

async function updateMember(id, payload) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid member identifier.', 400, 'INVALID_IDENTIFIER');
  }

  const existingResult = await db.query('SELECT * FROM members WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Member not found.', 404, 'MEMBER_NOT_FOUND');
  }
  const existing = existingResult.rows[0];

  const validated = validateMemberPayload(payload, existing);

  const dup = await db.query('SELECT id FROM members WHERE phone = $1 AND id <> $2', [
    validated.phone,
    id,
  ]);
  if (dup.rows.length > 0) {
    throw new AppError(
      `A member with phone number '${validated.phone}' is already registered.`,
      409,
      'DUPLICATE_PHONE'
    );
  }

  const { rows } = await db.query(
    `UPDATE members
     SET name = $1,
         phone = $2,
         email = $3,
         gender_code = $4,
         emergency_contact_name = $5,
         emergency_contact_phone = $6,
         notes = $7,
         is_active = $8,
         updated_at = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      validated.name,
      validated.phone,
      validated.email,
      validated.gender_code,
      validated.emergency_contact_name,
      validated.emergency_contact_phone,
      validated.notes,
      validated.is_active,
      id,
    ]
  );

  return rows[0];
}

module.exports = {
  validateMemberPayload,
  generateMemberCode,
  listMembers,
  getMemberById,
  createMember,
  updateMember,
};
