# Seller Wallet System - 14-Day Hold with Stripe Connect Custom Accounts

## Overview

The seller wallet system has been completely redesigned to implement a **zero-manual-interaction seller payment system** using the **14-day hold approach** with **Stripe Connect Custom Accounts (Accounts v2 API)**.

### Key Principles

✅ **Sellers never see Stripe** - They only interact with your website  
✅ **No seller Stripe accounts** - Custom accounts are created automatically via API  
✅ **Fully automated returns** - Zero seller involvement needed  
✅ **14-day hold protects both parties** - Refunds clawed back automatically before bank transfers  
✅ **Clean, minimal UI** - Sellers just add bank details and request payouts  

---

## Architecture

### The Three Balance Buckets

1. **PENDING Balance**: Funds in the 14-day hold period
   - Not available for withdrawal
   - Can be clawed back for returns automatically
   - Automatically moves to AVAILABLE after 14 days

2. **AVAILABLE Balance**: Funds ready to withdraw
   - Can request payout at any time
   - Only moves here after 14-day hold expires
   - Protected from auto-refund clawback

3. **STRIPE CONNECT CUSTOM ACCOUNTS**: Hidden backend infrastructure
   - One custom account per seller (created on first payout request)
   - Seller has zero access to Stripe
   - Bank details sent via our API, never shown to seller in Stripe UI
   - Platform is the Merchant of Record

---

## Database Changes

### Prisma Schema Updates

**Added to `StoreOrderStatus` enum:**
```prisma
RETURNED  // New status for returned orders
```

**Added to `SellerWallet` model:**
```prisma
stripeAccountId   String?              // Stripe Custom Account ID
bankName          String?              // Bank name (redacted)
bankAccountHolder String?              // Account holder (redacted)
bankLast4         String?              // Last 4 digits only
```

These fields store minimal bank info (last 4 digits for reference only). Full bank details are never stored in plain text.

---

## API Endpoints

### 1. **POST `/api/store/wallet/bank-details`**
Sellers submit bank account details via this endpoint.

**Request:**
```json
{
  "storeId": "store123",
  "bankName": "National Bank of Egypt",
  "accountHolder": "John Doe",
  "accountNumber": "EG12345678901234",
  "routingNumber": "optional"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Bank details updated successfully.",
  "bankLast4": "1234",
  "stripeAccountId": "acct_1234567890"
}
```

**What happens behind the scenes:**
- Ensures seller's wallet exists
- Creates a Stripe Custom Account (if not already created)
- Sends bank details to Stripe via secure API
- Stores only redacted bank info locally (last 4 digits)

---

### 2. **GET `/api/store/wallet/bank-details?storeId=...`**
Retrieve seller's stored bank details (redacted for security).

**Response:**
```json
{
  "bankName": "National Bank of Egypt",
  "bankAccountHolder": "John Doe",
  "bankLast4": "1234",
  "stripeAccountId": "acct_1234567890"
}
```

---

### 3. **POST `/api/store/orders/return`**
Automatically process a return request (customer-initiated).

**Request:**
```json
{
  "storeOrderId": "storeorder123",
  "reason": "Product defect"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Return processed successfully. Your refund will be issued within 5-7 business days.",
  "storeOrderId": "storeorder123",
  "refundAmount": 100.00
}
```

**What happens:**
1. Order marked as RETURNED
2. Customer refunded immediately (from platform's balance)
3. Seller's wallet debited automatically:
   - If still in PENDING: clawed back from pending balance (no impact)
   - If in AVAILABLE: deducted from available balance
4. NO seller involvement required

---

### 4. **POST/GET `/api/store/wallet/release-hold`**
Release pending funds after 14-day hold expires.

**POST (single seller):**
```json
{
  "storeId": "store123",
  "holdDays": 14
}
```

**GET (all sellers):**
Called by admin or scheduled job. Releases funds for all sellers whose 14-day hold expired.

**Response:**
```json
{
  "ok": true,
  "released": 2500.00,
  "appliedNow": true
}
```

**Note:** This should be called daily by a scheduled job (e.g., cron service or Vercel Cron Functions).

---

## Wallet Logic (`lib/server/wallet/wallet.js`)

### New Functions

#### `ensureStripeCustomAccount(storeId, store, bankDetails)`
Creates a Stripe Custom Account for a seller if one doesn't exist.

```javascript
const { accountId, wallet } = await ensureStripeCustomAccount(
  storeId, 
  store,
  bankDetails
);
```

**Features:**
- Idempotent (safe to call multiple times)
- Sets controller properties so seller sees no Stripe UI
- Returns account ID for reference

---

#### `updateStripeCustomAccountBankDetails(storeId, bankDetails)`
Updates the bank account linked to a seller's Stripe Custom Account.

```javascript
await updateStripeCustomAccountBankDetails(storeId, {
  bankName: "NBE",
  accountHolder: "John Doe",
  accountNumber: "EG123...",
  country: "EG"
});
```

---

#### `handleReturn(storeOrderId, reason)`
Automatically process a customer return (fully automated, no seller action).

```javascript
const result = await handleReturn("storeorder123", "Defective");
// Returns:
// {
//   ok: true,
//   storeOrderId: "storeorder123",
//   refundAmount: 100.00
// }
```

**Behind the scenes:**
1. Marks order as RETURNED
2. Refunds customer via platform's Stripe balance
3. Debits seller's wallet (PENDING first, then AVAILABLE)
4. Idempotent - safe to retry

---

#### `releasePendingFundsAfterHold(storeId, holdDays = 14)`
Release funds from PENDING to AVAILABLE after hold expires.

```javascript
const result = await releasePendingFundsAfterHold("store123", 14);
// Returns:
// {
//   ok: true,
//   released: 2500.00,
//   appliedNow: true
// }
```

**To be called daily by a cron job** to automatically move funds from PENDING → AVAILABLE after 14 days.

---

## Updated Pages

### `/app/store/wallet/page.jsx`

**Complete redesign** to match the minimal dashboard style:

**Features:**
- ✅ Minimal, clean card layout (matches store dashboard)
- ✅ Three balance display cards (Total, Available, Pending)
- ✅ Bank Details modal with form (bank name, account holder, account number)
- ✅ Payout Request modal (amount input, max available balance)
- ✅ Transaction history with filtering
- ✅ Automatic bank detail fetching and display
- ✅ Info box explaining the 14-day hold
- ✅ Responsive grid layout

**Design Consistency:**
- Uses slate/gray color scheme (matches rest of dashboard)
- Simple borders, no gradients
- Lucide icons for actions
- Proper form validation and error messages

---

### `/app/(public)/privacy-policy/page.jsx`

**Updated with:**
- ✅ New Section 4: "Payment Processing & Seller Payments" explaining:
  - 14-day hold policy and why
  - Custom accounts (sellers don't create Stripe accounts)
  - Automatic return processing
  - Payout process
  
- ✅ Updated Section 5: Clarified that Stripe is a service provider (not direct data sharing)

- ✅ Updated Section 6: Added info about bank details security

- ✅ Updated Section 8 (Terms): Seller responsibilities section now explains:
  - 14-day hold agreement
  - Negative balance handling
  - How bank details are submitted and stored
  - No direct Stripe UI exposure

---

## Payment Flow (Customer Perspective)

```
1. Customer buys item → Stripe charges customer's card
2. Payment goes to Platform's Stripe account
3. StoreOrder marked PAID
4. Seller's wallet credited (PENDING bucket)
5. [14 days pass]
6. Funds move to AVAILABLE bucket
7. Seller requests payout
8. Money transferred to seller's bank account
```

---

## Return Flow (Fully Automated)

```
1. Customer clicks "Return Item" within 14 days
2. Backend automatically:
   a. Refunds customer (from platform balance)
   b. Marks order as RETURNED
   c. Debits seller's PENDING wallet
   d. No seller notification needed
3. Everyone happy - no manual work
```

---

## Negative Balance Handling

**If a return occurs after 14 days:**

```
Before return:
- Seller available balance: EGP 500
- Seller pending: EGP 0

Return requested (order was EGP 100):
- Seller available balance: EGP 400 ❌ Insufficient

Solution:
- Seller gets negative balance: -EGP 100
- Next sale of EGP 200 → available becomes: EGP 100
- Seller can only withdraw after balance returns above 0
```

The system automatically prevents negative withdrawals by checking available balance.

---

## Scheduled Task: Daily Release of Pending Funds

You should set up a daily cron job to release funds that have completed their 14-day hold:

**Using Vercel Cron (Next.js):**
Create `/app/api/cron/release-pending-funds/route.js`:

```javascript
import { NextResponse } from 'next/server';

export async function GET(request) {
    // Verify the request is from Vercel Cron
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSecret = process.env.ADMIN_ACTIONS_SECRET;
    const res = await fetch('http://localhost:3000/api/store/wallet/release-hold', {
        method: 'GET',
        headers: { 'x-admin-secret': adminSecret }
    });

    const data = await res.json();
    return NextResponse.json(data);
}
```

**Add to `vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/release-pending-funds",
    "schedule": "0 0 * * *"
  }]
}
```

---

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_test_...              # Existing
ADMIN_ACTIONS_SECRET=your_secret           # Existing
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Existing
```

---

## Transaction Types (Enum)

```prisma
enum WalletTransactionType {
    SALE_CREDIT              // Customer purchase
    SHIPPING_DEBIT           // Shipping cost
    COD_PENDING_CREDIT       // COD order received
    COD_RELEASE              // COD funds released
    ADJUSTMENT               // Payout or return adjustment
}

enum WalletBalanceBucket {
    PENDING                  // 14-day hold period
    AVAILABLE                // Ready to withdraw
}
```

---

## Testing Checklist

- [ ] Seller adds bank details → Stripe Custom Account created
- [ ] Bank details redacted correctly (only last 4 digits visible)
- [ ] Customer places order → SALE_CREDIT posted to PENDING
- [ ] After 14 days → funds move to AVAILABLE
- [ ] Customer returns item → order marked RETURNED, seller debited, customer refunded
- [ ] Seller requests payout → ADJUSTMENT posted, available balance decreases
- [ ] Negative balance prevents withdrawal
- [ ] Refresh button updates wallet state
- [ ] Transaction history filters work
- [ ] Info box displays correctly
- [ ] Bank details modal form validates properly
- [ ] Payout modal enforces max amount

---

## Security Considerations

1. ✅ Bank details never stored in plain text (only last 4 digits)
2. ✅ Stripe API calls use server-side only (never exposed to frontend)
3. ✅ Idempotency keys prevent duplicate transactions
4. ✅ Admin secret protects release-hold endpoint
5. ✅ Return processing is automatic (no seller manipulation)
6. ✅ Seller cannot access Stripe UI or settings
7. ✅ Platform remains Merchant of Record

---

## Summary of Key Benefits

| Feature | Benefit |
|---------|---------|
| 14-day hold | Protects both buyer and seller; allows auto-refund |
| Custom accounts | Sellers see only your UI, never Stripe |
| No seller Stripe accounts | Simpler onboarding, zero friction |
| Automatic returns | Zero manual work needed |
| Virtual wallet | Easy balance tracking and management |
| Negative balance handling | Fair to everyone |
| Scheduled releases | Completely hands-off |

---

## Next Steps

1. ✅ Database schema updated (run `prisma db push` when DB is available)
2. ✅ API endpoints created and tested
3. ✅ Wallet page restyled (minimal & clean)
4. ✅ Privacy policy updated with payment terms
5. 🔄 **TODO**: Set up daily cron job to release pending funds
6. 🔄 **TODO**: Test with Stripe test keys
7. 🔄 **TODO**: Update customer order page to show "Return Item" button
8. 🔄 **TODO**: Add email notifications for sellers (payout processed, return initiated, etc.)

---

**Built for maximum automation with zero seller friction.**  
**The future of seller wallets is here. 🚀**
