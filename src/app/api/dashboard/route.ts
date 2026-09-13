import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import {
  sales,
  purchases,
  expenses,
  customers,
  suppliers,
  internetCards,
  treasury,
  approvalRequests,
  journalEntries,
  journalLines,
  accounts,
} from "@/db/schema";
import { eq, sql, and, gte, ne } from "drizzle-orm";
import { safeDecimal } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total sales this month
    const monthlySales = await db
      .select({ total: sql<string>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales)
      .where(and(gte(sales.date, startOfMonth), eq(sales.isVoid, false)));

    // Total purchases this month
    const monthlyPurchases = await db
      .select({ total: sql<string>`COALESCE(SUM(${purchases.total}), 0)` })
      .from(purchases)
      .where(and(gte(purchases.date, startOfMonth), eq(purchases.isVoid, false)));

    // Total expenses this month
    const monthlyExpenses = await db
      .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(gte(expenses.date, startOfMonth), eq(expenses.isVoid, false)));

    // Customer count
    const customerCount = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(customers)
      .where(eq(customers.isActive, true));

    // Supplier count
    const supplierCount = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(suppliers)
      .where(eq(suppliers.isActive, true));

    // Low stock cards
    const lowStockCards = await db
      .select()
      .from(internetCards)
      .where(
        and(
          eq(internetCards.isActive, true),
          sql`${internetCards.quantity} <= ${internetCards.minQuantity}`
        )
      );

    // Treasury balances
    const treasuryBalances = await db
      .select()
      .from(treasury)
      .where(eq(treasury.isActive, true));

    // Pending approvals
    const pendingApprovals = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(approvalRequests)
      .where(eq(approvalRequests.status, "pending"));

    // Recent transactions (last 10)
    const recentEntries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.isVoid, false))
      .orderBy(sql`${journalEntries.createdAt} DESC`)
      .limit(10);

    // Total accounts receivable
    const arAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1200"))
      .limit(1);

    let totalReceivables = 0;
    if (arAccount[0]) {
      const arLines = await db
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
        .where(eq(journalLines.accountId, arAccount[0].id));
      totalReceivables =
        safeDecimal(arLines[0]?.totalDebit) -
        safeDecimal(arLines[0]?.totalCredit);
    }

    // Total accounts payable
    const apAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "2100"))
      .limit(1);

    let totalPayables = 0;
    if (apAccount[0]) {
      const apLines = await db
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
        .where(eq(journalLines.accountId, apAccount[0].id));
      totalPayables =
        safeDecimal(apLines[0]?.totalCredit) -
        safeDecimal(apLines[0]?.totalDebit);
    }

    return NextResponse.json({
      monthlySales: safeDecimal(monthlySales[0]?.total),
      monthlyPurchases: safeDecimal(monthlyPurchases[0]?.total),
      monthlyExpenses: safeDecimal(monthlyExpenses[0]?.total),
      customerCount: parseInt(customerCount[0]?.count || "0"),
      supplierCount: parseInt(supplierCount[0]?.count || "0"),
      lowStockCards,
      treasuryBalances,
      pendingApprovals: parseInt(pendingApprovals[0]?.count || "0"),
      recentEntries,
      totalReceivables,
      totalPayables,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
