import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { customers, accounts, journalLines, journalEntries } from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import { getAccountStatement } from "@/lib/accounting";
import { safeDecimal } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const customerId = parseInt(id);

    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer[0]) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    // Get account statement
    let statement: Awaited<ReturnType<typeof getAccountStatement>> = [];
    let balance = 0;
    if (customer[0].accountId) {
      statement = await getAccountStatement(customer[0].accountId);
      balance =
        statement.length > 0 ? statement[statement.length - 1].balance : 0;
    }

    return NextResponse.json({ customer: customer[0], statement, balance });
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
    const customerId = parseInt(id);
    const body = await req.json();

    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    const [updated] = await db
      .update(customers)
      .set({
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        creditLimit: String(body.creditLimit || 0),
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "update",
      entityType: "customer",
      entityId: customerId,
      oldData: existing[0],
      newData: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
