function successResponse(res, data = {}, statusCode = 200, meta = null) {
  const body = {
    success: true,
    data
  };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

function errorResponse(res, statusCode, code, message, details = null) {
  const body = {
    success: false,
    error: {
      code,
      message
    }
  };
  if (details) {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
}

module.exports = {
  successResponse,
  errorResponse
};
