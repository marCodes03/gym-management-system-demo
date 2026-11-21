const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  isValidPlanCode,
  isValidHexColor,
  isValidUuid,
  computeVatBreakdown,
} = require('../utils/validators');

const VALID_PLAN_TYPES = new Set(['DAY_PASS', 'RECURRING', 'SESSION_PACK']);

function formatPlanRow(row) {
  const price = Number(row.price);
  const vat = computeVatBreakdown(price, 0, 12);
  return {
    ...row,
    price,
    vat_amount: vat.taxAmount,
    net_amount: vat.subtotalAmount,
  };
}

function validatePlanPayload(payload, isUpdate = false, existing = null) {
  const rawName = payload.name !== undefined ? payload.name : existing?.name;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (name.length < 2 || name.length > 100) {
    throw new AppError(
      'Plan name must be between 2 and 100 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawCode = payload.code !== undefined ? payload.code : existing?.code;
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  if (!isValidPlanCode(code)) {
    throw new AppError(
      'Plan code must be 3–40 uppercase letters, numbers, or hyphens (e.g., PLAN-MONTHLY).',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawType =
    payload.plan_type_code !== undefined
      ? payload.plan_type_code
      : existing?.plan_type_code;
  const plan_type_code = typeof rawType === 'string' ? rawType.trim().toUpperCase() : '';
  if (!VALID_PLAN_TYPES.has(plan_type_code)) {
    throw new AppError('Please select a valid plan type.', 400, 'VALIDATION_ERROR');
  }

  let duration_days;
  let included_sessions;

  if (plan_type_code === 'DAY_PASS') {
    duration_days = 1;
    included_sessions = null;
  } else {
    const rawDuration =
      payload.duration_days !== undefined
        ? payload.duration_days
        : existing?.duration_days;
    const parsedDuration = Number(rawDuration);
    if (
      rawDuration === null ||
      rawDuration === '' ||
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 3650
    ) {
      throw new AppError(
        'Duration must be a whole number of days between 1 and 3,650.',
        400,
        'VALIDATION_ERROR'
      );
    }
    duration_days = parsedDuration;

    if (plan_type_code === 'RECURRING') {
      included_sessions = null;
    } else {
      // SESSION_PACK
      const rawSessions =
        payload.included_sessions !== undefined
          ? payload.included_sessions
          : existing?.included_sessions;
      const parsedSessions = Number(rawSessions);
      if (
        rawSessions === null ||
        rawSessions === undefined ||
        rawSessions === '' ||
        !Number.isInteger(parsedSessions) ||
        parsedSessions < 1 ||
        parsedSessions > 1000
      ) {
        throw new AppError(
          'Please enter the number of included visits (1 to 1,000) for a Visit/Session Pack.',
          400,
          'VALIDATION_ERROR'
        );
      }
      included_sessions = parsedSessions;
    }
  }

  const rawPrice = payload.price !== undefined ? payload.price : existing?.price;
  const parsedPrice = Number(rawPrice);
  if (
    rawPrice === null ||
    rawPrice === undefined ||
    rawPrice === '' ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0 ||
    parsedPrice > 999999.99
  ) {
    throw new AppError(
      'Please enter a valid price of ₱0.00 or greater.',
      400,
      'VALIDATION_ERROR'
    );
  }
  const price = Number(parsedPrice.toFixed(2));

  const rawBadge =
    payload.badge_color_hex !== undefined
      ? payload.badge_color_hex
      : existing?.badge_color_hex || '#2563EB';
  const badge_color_hex = typeof rawBadge === 'string' ? rawBadge.trim() : '';
  if (!isValidHexColor(badge_color_hex)) {
    throw new AppError('Please select a valid badge color.', 400, 'VALIDATION_ERROR');
  }

  const rawDesc =
    payload.description !== undefined ? payload.description : existing?.description ?? null;
  let description = null;
  if (rawDesc !== null && rawDesc !== undefined && String(rawDesc).trim() !== '') {
    description = String(rawDesc).trim();
    if (description.length > 500) {
      throw new AppError(
        'Description cannot exceed 500 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const is_active =
    payload.is_active !== undefined
      ? Boolean(payload.is_active)
      : isUpdate
        ? existing.is_active
        : true;

  return {
    code,
    name,
    plan_type_code,
    duration_days,
    included_sessions,
    price,
    badge_color_hex,
    description,
    is_active,
  };
}

async function listPlans(query = {}) {
  const conditions = [];
  const params = [];

  if (query.plan_type_code && VALID_PLAN_TYPES.has(String(query.plan_type_code).toUpperCase())) {
    params.push(String(query.plan_type_code).toUpperCase());
    conditions.push(`p.plan_type_code = $${params.length}`);
  }

  if (query.is_active === 'true' || query.is_active === 'false') {
    params.push(query.is_active === 'true');
    conditions.push(`p.is_active = $${params.length}`);
  }

  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim()}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.code ILIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT
        p.id,
        p.code,
        p.name,
        p.plan_type_code,
        pt.name AS plan_type_name,
        p.duration_days,
        p.included_sessions,
        p.price,
        p.badge_color_hex,
        p.description,
        p.is_active,
        p.created_at,
        p.updated_at
     FROM membership_plans p
     JOIN plan_types pt ON pt.code = p.plan_type_code
     ${whereClause}
     ORDER BY
       p.is_active DESC,
       CASE p.plan_type_code
         WHEN 'DAY_PASS' THEN 1
         WHEN 'RECURRING' THEN 2
         WHEN 'SESSION_PACK' THEN 3
       END,
       p.price ASC`,
    params
  );

  return rows.map(formatPlanRow);
}

async function createPlan(payload) {
  const validated = validatePlanPayload(payload, false);

  const dup = await db.query('SELECT id FROM membership_plans WHERE UPPER(code) = $1', [
    validated.code,
  ]);
  if (dup.rows.length > 0) {
    throw new AppError(
      `A membership plan with code '${validated.code}' already exists.`,
      409,
      'DUPLICATE_PLAN_CODE'
    );
  }

  const { rows } = await db.query(
    `INSERT INTO membership_plans
       (code, name, plan_type_code, duration_days, included_sessions, price, badge_color_hex, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      validated.code,
      validated.name,
      validated.plan_type_code,
      validated.duration_days,
      validated.included_sessions,
      validated.price,
      validated.badge_color_hex,
      validated.description,
      validated.is_active,
    ]
  );

  return formatPlanRow(rows[0]);
}

async function updatePlan(id, payload) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid membership plan identifier.', 400, 'INVALID_IDENTIFIER');
  }

  const existingResult = await db.query('SELECT * FROM membership_plans WHERE id = $1', [id]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Membership plan not found.', 404, 'PLAN_NOT_FOUND');
  }
  const existing = existingResult.rows[0];

  const validated = validatePlanPayload(payload, true, existing);

  const dup = await db.query(
    'SELECT id FROM membership_plans WHERE UPPER(code) = $1 AND id <> $2',
    [validated.code, id]
  );
  if (dup.rows.length > 0) {
    throw new AppError(
      `A membership plan with code '${validated.code}' already exists.`,
      409,
      'DUPLICATE_PLAN_CODE'
    );
  }

  const { rows } = await db.query(
    `UPDATE membership_plans
     SET code = $1,
         name = $2,
         plan_type_code = $3,
         duration_days = $4,
         included_sessions = $5,
         price = $6,
         badge_color_hex = $7,
         description = $8,
         is_active = $9,
         updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      validated.code,
      validated.name,
      validated.plan_type_code,
      validated.duration_days,
      validated.included_sessions,
      validated.price,
      validated.badge_color_hex,
      validated.description,
      validated.is_active,
      id,
    ]
  );

  return formatPlanRow(rows[0]);
}

async function togglePlanStatus(id, { is_active }) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid membership plan identifier.', 400, 'INVALID_IDENTIFIER');
  }

  if (typeof is_active !== 'boolean') {
    throw new AppError(
      'Please provide a valid boolean value for is_active.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const { rows } = await db.query(
    `UPDATE membership_plans
     SET is_active = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [is_active, id]
  );

  if (rows.length === 0) {
    throw new AppError('Membership plan not found.', 404, 'PLAN_NOT_FOUND');
  }

  return formatPlanRow(rows[0]);
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
};
