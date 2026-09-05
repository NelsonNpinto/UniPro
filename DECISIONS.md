# Design decisions

## 1. Invariants and where they are enforced

1. **Inventory never goes negative.** `server/src/services/checkoutService.js` checks
   `availableInventory < quantity` for every line before any mutation, and only
   decrements after all checks pass. Both happen in one synchronous section, so
   two checkouts cannot both pass the check for the same last unit.
2. **A cart is checked out at most once.** `checkoutService.js` rejects a cart
   whose status is not `open`, then sets `status = 'checked_out'` in the same
   synchronous section.
3. **A retried checkout produces exactly one order.** The checkout route in
   `server/src/routes/carts.js` looks up the idempotency key, runs the checkout,
   and records the order under the key without yielding, so a retry replays the
   stored order instead of creating a second one.
4. **Order totals are fixed at creation.** `checkoutService.js` builds the order
   as a snapshot of names, prices, and quantities and returns `deepFreeze(order)`.
   `Object.isFrozen` on a stored order is asserted in the tests.
5. **A coupon is redeemed at most once.** `checkoutService.js` checks
   `coupon.status !== 'available'` and sets it to `redeemed` in the same
   synchronous section.
6. **A coupon is not consumed by a failed checkout.** In `checkoutService.js`
   the coupon is marked `redeemed` only after `paymentGateway.charge` succeeds;
   every check that can throw runs before that point.
7. **At most one coupon per milestone.** `server/src/services/couponService.js`
   checks `rewardedMilestones.has(milestone)` and adds to the set in the same
   synchronous section.
8. **An order total is never negative.** `server/src/lib/money.js` `applyDiscount`
   returns `Math.max(gross - discount, 0)`.
9. **The report reconciles.** `server/src/services/reportService.js` sums
   `netRevenueMinor` from each order's `totalMinor`. Because every order total is
   `gross - discount`, `net === gross - discounts` holds by construction, and the
   sum of order totals equals `net`.

## 2. Ambiguities and chosen semantics

These are the questions the brief left open and the answer this implementation commits to.

- **Do carts capture price at add-time or checkout-time?** The cart stores only
  product references and quantities. Prices and availability are read live at
  view and checkout time, and the order snapshots them. A cart never sells a
  stale price.
- **What counts toward a milestone?** Only successfully placed orders increment
  `ordersPlaced`. Failed checkouts (validation, inventory, payment) do not count.
- **Is a coupon created automatically on reaching a milestone?** No. Reaching a
  milestone makes a coupon *eligible*; the admin endpoint creates it. The target
  milestone is `floor(ordersPlaced / N)`. Calling the endpoint once per milestone
  yields one coupon per milestone. If the admin skips calls, only the highest
  currently-eligible, not-yet-rewarded milestone is created; lower skipped
  milestones are not backfilled.
- **Who owns a coupon?** Coupons are global and single-use. With no authentication
  there is no per-customer ownership. This is a deliberate simplification.
- **How many coupons per order?** At most one, applied to gross, half-up, clamped
  at zero.
- **Do coupons expire?** Not in scope; deferred.

## 3. Material design decisions

## Decision: In-memory single-process store
**Context:** The brief fixes persistence as in-memory, single process.
**Options considered:** A database (SQLite/Postgres) behind a repository layer; a
single in-memory module of `Map`s; per-request state.
**Choice:** A single `createStore()` returning plain `Map`s and counters, created
once per app instance.
**Why:** It matches the brief, keeps the concurrency model honest (one process,
one event loop), and makes tests trivially isolated because each app gets a fresh
store. A repository abstraction would be speculative for a spec that forbids
extra layers.
**Consequences:** State is lost on restart and cannot be shared across processes.
Section 8 describes the migration path. The service code already takes the store
as a parameter, so it stays stateless and portable.

## Decision: One synchronous critical section for checkout
**Context:** Checkout must not oversell, double-charge, or partially apply under
concurrent or retried requests.
**Options considered:** A mutex/lock or queue around checkout; an async
reserve-then-commit flow with compensation; a single synchronous section with no
`await` between the first read and the last write.
**Choice:** The synchronous section. `checkoutService.checkout` performs all
validation and all mutation without awaiting.
**Why:** Node runs JavaScript on one thread, so a block with no `await` inside it
is atomic by construction. A lock adds machinery to re-create a guarantee the
runtime already provides in this deployment model. All fallible steps
(cart, inventory, coupon, payment) run first and can throw; the mutations that
follow cannot fail.
**Consequences:** Correctness depends on the section staying `await`-free, which
is called out in comments. The payment gateway must therefore be synchronous
(next decision). In a multi-process world this guarantee no longer holds and must
move into the database (section 8).

## Decision: Synchronous payment gateway abstraction
**Context:** A real payment call is asynchronous, but an `await` inside checkout
would break atomicity.
**Options considered:** An async gateway with a reserve -> charge -> commit or
compensate protocol; a synchronous gateway that returns a result immediately.
**Choice:** A synchronous `PaymentGateway.charge` that returns success or a
deterministic decline, charged before any mutation.
**Why:** It keeps the critical section atomic and keeps the demo self-contained,
while still modelling the important ordering property: nothing is mutated until
payment succeeds, so a decline consumes neither inventory nor a coupon.
**Consequences:** This is not how a production integration works. The realistic
asynchronous model is documented in section 8 as the intended evolution.

## Decision: Idempotency via a client-supplied request key
**Context:** A retried checkout must not create a second order.
**Options considered:** Deduplicating on cart id alone; a client `Idempotency-Key`
header mapped to the resulting order; no idempotency.
**Choice:** A required `Idempotency-Key` header. The store maps the key to
`{ status, requestFingerprint, order }`. An unseen key proceeds and is recorded;
a seen key with a matching request replays the stored order with `200`; a seen key
with a different request returns `409 IDEMPOTENCY_CONFLICT`.
**Why:** Cart id alone is too coarse (a different coupon is a different request)
and does not survive the cart being consumed. A request key is the standard
mechanism and lets the client retry safely after a network error.
**Consequences:** Clients must generate and reuse a key per attempt. A failed
checkout does not record a key, so a genuine retry after a transient failure is
allowed. In a single process there is no in-flight window; a shared store would
need the key as a uniquely-indexed row inserted atomically.

## Decision: Coupon generation separated from eligibility
**Context:** The brief distinguishes reaching a milestone from issuing a reward.
**Options considered:** Auto-issue a coupon the moment `ordersPlaced` hits a
multiple of N; make issuance an explicit admin action.
**Choice:** Explicit issuance. `generateCoupon` computes `floor(ordersPlaced / N)`
and creates a coupon only if that milestone is `>= 1` and not already in
`rewardedMilestones`.
**Why:** It keeps the checkout path free of reward side effects, makes issuance
auditable, and models the real separation between "customer became eligible" and
"business decided to grant the reward". The `rewardedMilestones` set makes the
one-per-milestone invariant a simple synchronous check-and-add.
**Consequences:** A reward is not granted until an admin asks for it, and skipped
milestones are not backfilled (see section 2).

## Decision: Integer money with half-up, clamped rounding
**Context:** Money must never be a floating-point number.
**Options considered:** Floats with `toFixed`; a decimal library; integer minor
units with hand-written rounding.
**Choice:** Integer minor units everywhere, with
`discount = floor((gross * percentOff + 50) / 100)` for half-up rounding and
`total = max(gross - discount, 0)`.
**Why:** Integer arithmetic has no representation error, needs no dependency, and
the `+ 50` before the `/ 100` floor is an exact half-up rule because gross and
percent are non-negative. The clamp guarantees a non-negative total even if a
percentage above 100 is ever configured.
**Consequences:** Every amount in the system is an integer suffixed `Minor`. Only
display formatting converts to major units, and it does so with integer division
rather than floating-point division.

## 4. Transaction, concurrency, and idempotency strategy

Node executes JavaScript on a single thread, so two requests never run JS
simultaneously. Any block that reads and mutates the store without an `await`
inside it is therefore atomic: nothing can interleave.

Checkout uses this directly. `checkoutService.checkout` is one synchronous
function that (1) loads the cart and rejects it if missing, empty, or already
checked out; (2) loads every product and rejects on insufficient inventory;
(3) loads the coupon if supplied and rejects if missing or not available;
(4) computes gross, discount, and total from current prices; (5) charges payment
and throws on decline; then (6) decrements inventory, marks the coupon redeemed,
creates the frozen order, marks the cart checked out, and increments
`ordersPlaced`; and (7) the route records the order under the idempotency key.
Steps 1-5 are pure checks that can throw before any state changes. Steps 6-7 are
mutations that cannot fail and never yield. Because nothing yields, a partial
checkout is never observable and two checkouts cannot both take the last unit.

Idempotency is resolved in the same synchronous handler. The key lookup, the
checkout call, and recording the resulting order happen without an `await`
between them, so a concurrent retry with the same key cannot slip in before the
first has recorded its order. An unseen key proceeds; a matching seen key replays
the stored order; a conflicting seen key is rejected.

Coupon redemption is the synchronous `available -> redeemed` transition in step 6,
after payment has succeeded. Two concurrent checkouts with the same coupon cannot
both redeem it, and a declined payment leaves it untouched.

Coupon generation is a synchronous check-and-create against `rewardedMilestones`,
which prevents two admin calls from issuing two coupons for the same milestone.

## 5. Money and rounding rules

- All amounts are integer minor units (paise for INR) in fields suffixed `Minor`.
- Line total = `unitPriceMinor * quantity`.
- Gross = sum of line totals.
- Percentage discount = `floor((gross * percentOff + 50) / 100)` (half-up on
  integers).
- Total = `max(gross - discount, 0)`.
- The rounding helper is unit-tested directly, including the clamp-at-zero case.
- Display formatting (`web/src/format.js`) also avoids floating point: it uses
  integer division for the major part and the remainder for the minor part.

## 6. Error model

All errors share one envelope: `{ "error": { "code", "message", "details" } }`.
`AppError(code, message, details?)` carries the HTTP status via a fixed
code-to-status table in `server/src/lib/errors.js`, and `errorHandler` is the only
place that formats the envelope.

Codes are specific rather than generic (`INSUFFICIENT_INVENTORY`,
`COUPON_ALREADY_REDEEMED`, `IDEMPOTENCY_CONFLICT`, `MILESTONE_NOT_REACHED`, and so
on) so that clients can branch on a stable code and show a precise message instead
of parsing prose. The frontend maps each code to a shopper-facing sentence in
`web/src/errorMessages.js`. Unexpected (non-`AppError`) failures return a generic
`500 INTERNAL_ERROR` so that internal details never leak.

## 7. Implemented vs. deferred

Implemented: products and seed data; cart create/view and item add/update/remove;
checkout as a synchronous critical section with no oversell; idempotent checkout
with replay and conflict detection; coupon generation per milestone; coupon
redemption with discount, clamp, and single-use enforcement; the failed-payment
guarantee; the admin report; a focused automated test suite; and a React
demonstrator covering every view.

Deferred (intentionally out of scope): coupon expiry; per-customer coupon
ownership; real authentication and authorization (the admin guard is a stub);
real payment processing; persistence across restarts; multi-instance
coordination; and rate limiting.

## 8. Evolution for multiple instances and production scale

With more than one process the in-memory guarantees break, because two processes
have two event loops and two copies of the store. The migration keeps the service
code stateless and moves the atomicity into a shared transactional system:

- Inventory decrements become atomic conditional updates
  (`UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty`),
  and a zero-row result is the new `INSUFFICIENT_INVENTORY`.
- Cart and coupon transitions become atomic conditional updates
  (`... WHERE status = 'open'` / `... WHERE status = 'available'`).
- The idempotency key becomes a uniquely-indexed row inserted atomically; a
  duplicate insert signals a replay or an in-flight request.
- The multi-write checkout runs inside a database transaction so the whole set of
  mutations commits or rolls back together.
- The payment gateway becomes asynchronous with a reserve -> charge -> commit or
  compensate flow, so a slow or failed charge never holds a transaction open.

Because the services already receive the store as a parameter, swapping the
`Map`-based store for a database-backed one does not change the route or service
structure.

## 9. AI use

This solution was implemented with Claude (Anthropic's Claude Code). The
architecture, invariants, and semantics were specified up front; Claude generated
the implementation feature by feature, and each feature was exercised against its
invariant (by a quick script or a test) before the next was started.

One concrete redirection: the first cut wrapped every route handler in
`try/catch` to forward errors to `next(err)`. After confirming that Express
forwards a synchronously thrown error to the error middleware on its own, that
boilerplate was removed so handlers throw `AppError` directly. This was not only
tidier; it kept the checkout handler a single clean synchronous block, which is
exactly the property the concurrency model depends on. A second, more
architectural steer was to keep the payment gateway synchronous and the checkout
section `await`-free rather than reaching for a lock or an async charge inside the
critical section; the asynchronous model is documented in section 8 as the
intended production evolution rather than implemented here.

## 10. What I would examine first with two more hours

- Add a test that asserts a frozen order actually rejects mutation in strict mode,
  not just that it is frozen.
- Property-test the rounding helper across a range of gross values and percentages
  against an independent decimal computation.
- Add a small load test that fires many mixed concurrent operations (adds,
  checkouts, redemptions) and re-checks every invariant at the end.
- Tighten checkout request validation to reject unknown body fields explicitly.
- Add structured request logging so the report and the order log can be
  cross-checked from outside the process.
