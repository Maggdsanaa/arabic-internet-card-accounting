import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { internetCards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createApprovalRequest, NoPartnersError } from "@/lib/approvals";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const card = await db
      .select()
      .from(internetCards)
      .where(eq(internetCards.id, parseInt(id)))
      .limit(1);

    if (!card[0]) {
      return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });
    }
    return NextResponse.json(card[0]);
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
    const cardId = parseInt(id);
    const body = await req.json();

    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب التعديل مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(internetCards)
      .where(eq(internetCards.id, cardId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });
    }

    const request = await createApprovalRequest({
      user,
      operationType: "update",
      entityType: "card",
      entityId: cardId,
      oldData: existing[0],
      newData: {
        name: body.name,
        description: body.description,
        cardType: body.cardType,
        durationDays: body.durationDays,
        speed: body.speed,
        provider: body.provider,
        purchasePrice: body.purchasePrice,
        sellingPrice: body.sellingPrice,
        minQuantity: body.minQuantity,
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

// Delete requires triple-partner approval; the card is only deactivated after full approval.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const cardId = parseInt(id);
    const body = await req.json().catch(() => ({}));

    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب الحذف مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(internetCards)
      .where(eq(internetCards.id, cardId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "الكارت غير موجود" }, { status: 404 });
    }

    const request = await createApprovalRequest({
      user,
      operationType: "delete",
      entityType: "card",
      entityId: cardId,
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
