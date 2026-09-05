import { randomUUID } from 'node:crypto';

// Synchronous on purpose: the checkout critical section must not yield, so the
// charge cannot be a real network call here. A production gateway would be
// asynchronous and force the reserve -> charge -> commit model discussed in
// DECISIONS.md. setMode lets tests force a deterministic decline.
export function createPaymentGateway() {
  let mode = 'approve';

  return {
    charge({ amountMinor, currency }) {
      if (mode === 'decline') {
        return { ok: false, reason: 'card_declined' };
      }
      return { ok: true, reference: randomUUID(), amountMinor, currency };
    },
    setMode(next) {
      mode = next;
    },
  };
}
