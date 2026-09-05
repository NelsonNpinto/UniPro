import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';

// Reaching a milestone only makes a coupon eligible; this call creates it. The
// target milestone is floor(ordersPlaced / N) computed from successful orders.
// The synchronous check-and-add against rewardedMilestones guarantees at most
// one coupon per milestone even under concurrent admin calls.
export function generateCoupon({ store, config }) {
  const milestone = Math.floor(store.counters.ordersPlaced / config.milestoneInterval);
  if (milestone < 1) {
    throw new AppError('MILESTONE_NOT_REACHED', 'no reward milestone reached yet', {
      ordersPlaced: store.counters.ordersPlaced,
      milestoneInterval: config.milestoneInterval,
    });
  }
  if (store.counters.rewardedMilestones.has(milestone)) {
    throw new AppError('MILESTONE_ALREADY_REWARDED', `milestone ${milestone} already rewarded`, {
      milestone,
    });
  }

  const coupon = {
    code: `M${milestone}-${randomUUID().slice(0, 8).toUpperCase()}`,
    percentOff: config.couponPercentOff,
    milestone,
    status: 'available',
  };
  store.counters.rewardedMilestones.add(milestone);
  store.coupons.set(coupon.code, coupon);
  return coupon;
}
