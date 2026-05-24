# Custom Request API Design

## Overview

This document defines all API endpoints and data structures for the custom request system. The system is **localStorage-based** in the current MVP, but this design is architecture-agnostic and can be adapted to REST/GraphQL backends.

---

## Table of Contents
1. [Core Data Structures](#core-data-structures)
2. [Request Management APIs](#request-management-apis)
3. [Offer Management APIs](#offer-management-apis)
4. [Payment APIs](#payment-apis)
5. [Chat & Messaging APIs](#chat--messaging-apis)
6. [Notification APIs](#notification-apis)
7. [Query/List APIs](#querylist-apis)
8. [Error Handling](#error-handling)

---

## Core Data Structures

### CustomRequest (Root Entity)
```typescript
interface CustomRequest {
  id: string;                           // "cr_xxxxx" unique ID
  ownerUserId: string;                  // Buyer's user ID
  
  // Content
  itemName: string;
  description: string;
  category?: string;
  
  // Images & media
  images: string[];                     // Array of data URLs or file paths
  voiceMemoDataUrl?: string;            // Optional voice memo (data URL)
  voiceMemoUrl?: string;                // Or URL reference
  
  // Specifications
  quantity: number;
  material?: string;
  size?: {
    length: string | number;
    width: string | number;
    height: string | number;
  };
  sizeMode?: "custom" | "package";      // How size is specified
  packageSize?: string;                 // e.g., "Large", "Medium"
  colors?: Array<{
    hex: string;                        // e.g., "#8B4513"
    name?: string;
    description?: string;
  }>;
  
  // Timeline
  deliveryDate: string;                 // ISO 8601 date
  
  // Association
  store?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
  };
  
  // Metadata
  visibility: "open" | "private";
  createdAt: string;                    // ISO 8601 timestamp
  updatedAt: string;                    // ISO 8601 timestamp
}
```

### Offer (Proposal Entity)
```typescript
interface Offer {
  id: string;                           // "cro_xxxxx" unique ID
  requestId: string;                    // FK to CustomRequest
  sellerId: string;                     // Seller's user ID
  sellerName: string;
  
  // Proposal details
  price: number;                        // EGP amount
  deliveryDate: string;                 // ISO 8601 date
  
  // Communication
  comments: Comment[];                  // Chronological message thread
  
  // Payment history (populated after acceptance)
  payments: Payment[];                  // Milestone payments recorded
  shippingAddress?: {
    id: string;
    name: string;
    bostaDistrictName?: string;
    bostaCityName?: string;
    state?: string;
    city?: string;
    zip?: string;
    // ... other address fields
  };
  paymentMethod?: "STRIPE" | "COD";
  
  // Lifecycle
  status: OfferStatus;                  // See enum below
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  firstPaidAt?: string;
  secondPaidAt?: string;
  progressUploadedAt?: string;
  readyToShipAt?: string;
  paidAt?: string;
  
  // Optional metadata
  sellerComment?: string;               // Note sent with proposal
  buyerComment?: string;                // Buyer's response (decline/accept)
}

enum OfferStatus {
  PENDING = "pending",                  // Sent, awaiting buyer
  DECLINED = "declined",                // Buyer declined
  BLOCKED = "blocked",                  // Buyer blocked seller (terminal)
  ACCEPTED = "accepted",                // Buyer accepted, awaiting 1st payment
  FIRST_PAID = "first_paid",            // 1st milestone paid
  PROGRESS_UPLOADED = "progress_uploaded", // (Big orders) 50% complete
  SECOND_PAID = "second_paid",          // 2nd milestone paid (big orders only)
  READY_TO_SHIP = "ready_to_ship",      // Seller marked complete
  PAID = "paid",                        // All milestones paid (terminal)
  SUPERSEDED = "superseded"             // Buyer accepted different offer
}
```

### Comment (Message in Thread)
```typescript
interface Comment {
  id: string;                           // "cmt_xxxxx" unique ID
  author: "seller" | "buyer";           // Who sent it
  text: string;                         // Message content
  createdAt: string;                    // ISO 8601 timestamp
}
```

### Payment (Milestone Record)
```typescript
interface Payment {
  id: string;                           // "pay_xxxxx" unique ID
  milestone: "first" | "second" | "final";
  amount: number;                       // EGP amount
  paymentMethod: "STRIPE" | "COD";
  address?: {                           // Only set for "final" milestone
    id: string;
    name: string;
    bostaDistrictName?: string;
    bostaCityName?: string;
    state?: string;
    city?: string;
    zip?: string;
  };
  paidAt: string;                       // ISO 8601 timestamp
}
```

### MilestoneSchedule (Derived)
```typescript
interface MilestoneSchedule {
  mode: "thirds" | "halves";            // Based on price
  first: number;                        // 1st milestone amount (EGP)
  second: number | null;                // 2nd milestone (null for halves mode)
  final: number;                        // 3rd/final milestone (EGP)
  total: number;                        // Sum of all milestones
}
```

---

## Request Management APIs

### 1. Create Custom Request
**Endpoint:** `POST /api/custom/requests`

**Caller:** Buyer

**Request Body:**
```typescript
{
  itemName: string;                     // Required
  description: string;                  // Required
  category?: string;
  images: string[];                     // Required, can be data URLs
  voiceMemoDataUrl?: string;
  quantity: number;
  material?: string;
  size?: { length: string; width: string; height: string };
  sizeMode?: "custom" | "package";
  packageSize?: string;
  colors?: Array<{ hex: string; name?: string }>;
  deliveryDate: string;                 // ISO 8601
  visibility: "open" | "private";
  store?: { id: string; name: string };
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: CustomRequest;
  error?: string;
}
```

**Side Effects:**
- Creates entry in custom_requests collection
- Returns newly created request with auto-generated ID

---

### 2. Get Custom Request by ID
**Endpoint:** `GET /api/custom/requests/:id`

**Caller:** Buyer or Seller

**Response:**
```typescript
{
  success: boolean;
  data?: CustomRequest;
  error?: string;
}
```

**Auth:** Public (any visitor can view)

---

### 3. Update Custom Request
**Endpoint:** `PUT /api/custom/requests/:id`

**Caller:** Buyer (owner) only

**Request Body:**
```typescript
{
  itemName?: string;
  description?: string;
  category?: string;
  images?: string[];
  // ... other fields (partial update)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: CustomRequest;
  error?: string;
}
```

**Validation:**
- Only owner (ownerUserId) can update
- Cannot update if any offer is in ACCEPTED/PAID state
- Return error: "Cannot edit request with active or completed offers"

---

### 4. List All Custom Requests
**Endpoint:** `GET /api/custom/requests?search=term&category=cat&ownership=mine&limit=50&offset=0`

**Caller:** Any authenticated user

**Query Parameters:**
- `search?: string` - Search itemName + description
- `category?: string` - Filter by category
- `ownership?: "all" | "mine"` - Filter to own requests
- `limit?: number` - Pagination (default 50)
- `offset?: number` - Pagination offset

**Response:**
```typescript
{
  success: boolean;
  data?: {
    requests: CustomRequest[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}
```

**Ordering:** Newest first (by createdAt DESC)

---

### 5. Delete Custom Request
**Endpoint:** `DELETE /api/custom/requests/:id`

**Caller:** Buyer (owner) only

**Validation:**
- Only owner can delete
- Cannot delete if offers exist in active states
- Return error: "Cannot delete request with active offers"

**Response:**
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## Offer Management APIs

### 1. Create Offer (Send Proposal)
**Endpoint:** `POST /api/custom/offers`

**Caller:** Seller (authenticated)

**Request Body:**
```typescript
{
  requestId: string;                    // Required
  price: number;                        // Required, > 0
  deliveryDate: string;                 // Required, ISO 8601
  sellerComment?: string;               // Optional note (≤240 chars)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Logic:**
1. Fetch request by ID (check it exists)
2. Check if seller already has pending/declined offer for this request
   - If yes: Replace it (update fields, carry over comments, append new seller comment)
   - If no: Create new offer
3. Set status = "pending"
4. Set comments = [optionally carry previous] + [new seller comment if provided]
5. Return offer with ID

**Side Effects:**
- Broadcast notification to request owner (buyer)
  - Type: "custom_proposal" or "custom_proposal_resend"
  - Message: "{sellerName} sent a proposal for '{itemName}'"
  - Link: `/custom/request-view/{requestId}`

---

### 2. Accept Offer
**Endpoint:** `PUT /api/custom/offers/:id/accept`

**Caller:** Buyer (request owner only)

**Request Body:**
```typescript
{
  buyerComment?: string;                // Optional note (≤240 chars)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Logic:**
1. Fetch offer by ID
2. Validate buyer is the request owner
3. Validate offer.status === "pending" (else error: "Offer already decided")
4. Set offer.status = "accepted"
5. Set offer.acceptedAt = now
6. Append buyer comment to offer.comments
7. **Mark all other offers for this request with status PENDING|DECLINED as SUPERSEDED**
8. Update offer.updatedAt

**Side Effects:**
- Broadcast notification to seller
  - Type: "custom_accepted"
  - Message: "{buyerName} accepted your proposal for '{itemName}'. Chat is now open."
  - Link: `/custom/negotiation/{requestId}`
- Unlock chat on `/custom/request-view/{requestId}`

---

### 3. Decline Offer
**Endpoint:** `PUT /api/custom/offers/:id/decline`

**Caller:** Buyer (request owner only)

**Request Body:**
```typescript
{
  buyerComment?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Logic:**
1. Fetch offer
2. Validate buyer is owner
3. Validate offer.status === "pending"
4. Set offer.status = "declined"
5. Append buyer comment
6. Update updatedAt

**Side Effects:**
- Broadcast notification to seller
  - Type: "custom_declined"
  - Message: "{buyerName} declined your proposal. You can resend an updated one."
  - Link: `/custom/negotiation/{requestId}`

---

### 4. Block Offer
**Endpoint:** `PUT /api/custom/offers/:id/block`

**Caller:** Buyer (request owner only)

**Request Body:**
```typescript
{
  buyerComment?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Logic:**
1. Fetch offer
2. Validate buyer is owner
3. Validate offer.status === "pending"
4. Set offer.status = "blocked"
5. Append buyer comment
6. Update updatedAt

**Side Effects:**
- Broadcast notification to seller
  - Type: "custom_blocked"
  - Message: "{buyerName} blocked further proposals for '{itemName}'."
  - Link: `/custom/negotiation/{requestId}`
- Seller can no longer interact with this request

**Terminal State:** Cannot be unblocked

---

### 5. Get Offer by ID
**Endpoint:** `GET /api/custom/offers/:id`

**Caller:** Authenticated user

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Auth:** Buyer of request or seller of offer can view

---

### 6. List Offers by Request ID
**Endpoint:** `GET /api/custom/requests/:requestId/offers?status=pending`

**Caller:** Buyer (owner) or any seller who sent proposal

**Query Parameters:**
- `status?: string` - Filter by status (e.g., "pending", "accepted")

**Response:**
```typescript
{
  success: boolean;
  data?: {
    offers: Offer[];
  };
  error?: string;
}
```

**Ordering:** Newest first (by createdAt DESC)

**Visibility Rules:**
- Buyer can see all offers for their request
- Seller can see only their own offers for requests
- Non-authenticated users: 403 Forbidden

---

### 7. List Offers by Seller ID
**Endpoint:** `GET /api/custom/sellers/:sellerId/offers?limit=50&offset=0`

**Caller:** Authenticated seller (self) or admins

**Response:**
```typescript
{
  success: boolean;
  data?: {
    offers: Offer[];
    total: number;
  };
  error?: string;
}
```

**Ordering:** Most recently updated first (by updatedAt DESC)

**Visibility:** Only own offers (sellerId must match currentUserId)

---

---

## Payment APIs

### 1. Record Milestone Payment
**Endpoint:** `PUT /api/custom/offers/:id/pay`

**Caller:** Buyer (request owner) only

**Request Body:**
```typescript
{
  milestone: "first" | "second" | "final";  // Required
  amount: number;                           // Required
  paymentMethod: "STRIPE" | "COD";          // Required
  address?: {                               // Required for "final"
    id?: string;                            // ID if selecting existing
    name: string;
    bostaDistrictName?: string;
    bostaCityName?: string;
    state?: string;
    city?: string;
    zip?: string;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Validation:**
1. Offer status must match milestone:
   - "first" → status === "accepted"
   - "second" → status === "progress_uploaded"
   - "final" → status === "ready_to_ship"
2. Amount must match milestone schedule (call getMilestoneSchedule(offer.price))
3. For "final": address is required
4. No duplicate payments: Check payment.milestone not already in offer.payments

**Logic:**
1. Create Payment record with paidAt = now
2. Append to offer.payments array
3. Update offer.status based on milestone:
   - "first" → "first_paid"
   - "second" → "second_paid"
   - "final" → "paid"
4. For final only: Set offer.shippingAddress = address
5. Set appropriate *PaidAt timestamp (firstPaidAt, secondPaidAt, paidAt)
6. Update updatedAt

**Side Effects:**
- Broadcast notification to seller
  - Type: "custom_paid"
  - Message: "{buyerName} paid for '{itemName}'. {Next action: start/continue working or ship}"
  - Link: `/custom/negotiation/{requestId}`
- Payment processing (call Stripe or gateway, in production)

---

### 2. Get Milestone Schedule
**Endpoint:** `GET /api/custom/offers/:id/milestones`

**Caller:** Any (public)

**Response:**
```typescript
{
  success: boolean;
  data?: {
    schedule: MilestoneSchedule;
    nextMilestone: {
      key: "first" | "second" | "final" | null;
      amount: number;
    };
    paidTotal: number;
    remainingTotal: number;
  };
  error?: string;
}
```

**Logic:**
```javascript
const schedule = getMilestoneSchedule(offer.price);
const paidTotal = offer.payments.reduce((s, p) => s + p.amount, 0);
const nextMilestone = getNextMilestone(offer);  // Returns {key, amount} or null
```

---

### 3. Mark Progress Uploaded
**Endpoint:** `PUT /api/custom/offers/:id/progress-uploaded`

**Caller:** Seller only

**Request Body:** (empty)

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Validation:**
- Offer must exist
- Offer.status === "first_paid"
- Only for large orders (price > 1000 EGP threshold)
- Seller must own offer

**Logic:**
1. Set offer.status = "progress_uploaded"
2. Set offer.progressUploadedAt = now
3. Update updatedAt

**Side Effects:**
- Broadcast notification to buyer
  - Type: "custom_progress"
  - Message: "Seller marked work 50% complete. Second payment now due."
  - Link: `/custom/request-view/{requestId}`

---

### 4. Mark Ready to Ship
**Endpoint:** `PUT /api/custom/offers/:id/ready-to-ship`

**Caller:** Seller only

**Request Body:** (empty)

**Response:**
```typescript
{
  success: boolean;
  data?: Offer;
  error?: string;
}
```

**Validation:**
- Offer must exist
- Offer.status === "first_paid" (small orders) OR "second_paid" (large orders)
- Seller must own offer

**Logic:**
1. Set offer.status = "ready_to_ship"
2. Set offer.readyToShipAt = now
3. Update updatedAt

**Side Effects:**
- Broadcast notification to buyer
  - Type: "custom_ready"
  - Message: "Seller marked ready to ship. Add address and pay final to finalize."
  - Link: `/custom/request-view/{requestId}`

---

---

## Chat & Messaging APIs

### 1. Append Message to Offer Chat
**Endpoint:** `POST /api/custom/offers/:id/messages`

**Caller:** Buyer or Seller who owns offer

**Request Body:**
```typescript
{
  author: "buyer" | "seller";           // Determined by caller
  text: string;                         // Required, max 2000 chars
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    comment: Comment;
    offer: Offer;
  };
  error?: string;
}
```

**Validation:**
- Offer status must allow chat (in ACTIVE_DEAL_STATUSES)
- Text must not be empty
- Caller must be buyer of request OR seller of offer

**Logic:**
1. Create Comment with id, author, text, createdAt
2. Append to offer.comments
3. Update offer.updatedAt
4. Return comment + updated offer

**Side Effects:**
- If sender is buyer: Notify seller
- If sender is seller: Notify buyer

---

### 2. Get Chat History
**Endpoint:** `GET /api/custom/offers/:id/messages`

**Caller:** Authenticated buyer or seller

**Response:**
```typescript
{
  success: boolean;
  data?: {
    messages: Comment[];           // Includes intro description
    offer: Offer;
  };
  error?: string;
}
```

**Logic:**
1. Fetch offer
2. Return offer.comments in chronological order
3. Prepend intro message (buyer's request description)

**Visibility:** Buyer or seller of this offer only

---

---

## Notification APIs

### 1. Notify Proposal Sent
**Internal Trigger:** After `addOfferToRequest`

**Payload:**
```typescript
{
  recipientUserId: string;              // Buyer
  type: "custom_proposal" | "custom_proposal_resend";
  title: string;
  message: string;
  href: string;                         // "/custom/request-view/{requestId}"
  metadata: {
    requestId: string;
    offerId: string;
    sellerId: string;
    sellerName: string;
    isResend: boolean;
  };
}
```

---

### 2. Notify Offer Accepted
**Internal Trigger:** After `acceptOffer`

**Payload:**
```typescript
{
  recipientUserId: string;              // Seller
  type: "custom_accepted";
  title: "Proposal accepted";
  message: "{buyerName} accepted your proposal for '{itemName}'. Chat is open.";
  href: "/custom/negotiation/{requestId}";
  metadata: {
    requestId: string;
    offerId: string;
    buyerId: string;
    buyerName: string;
  };
}
```

---

### 3. Notify Offer Declined
**Internal Trigger:** After `declineOffer`

**Payload:**
```typescript
{
  recipientUserId: string;              // Seller
  type: "custom_declined";
  title: "Proposal declined";
  message: "{buyerName} declined your proposal. You can resend an updated one.";
  href: "/custom/negotiation/{requestId}";
  metadata: {
    requestId: string;
    offerId: string;
  };
}
```

---

### 4. Notify Offer Blocked
**Internal Trigger:** After `blockOffer`

**Payload:**
```typescript
{
  recipientUserId: string;              // Seller
  type: "custom_blocked";
  title: "Proposals blocked";
  message: "{buyerName} blocked further proposals on '{itemName}'.";
  href: "/custom/negotiation/{requestId}";
  metadata: {
    requestId: string;
    offerId: string;
  };
}
```

---

### 5. Notify Order Paid
**Internal Trigger:** After `recordOfferPayment`

**Payload:**
```typescript
{
  recipientUserId: string;              // Seller
  type: "custom_paid";
  title: "Buyer paid";
  message: "{buyerName} paid for '{itemName}'. {action based on milestone}";
  href: "/custom/negotiation/{requestId}";
  metadata: {
    requestId: string;
    offerId: string;
    milestone: "first" | "second" | "final";
    amount: number;
  };
}
```

---

### 6. Notify Ready to Ship
**Internal Trigger:** After `markOfferReadyToShip`

**Payload:**
```typescript
{
  recipientUserId: string;              // Buyer
  type: "custom_ready";
  title: "Order ready to ship";
  message: "{sellerName} marked '{itemName}' ready. Add address and pay final.";
  href: "/custom/request-view/{requestId}";
  metadata: {
    requestId: string;
    offerId: string;
    sellerId: string;
  };
}
```

---

## Query/List APIs

### Helper: Get Next Milestone
**Internal Function** (not exposed as endpoint, used by frontend)

```typescript
function getNextMilestone(offer: Offer): {
  key: "first" | "second" | "final" | null;
  amount: number;
} | null {
  const sched = getMilestoneSchedule(offer.price);
  switch (offer.status) {
    case "accepted":
      return { key: "first", amount: sched.first };
    case "progress_uploaded":
      return { key: "second", amount: sched.second };
    case "ready_to_ship":
      return { key: "final", amount: sched.final };
    default:
      return null;
  }
}
```

### Helper: Get Paid Total
**Internal Function** (not exposed as endpoint)

```typescript
function getPaidTotal(offer: Offer): number {
  return (offer.payments || []).reduce((sum, p) => sum + p.amount, 0);
}
```

### Get Active Deal Offer
**Endpoint:** `GET /api/custom/requests/:requestId/active-offer`

**Caller:** Buyer or seller

**Response:**
```typescript
{
  success: boolean;
  data?: Offer | null;                  // null if no active deal
  error?: string;
}
```

**Logic:**
- Return first offer with status in {ACCEPTED, FIRST_PAID, PROGRESS_UPLOADED, SECOND_PAID, READY_TO_SHIP, PAID}
- null if none found

---

---

## Error Handling

### Standard Error Response
```typescript
{
  success: false;
  error: string;
  code?: string;
  details?: any;
}
```

### Error Codes & Messages

| Code | HTTP | Message | Trigger |
|------|------|---------|---------|
| `UNAUTHORIZED` | 401 | "You must be signed in" | Missing auth token |
| `FORBIDDEN` | 403 | "You don't have permission" | Accessing other user's data |
| `NOT_FOUND` | 404 | "Request/offer not found" | ID doesn't exist |
| `VALIDATION_ERROR` | 400 | "Invalid request: {field}" | Bad input data |
| `OFFER_ALREADY_DECIDED` | 400 | "Offer already decided" | Accepting non-pending offer |
| `INVALID_STATE_TRANSITION` | 400 | "Cannot transition from {current} to {target}" | Wrong status for operation |
| `ADDRESS_REQUIRED` | 400 | "Address required for final payment" | Final payment without address |
| `DUPLICATE_PAYMENT` | 400 | "This milestone already paid" | Paying same milestone twice |
| `SELLER_BLOCKED` | 403 | "You are blocked for this request" | Blocked seller trying to resend |
| `EDIT_NOT_ALLOWED` | 400 | "Cannot edit request with active offers" | Updating request with accepted offer |
| `INTERNAL_ERROR` | 500 | "An error occurred" | Server-side crash |

### Validation Rules

**Create Request:**
- itemName: required, 3-500 chars
- description: required, 10-5000 chars
- images: required, 1-10 items, each must be data URL or valid path
- deliveryDate: required, must be future date
- quantity: required, integer > 0

**Send Proposal:**
- price: required, > 0, ≤ 1,000,000
- deliveryDate: required, ISO 8601 format
- sellerComment: optional, max 240 chars

**Accept/Decline/Block:**
- buyerComment: optional, max 240 chars

**Send Message:**
- text: required, 1-2000 chars, not all whitespace

---

## Backend Implementation Notes (Future)

If migrating to REST/GraphQL backend:

### Expected Endpoints Summary
```
POST   /api/custom/requests
GET    /api/custom/requests
GET    /api/custom/requests/:id
PUT    /api/custom/requests/:id
DELETE /api/custom/requests/:id

POST   /api/custom/offers
GET    /api/custom/offers/:id
GET    /api/custom/requests/:requestId/offers
GET    /api/custom/sellers/:sellerId/offers
PUT    /api/custom/offers/:id/accept
PUT    /api/custom/offers/:id/decline
PUT    /api/custom/offers/:id/block

PUT    /api/custom/offers/:id/pay
PUT    /api/custom/offers/:id/progress-uploaded
PUT    /api/custom/offers/:id/ready-to-ship
GET    /api/custom/offers/:id/milestones

POST   /api/custom/offers/:id/messages
GET    /api/custom/offers/:id/messages

GET    /api/custom/requests/:requestId/active-offer
```

### Database Schema (SQL Example)
```sql
CREATE TABLE custom_requests (
  id VARCHAR(20) PRIMARY KEY,
  owner_user_id VARCHAR(50) NOT NULL,
  item_name VARCHAR(500),
  description TEXT,
  category VARCHAR(100),
  images JSON,                          -- Array of URLs
  quantity INT,
  material VARCHAR(200),
  size JSON,                            -- {length, width, height}
  delivery_date DATE,
  visibility ENUM('open', 'private'),
  store_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offers (
  id VARCHAR(20) PRIMARY KEY,
  request_id VARCHAR(20) FOREIGN KEY,
  seller_id VARCHAR(50),
  seller_name VARCHAR(200),
  price DECIMAL(10, 2),
  delivery_date DATE,
  status ENUM(...),
  comments JSON,                        -- Array of {id, author, text, createdAt}
  payments JSON,                        -- Array of {id, milestone, amount, ...}
  shipping_address JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  accepted_at TIMESTAMP,
  first_paid_at TIMESTAMP,
  second_paid_at TIMESTAMP,
  ready_to_ship_at TIMESTAMP,
  paid_at TIMESTAMP,
  INDEX (request_id, seller_id),
  INDEX (seller_id, updated_at)
);

CREATE TABLE comments (
  id VARCHAR(20) PRIMARY KEY,
  offer_id VARCHAR(20) FOREIGN KEY,
  author ENUM('buyer', 'seller'),
  text TEXT,
  created_at TIMESTAMP
);

CREATE TABLE payments (
  id VARCHAR(20) PRIMARY KEY,
  offer_id VARCHAR(20) FOREIGN KEY,
  milestone ENUM('first', 'second', 'final'),
  amount DECIMAL(10, 2),
  payment_method VARCHAR(50),
  address JSON,
  paid_at TIMESTAMP
);
```

---

## Concurrency & Conflict Resolution

### Conflict: Multiple Sellers Sending Proposals
- **Last-write-wins** for non-active offers
- Each seller can have max 1 pending/declined offer per request
- Resend replaces previous, preserving comments

### Conflict: Buyer Accepting While Seller Sends Message
- Message append should succeed
- Accept should supersede other offers before message is processed
- Frontend should refresh after each action to sync state

### Conflict: Double-Click Payment
- Validate payment.milestone not in payments array (catch duplicate)
- Return 400 error if already paid
- Frontend should disable button during processing

---

## Rate Limiting Suggestions

```
POST /api/custom/offers          → 10 req/min per seller
PUT  /api/custom/offers/*/accept → 50 req/min per buyer
POST /api/custom/offers/*/messages → 30 req/min per user
```

---

## API Response Time Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Create request | < 200ms | No images; async later |
| List requests | < 300ms | Paginated, indexed queries |
| Send proposal | < 150ms | Simple insert |
| Accept offer | < 200ms | Update + notification |
| Record payment | < 250ms | Includes gateway call (simulated) |
| Send message | < 150ms | Append to array |

---

## Summary by User Role

### Buyer Endpoints
```
✅ Create, read, update, delete own requests
✅ Accept/decline/block offers
✅ Record milestone payments
✅ Send & read messages
✅ View all offers for own request
```

### Seller Endpoints
```
✅ View all requests
✅ Send offers (propose on requests)
✅ Resend after decline
✅ Mark progress uploaded
✅ Mark ready to ship
✅ Send & read messages
✅ View own offers list
```

### Admin Endpoints (Not covered here)
```
✅ View all requests/offers
✅ Moderate content
✅ View transactions
✅ Generate reports
```
