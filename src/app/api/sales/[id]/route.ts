import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { sales, saleItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createApprovalRequest, NoPartnersError } from "@/lib/approvals";

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

// Voiding a sale requires triple-partner approval. The financial record is never
// deleted — a reversing journal entry is created only after full approval.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const saleId = parseInt(id);
    const body = await req.json().catch(() => ({}));

    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب إلغاء الفاتورة مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(sales)
      .where(eq(sales.id, saleId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { error: "الفاتورة غير موجودة" },
        { status: 404 }
      );
    }

    if (existing[0].isVoid) {
      return NextResponse.json(
        { error: "الفاتورة ملغاة مسبقاً" },
        { status: 400 }
      );
    }

    const request = await createApprovalRequest({
      user,
      operationType: "delete",
      entityType: "sale",
      entityId: saleId,
      oldData: existing[0],
      reason: body.reason,
    });

    return NextResponse.json(
      {
        message: "تم إرسال طلب إلغاء الفاتورة، بانتظار موافقة الشركاء الثلاثة",
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
