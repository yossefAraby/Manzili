# Manzili Backend Migration Roadmap (Local Adapters -> Real API)

## 1) Goal
Migrate from local-storage-driven functionality to backend APIs in incremental waves with stable UI behavior, measurable gates, and rollback safety.

## 2) Migration Principles
- do not rewrite UI pages per domain migration;
- switch adapters through configuration, not component changes;
- run same contract tests against both local and API adapters;
- migrate high-value domains first, high-risk domains with tighter controls.

## 3) Runtime Mode Strategy

Mode options:
- `local`: all domains use local adapters.
- `hybrid`: selected domains use API adapters while others remain local.
- `api`: all migrated domains use backend APIs by default.

Suggested flag strategy:
- `NEXT_PUBLIC_DATA_MODE=local|hybrid|api`
- domain override flags:
  - `NEXT_PUBLIC_MODE_AUTH`
  - `NEXT_PUBLIC_MODE_PRODUCTS`
  - `NEXT_PUBLIC_MODE_CART`
  - `NEXT_PUBLIC_MODE_ORDERS`
  - `NEXT_PUBLIC_MODE_CUSTOM_REQUESTS`

## 4) Wave Plan

## Wave 0 - Foundation and Safety Net
Scope:
- establish service contracts and adapter resolver;
- add contract test harness (run against local and mock API);
- introduce centralized error mapping.

Deliverables:
- domain contracts in `lib/contracts`;
- resolver in `lib/services/providerResolver`;
- shared DTO validation layer.

Acceptance gate:
- all domains compile against contracts;
- local adapters pass baseline contract tests.

Rollback:
- default mode remains `local`.

## Wave 1 - Identity and Catalog
Scope:
- auth/session, users/profile, stores, products.

Execution:
- implement API adapters for these domains;
- keep cart/orders/custom requests on local mode;
- enable with flags in staging first.

Acceptance gate:
- login/logout/profile parity validated;
- product browse/search/filter parity validated;
- no UI-level code changes required to toggle mode.

Rollback:
- switch affected domain flags back to `local`.

## Wave 2 - Cart, Checkout, Orders
Scope:
- cart CRUD, coupon validation, checkout, order persistence.

Execution:
- API adapters + idempotency support for checkout confirmations;
- dual-write option (temporary) for audit in hybrid mode;
- strict status transition validation server-side.

Acceptance gate:
- checkout success rates stable in staging;
- order history parity between local and api modes;
- contract + scenario tests pass for COD and Stripe.

Rollback:
- restore cart/orders flags to local, keep created API orders intact.

## Wave 3 - Custom Requests Collaboration
Scope:
- custom requests create/list/detail and offer/reply lifecycle.

Execution:
- API endpoints replace mock route behavior;
- migration script imports local request data where needed;
- maintain compatibility with existing request fields.

Acceptance gate:
- custom request journey works in api mode end-to-end;
- collaboration records durable and role permissions enforced.

Rollback:
- switch custom-request domain flag to local.

## Wave 4 - Logistics and Wallet
Scope:
- shipment orchestration (Bosta abstraction), webhook ingestion, wallet transactions.

Execution:
- build operation services with idempotent webhook handling;
- introduce seller wallet views and admin settlement actions;
- harden observability and audit logs.

Acceptance gate:
- shipment lifecycle updates from webhook to UI;
- wallet posting invariants hold under retries.

Rollback:
- disable operations flags; keep core commerce on API.

## Wave 5 - Admin Hardening and Local Deprecation
Scope:
- moderation/admin tools, analytics APIs, local adapter retirement.

Execution:
- remove direct local domain writes except optional dev-only mock mode;
- finalize data migration/backfill jobs;
- archive compatibility shims.

Acceptance gate:
- production runs with `api` mode by default;
- local mode restricted to development/testing only.

Rollback:
- emergency fallback profile can re-enable selected local adapters in non-prod.

## 5) Contract-Test Parity Strategy

For each domain, define a shared test suite:
- `shouldCreateEntity`
- `shouldListEntities`
- `shouldHandleNotFound`
- `shouldEnforceValidation`
- `shouldRespectAuthorization`

Run matrix:
- local adapter suite;
- API adapter suite against staging test DB;
- hybrid smoke tests for cross-domain flow.

Release requirement:
- parity score 100 percent for migrated domain before promotion.

## 6) Data Migration Strategy

### Local -> API bootstrap
- export utility to read versioned local envelopes;
- map to API DTOs and import in batches;
- write import reports (created, skipped, conflicts).

### Conflict policy
- if same id exists:
  - latest `updatedAt` wins for mutable fields;
  - immutable fields (creator, createdAt) preserved from earliest valid source.

### Safety
- dry-run mode before any write;
- idempotent import job using deterministic external keys.

## 7) Observability and Operations
- correlation id in all API logs;
- per-domain error dashboards;
- migration counters:
  - requests per mode (local/hybrid/api),
  - contract-test pass trend,
  - user-facing error rate.

Operational checks per release:
- no spike in checkout failures;
- no missing orders in seller or buyer dashboards;
- no increase in unauthorized access responses due to policy mistakes.

## 8) Timeline Template
- Week 1: Wave 0
- Week 2: Wave 1
- Week 3-4: Wave 2
- Week 5: Wave 3
- Week 6-7: Wave 4
- Week 8: Wave 5 and cleanup

This timeline is adjustable; each wave exits only after acceptance gate is met.

## 9) Final Exit Criteria
- all primary user journeys run on API adapters in production;
- local adapters remain only for tests/dev;
- zero domain regressions compared to local baseline;
- migration runbook and rollback procedures documented and practiced.
