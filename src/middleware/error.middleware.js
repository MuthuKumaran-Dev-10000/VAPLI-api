const { ApiError } = require('../core/errors');
const { errorResponse } = require('../core/response');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return errorResponse(res, err.statusCode, err.code, err.message, err.details);
  }

  console.error('[UNHANDLED ERROR]', err);
  return errorResponse(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}

module.exports = { errorHandler };
