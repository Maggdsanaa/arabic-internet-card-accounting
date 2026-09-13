import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { partners, accounts, journalLines, journalEntries } from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { safeDecimal } from "@/lib/utils";
import { getAccountStatement } from "@/lib/accounting";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("id");

    if (partnerId) {
      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.id, parseInt(partnerId)))
        .limit(1);

      if (!partner[0]) {
        return NextResponse.json(
          { error: "الشريك غير موجود" },
          { status: 404 }
        );
      }

      // Get capital balance
      let capitalBalance = 0;
      let drawingsBalance = 0;
      let capitalStatement: Awaited<ReturnType<typeof getAccountStatement>> = [];
      let drawingsStatement: Awaited<ReturnType<typeof getAccountStatement>> = [];

      if (partner[0].capitalAccountId) {
        capitalStatement = await getAccountStatement(
          partner[0].capitalAccountId
        );
        capitalBalance =
          capitalStatement.length > 0
            ? capitalStatement[capitalStatement.length - 1].balance
            : 0;
      }
      if (partner[0].drawingsAccountId) {
        drawingsStatement = await getAccountStatement(
          partner[0].drawingsAccountId
        );
        drawingsBalance =
          drawingsStatement.length > 0
            ? drawingsStatement[drawingsStatement.length - 1].balance
            : 0;
      }

      return NextResponse.json({
        partner: partner[0],
        capitalBalance,
        drawingsBalance,
        capitalStatement,
        drawingsStatement,
      });
    }

    const allPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true));

    // Calculate balances for each partner
    const enriched = await Promise.all(
      allPartners.map(async (p) => {
        let capitalBalance = 0;
        let drawingsBalance = 0;

        if (p.capitalAccountId) {
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
            .where(eq(journalLines.accountId, p.capitalAccountId));
          capitalBalance =
            safeDecimal(lines[0]?.totalCredit) -
            safeDecimal(lines[0]?.totalDebit);
        }

        if (p.drawingsAccountId) {
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
            .where(eq(journalLines.accountId, p.drawingsAccountId));
          drawingsBalance =
            safeDecimal(lines[0]?.totalDebit) -
            safeDecimal(lines[0]?.totalCredit);
        }

        return {
          ...p,
          capitalBalance,
          drawingsBalance,
          netCapital: capitalBalance - drawingsBalance,
        };
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
