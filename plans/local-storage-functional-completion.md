# Manzili Local-Storage Functional Completion Plan

## 1) Objective
Make the site fully functional in local mode (no required backend dependency for core user journeys), while preserving modularity so swapping to real backend adapters later is straightforward.

## 2) Current State Snapshot

Observed:
- Local storage utility exists for custom requests in `lib/customRequestsLocal.js`.
- `custom-products` page already merges API and local custom requests.
- Checkout and custom-order server routes exist with temporary/mock behavior.

Gaps to close:
- local mode behavior is not normalized across all domains;
- direct `fetch` usage in pages can bypass domain contracts;
- no shared storage schema/version strategy for all entities.

## 3) Local-First Architecture Contract

UI rule:
- components/pages call only domain services (`AuthService`, `CartService`, `OrderService`, etc.).
- services call provider interfaces, not storage APIs directly.

Provider rule:
- all provider methods are async (`Promise` based), even for local mode.
- each domain has two adapters:
  - `Local*Adapter` (browser storage);
  - `Api*Adapter` (future backend).

Suggested shape:
```ts
export interface OrderProvider {
  createFromCart(input: CreateOrderInput): Promise<Order>;
  getById(id: string): Promise<Order | null>;
  listMine(query?: ListQuery): Promise<Order[]>;
}
```

## 4) Domain-by-Domain Local Completion

## 4.0 Accounts, Stores, and Admin (local-mode rules)

- **Accounts**: Every real session comes from registration or login (`manzili_auth_users_v1` + `manzili_auth_session_v1`). There is no implicit or auto-created “dummy” seller session; guests are not treated as store owners.
- **Stores**: Each user may own **at most one** store. Store records live in `manzili_stores_v1` with `userId` ownership; the session carries `storeId` only when it matches a store owned by that user (invalid links, e.g. legacy shared demo ids, are reconciled away on boot).
- **Seller onboarding**: Registering as a seller creates a dedicated store row and links it to the new user. Buyers without a store can open a store once via the seller dashboard (same one-store rule).
- **Admin**: Admin UI stays **account-less**; access is gated by a short **passkey** (default `admin`, overridable via `NEXT_PUBLIC_ADMIN_PASSKEY`) stored in `sessionStorage` after unlock — suitable for local/demo only.

## 4.1 Auth and Session
Local requirements:
- login/logout/me lifecycle;
- buyer vs seller derived from `storeId` on the user session (not from separate role enums unless added later);
- persisted session; optional future: expiry metadata.

Storage keys:
- `manzili_auth_session_v1`
- `manzili_auth_users_v1` (no seeded fake users required for core flows; demo catalog data may remain separate)

## 4.2 Stores and Products
Local requirements:
- seller can create/edit products **scoped to their store** (`storeId` on session);
- buyer can browse/filter/search products;
- stock and availability update locally.

Storage keys:
- `manzili_stores_v1`
- `manzili_products_v1`

## 4.3 Cart and Checkout
Local requirements:
- add/update/remove cart items;
- coupon apply/remove;
- checkout with both methods:
  - `COD`: immediate local order creation;
  - `STRIPE`: local simulated success path + persisted order.

Storage keys:
- `manzili_cart_v1`
- `manzili_checkout_drafts_v1`

## 4.4 Orders
Local requirements:
- persist buyer order history;
- store-owner view for own store orders;
- status progression guard rails (`ORDER_PLACED -> PROCESSING -> SHIPPED -> DELIVERED`).

Storage keys:
- `manzili_orders_v1`
- `manzili_order_items_v1`

## 4.5 Addresses
Local requirements:
- full CRUD for user addresses;
- default-address selection and validation.

Storage key:
- `manzili_addresses_v1`

## 4.6 Custom Requests and Collaboration
Local requirements:
- keep current request creation/list/detail working;
- add local offers/replies model so collaboration flow works without backend;
- preserve media data URLs as currently done.

Storage keys:
- `manzili_custom_requests_v1` (already used)
- `manzili_custom_request_offers_v1`

## 4.7 Coupons
Local requirements:
- local coupon validation and expiry checks;
- admin local coupon CRUD for testing promotions.

Storage key:
- `manzili_coupons_v1`

## 5) Data Consistency and Safety Standards

## 5.1 Versioned Storage Envelope
Use envelope for every key:
```json
{
  "version": 1,
  "updatedAt": "2026-05-12T00:00:00.000Z",
  "items": []
}
```

## 5.2 Migrations
- on app boot, run `migrateLocalStorage()` once;
- support `v1 -> v2` transforms per key;
- fallback: if corrupted JSON, quarantine old value then reinitialize safely.

## 5.3 Deterministic IDs and Timestamps
- ID format per domain: `ord_*`, `prd_*`, `cr_*` etc.
- All records include `createdAt`, `updatedAt`, optional `deletedAt`.

## 5.4 Merge and Precedence Rules
- in hybrid mode (api + local), local pending writes override stale API records by id/version.
- record-level `updatedAt` determines winner when both sources changed.

## 6) Modularity Rules (Non-Negotiable)
- no direct `localStorage` calls in pages/components.
- no `fetch` calls from UI for domain data paths.
- all IO goes through domain service contracts.
- adapters selected from one resolver:
  - `getProviderMode(): "local" | "api" | "hybrid"`.

## 7) Execution Sequence

Step 1:
- Introduce contract interfaces per domain.

Step 2:
- Implement missing local adapters with async APIs.

Step 3:
- Refactor pages to consume services only.

Step 4:
- Add hybrid resolver and merge policy.

Step 5:
- Add scenario tests for local mode.

## 8) Acceptance Gates

Gate A (Functional local mode):
- buyer journey works end-to-end: browse -> cart -> checkout -> order history;
- seller can manage products and see relevant orders;
- custom requests and collaboration basic cycle works locally.

Gate B (Modularity preserved):
- zero direct localStorage usage in UI code;
- zero domain `fetch` calls from UI;
- all domains expose async provider contracts.

Gate C (Backend swap readiness):
- adapter resolver can switch to `api` without page-level code changes;
- contract tests pass on local adapters.

## 9) Suggested File Organization
- `lib/contracts/*.ts` (or `.js` with JSDoc typedefs)
- `lib/services/*.ts`
- `lib/adapters/local/*.ts`
- `lib/adapters/api/*.ts`
- `lib/storage/migrations/*.ts`

## 10) Risks and Mitigations
- Risk: data loss from malformed local writes.
  - Mitigation: envelope + validation + guarded writes + backup on parse failure.
- Risk: API swap regressions due to sync/async mismatch.
  - Mitigation: enforce Promise-based contracts now.
- Risk: duplicate logic across adapters.
  - Mitigation: keep pure domain rules in shared service layer, adapters only do IO translation.
