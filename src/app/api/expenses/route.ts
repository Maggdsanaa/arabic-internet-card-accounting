import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { expenses, accounts } from "@/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createJournalEntry } from "@/lib/accounting";

const expenseSchema = z.object({
  date: z.string(),
  categoryAccountId: z.number(),
  description: z.string().min(1),
  amount: z.number().min(0.01),
  paymentMethod: z.enum(["cash", "bank"]).default("cash"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(expenses.isVoid, false)];
    if (from) conditions.push(gte(expenses.date, new Date(from)));
    if (to) conditions.push(lte(expenses.date, new Date(to)));

    const results = await db
      .select({
        id: expenses.id,
        expenseNumber: expenses.expenseNumber,
        date: expenses.date,
        description: expenses.description,
        amount: expenses.amount,
        paymentMethod: expenses.paymentMethod,
        notes: expenses.notes,
        isVoid: expenses.isVoid,
        createdAt: expenses.createdAt,
        accountName: accounts.nameAr,
      })
      .from(expenses)
      .leftJoin(accounts, eq(expenses.categoryAccountId, accounts.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.date))
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
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(expenses);
    const expenseNumber = `EXP-${String(parseInt(countResult[0]?.count || "0") + 1).padStart(6, "0")}`;

    const cashAccountCode =
      data.paymentMethod === "bank" ? "1120" : "1110";
    const cashAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, cashAccountCode))
      .limit(1);

    const journalEntryId = await createJournalEntry({
      date: new Date(data.date),
      description: `مصروف - ${data.description}`,
      transactionType: "expense",
      createdBy: user.id,
      lines: [
        {
          accountId: data.categoryAccountId,
          description: data.description,
          debit: data.amount,
          credit: 0,
        },
        {
          accountId: cashAccount[0]!.id,
          description: `دفع مصروف - ${data.description}`,
          debit: 0,
          credit: data.amount,
        },
      ],
    });

    const [expense] = await db
      .insert(expenses)
      .values({
        expenseNumber,
        date: new Date(data.date),
        categoryAccountId: data.categoryAccountId,
        description: data.description,
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
      entityType: "expense",
      entityId: expense.id,
      newData: expense,
    });

    return NextResponse.json(expense, { status: 201 });
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
