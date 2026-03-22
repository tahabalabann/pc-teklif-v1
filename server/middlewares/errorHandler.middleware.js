import { logger } from "../logger.js";

export function errorHandler(err, req, res, next) {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - ${req.ip}`, {
    stack: err.stack,
    body: req.body,
    user: req.user?.id || "anonymous",
  });

  const statusCode = err.status || 500;
  const message = err.message || "Sunucu tarafında beklenmeyen bir hata oluştu.";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
