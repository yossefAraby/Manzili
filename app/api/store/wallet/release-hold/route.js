import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { releasePendingFundsAfterHold } from "@/lib/server/wallet/wallet";

/**
 * Internal endpoint to release pending funds after the 14-day hold expires.
 * Should be called by a scheduled job (e.g., cron service) or manually by admin.
 * Requires admin secret for authorization.
 */
export async function POST(request) {
  // Verify authorization (admin secret)
  const secret = process.env.ADMIN_ACTIONS_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storeId, holdDays = 7 } = body || {};

  if (!storeId) {
    return NextResponse.json({ error: "storeId is required" }, { status: 400 });
  }

  try {
    const result = await releasePendingFundsAfterHold(storeId, holdDays);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to release pending funds:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to release pending funds" },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to release funds for ALL sellers whose 14-day hold has expired.
 * This should be called periodically by a cron job.
 * Example: Every day at midnight, release funds for all eligible sellers.
 */
export async function GET(request) {
  // Verify authorization (admin secret)
  const secret = process.env.ADMIN_ACTIONS_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all wallets with pending balance
    const walletsWithPending = await prisma.sellerWallet.findMany({
      where: { pendingBalance: { gt: 0 } },
      select: { storeId: true },
    });

    // Release funds for each wallet
    const results = await Promise.all(
      walletsWithPending.map((wallet) =>
        releasePendingFundsAfterHold(wallet.storeId, 7),
      ),
    );

    // Calculate totals
    const totalReleased = results.reduce(
      (sum, r) => sum + (r.released || 0),
      0,
    );
    const successCount = results.filter((r) => r.ok).length;

    return NextResponse.json({
      ok: true,
      message: `Released pending funds for ${successCount} sellers`,
      totalReleased,
      details: results,
    });
  } catch (error) {
    console.error("Bulk release failed:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process bulk release" },
      { status: 500 },
    );
  }
}
