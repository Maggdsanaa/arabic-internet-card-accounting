import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { internetCards } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const card = await db
      .select()
      .from(internetCards)
      .where(eq(internetCards.id, parseInt(id)))
      .limit(1);

    if (!card[0]) {
      return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });
    }
    return NextResponse.json(card[0]);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(internetCards)
      .set({
        name: body.name,
        description: body.description,
        cardType: body.cardType,
        durationDays: body.durationDays,
        speed: body.speed,
        provider: body.provider,
        purchasePrice: String(body.purchasePrice),
        sellingPrice: String(body.sellingPrice),
        minQuantity: body.minQuantity,
        updatedAt: new Date(),
      })
      .where(eq(internetCards.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
