import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { internetCards, accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const cardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  cardType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]),
  durationDays: z.number().optional(),
  speed: z.string().optional(),
  provider: z.string().optional(),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  quantity: z.number().min(0).default(0),
  minQuantity: z.number().min(0).default(5),
});

export async function GET() {
  try {
    await requireAuth();
    const cards = await db
      .select()
      .from(internetCards)
      .where(eq(internetCards.isActive, true));
    return NextResponse.json(cards);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = cardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    // Get system accounts
    const inventoryAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1310"))
      .limit(1);

    const revenueAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "4100"))
      .limit(1);

    const cogsAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "5100"))
      .limit(1);

    const [card] = await db
      .insert(internetCards)
      .values({
        name: data.name,
        description: data.description,
        cardType: data.cardType,
        durationDays: data.durationDays,
        speed: data.speed,
        provider: data.provider,
        purchasePrice: String(data.purchasePrice),
        sellingPrice: String(data.sellingPrice),
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        inventoryAccountId: inventoryAccount[0]?.id,
        revenueAccountId: revenueAccount[0]?.id,
        costAccountId: cogsAccount[0]?.id,
        createdBy: user.id,
      })
      .returning();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "internet_card",
      entityId: card.id,
      newData: card,
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
