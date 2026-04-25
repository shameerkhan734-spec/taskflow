const logger = require('./logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      message: isProduction && statusCode === 500
        ? 'An internal server error occurred'
        : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};

module.exports = errorHandler;
