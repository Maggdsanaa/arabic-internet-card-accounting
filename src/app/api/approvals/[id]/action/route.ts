import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { approvalRequests, partners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { executeApprovedRequest } from "@/lib/approvalExecutor";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    // Only partners can approve/reject
    if (user.role !== "partner") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { id } = await params;
    const requestId = parseInt(id);
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { action, comment } = parsed.data;

    const request = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId))
      .limit(1);

    if (!request[0]) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    if (request[0].status !== "pending") {
      return NextResponse.json(
        { error: "الطلب تمت معالجته مسبقاً" },
        { status: 400 }
      );
    }

    // Find which partner slot this user belongs to
    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, user.id))
      .limit(1);

    if (!partner[0]) {
      return NextResponse.json(
        { error: "لم يتم العثور على حساب الشريك" },
        { status: 403 }
      );
    }

    const partnerId = partner[0].id;
    const now = new Date();
    const statusValue = action === "approve" ? "approved" : "rejected";

    let updateData: Record<string, unknown> = {};

    if (request[0].partner1Id === partnerId) {
      if (request[0].partner1Status !== "pending") {
        return NextResponse.json(
          { error: "لقد قمت بالتصويت مسبقاً" },
          { status: 400 }
        );
      }
      updateData = {
        partner1Status: statusValue,
        partner1Comment: comment,
        partner1ActionAt: now,
        updatedAt: now,
      };
    } else if (request[0].partner2Id === partnerId) {
      if (request[0].partner2Status !== "pending") {
        return NextResponse.json(
          { error: "لقد قمت بالتصويت مسبقاً" },
          { status: 400 }
        );
      }
      updateData = {
        partner2Status: statusValue,
        partner2Comment: comment,
        partner2ActionAt: now,
        updatedAt: now,
      };
    } else if (request[0].partner3Id === partnerId) {
      if (request[0].partner3Status !== "pending") {
        return NextResponse.json(
          { error: "لقد قمت بالتصويت مسبقاً" },
          { status: 400 }
        );
      }
      updateData = {
        partner3Status: statusValue,
        partner3Comment: comment,
        partner3ActionAt: now,
        updatedAt: now,
      };
    } else {
      return NextResponse.json(
        { error: "لا تملك صلاحية الموافقة على هذا الطلب" },
        { status: 403 }
      );
    }

    await db
      .update(approvalRequests)
      .set(updateData)
      .where(eq(approvalRequests.id, requestId));

    // Re-fetch updated request
    const updated = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, requestId))
      .limit(1);

    const req2 = updated[0];

    // Check if all voted
    const allApproved =
      req2.partner1Status === "approved" &&
      req2.partner2Status === "approved" &&
      req2.partner3Status === "approved";

    const anyRejected =
      req2.partner1Status === "rejected" ||
      req2.partner2Status === "rejected" ||
      req2.partner3Status === "rejected";

    if (allApproved) {
      await db
        .update(approvalRequests)
        .set({ status: "approved", executedAt: now, updatedAt: now })
        .where(eq(approvalRequests.id, requestId));

      try {
        await executeApprovedRequest(req2, user.id);
      } catch (execError) {
        console.error("Approval execution error:", execError);
        await createAuditLog({
          userId: user.id,
          userName: user.name,
          action: "execution_failed",
          entityType: req2.entityType,
          entityId: req2.entityId ?? undefined,
          newData: {
            error:
              execError instanceof Error
                ? execError.message
                : String(execError),
          },
          approvalRequestId: requestId,
        });
      }
    } else if (anyRejected) {
      await db
        .update(approvalRequests)
        .set({ status: "rejected", updatedAt: now })
        .where(eq(approvalRequests.id, requestId));
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: `partner_${action}`,
      entityType: "approval_request",
      entityId: requestId,
      newData: { action, comment },
      approvalRequestId: requestId,
    });

    return NextResponse.json({
      success: true,
      status: allApproved ? "approved" : anyRejected ? "rejected" : "pending",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
