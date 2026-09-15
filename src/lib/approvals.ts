import { db } from "@/db";
import { approvalRequests, partners } from "@/db/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit";
import type { AuthUser } from "@/lib/auth";

export class NoPartnersError extends Error {
  constructor() {
    super("يجب وجود 3 شركاء نشطين على الأقل لإنشاء طلب موافقة");
    this.name = "NoPartnersError";
  }
}

/**
 * Creates a triple-partner approval request instead of applying a change directly.
 * Any update/delete on protected entities MUST go through this function.
 */
export async function createApprovalRequest(params: {
  user: AuthUser;
  operationType: "create" | "update" | "delete";
  entityType: string;
  entityId?: number;
  oldData?: unknown;
  newData?: unknown;
  reason: string;
}) {
  const allPartners = await db
    .select()
    .from(partners)
    .where(eq(partners.isActive, true))
    .limit(3);

  if (allPartners.length < 3) {
    throw new NoPartnersError();
  }

  const countResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(approvalRequests);
  const requestNumber = `APPR-${String(
    parseInt(countResult[0]?.count || "0") + 1
  ).padStart(6, "0")}`;

  const [request] = await db
    .insert(approvalRequests)
    .values({
      requestNumber,
      operationType: params.operationType,
      entityType: params.entityType,
      entityId: params.entityId,
      oldData: params.oldData as Record<string, unknown> | null,
      newData: params.newData as Record<string, unknown> | null,
      reason: params.reason,
      status: "pending",
      requestedBy: params.user.id,
      partner1Id: allPartners[0].id,
      partner1Status: "pending",
      partner2Id: allPartners[1].id,
      partner2Status: "pending",
      partner3Id: allPartners[2].id,
      partner3Status: "pending",
    })
    .returning();

  await createAuditLog({
    userId: params.user.id,
    userName: params.user.name,
    action: "create_approval_request",
    entityType: params.entityType,
    entityId: params.entityId,
    oldData: params.oldData,
    newData: params.newData,
    approvalRequestId: request.id,
  });

  return request;
}
