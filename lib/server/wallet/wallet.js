import { prisma } from "@/lib/db/prisma";

// Stripe is instantiated lazily so the module can be imported in routes
// that don't touch Stripe (e.g. plain wallet reads) without failing when
// STRIPE_SECRET_KEY is undefined in test/CI environments.
function getStripe() {
  const { default: Stripe } = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function ensureSellerWallet(storeId, currency = "EGP") {
  return prisma.sellerWallet.upsert({
    where: { storeId },
    update: { currency },
    create: { storeId, currency },
  });
}

/**
 * Create or retrieve a Stripe Connect Custom Account for a seller.
 * Sellers never see Stripe — they only interact with your website.
 */
export async function ensureStripeCustomAccount(storeId, store) {
  const wallet = await ensureSellerWallet(storeId);

  if (wallet.stripeAccountId) {
    return { accountId: wallet.stripeAccountId, wallet };
  }

  const stripe = getStripe();

  try {
    const account = await stripe.accounts.create({
      type: "custom",
      country: "EG",
      email: store.email,
      controller: {
        requirement_collection: "platform",
        losses: { payments: "platform" },
        fees: { payer: "platform" },
        stripe_dashboard: { type: "none" },
      },
      business_profile: {
        name: store.name,
        support_email: store.email,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/store/${store.username}`,
      },
      capabilities: {
        transfers: { requested: true },
      },
    });

    await prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: { stripeAccountId: account.id },
    });

    return {
      accountId: account.id,
      wallet: { ...wallet, stripeAccountId: account.id },
    };
  } catch (error) {
    console.error("Failed to create Stripe Custom Account:", error);
    throw new Error("Could not create payment account. Please try again.");
  }
}

/**
 * Attach bank account details to the seller's Stripe Custom Account.
 * Only redacted info (last 4 digits) is stored locally.
 */
export async function updateStripeCustomAccountBankDetails(
  storeId,
  bankDetails,
) {
  const wallet = await prisma.sellerWallet.findUnique({ where: { storeId } });

  if (!wallet?.stripeAccountId) {
    throw new Error("Seller account not configured");
  }

  const stripe = getStripe();

  try {
    await stripe.accounts.createExternalAccount(wallet.stripeAccountId, {
      external_account: {
        object: "bank_account",
        country: bankDetails.country || "EG",
        currency: "egp",
        account_holder_name: bankDetails.accountHolder,
        account_holder_type: "individual",
        routing_number: bankDetails.routingNumber,
        account_number: bankDetails.accountNumber,
      },
    });

    await prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: {
        bankName: bankDetails.bankName,
        bankAccountHolder: bankDetails.accountHolder,
        bankLast4: bankDetails.accountNumber?.slice(-4) || "",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update bank details:", error);
    throw new Error(
      "Could not update bank details. Please check your information and try again.",
    );
  }
}

export async function postWalletTransaction({
  storeId,
  type,
  bucket,
  amount,
  currency = "EGP",
  idempotencyKey,
  references = {},
}) {
  if (!storeId) throw new Error("storeId required");
  if (!idempotencyKey) throw new Error("idempotencyKey required");
  const value = Number(amount);
  if (!Number.isFinite(value) || value === 0)
    throw new Error("amount must be non-zero");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.sellerWallet.upsert({
      where: { storeId },
      update: { currency },
      create: { storeId, currency },
    });

    const existing = await tx.walletTransaction.findUnique({
      where: {
        walletId_idempotencyKey: { walletId: wallet.id, idempotencyKey },
      },
    });
    if (existing) return { wallet, transaction: existing, applied: false };

    const txRow = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        bucket,
        amount: value,
        currency,
        idempotencyKey,
        orderId: references.orderId ?? null,
        storeOrderId: references.storeOrderId ?? null,
        shipmentId: references.shipmentId ?? null,
      },
    });

    const nextPending =
      bucket === "PENDING"
        ? wallet.pendingBalance + value
        : wallet.pendingBalance;
    const nextAvailable =
      bucket === "AVAILABLE"
        ? wallet.availableBalance + value
        : wallet.availableBalance;

    const updatedWallet = await tx.sellerWallet.update({
      where: { id: wallet.id },
      data: { pendingBalance: nextPending, availableBalance: nextAvailable },
    });

    return { wallet: updatedWallet, transaction: txRow, applied: true };
  });
}

/**
 * Process a return automatically.
 * 1. Marks the order RETURNED (graceful if enum not yet in DB after db push).
 * 2. Issues a Stripe refund to the customer from the platform balance.
 * 3. Debits the seller's wallet — from PENDING if still in hold, else AVAILABLE.
 *
 * Zero seller interaction required.
 */
export async function handleReturn(
  storeOrderId,
  reason = "Customer requested return",
) {
  const storeOrder = await prisma.storeOrder.findUnique({
    where: { id: storeOrderId },
    select: {
      id: true,
      storeId: true,
      total: true,
      paymentMethod: true,
      orderId: true,
    },
  });

  if (!storeOrder) throw new Error("Store order not found");

  // Mark order returned — silently skip if RETURNED enum is not yet in DB
  try {
    await prisma.storeOrder.update({
      where: { id: storeOrderId },
      data: { status: "RETURNED" },
    });
  } catch (err) {
    console.warn(
      "[handleReturn] Could not set status=RETURNED (run prisma db push):",
      err?.message,
    );
  }

  // Issue Stripe refund for card payments
  if (storeOrder.paymentMethod === "STRIPE") {
    try {
      const stripe = getStripe();
      // Find the PaymentIntent for this order
      const order = await prisma.order.findUnique({
        where: { id: storeOrder.orderId },
        select: { stripePaymentIntentId: true },
      });
      if (order?.stripePaymentIntentId) {
        await stripe.refunds.create({
          payment_intent: order.stripePaymentIntentId,
          reason: "requested_by_customer",
        });
      }
    } catch (err) {
      // Log but don't block wallet debit — admin can issue refund manually
      console.error("[handleReturn] Stripe refund failed:", err?.message);
    }
  }

  // Debit seller wallet — PENDING first (within hold window), else AVAILABLE
  const wallet = await prisma.sellerWallet.findUnique({
    where: { storeId: storeOrder.storeId },
  });
  if (wallet) {
    const bucket =
      wallet.pendingBalance >= storeOrder.total ? "PENDING" : "AVAILABLE";
    await postWalletTransaction({
      storeId: storeOrder.storeId,
      type: "ADJUSTMENT",
      bucket,
      amount: -storeOrder.total,
      currency: wallet.currency,
      idempotencyKey: `return:${storeOrderId}`,
      references: { storeOrderId },
    }).catch(() => null); // idempotent
  }

  return { ok: true, storeOrderId, refundAmount: storeOrder.total };
}

/**
 * Promote PENDING transactions to AVAILABLE after the 7-day hold window.
 * Call this daily via a cron job or admin endpoint.
 */
export async function releasePendingFundsAfterHold(storeId, holdDays = 7) {
  const wallet = await prisma.sellerWallet.findUnique({
    where: { storeId },
    include: { transactions: true },
  });

  if (!wallet || wallet.pendingBalance <= 0) return { ok: true, released: 0 };

  const holdExpiryDate = new Date();
  holdExpiryDate.setDate(holdExpiryDate.getDate() - holdDays);

  const oldPendingTx = wallet.transactions.filter(
    (tx) =>
      tx.bucket === "PENDING" &&
      tx.createdAt < holdExpiryDate &&
      tx.type === "SALE_CREDIT",
  );

  if (oldPendingTx.length === 0) return { ok: true, released: 0 };

  const amountToRelease = oldPendingTx.reduce((sum, tx) => sum + tx.amount, 0);

  // Use a date-bucketed key so the same funds aren't released twice
  const bucketDate = holdExpiryDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const idempotencyKey = `release_hold:${storeId}:${bucketDate}`;

  const result = await postWalletTransaction({
    storeId,
    type: "ADJUSTMENT",
    bucket: "AVAILABLE",
    amount: amountToRelease,
    currency: wallet.currency,
    idempotencyKey,
  }).catch((err) => {
    console.error("Failed to release pending funds:", err);
    return { wallet, transaction: null, applied: false };
  });

  return { ok: true, released: amountToRelease, appliedNow: result.applied };
}
