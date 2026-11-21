const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const {
  isValidEmail,
  isValidPassword,
  isValidUuid,
  parsePagination,
  buildPaginationMeta,
} = require('../utils/validators');

const BCRYPT_ROUNDS = 10;
const VALID_ROLES = new Set(['ADMIN', 'FRONT_DESK']);

async function listStaff(query = {}) {
  const { page, limit, offset } = parsePagination(query, 20, 100);
  const conditions = [];
  const params = [];

  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim()}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  if (query.role_code && VALID_ROLES.has(String(query.role_code).toUpperCase())) {
    params.push(String(query.role_code).toUpperCase());
    conditions.push(`u.role_code = $${params.length}`);
  }

  if (query.is_active === 'true' || query.is_active === 'false') {
    params.push(query.is_active === 'true');
    conditions.push(`u.is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*)::INT AS total FROM users u ${whereClause}`,
    params
  );
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT
        u.id,
        u.name,
        u.email,
        u.role_code,
        r.name AS role_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(att.sign_ins_processed, 0)::INT AS sign_ins_processed,
        COALESCE(pay.payments_processed, 0)::INT AS payments_processed
     FROM users u
     JOIN roles r ON r.code = u.role_code
     LEFT JOIN (
       SELECT checked_in_by, COUNT(*)::INT AS sign_ins_processed
       FROM attendance_logs
       WHERE checked_in_by IS NOT NULL
       GROUP BY checked_in_by
     ) att ON att.checked_in_by = u.id
     LEFT JOIN (
       SELECT cashier_id, COUNT(*)::INT AS payments_processed
       FROM payments
       GROUP BY cashier_id
     ) pay ON pay.cashier_id = u.id
     ${whereClause}
     ORDER BY u.is_active DESC, u.created_at ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function createStaff({ name, email, role_code, password, is_active = true }) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new AppError(
      'Staff name must be between 2 and 100 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError('Please enter a valid email address.', 400, 'VALIDATION_ERROR');
  }

  const normalizedRole = typeof role_code === 'string' ? role_code.trim().toUpperCase() : '';
  if (!VALID_ROLES.has(normalizedRole)) {
    throw new AppError(
      'Please select a valid role for this staff member.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!isValidPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters long and include both letters and numbers.',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (typeof is_active !== 'boolean') {
    throw new AppError('Invalid active status flag.', 400, 'VALIDATION_ERROR');
  }

  const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [
    normalizedEmail,
  ]);
  if (existing.rows.length > 0) {
    throw new AppError(
      'A staff account with this email address already exists.',
      409,
      'DUPLICATE_EMAIL'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role_code, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role_code, is_active, created_at, updated_at`,
    [trimmedName, normalizedEmail, passwordHash, normalizedRole, is_active]
  );

  return rows[0];
}

async function updateStaff(id, { name, email, role_code, is_active }, currentUserId) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid staff account identifier.', 400, 'INVALID_IDENTIFIER');
  }

  const existingResult = await db.query(
    'SELECT id, name, email, role_code, is_active FROM users WHERE id = $1',
    [id]
  );
  if (existingResult.rows.length === 0) {
    throw new AppError('Staff account not found.', 404, 'STAFF_NOT_FOUND');
  }
  const existingUser = existingResult.rows[0];

  const nextName = name !== undefined ? String(name).trim() : existingUser.name;
  if (nextName.length < 2 || nextName.length > 100) {
    throw new AppError(
      'Staff name must be between 2 and 100 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const nextEmail =
    email !== undefined ? String(email).trim().toLowerCase() : existingUser.email;
  if (!isValidEmail(nextEmail)) {
    throw new AppError('Please enter a valid email address.', 400, 'VALIDATION_ERROR');
  }

  const nextRole =
    role_code !== undefined
      ? String(role_code).trim().toUpperCase()
      : existingUser.role_code;
  if (!VALID_ROLES.has(nextRole)) {
    throw new AppError(
      'Please select a valid role for this staff member.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const nextActive = is_active !== undefined ? is_active : existingUser.is_active;
  if (typeof nextActive !== 'boolean') {
    throw new AppError('Invalid active status flag.', 400, 'VALIDATION_ERROR');
  }

  // Self-Lockout Guard
  if (id === currentUserId && (nextActive === false || nextRole !== 'ADMIN')) {
    throw new AppError(
      'You cannot deactivate or demote your own active owner account.',
      400,
      'SELF_LOCKOUT_GUARD'
    );
  }

  const dup = await db.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2',
    [nextEmail, id]
  );
  if (dup.rows.length > 0) {
    throw new AppError(
      'A staff account with this email address already exists.',
      409,
      'DUPLICATE_EMAIL'
    );
  }

  const { rows } = await db.query(
    `UPDATE users
     SET name = $1, email = $2, role_code = $3, is_active = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, email, role_code, is_active, created_at, updated_at`,
    [nextName, nextEmail, nextRole, nextActive, id]
  );

  return rows[0];
}

async function resetPassword(id, { password }) {
  if (!isValidUuid(id)) {
    throw new AppError('Invalid staff account identifier.', 400, 'INVALID_IDENTIFIER');
  }

  if (!isValidPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters long and include both letters and numbers.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const existingResult = await db.query('SELECT id, name, email FROM users WHERE id = $1', [
    id,
  ]);
  if (existingResult.rows.length === 0) {
    throw new AppError('Staff account not found.', 404, 'STAFF_NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, id]
  );

  return {
    id: existingResult.rows[0].id,
    name: existingResult.rows[0].name,
    email: existingResult.rows[0].email,
    message: `Password updated successfully for ${existingResult.rows[0].name}.`,
  };
}

module.exports = {
  listStaff,
  createStaff,
  updateStaff,
  resetPassword,
};
