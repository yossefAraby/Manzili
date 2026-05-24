# Custom Request Flow Documentation

## Overview

The custom request system is a **negotiation-based marketplace** where:
- **BUYER** creates a custom request and receives proposals from sellers
- **SELLER** views requests and sends proposals to buyers
- Both parties **communicate and negotiate** until a deal is struck
- Once accepted, a **milestone-based payment system** kicks in

---

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Buyer Flow: Request View](#buyer-flow-request-view)
3. [Seller Flow: Negotiation View](#seller-flow-negotiation-view)
4. [State Machine & Status Lifecycle](#state-machine--status-lifecycle)
5. [Milestone Payment System](#milestone-payment-system)
6. [Key Interactions](#key-interactions)

---

## Core Concepts

### Request Entity
A custom request is the **root document** created by a buyer:
```
{
  id: "cr_xxxxx",
  ownerUserId: "user_123",
  itemName: "Custom wooden shelf",
  description: "A 100cm shelf with geometric design",
  category: "Woodworking",
  visibility: "open" | "private",
  
  // Images & media
  images: [...data URLs or file paths...],
  voiceMemoDataUrl: "data:audio/...",
  
  // Specifications
  quantity: 1,
  material: "Walnut wood",
  size: { length: 100, width: 30, height: 20 },
  sizeMode: "custom" | "package",
  packageSize: "Large",
  colors: [{ hex: "#8B4513", name: "Walnut" }],
  
  // Timeline
  deliveryDate: "2024-12-25",
  createdAt: "2024-10-01T10:00:00Z",
  updatedAt: "2024-10-05T15:30:00Z",
  
  // Associated store (optional)
  store: { id: "store_1", name: "My Shop" },
  user: { id: "user_123", name: "Ahmed" }
}
```

### Offer Entity
A **proposal from a seller** responding to a request:
```
{
  id: "cro_xxxxx",
  requestId: "cr_xxxxx",
  sellerId: "seller_456",
  sellerName: "Karim",
  
  // Proposal details
  price: 1500,           // EGP
  deliveryDate: "2024-12-20",
  
  // Communication thread
  comments: [
    {
      id: "cmt_1",
      author: "seller",  // or "buyer"
      text: "I can do this in walnut for 1500 EGP",
      createdAt: "2024-10-02T09:00:00Z"
    },
    {
      id: "cmt_2",
      author: "buyer",
      text: "Can you do it in oak instead?",
      createdAt: "2024-10-02T10:30:00Z"
    }
  ],
  
  // Payment history (only populated after acceptance)
  payments: [
    {
      id: "pay_1",
      milestone: "first",    // "first" | "second" | "final"
      amount: 500,
      paymentMethod: "STRIPE",
      address: null,         // Only set on "final"
      paidAt: "2024-10-10T14:00:00Z"
    }
  ],
  
  // Lifecycle timestamps
  status: "accepted",        // See status lifecycle below
  createdAt: "2024-10-02T09:00:00Z",
  updatedAt: "2024-10-05T15:30:00Z",
  acceptedAt: "2024-10-05T10:00:00Z",
  firstPaidAt: "2024-10-10T14:00:00Z",
  shippingAddress: { ... }  // Captured on final payment
}
```

---

## Buyer Flow: Request View

**Page:** `/custom/request-view/[id]`

### 1. Initial Load
```
┌─ Buyer visits request page
├─ Load request by ID
├─ Load all offers for this request
└─ Display request details + proposals
```

**What the buyer sees:**

#### Phase A: No Accepted Offer Yet
The page shows **three zones**:
1. **Full Details** (top, full-width)
   - Main image gallery
   - Request title, description, specs (quantity, material, size, delivery date)
   - Colors with hex values (clickable to copy)
   - Voice memo playback

2. **Inbound Proposals** (below details)
   - List of pending/declined/blocked proposals from sellers
   - Each proposal card shows:
     - Seller avatar & name
     - Price quote
     - Suggested delivery date
     - Previous conversation history (back-and-forth comments)
     - **Buyer's reply textarea** (optional note to include when accepting/declining)
     - **Action buttons**: Accept, Decline, Block (triple-tap to confirm)

#### Phase B: Offer Accepted
Layout switches to **3-column grid** (on desktop):
1. **Chat Card** (left, 2/3 width)
   - Header with main image, offer status badge
   - Message thread (intro description + all comments)
   - Input form to send messages

2. **Compact Details Rail** (right, 1/3 width)
   - Small hero image with thumbnail strip
   - Delivery deadline countdown
   - Description, specs, colors (compact)

3. **Payment Card** (top, full-width, when milestone due)
   - Shows which milestone is active (1st/2nd/final)
   - Visual milestone strip with dots (green=paid, amber=due, gray=upcoming)
   - If final milestone: address selector + payment method
   - Summary: item, seller, subtotal, already paid, amount due now
   - **Pay button**

**Banners that appear:**
- ✅ "First payment cleared — seller is working" (when `status === FIRST_PAID`)
- ✅ "Second payment cleared — seller is finishing up" (when `status === SECOND_PAID`)
- ✅ "Order finalized" (when `status === PAID`)

### 2. Proposal Interaction

#### Accept Flow
```
Buyer sees proposal → Clicks "Accept" button
    ↓
Show reply textarea (optional)
    ↓
handleAccept(offer, {buyerComment})
    ├─ Appends buyer comment to offer.comments
    ├─ Sets offer.status = "accepted"
    ├─ Auto-rejects all other pending/declined offers → "superseded"
    ├─ Sets offer.acceptedAt = now
    └─ Broadcasts notification to seller
    
Result: Chat unlocks, payment card appears
```

#### Decline Flow
```
Buyer → "Decline" button
    ↓
handleDecline(offer, {buyerComment})
    ├─ Appends buyer comment
    ├─ Sets offer.status = "declined"
    └─ Seller can resend a new proposal
    
Result: Offer stays visible but grayed out, buyer can see other proposals
```

#### Block Flow (Triple-Tap Confirmation)
```
Buyer → "Block" button (tap 1)
    ├─ UI shows "Tap twice more to confirm"
    ↓
Second tap
    ├─ UI shows "Tap once more to confirm"
    ↓
Third tap
    ├─ handleBlock(offer, {buyerComment})
    │   ├─ Sets offer.status = "blocked"
    │   ├─ 4s auto-reset timer
    │   └─ Broadcast notification to seller (terminal)
    └─ Offer removed from proposals list
```

### 3. Payment Flow

Once offer is accepted, buyer must pay in **stages**:

#### Stage 1: First Payment (on Accept)
```
Offer status: "accepted"
nextMilestone: { key: "first", amount: schedule.first }

Buyer clicks "Pay first installment" 
    ├─ recordOfferPayment(offerId, {
    │   milestone: "first",
    │   amount: schedule.first,
    │   paymentMethod: "STRIPE"
    │ })
    ├─ Creates payment record
    ├─ Sets offer.status = "first_paid"
    ├─ Notify seller: "Buyer paid — you can start working"
    └─ Payment card disappears, "waiting on seller" banner appears
```

#### Stage 2: Second Payment (Large Orders Only)
```
Offer price > 1000 EGP → 3-milestone system (thirds)
Offer price ≤ 1000 EGP → 2-milestone system (halves, skip this stage)

Triggered when: Seller marks progress upload
Offer status: "progress_uploaded"
nextMilestone: { key: "second", amount: schedule.second }

Same flow as Stage 1
Notify seller: "Buyer paid 2nd — continue working"
```

#### Stage 3: Final Payment (Ship)
```
Triggered when: Seller marks "ready_to_ship"
Offer status: "ready_to_ship"
nextMilestone: { key: "final", amount: schedule.final }

Buyer MUST:
  1. Select or add shipping address
  2. Confirm payment method (Stripe only in MVP)
  
handlePay() 
    ├─ Validates address is set
    ├─ recordOfferPayment(offerId, {
    │   milestone: "final",
    │   amount: schedule.final,
    │   paymentMethod: "STRIPE",
    │   address: selectedAddress  ← Captured here only
    │ })
    ├─ Sets offer.status = "paid"
    ├─ Sets offer.shippingAddress = address
    ├─ Notify seller: "Buyer paid final — ship to saved address"
    └─ Green "Order finalized" banner shows
```

### 4. Chat System
Once offer accepted, **full chat unlocks**:

```
Message Structure:
{
  id: timestamp,
  sender: "buyer",
  text: "Can you start Monday?",
  time: "14:30"
}

Flow:
1. Buyer types → setMessageInput()
2. Submit form → handleSendMessage()
3. Append message to local UI immediately
4. Call appendOfferChatMessage(offerId, {author: "buyer", text})
5. Message persisted in offer.comments
```

---

## Seller Flow: Negotiation View

**Page:** `/custom/negotiation/[id]`

### 1. Initial Load
Seller views a request they're interested in proposing on.

**What seller sees:**

#### Phase A: No Proposal Sent Yet
- **Request Details** (center/main)
  - Full image gallery
  - Item name, category, description
  - Specs: quantity, material, size, colors
  - Buyer's deadline
  
- **Proposal Card** (bottom)
  - Price input (empty)
  - Delivery date input
  - Toggle: "Accept buyer's date" (auto-fills from request.deliveryDate)
  - Note textarea for seller comment (optional)
  - **Send Proposal** button

#### Phase B: Proposal Sent (Status = "Pending")
- Chat remains **locked**
- Proposal card shows:
  - **Status badge**: "Awaiting buyer response" (animated dots)
  - Price & date are **disabled** (can't edit)
  - Conversation history visible on card
  - **Button**: Disabled loading state

#### Phase C: Buyer Rejected or Resending
- If buyer **declined**: 
  - Status badge: "Declined"
  - Inputs unlock again
  - Button becomes: "Resend proposal"
  - Previous comments still visible (context preserved)
  
- If buyer **blocked**:
  - Status badge: "Blocked"
  - All inputs locked
  - Button: "Blocked by buyer" (disabled)
  - Cannot resend

#### Phase D: Buyer Accepted
- **Chat Unlocks** (full 3-column layout)
  - Chat card fills left side
  - Details card on right
  - Proposal card below details
  
- Status badge: "Accepted"
- Conversation history moved into chat
- Inputs disabled (price/date locked)
- New button: **"Order ready to ship"** (with triple-tap confirmation)

#### Phase E: Seller Marks "Ready to Ship"
- Button state: Armed (tap 1) → "Tap twice more" (tap 2) → "Tap once more" (tap 3) → Commit
- Auto-resets after 4s inactivity
- On 3rd tap: `markOfferReadyToShip(offerId)`
  - Sets status = "ready_to_ship"
  - Notify buyer: "Seller marked ready to ship"
  - Button becomes: "Waiting for buyer payment"

#### Phase F: Buyer Paid Final
- Status badge: "Paid"
- Button: "Paid · ready to ship" (disabled, final state)
- Shows message: "Buyer paid — ship to the saved address"
- Seller can see address in offer.shippingAddress

### 2. Proposal Sending

```
Seller fills form:
  ├─ proposedPrice: "1500"
  ├─ proposedDate: "2024-12-20"
  ├─ acceptBuyerDate: true  (uses request.deliveryDate)
  └─ sellerComment: "I can do this in 2 weeks..."

Click "Send Proposal"
    ↓
Validation:
    ├─ Seller must be signed in
    ├─ Price > 0
    ├─ Delivery date set
    └─ Comment optional
    
handleSendProposal()
    ├─ isResend = Boolean(offer)  ← Check if update or new
    ├─ addOfferToRequest(requestId, {
    │   sellerId,
    │   sellerName,
    │   price,
    │   deliveryDate,
    │   sellerComment
    │ })
    │
    │ (If same seller resends, old pending/declined offer is replaced)
    │ (Comments carry forward so buyer sees conversation history)
    │
    ├─ Sets status = "pending"
    ├─ Notify buyer: "{sellerName} sent a proposal"
    └─ UI shows "Awaiting buyer response" state
```

### 3. Conversation Thread

**Before acceptance:** Comments live on the **proposal card**
```
[Seller message]
↓ (buyer reads & comments back)
[Buyer message]
↓ (seller resends with updated price/note)
[Seller message (resend)]
```

**After acceptance:** Comments move to **chat**
```
1. Intro message (buyer's original description)
2. All previous comments in chronological order
3. New messages go to offer.comments & display in chat
```

### 4. Milestone Workflow (From Seller Perspective)

For seller, milestones trigger **status transitions**:

#### For Large Orders (price > 1000 EGP): Thirds System
```
accepted
    ↓ (buyer pays 1st)
first_paid
    ↓ (seller marks "progress uploaded" - manual action)
progress_uploaded
    ↓ (buyer pays 2nd)
second_paid
    ↓ (seller marks "ready to ship")
ready_to_ship
    ↓ (buyer pays final + address)
paid (terminal)
```

**Seller Action Points:**
1. After `first_paid` → Can mark `progress_uploaded` (via seller dashboard, not this page)
2. After `second_paid` → Marks `ready_to_ship` via **triple-tap button on this page**
3. Awaits `paid` state

#### For Small Orders (price ≤ 1000 EGP): Halves System
```
accepted
    ↓ (buyer pays 1st)
first_paid
    ↓ (seller marks "ready to ship")
ready_to_ship
    ↓ (buyer pays final + address)
paid (terminal)
```

**Seller Action Point:**
- After `first_paid` → Marks `ready_to_ship` immediately (no middle step)

---

## State Machine & Status Lifecycle

### Status Values
```
PENDING      → Offer sent, awaiting buyer decision
DECLINED     → Buyer declined; seller can resend
BLOCKED      → Buyer blocked seller (terminal for this request)
ACCEPTED     → Buyer accepted; must pay 1st milestone before seller starts
FIRST_PAID   → 1st payment cleared; seller can work
PROGRESS_UPLOADED → (big orders) 50% done marker; buyer pays 2nd
SECOND_PAID  → 2nd payment cleared; seller finishes
READY_TO_SHIP → Seller marks order complete; buyer pays final + address
PAID         → All paid, shipping address set (terminal, order complete)
SUPERSEDED   → Buyer accepted a different offer (can't be reactivated)
```

### Visibility Rules

**Per request, max ONE offer in "active" state:**
```
ACTIVE_DEAL_STATUSES = {
  ACCEPTED, FIRST_PAID, PROGRESS_UPLOADED, 
  SECOND_PAID, READY_TO_SHIP, PAID
}
```

**When buyer accepts an offer:**
- All other offers with status `PENDING` or `DECLINED` → `SUPERSEDED`
- Only the accepted offer progresses through the milestone chain

### Seller Resend Behavior
```
Seller has offer1 (status: PENDING)
    ↓
Buyer declines offer1
offer1.status = DECLINED
    ↓
Seller adjusts price/date and resends
    ├─ Find old pending/declined offer from same seller
    ├─ Replace it (don't create duplicate)
    ├─ Carry over comments (append new seller comment)
    └─ New offer appears as "Awaiting buyer"
    
Result: Buyer sees ONE proposal from this seller (most recent), 
        but with full conversation history
```

---

## Milestone Payment System

### Calculation Logic

```javascript
function getMilestoneSchedule(price) {
  if (price > 1000) {
    // Thirds: 1/3 start, 1/3 midway, 1/3 delivery
    const third = Math.round((price / 3) * 100) / 100
    return {
      mode: "thirds",
      first: third,
      second: third,
      final: price - (2 * third),  // Remainder to avoid rounding drift
      total: price
    }
  } else {
    // Halves: 1/2 start, 1/2 delivery
    const half = Math.round((price / 2) * 100) / 100
    return {
      mode: "halves",
      first: half,
      second: null,
      final: price - half,
      total: price
    }
  }
}
```

### Payment Recording
```
recordOfferPayment(offerId, {
  milestone: "first" | "second" | "final",
  amount: number,
  paymentMethod: "STRIPE",
  address: null | {address object}  // Only for "final"
})

Effects:
├─ Creates payment record with paidAt timestamp
├─ Pushes to offer.payments array
├─ Updates offer.status based on milestone:
│   ├─ "first"  → status = FIRST_PAID
│   ├─ "second" → status = SECOND_PAID
│   └─ "final"  → status = PAID
├─ For final: stores offer.shippingAddress
└─ Notifies seller
```

### UI: Payment Card Display

**Top Section (Milestone Strip):**
```
[1] 1/3 Start        [2] 1/3 Midway        [3] 1/3 Delivery
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status Legend:
🟢 = Paid (green circle with checkmark)
🟠 = Due now (amber circle with number, ring effect)
⚫ = Upcoming (gray circle with number)
```

**Summary Section:**
- Item name & seller name
- Order subtotal
- Already paid (sum of completed payments)
- Current installment amount & label
- Final milestone only: + Estimated shipping
- **Due now total** (bolded)

**Address Section (Final Milestone Only):**
- Pre-filled dropdown from saved addresses
- Add new address link → Opens AddressModal
- Edit button to change selected address

**Payment Method Section (Final Only):**
- Stripe radio button (selected by default)
- COD disabled (placeholder)

---

## Key Interactions

### 1. Notifications

**Buyer notifications:**
- "New proposal from {seller}" → `/custom/request-view/{id}`
- "Seller marked ready to ship" → `/custom/request-view/{id}`
- "Your payment processed" (implicit)

**Seller notifications:**
- "Proposal accepted by {buyer}" → `/custom/negotiation/{id}`
- "Proposal declined" → `/custom/negotiation/{id}` (resend button unlocks)
- "Proposal blocked" → `/custom/negotiation/{id}` (terminal)
- "Buyer paid {milestone}" → `/custom/negotiation/{id}`

### 2. Real-time Sync
Both pages use **localStorage** as source of truth:
- Accepting an offer immediately updates all offer lists
- New messages appear instantly in chat
- Payment records update milestone strip immediately
- No polling; state updates on user action

### 3. Conditional Rendering

**Buyer request-view:**
```
if no activeOffer:
  → Show full details + proposal cards
  
if activeOffer:
  → Show chat + compact details + payment card (when milestone due)
```

**Seller negotiation:**
```
if no offer:
  → Show request + proposal form
  
if offer status in {PENDING}:
  → Lock form, show "awaiting" state
  
if offer status === DECLINED:
  → Unlock form for resend
  
if offer status in {ACCEPTED, READY_TO_SHIP, PAID}:
  → Lock form, unlock chat + "ready to ship" button
```

### 4. Data Flow

```
User Action (e.g., accept offer)
    ↓
API call (e.g., acceptOffer)
    ├─ Read from localStorage
    ├─ Update state
    └─ Write back to localStorage
    ↓
UI updates via state hook
    ├─ Notification dispatched to redux
    └─ User sees instant feedback
```

---

## Edge Cases

### 1. Multiple Sellers, One Accepted Offer
- Buyer can only have ONE active deal per request
- Accepting offer A auto-archives B, C, D as SUPERSEDED
- Sellers of B, C, D see "Buyer chose another proposal" badge
- Can re-propose on future requests

### 2. Large Order with No Progress Step
- If seller never calls `markOfferProgressUploaded`
- Buyer doesn't see "Second payment cleared" banner
- Workflow continues normally from `first_paid` to `ready_to_ship`

### 3. Address Not Set Before Final Payment
- UI button is **disabled** if no address selected
- Toast error: "Please select or add a shipping address"
- Buyer must resolve before proceeding

### 4. Resend After Decline
- Old offer stays in history (status: DECLINED)
- New offer is technically a replacement (same sellerId + requestId)
- Comments carry over so buyer sees full conversation
- UI shows one visible proposal card with all conversation history

---

## Summary Table

| Aspect | Buyer View | Seller View |
|--------|-----------|------------|
| **Page** | `/custom/request-view/[id]` | `/custom/negotiation/[id]` |
| **Main Goal** | Review proposals, negotiate, pay | Send proposal, fulfill order |
| **Chat Access** | After accepting offer | After buyer accepts offer |
| **Initiates Payment** | Buyer (milestone-based) | — |
| **Marks Progress** | — | After buyer pays 1st |
| **Marks Ready** | — | After 1st (small) or 2nd (large) |
| **Provides Address** | On final payment | Receives on final payment |
| **Can Block** | ✅ (triple-tap) | ✗ |
| **Can Decline** | ✅ | — (auto-declined by buyer) |
| **Can Resend** | — | ✅ (after decline) |
| **Receives Notifications** | Proposal, ready, paid | Accepted, declined, blocked, paid |
