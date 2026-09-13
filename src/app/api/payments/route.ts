import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { payments, accounts, customers, suppliers, partners } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createJournalEntry } from "@/lib/accounting";

const paymentSchema = z.object({
  date: z.string(),
  type: z.enum(["receipt", "payment"]),
  partyType: z.enum(["customer", "supplier", "partner"]),
  partyId: z.number(),
  partyName: z.string(),
  amount: z.number().min(0.01),
  paymentMethod: z.enum(["cash", "bank"]).default("cash"),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const results = await db
      .select()
      .from(payments)
      .where(eq(payments.isVoid, false))
      .orderBy(desc(payments.date))
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
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    // Get cash account
    const cashAccountCode = data.paymentMethod === "bank" ? "1120" : "1110";
    const cashAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, cashAccountCode))
      .limit(1);

    // Get party account
    let partyAccountId: number | undefined;

    if (data.partyType === "customer") {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, data.partyId))
        .limit(1);
      partyAccountId = customer[0]?.accountId || undefined;
    } else if (data.partyType === "supplier") {
      const supplier = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, data.partyId))
        .limit(1);
      partyAccountId = supplier[0]?.accountId || undefined;
    } else if (data.partyType === "partner") {
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.id, data.partyId))
        .limit(1);
      partyAccountId = partner[0]?.drawingsAccountId || undefined;
    }

    if (!partyAccountId || !cashAccount[0]) {
      return NextResponse.json(
        { error: "حساب الطرف أو النقدية غير موجود" },
        { status: 400 }
      );
    }

    // Build journal lines based on receipt or payment
    let journalLinesList: {
      accountId: number;
      description: string;
      debit: number;
      credit: number;
    }[];

    if (data.type === "receipt") {
      // Receipt: cash in, AR/liability out
      journalLinesList = [
        {
          accountId: cashAccount[0].id,
          description: `تحصيل - ${data.partyName}`,
          debit: data.amount,
          credit: 0,
        },
        {
          accountId: partyAccountId,
          description: `تحصيل من ${data.partyName}`,
          debit: 0,
          credit: data.amount,
        },
      ];
    } else {
      // Payment: cash out, AP/asset out
      journalLinesList = [
        {
          accountId: partyAccountId,
          description: `دفع لـ ${data.partyName}`,
          debit: data.amount,
          credit: 0,
        },
        {
          accountId: cashAccount[0].id,
          description: `دفع - ${data.partyName}`,
          debit: 0,
          credit: data.amount,
        },
      ];
    }

    const transactionType = data.type === "receipt" ? "receipt" : "payment";
    const journalEntryId = await createJournalEntry({
      date: new Date(data.date),
      description: `${data.type === "receipt" ? "تحصيل" : "دفعة"} - ${data.partyName}`,
      transactionType,
      createdBy: user.id,
      lines: journalLinesList,
    });

    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(payments);
    const paymentNumber = `PAY-${String(parseInt(countResult[0]?.count || "0") + 1).padStart(6, "0")}`;

    const [payment] = await db
      .insert(payments)
      .values({
        paymentNumber,
        date: new Date(data.date),
        type: data.type,
        partyType: data.partyType,
        partyId: data.partyId,
        partyName: data.partyName,
        amount: String(data.amount),
        paymentMethod: data.paymentMethod,
        journalEntryId,
        notes: data.notes,
        createdBy: user.id,
      })
      .returning();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "payment",
      entityId: payment.id,
      newData: payment,
    });

    return NextResponse.json(payment, { status: 201 });
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
