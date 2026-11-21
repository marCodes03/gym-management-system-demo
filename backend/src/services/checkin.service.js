const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  isValidUuid,
  isValidIsoDate,
  stripPhoneDigits,
  parsePagination,
  buildPaginationMeta,
} = require('../utils/validators');

const VALID_METHODS = new Set([
  'KIOSK_CODE',
  'KIOSK_PHONE',
  'KIOSK_QR',
  'STAFF_LOOKUP',
]);

const VALID_ACCESS_STATUSES = new Set([
  'GRANTED',
  'DENIED_EXPIRED',
  'DENIED_FROZEN',
  'DENIED_NO_PLAN',
]);

function formatDateIso(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function formatTime12h(dateVal) {
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

async function resolveMember(client, { identifier, member_id }) {
  if (member_id) {
    if (!isValidUuid(member_id)) {
      throw new AppError(
        'Member not found. Please check your Member Code or Phone Number, or ask the Front Desk for assistance.',
        404,
        'MEMBER_NOT_FOUND'
      );
    }
    const { rows } = await client.query(
      'SELECT * FROM members WHERE id = $1 AND is_active = TRUE',
      [member_id]
    );
    return rows[0] || null;
  }

  const trimmed = typeof identifier === 'string' ? identifier.trim() : '';
  if (trimmed.length < 1 || trimmed.length > 50) {
    throw new AppError(
      'Please enter your Member Code, Phone Number, or scan your QR Pass.',
      400,
      'VALIDATION_ERROR'
    );
  }

  // 1. Exact Member Code match (case-insensitive)
  const exactCode = await client.query(
    'SELECT * FROM members WHERE UPPER(member_code) = UPPER($1) AND is_active = TRUE LIMIT 1',
    [trimmed]
  );
  if (exactCode.rows.length > 0) {
    return exactCode.rows[0];
  }

  // 2. 1-4 digit numeric suffix match (e.g., "1" or "0001" -> "MEM-YYYY-0001")
  if (/^\d{1,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const preferredCode = `MEM-${currentYear}-${padded}`;

    const suffixRes = await client.query(
      `SELECT *
       FROM members
       WHERE is_active = TRUE
         AND (UPPER(member_code) = $1 OR member_code LIKE $2)
       ORDER BY
         CASE WHEN UPPER(member_code) = $1 THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 1`,
      [preferredCode, `%-${padded}`]
    );
    if (suffixRes.rows.length > 0) {
      return suffixRes.rows[0];
    }
  }

  // 3. Exact or digit-normalized phone number match
  const digits = stripPhoneDigits(trimmed);
  if (digits.length >= 7) {
    const phoneRes = await client.query(
      `SELECT *
       FROM members
       WHERE is_active = TRUE
         AND (
           phone = $1
           OR regexp_replace(phone, '[^0-9]', '', 'g') = $2
         )
       LIMIT 1`,
      [trimmed, digits]
    );
    if (phoneRes.rows.length > 0) {
      return phoneRes.rows[0];
    }
  }

  return null;
}

async function processCheckIn(payload, staffUser = null) {
  const {
    identifier,
    member_id,
    check_in_method = member_id ? 'STAFF_LOOKUP' : 'KIOSK_CODE',
    notes = null,
  } = payload || {};

  const normalizedMethod = String(check_in_method || '').trim().toUpperCase();
  if (!VALID_METHODS.has(normalizedMethod)) {
    throw new AppError('Invalid check-in method.', 400, 'VALIDATION_ERROR');
  }

  if (!member_id && (typeof identifier !== 'string' || identifier.trim().length === 0)) {
    throw new AppError(
      'Please enter your Member Code, Phone Number, or scan your QR Pass.',
      400,
      'VALIDATION_ERROR'
    );
  }

  return db.withTransaction(async (client) => {
    const member = await resolveMember(client, { identifier, member_id });
    if (!member) {
      throw new AppError(
        'Member not found. Please check your Member Code or Phone Number, or ask the Front Desk for assistance.',
        404,
        'MEMBER_NOT_FOUND'
      );
    }

    // Fetch latest subscription first (read for cooldown response or lock for mutation)
    const fetchLatestSub = async (lock = false) => {
      const lockClause = lock ? 'FOR UPDATE OF ms' : '';
      const { rows } = await client.query(
        `SELECT
            ms.*,
            mp.code AS plan_code,
            mp.name AS plan_name,
            mp.plan_type_code,
            mp.badge_color_hex,
            (ms.end_date - CURRENT_DATE)::INT AS days_diff,
            (CURRENT_DATE > ms.end_date) AS is_date_past
         FROM member_subscriptions ms
         JOIN membership_plans mp ON mp.id = ms.plan_id
         WHERE ms.member_id = $1
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
         ${lockClause}`,
        [member.id]
      );
      return rows[0] || null;
    };

    // 1. 5-Minute Duplicate Sign-In Cooldown Guard
    const cooldownRes = await client.query(
      `SELECT *
       FROM attendance_logs
       WHERE member_id = $1
         AND access_status = 'GRANTED'
         AND check_in_at >= NOW() - INTERVAL '5 minutes'
       ORDER BY check_in_at DESC
       LIMIT 1`,
      [member.id]
    );

    if (cooldownRes.rows.length > 0) {
      const existingLog = cooldownRes.rows[0];
      const latestSub = await fetchLatestSub(false);
      const timeStr = formatTime12h(existingLog.check_in_at);

      return {
        alreadySignedIn: true,
        access_status: 'GRANTED',
        expiring_soon: false,
        message: `You are already signed in today at ${timeStr}, ${member.name}! Enjoy your workout.`,
        existingLog,
        member,
        subscription: latestSub,
      };
    }

    // 2. Lock latest subscription (FOR UPDATE) and evaluate eligibility
    const sub = await fetchLatestSub(true);
    const checkedInBy =
      normalizedMethod === 'STAFF_LOOKUP' && staffUser ? staffUser.id : null;
    const trimmedNotes =
      notes !== null && notes !== undefined && String(notes).trim() !== ''
        ? String(notes).trim().slice(0, 500)
        : null;

    // Case A: No subscription at all
    if (!sub) {
      const { rows: logRows } = await client.query(
        `INSERT INTO attendance_logs
           (member_id, subscription_id, check_in_method, access_status,
            remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, notes)
         VALUES ($1, NULL, $2, 'DENIED_NO_PLAN', NULL, NULL, $3, $4)
         RETURNING *`,
        [member.id, normalizedMethod, checkedInBy, trimmedNotes]
      );

      return {
        alreadySignedIn: false,
        access_status: 'DENIED_NO_PLAN',
        expiring_soon: false,
        message: `ACCESS DENIED — No active membership found for ${member.name}. Please see the Front Desk to purchase a plan or Day Pass.`,
        log: logRows[0],
        member,
        subscription: null,
      };
    }

    // Case B: Frozen subscription
    if (sub.status_code === 'FROZEN') {
      const { rows: logRows } = await client.query(
        `INSERT INTO attendance_logs
           (member_id, subscription_id, check_in_method, access_status,
            remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, notes)
         VALUES ($1, $2, $3, 'DENIED_FROZEN', $4, $5, $6, $7)
         RETURNING *`,
        [
          member.id,
          sub.id,
          normalizedMethod,
          Math.max(0, sub.days_diff),
          sub.remaining_sessions,
          checkedInBy,
          trimmedNotes,
        ]
      );

      return {
        alreadySignedIn: false,
        access_status: 'DENIED_FROZEN',
        expiring_soon: false,
        message:
          'ACCESS DENIED — Your membership is currently frozen. Please ask the Front Desk to unfreeze your plan.',
        log: logRows[0],
        member,
        subscription: sub,
      };
    }

    // Case C: Expired (by status, date, or 0 sessions)
    const isSessionsDepleted =
      sub.remaining_sessions !== null && sub.remaining_sessions <= 0;
    if (sub.status_code === 'EXPIRED' || sub.is_date_past || isSessionsDepleted) {
      if (sub.status_code === 'ACTIVE') {
        await client.query(
          `UPDATE member_subscriptions
           SET status_code = 'EXPIRED', updated_at = NOW()
           WHERE id = $1`,
          [sub.id]
        );
        sub.status_code = 'EXPIRED';
      }

      const { rows: logRows } = await client.query(
        `INSERT INTO attendance_logs
           (member_id, subscription_id, check_in_method, access_status,
            remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, notes)
         VALUES ($1, $2, $3, 'DENIED_EXPIRED', $4, $5, $6, $7)
         RETURNING *`,
        [
          member.id,
          sub.id,
          normalizedMethod,
          sub.days_diff,
          sub.remaining_sessions,
          checkedInBy,
          trimmedNotes,
        ]
      );

      const expiredDateStr = formatDateIso(sub.end_date);
      return {
        alreadySignedIn: false,
        access_status: 'DENIED_EXPIRED',
        expiring_soon: false,
        message: `ACCESS DENIED — Your membership expired on ${expiredDateStr}. Please see the Front Desk to renew.`,
        log: logRows[0],
        member,
        subscription: sub,
      };
    }

    // Case D: ACTIVE & Valid -> GRANT ACCESS
    let updatedRemainingSessions = sub.remaining_sessions;
    let updatedSubStatus = sub.status_code;

    if (sub.plan_type_code === 'SESSION_PACK') {
      updatedRemainingSessions = Math.max(0, Number(sub.remaining_sessions) - 1);
      // If 0 visits left after today's deduction, mark EXPIRED for future check-ins while granting today
      if (updatedRemainingSessions === 0) {
        updatedSubStatus = 'EXPIRED';
      }

      await client.query(
        `UPDATE member_subscriptions
         SET remaining_sessions = $1,
             status_code = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [updatedRemainingSessions, updatedSubStatus, sub.id]
      );
      sub.remaining_sessions = updatedRemainingSessions;
      sub.status_code = updatedSubStatus;
    }

    const remainingDays = Math.max(0, Number(sub.days_diff));

    const { rows: updatedMemberRows } = await client.query(
      `UPDATE members
       SET total_visits = total_visits + 1,
           last_check_in_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [member.id]
    );
    const updatedMember = updatedMemberRows[0];

    const { rows: logRows } = await client.query(
      `INSERT INTO attendance_logs
         (member_id, subscription_id, check_in_method, access_status,
          remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, notes)
       VALUES ($1, $2, $3, 'GRANTED', $4, $5, $6, $7)
       RETURNING *`,
      [
        member.id,
        sub.id,
        normalizedMethod,
        remainingDays,
        updatedRemainingSessions,
        checkedInBy,
        trimmedNotes,
      ]
    );

    const expiringSoon =
      remainingDays <= 3 ||
      (updatedRemainingSessions !== null && updatedRemainingSessions <= 2);

    const welcomeMessage =
      sub.plan_type_code === 'SESSION_PACK'
        ? `ACCESS GRANTED — Welcome back, ${updatedMember.name}! (1 visit deducted • ${updatedRemainingSessions} visit(s) left)`
        : `ACCESS GRANTED — Welcome back, ${updatedMember.name}! (${sub.plan_name} • ${remainingDays} day(s) remaining)`;

    const expiringReminder = expiringSoon
      ? sub.plan_type_code === 'SESSION_PACK'
        ? `Reminder: Only ${updatedRemainingSessions} visit(s) left on your membership!`
        : `Reminder: Only ${remainingDays} day(s) left on your membership!`
      : null;

    return {
      alreadySignedIn: false,
      access_status: 'GRANTED',
      expiring_soon: expiringSoon,
      expiring_reminder: expiringReminder,
      message: welcomeMessage,
      log: logRows[0],
      member: updatedMember,
      subscription: {
        ...sub,
        remaining_days: remainingDays,
      },
    };
  });
}

async function verifyKioskExit(userId, { staff_password }) {
  if (typeof staff_password !== 'string' || staff_password.length === 0) {
    throw new AppError(
      'Incorrect staff password. Kiosk mode remains locked.',
      401,
      'INVALID_KIOSK_EXIT_PASSWORD'
    );
  }

  const { rows } = await db.query(
    'SELECT id, password_hash FROM users WHERE id = $1 AND is_active = TRUE',
    [userId]
  );
  if (rows.length === 0) {
    throw new AppError(
      'Incorrect staff password. Kiosk mode remains locked.',
      401,
      'INVALID_KIOSK_EXIT_PASSWORD'
    );
  }

  const matches = await bcrypt.compare(staff_password, rows[0].password_hash);
  if (!matches) {
    throw new AppError(
      'Incorrect staff password. Kiosk mode remains locked.',
      401,
      'INVALID_KIOSK_EXIT_PASSWORD'
    );
  }

  return { verified: true };
}

async function listCheckInLogs(query = {}) {
  const { page, limit, offset } = parsePagination(query, 25, 100);
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
    conditions.push(`al.check_in_at >= $${params.length}::DATE`);
  }

  if (query.end_date) {
    params.push(query.end_date);
    conditions.push(`al.check_in_at < ($${params.length}::DATE + INTERVAL '1 day')`);
  }

  if (query.access_status && String(query.access_status).toUpperCase() !== 'ALL') {
    const status = String(query.access_status).toUpperCase();
    if (status === 'DENIED') {
      conditions.push(`al.access_status <> 'GRANTED'`);
    } else if (VALID_ACCESS_STATUSES.has(status)) {
      params.push(status);
      conditions.push(`al.access_status = $${params.length}`);
    }
  }

  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim()}%`);
    conditions.push(
      `(m.name ILIKE $${params.length} OR m.member_code ILIKE $${params.length} OR m.phone ILIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*)::INT AS total
     FROM attendance_logs al
     JOIN members m ON m.id = al.member_id
     ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT
        al.id,
        al.member_id,
        m.member_code,
        m.name AS member_name,
        m.phone AS member_phone,
        al.subscription_id,
        mp.name AS plan_name,
        mp.plan_type_code,
        al.check_in_method,
        al.access_status,
        al.remaining_days_at_checkin,
        al.remaining_sessions_at_checkin,
        al.checked_in_by,
        u.name AS checked_in_by_name,
        al.check_in_at,
        al.notes
     FROM attendance_logs al
     JOIN members m ON m.id = al.member_id
     LEFT JOIN member_subscriptions ms ON ms.id = al.subscription_id
     LEFT JOIN membership_plans mp ON mp.id = ms.plan_id
     LEFT JOIN users u ON u.id = al.checked_in_by
     ${whereClause}
     ORDER BY al.check_in_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

module.exports = {
  processCheckIn,
  verifyKioskExit,
  listCheckInLogs,
};
