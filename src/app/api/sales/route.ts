import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import {
  sales,
  saleItems,
  internetCards,
  accounts,
  customers,
} from "@/db/schema";
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createJournalEntry } from "@/lib/accounting";
import { safeDecimal } from "@/lib/utils";

const saleSchema = z.object({
  date: z.string(),
  customerId: z.number().optional(),
  customerName: z.string().optional(),
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
    const limit = parseInt(searchParams.get("limit") || "50");

    const conditions = [eq(sales.isVoid, false)];
    if (from) conditions.push(gte(sales.date, new Date(from)));
    if (to) conditions.push(lte(sales.date, new Date(to)));

    const results = await db
      .select()
      .from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.date))
      .limit(limit);

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
    const parsed = saleSchema.safeParse(body);

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

    // Validate stock
    for (const item of data.items) {
      const card = cardMap.get(item.cardId);
      if (!card) {
        return NextResponse.json(
          { error: `الكارت ${item.cardId} غير موجود` },
          { status: 400 }
        );
      }
      if (card.quantity < item.quantity) {
        return NextResponse.json(
          { error: `الكمية غير كافية للكارت ${card.name}` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const itemsWithTotal = data.items.map((item) => {
      const card = cardMap.get(item.cardId)!;
      return {
        ...item,
        cardName: card.name,
        purchasePrice: safeDecimal(card.purchasePrice),
        total: item.quantity * item.unitPrice,
      };
    });

    const subtotal = itemsWithTotal.reduce((s, i) => s + i.total, 0);
    const total = subtotal - data.discount;
    const paidAmount = data.paymentMethod !== "credit" ? total : 0;
    const dueAmount = total - paidAmount;

    // Get sale number
    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(sales);
    const saleNumber = `SALE-${String(parseInt(countResult[0]?.count || "0") + 1).padStart(6, "0")}`;

    // Get accounts
    const cashAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1110"))
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
    const inventoryAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1310"))
      .limit(1);

    // Get customer AR account
    let arAccountId = (
      await db
        .select()
        .from(accounts)
        .where(eq(accounts.code, "1200"))
        .limit(1)
    )[0]?.id;

    if (data.customerId) {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, data.customerId))
        .limit(1);
      if (customer[0]?.accountId) {
        arAccountId = customer[0].accountId;
      }
    }

    // Create journal entry
    const totalCOGS = itemsWithTotal.reduce(
      (s, i) => s + i.quantity * i.purchasePrice,
      0
    );

    const journalLines: {
      accountId: number;
      description: string;
      debit: number;
      credit: number;
    }[] = [];

    // Revenue side
    if (paidAmount > 0) {
      journalLines.push({
        accountId: cashAccount[0]!.id,
        description: `نقدي - ${saleNumber}`,
        debit: paidAmount,
        credit: 0,
      });
    }
    if (dueAmount > 0 && arAccountId) {
      journalLines.push({
        accountId: arAccountId,
        description: `آجل - ${saleNumber}`,
        debit: dueAmount,
        credit: 0,
      });
    }
    journalLines.push({
      accountId: revenueAccount[0]!.id,
      description: `مبيعات - ${saleNumber}`,
      debit: 0,
      credit: total,
    });

    // COGS side
    if (totalCOGS > 0 && cogsAccount[0] && inventoryAccount[0]) {
      journalLines.push({
        accountId: cogsAccount[0].id,
        description: `تكلفة مبيعات - ${saleNumber}`,
        debit: totalCOGS,
        credit: 0,
      });
      journalLines.push({
        accountId: inventoryAccount[0].id,
        description: `تخفيض مخزون - ${saleNumber}`,
        debit: 0,
        credit: totalCOGS,
      });
    }

    const journalEntryId = await createJournalEntry({
      date: new Date(data.date),
      description: `فاتورة مبيعات ${saleNumber}`,
      transactionType: "sale",
      createdBy: user.id,
      lines: journalLines,
    });

    // Create sale
    const [sale] = await db
      .insert(sales)
      .values({
        saleNumber,
        date: new Date(data.date),
        customerId: data.customerId,
        customerName: data.customerName,
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

    // Create sale items and update inventory
    await db.insert(saleItems).values(
      itemsWithTotal.map((item) => ({
        saleId: sale.id,
        cardId: item.cardId,
        cardName: item.cardName,
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        purchasePrice: String(item.purchasePrice),
        total: String(item.total),
      }))
    );

    // Decrease inventory
    for (const item of data.items) {
      await db
        .update(internetCards)
        .set({
          quantity: sql`${internetCards.quantity} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(internetCards.id, item.cardId));
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "sale",
      entityId: sale.id,
      newData: sale,
    });

    return NextResponse.json(sale, { status: 201 });
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
