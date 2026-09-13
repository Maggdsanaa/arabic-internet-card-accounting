import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { treasury, accounts, journalLines, journalEntries } from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { safeDecimal } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth();

    const treasuries = await db
      .select()
      .from(treasury)
      .where(eq(treasury.isActive, true));

    // Recalculate balances from journal lines
    const enriched = await Promise.all(
      treasuries.map(async (t) => {
        let balance = 0;
        if (t.accountId) {
          const lines = await db
            .select({
              totalDebit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
              totalCredit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
            })
            .from(journalLines)
            .innerJoin(
              journalEntries,
              and(
                eq(journalLines.entryId, journalEntries.id),
                ne(journalEntries.isVoid, true)
              )
            )
            .where(eq(journalLines.accountId, t.accountId));

          balance =
            safeDecimal(lines[0]?.totalDebit) -
            safeDecimal(lines[0]?.totalCredit);
        }
        return { ...t, currentBalance: String(balance) };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
