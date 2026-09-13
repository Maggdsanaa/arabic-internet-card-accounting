import { db } from "@/db";
import { auditLog } from "@/db/schema";

export async function createAuditLog({
  userId,
  userName,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  ipAddress,
  userAgent,
  approvalRequestId,
}: {
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
  approvalRequestId?: number;
}) {
  await db.insert(auditLog).values({
    userId,
    userName,
    action,
    entityType,
    entityId,
    oldData: oldData as Record<string, unknown> | null,
    newData: newData as Record<string, unknown> | null,
    ipAddress,
    userAgent,
    approvalRequestId,
  });
}
