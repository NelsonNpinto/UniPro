# Checkout and Rewards Service

A small checkout and rewards backend with an in-memory store, plus a React
demonstrator. It models carts, an idempotent checkout that never oversells stock
or double-charges a retry, milestone-based coupons that are single-use, and a
read-only admin report that reconciles. All money is stored and computed as
integer minor units. Design rationale and the concurrency model are in
[DECISIONS.md](DECISIONS.md).

## Prerequisites

- Node.js 20 or newer.

## Backend (`/server`)

```bash
cd server
npm install
npm start
```

The API listens on port 3000 by default. `npm run dev` runs it with `--watch`.

### Run the tests

```bash
cd server
npm test
```

The suite (Vitest + Supertest) covers the invariants directly: concurrent
checkout on the last unit, idempotent retries, concurrent redemption of one
coupon, a failed payment leaving the coupon and inventory untouched, the money
rounding rules, and report reconciliation.

## Frontend (`/web`)

Start the backend first, then:

```bash
cd web
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default). The dev server
proxies the API paths to the backend on port 3000, so no CORS setup is needed.
The Admin view is prefilled with the default admin token (`dev-admin-token`).

The frontend is a demonstrator and is secondary to backend correctness.

## Environment variables

All are read at startup with defaults.

| Variable | Meaning | Default |
|---|---|---|
| `N` | Orders per reward milestone | `5` |
| `X` | Coupon percent off | `10` |
| `CURRENCY` | Global currency code | `INR` |
| `ADMIN_TOKEN` | Shared secret for the admin routes (stub, not real auth) | `dev-admin-token` |
| `PORT` | Backend port | `3000` |

## API summary

All bodies and responses are JSON. Fields suffixed `Minor` are integers.

| Method | Path | Notes |
|---|---|---|
| GET | `/products` | List products |
| POST | `/carts` | Create an open cart |
| GET | `/carts/:cartId` | Cart view with live prices and subtotal |
| POST | `/carts/:cartId/items` | Add item `{ productId, quantity }` (merges quantity) |
| PATCH | `/carts/:cartId/items/:productId` | Set item quantity `{ quantity }` |
| DELETE | `/carts/:cartId/items/:productId` | Remove item |
| POST | `/carts/:cartId/checkout` | Requires `Idempotency-Key` header; body `{ couponCode? }` |
| GET | `/orders/:orderId` | Order snapshot |
| POST | `/admin/coupons` | Generate the coupon for the current milestone (needs `x-admin-token`) |
| GET | `/admin/report` | Read-only report (needs `x-admin-token`) |

Errors use a single envelope, `{ "error": { "code", "message", "details" } }`,
with stable codes mapped to HTTP status. The full list is in
[DECISIONS.md](DECISIONS.md#6-error-model).

Checkout returns `201` with the new order on first success and `200` with the
same order on a matching retry of the same `Idempotency-Key`.

## Time spent and status

Approximately five hours, AI-assisted. Everything in the specification is
implemented and tested; the items listed under "Implemented vs. deferred" in
[DECISIONS.md](DECISIONS.md#7-implemented-vs-deferred) (coupon expiry, per-customer
coupons, real auth, real payments, persistence, multi-instance coordination) are
intentionally out of scope.
