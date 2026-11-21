const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const { AppError } = require('./errorHandler');

/**
 * Verifies Bearer JWT token and confirms the user still exists and is active in PostgreSQL.
 */
async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Authentication required. Please sign in to continue.',
        401,
        'UNAUTHORIZED'
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError(
        'Authentication required. Please sign in to continue.',
        401,
        'UNAUTHORIZED'
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (_err) {
      throw new AppError(
        'Your session has expired or is invalid. Please sign in again.',
        401,
        'INVALID_TOKEN'
      );
    }

    const { rows } = await db.query(
      `SELECT id, name, email, role_code, is_active
       FROM users
       WHERE id = $1`,
      [decoded.sub]
    );

    if (rows.length === 0) {
      throw new AppError(
        'Staff account no longer exists. Please contact the gym owner.',
        401,
        'ACCOUNT_NOT_FOUND'
      );
    }

    const user = rows[0];
    if (!user.is_active) {
      throw new AppError(
        'This account has been deactivated. Please contact the gym owner.',
        403,
        'ACCOUNT_DEACTIVATED'
      );
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Reference-driven RBAC middleware checking req.user.role_code against allowed roles.
 */
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required. Please sign in to continue.',
          401,
          'UNAUTHORIZED'
        )
      );
    }

    if (!allowedRoles.includes(req.user.role_code)) {
      return next(
        new AppError(
          'Forbidden: You do not have permission to perform this action.',
          403,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
