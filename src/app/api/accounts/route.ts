import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, journalLines, journalEntries } from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { safeDecimal } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const withBalance = searchParams.get("withBalance") === "true";

    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.code);

    if (!withBalance) {
      return NextResponse.json(allAccounts);
    }

    // Calculate balances
    const enriched = await Promise.all(
      allAccounts.map(async (account) => {
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
          .where(eq(journalLines.accountId, account.id));

        const totalDebit = safeDecimal(lines[0]?.totalDebit);
        const totalCredit = safeDecimal(lines[0]?.totalCredit);

        let balance = 0;
        if (account.type === "asset" || account.type === "expense") {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }

        return { ...account, balance, totalDebit, totalCredit };
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "accountant") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();

    const [account] = await db
      .insert(accounts)
      .values({
        code: body.code,
        name: body.name || body.nameAr,
        nameAr: body.nameAr,
        type: body.type,
        parentId: body.parentId,
        description: body.description,
      })
      .returning();

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
