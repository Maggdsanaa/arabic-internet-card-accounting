import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAccountStatement } from "@/lib/accounting";
import { createApprovalRequest, NoPartnersError } from "@/lib/approvals";

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

// Any edit requires triple-partner approval — nothing is applied directly here.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const customerId = parseInt(id);
    const body = await req.json();

    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب التعديل مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    const request = await createApprovalRequest({
      user,
      operationType: "update",
      entityType: "customer",
      entityId: customerId,
      oldData: existing[0],
      newData: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        creditLimit: body.creditLimit || 0,
        notes: body.notes,
      },
      reason: body.reason,
    });

    return NextResponse.json(
      {
        message: "تم إرسال طلب التعديل، بانتظار موافقة الشركاء الثلاثة",
        approvalRequest: request,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (error instanceof NoPartnersError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

// Delete requires triple-partner approval; the customer is only deactivated after full approval.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const customerId = parseInt(id);
    const body = await req.json().catch(() => ({}));

    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب الحذف مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
    }

    const request = await createApprovalRequest({
      user,
      operationType: "delete",
      entityType: "customer",
      entityId: customerId,
      oldData: existing[0],
      reason: body.reason,
    });

    return NextResponse.json(
      {
        message: "تم إرسال طلب الحذف، بانتظار موافقة الشركاء الثلاثة",
        approvalRequest: request,
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (error instanceof NoPartnersError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
