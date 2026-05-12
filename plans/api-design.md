# Manzili API Design (Developer Spec)

## Scope
Core first, then expand. Keep contracts stable for `local` and `api` adapters.

## Global Rules
- Base path: `/api/v1`
- Auth: bearer or secure cookie session
- Content type: `application/json` (except file upload)
- Pagination: `?page=1&limit=20`
- Sorting: `?sortBy=createdAt&sortDir=desc`
- Idempotency required for checkout/payment writes via `Idempotency-Key`

### Response Contract
Success:
```json
{ "success": true, "data": {}, "meta": {}, "error": null }
```
Error:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": [] }
}
```

## Roles
- `BUYER`
- `SELLER`
- `ADMIN`

Enforce ownership on mutable resources and role guards per route group.

## Phase 1 (Core APIs)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/refresh`

Login request:
```json
{ "email": "user@example.com", "password": "secret" }
```

### Users + Addresses
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/addresses`
- `POST /users/me/addresses`
- `PATCH /users/me/addresses/{addressId}`
- `DELETE /users/me/addresses/{addressId}`

### Stores
- `GET /stores`
- `GET /stores/{storeId}`
- `POST /stores` (seller)
- `PATCH /stores/{storeId}` (owner/admin)
- `GET /stores/{storeId}/products`

### Products
- `GET /products`
- `GET /products/{productId}`
- `POST /products` (seller)
- `PATCH /products/{productId}` (owner/admin)
- `DELETE /products/{productId}` (owner/admin)

### Cart
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{itemId}`
- `DELETE /cart/items/{itemId}`
- `DELETE /cart`

Add-to-cart request:
```json
{ "productId": "prd_1", "quantity": 2 }
```

### Checkout + Orders
- `POST /checkout/validate`
- `POST /checkout/stripe-session`
- `POST /checkout/cod`
- `POST /checkout/confirm` (server-trusted only)
- `GET /orders`
- `GET /orders/{orderId}`
- `PATCH /orders/{orderId}/status` (seller/admin, constrained transitions)

Validate request:
```json
{ "addressId": "addr_1", "couponCode": "EID10", "paymentMethod": "STRIPE" }
```

### Coupons
- `GET /coupons/validate?code=EID10`
- `POST /admin/coupons` (admin)
- `PATCH /admin/coupons/{couponId}` (admin)
- `DELETE /admin/coupons/{couponId}` (admin)

### Custom Requests
- `GET /custom-requests`
- `POST /custom-requests`
- `GET /custom-requests/{requestId}`
- `PATCH /custom-requests/{requestId}`
- `POST /custom-requests/{requestId}/offers`
- `GET /custom-requests/{requestId}/offers`

Required fields supported by current UI:
- `itemName`, `description`, `images[]`, `visibility`, `category`, `quantity`, `material`, `deliveryDate`, `size`, `colors`, `voiceMemoUrl`

## Phase 2+ (Expansion APIs)

### Logistics
- `POST /shipments`
- `GET /shipments/{shipmentId}`
- `GET /shipments/by-order/{orderId}`
- `POST /shipments/webhooks/bosta`
- `POST /admin/shipments/{shipmentId}/retry-sync`

### Wallet
- `GET /seller/wallet`
- `GET /seller/wallet/transactions`
- `POST /admin/wallet/settlements`
- `POST /admin/wallet/adjustments`

### Admin + Moderation
- `GET /admin/stores/pending`
- `POST /admin/stores/{storeId}/approve`
- `POST /admin/stores/{storeId}/reject`
- `GET /admin/custom-requests/reports`
- `POST /admin/moderation/cases`

### Analytics
- `GET /admin/analytics/overview`
- `GET /seller/analytics/sales`
- `GET /seller/analytics/products`

## Iteration Order
1. Auth + catalog + cart + addresses
2. Checkout + orders
3. Custom requests lifecycle
4. Shipments + webhook sync
5. Wallet + admin + analytics

## Acceptance Gates
- Gate 1: all phase-1 routes defined with validation + auth + consistent envelopes
- Gate 2: checkout/order routes idempotent and status transitions enforced
- Gate 3: expansion routes documented with role ownership and service contracts

## Migration Notes (Current Code)
- Keep temporary aliases for existing routes under `app/api/checkout` and `app/api/custom-order` until frontend finishes adapter migration.
- Normalize legacy `{ success, requests }` custom-order payload in adapter layer.
