import { AppError } from '../lib/errors.js';

// Single JSON envelope for all errors: { error: { code, message, details } }.
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details ?? {} },
    });
  }

  // Anything reaching here is a bug rather than a modelled failure.
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', details: {} },
  });
}
