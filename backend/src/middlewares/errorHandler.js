/**
 * Custom operational error class for standardized API error envelopes.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Helper for returning standardized success JSON envelopes.
 */
function sendSuccess(res, data, statusCode = 200, pagination = null) {
  const payload = {
    success: true,
    data,
  };
  if (pagination) {
    payload.pagination = pagination;
  }
  return res.status(statusCode).json(payload);
}

/**
 * 404 Not Found middleware for unmatched API routes.
 */
function notFoundHandler(req, res, next) {
  next(
    new AppError(
      `The requested endpoint (${req.method} ${req.originalUrl}) was not found.`,
      404,
      'ROUTE_NOT_FOUND'
    )
  );
}

/**
 * Centralized Express error handler enforcing the standardized JSON envelope:
 * { success: false, error: { message, code } }
 */
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred. Please try again.';

  // Map malformed JSON body errors from express.json()
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON payload in request body.';
  }

  // Map common PostgreSQL constraint error codes to humanized messages
  if (err.code === '23505') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this unique value already exists.';
  } else if (err.code === '23503') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'The referenced record does not exist or cannot be linked.';
  } else if (err.code === '22P02') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = 'One or more provided identifiers or values have an invalid format.';
  } else if (err.code === '23514') {
    statusCode = 400;
    code = 'CONSTRAINT_VIOLATION';
    message = 'The submitted data does not meet required business constraints.';
  } else if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Unable to connect to the database service. Please check PostgreSQL status.';
  }

  // Never expose raw internal error details on unhandled 500s
  if (statusCode >= 500 && !err.isOperational && code !== 'DATABASE_UNAVAILABLE') {
    console.error('[errorHandler] Unhandled error:', err);
    message = 'An unexpected server error occurred. Please try again shortly.';
    code = 'INTERNAL_SERVER_ERROR';
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
    },
  });
}

module.exports = {
  AppError,
  sendSuccess,
  notFoundHandler,
  errorHandler,
};
