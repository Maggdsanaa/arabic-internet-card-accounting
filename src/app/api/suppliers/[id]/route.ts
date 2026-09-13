import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAccountStatement } from "@/lib/accounting";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supplierId = parseInt(id);

    const supplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    if (!supplier[0]) {
      return NextResponse.json({ error: "المورد غير موجود" }, { status: 404 });
    }

    let statement: Awaited<ReturnType<typeof getAccountStatement>> = [];
    let balance = 0;
    if (supplier[0].accountId) {
      statement = await getAccountStatement(supplier[0].accountId);
      balance =
        statement.length > 0 ? statement[statement.length - 1].balance : 0;
    }

    return NextResponse.json({ supplier: supplier[0], statement, balance });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const supplierId = parseInt(id);
    const body = await req.json();

    const [updated] = await db
      .update(suppliers)
      .set({
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, supplierId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
