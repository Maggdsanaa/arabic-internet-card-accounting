import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { createJournalEntry } from "@/lib/accounting";
import { createAuditLog } from "@/lib/audit";

const journalSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  lines: z
    .array(
      z.object({
        accountId: z.number(),
        description: z.string().optional(),
        debit: z.number().min(0),
        credit: z.number().min(0),
      })
    )
    .min(2),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(journalEntries.isVoid, false)];
    if (from) conditions.push(gte(journalEntries.date, new Date(from)));
    if (to) conditions.push(lte(journalEntries.date, new Date(to)));

    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(desc(journalEntries.date))
      .limit(50);

    return NextResponse.json(entries);
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
    const parsed = journalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: "القيد غير متوازن: إجمالي المدين لا يساوي إجمالي الدائن" },
        { status: 400 }
      );
    }

    const entryId = await createJournalEntry({
      date: new Date(data.date),
      description: data.description,
      transactionType: "journal",
      createdBy: user.id,
      lines: data.lines,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "journal_entry",
      entityId: entryId,
    });

    return NextResponse.json({ id: entryId }, { status: 201 });
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
