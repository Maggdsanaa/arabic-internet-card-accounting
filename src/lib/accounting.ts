import { db } from "@/db";
import {
  journalEntries,
  journalLines,
  accounts,
  treasury,
} from "@/db/schema";
import { eq, and, sql, gte, lte, ne } from "drizzle-orm";
import { safeDecimal } from "./utils";

// Get account balance (debit - credit for asset/expense, credit - debit for liability/equity/revenue)
export async function getAccountBalance(accountId: number): Promise<number> {
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!account[0]) return 0;

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
        eq(journalEntries.isVoid, false)
      )
    )
    .where(eq(journalLines.accountId, accountId));

  const totalDebit = safeDecimal(lines[0]?.totalDebit);
  const totalCredit = safeDecimal(lines[0]?.totalCredit);

  // Asset and Expense accounts: normal debit balance
  if (
    account[0].type === "asset" ||
    account[0].type === "expense"
  ) {
    return totalDebit - totalCredit;
  }
  // Liability, Equity, Revenue accounts: normal credit balance
  return totalCredit - totalDebit;
}

// Get account statement (ledger)
export async function getAccountStatement(
  accountId: number,
  fromDate?: Date,
  toDate?: Date
) {
  const conditions = [eq(journalLines.accountId, accountId), eq(journalEntries.isVoid, false)];
  if (fromDate) conditions.push(gte(journalEntries.date, fromDate));
  if (toDate) conditions.push(lte(journalEntries.date, toDate));

  const lines = await db
    .select({
      id: journalLines.id,
      entryId: journalEntries.id,
      entryNumber: journalEntries.entryNumber,
      date: journalEntries.date,
      description: journalLines.description,
      entryDescription: journalEntries.description,
      debit: journalLines.debit,
      credit: journalLines.credit,
      transactionType: journalEntries.transactionType,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
    .where(and(...conditions))
    .orderBy(journalEntries.date, journalEntries.id);

  // Calculate running balance
  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  const isDebitNormal =
    account[0]?.type === "asset" || account[0]?.type === "expense";

  let runningBalance = 0;
  return lines.map((line) => {
    const debit = safeDecimal(line.debit);
    const credit = safeDecimal(line.credit);
    if (isDebitNormal) {
      runningBalance += debit - credit;
    } else {
      runningBalance += credit - debit;
    }
    return {
      ...line,
      debit,
      credit,
      balance: runningBalance,
    };
  });
}

// Get next journal entry number
export async function getNextEntryNumber(): Promise<string> {
  const result = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(journalEntries);
  const count = parseInt(result[0]?.count || "0") + 1;
  const year = new Date().getFullYear();
  return `QYD-${year}-${String(count).padStart(6, "0")}`;
}

// Create double-entry journal entry
export async function createJournalEntry(
  entry: {
    date: Date;
    description: string;
    transactionType: string;
    referenceId?: number;
    referenceType?: string;
    createdBy: number;
    lines: { accountId: number; description?: string; debit: number; credit: number }[];
  }
): Promise<number> {
  // Validate balanced entry
  const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("القيد غير متوازن: إجمالي المدين لا يساوي إجمالي الدائن");
  }

  const entryNumber = await getNextEntryNumber();

  const [newEntry] = await db
    .insert(journalEntries)
    .values({
      entryNumber,
      date: entry.date,
      description: entry.description,
      transactionType: entry.transactionType as "sale" | "purchase" | "payment" | "receipt" | "expense" | "journal" | "opening_balance" | "partner_deposit" | "partner_withdrawal" | "profit_distribution",
      referenceId: entry.referenceId,
      referenceType: entry.referenceType,
      totalDebit: String(totalDebit),
      totalCredit: String(totalCredit),
      createdBy: entry.createdBy,
    })
    .returning({ id: journalEntries.id });

  await db.insert(journalLines).values(
    entry.lines.map((line) => ({
      entryId: newEntry.id,
      accountId: line.accountId,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
    }))
  );

  return newEntry.id;
}

// Void a journal entry (creates reversal entry)
export async function voidJournalEntry(
  entryId: number,
  reason: string,
  voidedBy: number
): Promise<number> {
  const entry = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, entryId))
    .limit(1);

  if (!entry[0]) throw new Error("القيد غير موجود");
  if (entry[0].isVoid) throw new Error("القيد ملغى مسبقاً");

  const lines = await db
    .select()
    .from(journalLines)
    .where(eq(journalLines.entryId, entryId));

  // Create reversal entry
  const reversalId = await createJournalEntry({
    date: new Date(),
    description: `قيد عكسي للقيد رقم ${entry[0].entryNumber} - ${reason}`,
    transactionType: entry[0].transactionType,
    referenceId: entryId,
    referenceType: "reversal",
    createdBy: voidedBy,
    lines: lines.map((l) => ({
      accountId: l.accountId,
      description: `عكس: ${l.description || ""}`,
      debit: safeDecimal(l.credit), // swap debit/credit
      credit: safeDecimal(l.debit),
    })),
  });

  // Mark original entry as void
  await db
    .update(journalEntries)
    .set({
      isVoid: true,
      voidReason: reason,
      voidedBy,
      voidedAt: new Date(),
      reversalEntryId: reversalId,
      updatedAt: new Date(),
    })
    .where(eq(journalEntries.id, entryId));

  return reversalId;
}

// Update treasury balance from journal lines
export async function syncTreasuryBalance(treasuryId: number): Promise<void> {
  const treas = await db
    .select()
    .from(treasury)
    .where(eq(treasury.id, treasuryId))
    .limit(1);

  if (!treas[0]?.accountId) return;

  const balance = await getAccountBalance(treas[0].accountId);
  await db
    .update(treasury)
    .set({ currentBalance: String(balance), updatedAt: new Date() })
    .where(eq(treasury.id, treasuryId));
}

// Get profit and loss
export async function getProfitAndLoss(fromDate?: Date, toDate?: Date) {
  const conditions = [ne(journalEntries.isVoid, true)];
  if (fromDate) conditions.push(gte(journalEntries.date, fromDate));
  if (toDate) conditions.push(lte(journalEntries.date, toDate));

  // Revenue accounts (credit normal)
  const revenueAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.nameAr,
      code: accounts.code,
      totalCredit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
      totalDebit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(
      journalEntries,
      and(eq(journalLines.entryId, journalEntries.id), ne(journalEntries.isVoid, true))
    )
    .where(eq(accounts.type, "revenue"))
    .groupBy(accounts.id, accounts.nameAr, accounts.code);

  // Expense accounts (debit normal)
  const expenseAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.nameAr,
      code: accounts.code,
      totalCredit: sql<string>`COALESCE(SUM(${journalLines.credit}), 0)`,
      totalDebit: sql<string>`COALESCE(SUM(${journalLines.debit}), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(
      journalEntries,
      and(eq(journalLines.entryId, journalEntries.id), ne(journalEntries.isVoid, true))
    )
    .where(eq(accounts.type, "expense"))
    .groupBy(accounts.id, accounts.nameAr, accounts.code);

  const totalRevenue = revenueAccounts.reduce(
    (s, a) => s + safeDecimal(a.totalCredit) - safeDecimal(a.totalDebit),
    0
  );
  const totalExpense = expenseAccounts.reduce(
    (s, a) => s + safeDecimal(a.totalDebit) - safeDecimal(a.totalCredit),
    0
  );

  return {
    revenueAccounts: revenueAccounts.map((a) => ({
      ...a,
      balance: safeDecimal(a.totalCredit) - safeDecimal(a.totalDebit),
    })),
    expenseAccounts: expenseAccounts.map((a) => ({
      ...a,
      balance: safeDecimal(a.totalDebit) - safeDecimal(a.totalCredit),
    })),
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
  };
}
