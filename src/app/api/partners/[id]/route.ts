import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createApprovalRequest, NoPartnersError } from "@/lib/approvals";

// Changing a partner's display name requires triple-partner approval.
// Other partner fields (capital, share %, accounts) are intentionally NOT
// editable here to protect the accounting integrity of the system.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const partnerId = parseInt(id);
    const body = await req.json();

    if (!body.name || String(body.name).trim().length === 0) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    if (!body.reason || String(body.reason).trim().length === 0) {
      return NextResponse.json(
        { error: "سبب التعديل مطلوب" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "الشريك غير موجود" }, { status: 404 });
    }

    const request = await createApprovalRequest({
      user,
      operationType: "update",
      entityType: "partner_name",
      entityId: partnerId,
      oldData: { name: existing[0].name },
      newData: { name: body.name },
      reason: body.reason,
    });

    return NextResponse.json(
      {
        message: "تم إرسال طلب تعديل اسم الشريك، بانتظار موافقة الشركاء الثلاثة",
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
