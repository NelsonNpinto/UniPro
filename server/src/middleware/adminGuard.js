import { AppError } from '../lib/errors.js';

// Stub check, not real authentication. It compares a shared secret directly:
// no user model, no sessions, no constant-time comparison. Production would
// replace this with a real identity and authorization layer.
export function adminGuard(config) {
  return (req, res, next) => {
    const token = req.header('x-admin-token');
    if (!token || token !== config.adminToken) {
      return next(new AppError('FORBIDDEN', 'admin token missing or invalid'));
    }
    next();
  };
}
