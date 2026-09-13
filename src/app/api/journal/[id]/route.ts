import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries, journalLines, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const entryId = parseInt(id);

    const entry = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, entryId))
      .limit(1);

    if (!entry[0]) {
      return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });
    }

    const lines = await db
      .select({
        id: journalLines.id,
        accountId: journalLines.accountId,
        accountName: accounts.nameAr,
        accountCode: accounts.code,
        description: journalLines.description,
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .leftJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(eq(journalLines.entryId, entryId));

    return NextResponse.json({ entry: entry[0], lines });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
