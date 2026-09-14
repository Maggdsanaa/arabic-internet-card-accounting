import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import {
  purchases,
  purchaseItems,
  internetCards,
  accounts,
  suppliers,
} from "@/db/schema";
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createJournalEntry } from "@/lib/accounting";
import { safeDecimal } from "@/lib/utils";

const purchaseSchema = z.object({
  date: z.string(),
  supplierId: z.number().optional(),
  supplierName: z.string().optional(),
  paymentMethod: z.enum(["cash", "credit", "bank"]).default("cash"),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        cardId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(purchases.isVoid, false)];
    if (from) conditions.push(gte(purchases.date, new Date(from)));
    if (to) conditions.push(lte(purchases.date, new Date(to)));

    const results = await db
      .select()
      .from(purchases)
      .where(and(...conditions))
      .orderBy(desc(purchases.date))
      .limit(50);

    return NextResponse.json(results);
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
    const parsed = purchaseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    // Load cards
    const cardIds = data.items.map((i) => i.cardId);
    const cardData = await db
      .select()
      .from(internetCards)
      .where(inArray(internetCards.id, cardIds));

    const cardMap = new Map(cardData.map((c) => [c.id, c]));

    const itemsWithTotal = data.items.map((item) => {
      const card = cardMap.get(item.cardId)!;
      return {
        ...item,
        cardName: card.name,
        total: item.quantity * item.unitPrice,
      };
    });

    const subtotal = itemsWithTotal.reduce((s, i) => s + i.total, 0);
    const total = subtotal - data.discount;
    const paidAmount = data.paymentMethod !== "credit" ? total : 0;
    const dueAmount = total - paidAmount;

    // Get purchase number
    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(purchases);
    const purchaseNumber = `PURCH-${String(parseInt(countResult[0]?.count || "0") + 1).padStart(6, "0")}`;

    // Get accounts
    const cashAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1110"))
      .limit(1);

    const inventoryAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1310"))
      .limit(1);

    let apAccountId = (
      await db
        .select()
        .from(accounts)
        .where(eq(accounts.code, "2100"))
        .limit(1)
    )[0]?.id;

    if (data.supplierId) {
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, data.supplierId))
        .limit(1);
      if (supplier[0]?.accountId) {
        apAccountId = supplier[0].accountId;
      }
    }

    const journalLinesList: {
      accountId: number;
      description: string;
      debit: number;
      credit: number;
    }[] = [
      {
        accountId: inventoryAccount[0]!.id,
        description: `شراء مخزون - ${purchaseNumber}`,
        debit: total,
        credit: 0,
      },
    ];

    if (paidAmount > 0) {
      journalLinesList.push({
        accountId: cashAccount[0]!.id,
        description: `نقدي - ${purchaseNumber}`,
        debit: 0,
        credit: paidAmount,
      });
    }
    if (dueAmount > 0 && apAccountId) {
      journalLinesList.push({
        accountId: apAccountId,
        description: `آجل - ${purchaseNumber}`,
        debit: 0,
        credit: dueAmount,
      });
    }

    const journalEntryId = await createJournalEntry({
      date: new Date(data.date),
      description: `فاتورة مشتريات ${purchaseNumber}`,
      transactionType: "purchase",
      createdBy: user.id,
      lines: journalLinesList,
    });

    const [purchase] = await db
      .insert(purchases)
      .values({
        purchaseNumber,
        date: new Date(data.date),
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        subtotal: String(subtotal),
        discount: String(data.discount),
        total: String(total),
        paidAmount: String(paidAmount),
        dueAmount: String(dueAmount),
        paymentMethod: data.paymentMethod,
        journalEntryId,
        notes: data.notes,
        createdBy: user.id,
      })
      .returning();

    await db.insert(purchaseItems).values(
      itemsWithTotal.map((item) => ({
        purchaseId: purchase.id,
        cardId: item.cardId,
        cardName: item.cardName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
      }))
    );

    // Increase inventory
    for (const item of data.items) {
      await db
        .update(internetCards)
        .set({
          quantity: sql`${internetCards.quantity} + ${item.quantity}`,
          purchasePrice: String(item.unitPrice),
          updatedAt: new Date(),
        })
        .where(eq(internetCards.id, item.cardId));
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "purchase",
      entityId: purchase.id,
      newData: purchase,
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "حدث خطأ" },
      { status: 500 }
    );
  }
}
