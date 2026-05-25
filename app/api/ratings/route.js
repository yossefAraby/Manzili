import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEMO_BUYER_ID } from "@/lib/server/demoIdentity";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const where = productId ? { productId } : {};

  const ratings = await prisma.rating.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({ ratings });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { productId, orderId, rating, review } = body || {};

  if (!productId || !orderId || !rating) {
    return NextResponse.json(
      { error: "productId, orderId, and rating are required" },
      { status: 400 },
    );
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.rating.create({
      data: {
        rating,
        review: review || "",
        userId: DEMO_BUYER_ID,
        productId,
        orderId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ rating: created }, { status: 201 });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "You have already rated this product for this order" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: e?.message || "Could not create rating" },
      { status: 400 },
    );
  }
}
