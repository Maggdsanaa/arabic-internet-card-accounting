import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const saleId = parseInt(id);

    const sale = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!sale[0]) {
      return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId));

    return NextResponse.json({ sale: sale[0], items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
