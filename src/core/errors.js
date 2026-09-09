class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details = null) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details = null) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details = null) {
    super(403, 'FORBIDDEN', message, details);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource Not Found', details = null) {
    super(404, 'NOT_FOUND', message, details);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource Conflict', details = null) {
    super(409, 'CONFLICT', message, details);
  }
}

class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', details = null) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError
};
