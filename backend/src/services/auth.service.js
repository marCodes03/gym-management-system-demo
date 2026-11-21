const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { AppError } = require('../middlewares/errorHandler');
const { isValidEmail } = require('../utils/validators');

async function login({ email, password }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError(
      'Please enter a valid email address (e.g., name@gym.com).',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (typeof password !== 'string' || password.trim().length === 0) {
    throw new AppError('Please enter your password.', 400, 'VALIDATION_ERROR');
  }

  const { rows } = await db.query(
    `SELECT id, name, email, password_hash, role_code, is_active, created_at
     FROM users
     WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );

  if (rows.length === 0) {
    throw new AppError(
      'Invalid email or password. Please verify your credentials.',
      401,
      'INVALID_CREDENTIALS'
    );
  }

  const user = rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError(
      'Invalid email or password. Please verify your credentials.',
      401,
      'INVALID_CREDENTIALS'
    );
  }

  if (!user.is_active) {
    throw new AppError(
      'This account has been deactivated. Please contact the gym owner.',
      403,
      'ACCOUNT_DEACTIVATED'
    );
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role_code: user.role_code,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role_code: user.role_code,
      is_active: user.is_active,
    },
  };
}

async function forgotPassword({ email }) {
  const rawEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedEmail = rawEmail.toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new AppError(
      'Please enter a valid email address (e.g., name@gym.com).',
      400,
      'VALIDATION_ERROR'
    );
  }

  const { rows: userRows } = await db.query(
    `SELECT id, name, email, role_code, is_active
     FROM users
     WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );

  if (userRows.length === 0) {
    throw new AppError(
      `No staff account found for '${rawEmail}'. Please check the spelling or contact the gym owner.`,
      404,
      'ACCOUNT_NOT_FOUND'
    );
  }

  const { rows: settingsRows } = await db.query(
    'SELECT gym_name, phone, address FROM store_settings WHERE id = 1'
  );
  const { rows: ownerRows } = await db.query(
    `SELECT name, email FROM users WHERE role_code = 'ADMIN' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );

  const settings = settingsRows[0] || {};
  const owner = ownerRows[0] || {};

  return {
    accountFound: true,
    staffName: userRows[0].name,
    email: userRows[0].email,
    recovery: {
      gymName: settings.gym_name || 'Mad Max Gym',
      ownerName: owner.name || 'Gym Owner',
      ownerEmail: owner.email || 'owner@madmaxgym.com',
      gymPhone: settings.phone || '+63 917 555 0199',
      instructions:
        'For security, please contact the Gym Owner to issue an immediate password reset from Staff Management (/staff).',
    },
  };
}

async function getMe(userId) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.role_code, r.name AS role_name, u.is_active, u.created_at
     FROM users u
     JOIN roles r ON r.code = u.role_code
     WHERE u.id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    throw new AppError('Staff account not found.', 404, 'ACCOUNT_NOT_FOUND');
  }

  return rows[0];
}

module.exports = {
  login,
  forgotPassword,
  getMe,
};
