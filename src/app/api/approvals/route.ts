import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { approvalRequests, partners, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const approvalSchema = z.object({
  operationType: z.enum(["create", "update", "delete", "approve", "reject"]),
  entityType: z.string().min(1),
  entityId: z.number().optional(),
  oldData: z.unknown().optional(),
  newData: z.unknown().optional(),
  reason: z.string().min(1, "سبب الطلب مطلوب"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const results = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.status, status as "pending" | "approved" | "rejected" | "cancelled"))
      .orderBy(desc(approvalRequests.createdAt))
      .limit(50);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = approvalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    // Get all 3 partners
    const allPartners = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .limit(3);

    if (allPartners.length < 3) {
      return NextResponse.json(
        { error: "يجب وجود 3 شركاء على الأقل" },
        { status: 400 }
      );
    }

    const countResult = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(approvalRequests);
    const requestNumber = `APPR-${String(parseInt(countResult[0]?.count || "0") + 1).padStart(6, "0")}`;

    const [request] = await db
      .insert(approvalRequests)
      .values({
        requestNumber,
        operationType: data.operationType,
        entityType: data.entityType,
        entityId: data.entityId,
        oldData: data.oldData as Record<string, unknown> | null,
        newData: data.newData as Record<string, unknown> | null,
        reason: data.reason,
        status: "pending",
        requestedBy: user.id,
        partner1Id: allPartners[0].id,
        partner1Status: "pending",
        partner2Id: allPartners[1].id,
        partner2Status: "pending",
        partner3Id: allPartners[2].id,
        partner3Status: "pending",
      })
      .returning();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create_approval_request",
      entityType: data.entityType,
      entityId: data.entityId,
      newData: { requestNumber, reason: data.reason },
      approvalRequestId: request.id,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
