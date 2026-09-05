function intFromEnv(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    throw new Error(`env ${name} must be an integer, got "${raw}"`);
  }
  return n;
}

// N = orders per milestone, X = percent off. Both come from the environment so
// the reward cadence can be tuned without code changes.
export function loadConfig(env = process.env) {
  const milestoneInterval = intFromEnv(env, 'N', 5);
  const couponPercentOff = intFromEnv(env, 'X', 10);
  if (milestoneInterval < 1) throw new Error('N must be >= 1');
  if (couponPercentOff < 0 || couponPercentOff > 100) {
    throw new Error('X must be between 0 and 100');
  }
  return {
    milestoneInterval,
    couponPercentOff,
    currency: env.CURRENCY || 'INR',
    adminToken: env.ADMIN_TOKEN || 'dev-admin-token',
    port: intFromEnv(env, 'PORT', 3000),
  };
}

export const config = loadConfig();
