import { db } from "@/db";
import {
  customers,
  suppliers,
  internetCards,
  partners,
  users,
  sales,
  saleItems,
  type ApprovalRequest,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { voidJournalEntry } from "@/lib/accounting";
import { createAuditLog } from "@/lib/audit";

/**
 * Applies the actual database change for a fully-approved request.
 * This is the ONLY place where update/delete on protected entities actually happens.
 * Called right after the 3rd partner approval flips the request to "approved".
 */
export async function executeApprovedRequest(
  request: ApprovalRequest,
  executedByUserId: number
) {
  const newData = (request.newData as Record<string, unknown> | null) ?? null;

  switch (request.entityType) {
    case "customer": {
      if (request.operationType === "update" && request.entityId && newData) {
        await db
          .update(customers)
          .set({
            name: newData.name as string,
            phone: (newData.phone as string) ?? null,
            email: (newData.email as string) ?? null,
            address: (newData.address as string) ?? null,
            creditLimit: String(newData.creditLimit ?? 0),
            notes: (newData.notes as string) ?? null,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, request.entityId));
      } else if (request.operationType === "delete" && request.entityId) {
        await db
          .update(customers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(customers.id, request.entityId));
      }
      break;
    }

    case "supplier": {
      if (request.operationType === "update" && request.entityId && newData) {
        await db
          .update(suppliers)
          .set({
            name: newData.name as string,
            phone: (newData.phone as string) ?? null,
            email: (newData.email as string) ?? null,
            address: (newData.address as string) ?? null,
            notes: (newData.notes as string) ?? null,
            updatedAt: new Date(),
          })
          .where(eq(suppliers.id, request.entityId));
      } else if (request.operationType === "delete" && request.entityId) {
        await db
          .update(suppliers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(suppliers.id, request.entityId));
      }
      break;
    }

    case "card": {
      if (request.operationType === "update" && request.entityId && newData) {
        await db
          .update(internetCards)
          .set({
            name: newData.name as string,
            description: (newData.description as string) ?? null,
            cardType: newData.cardType as
              | "daily"
              | "weekly"
              | "monthly"
              | "quarterly"
              | "yearly"
              | "custom",
            durationDays: (newData.durationDays as number) ?? null,
            speed: (newData.speed as string) ?? null,
            provider: (newData.provider as string) ?? null,
            purchasePrice: String(newData.purchasePrice ?? 0),
            sellingPrice: String(newData.sellingPrice ?? 0),
            minQuantity: (newData.minQuantity as number) ?? 5,
            updatedAt: new Date(),
          })
          .where(eq(internetCards.id, request.entityId));
      } else if (request.operationType === "delete" && request.entityId) {
        await db
          .update(internetCards)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(internetCards.id, request.entityId));
      }
      break;
    }

    case "partner_name": {
      if (request.operationType === "update" && request.entityId && newData) {
        const newName = newData.name as string;
        await db
          .update(partners)
          .set({ name: newName, updatedAt: new Date() })
          .where(eq(partners.id, request.entityId));

        const [linkedPartner] = await db
          .select()
          .from(partners)
          .where(eq(partners.id, request.entityId))
          .limit(1);
        if (linkedPartner?.userId) {
          await db
            .update(users)
            .set({ name: newName, updatedAt: new Date() })
            .where(eq(users.id, linkedPartner.userId));
        }
      }
      break;
    }

    case "sale": {
      if (request.operationType === "delete" && request.entityId) {
        const [sale] = await db
          .select()
          .from(sales)
          .where(eq(sales.id, request.entityId))
          .limit(1);

        if (sale && !sale.isVoid) {
          // Reverse the journal entry (never delete financial records)
          if (sale.journalEntryId) {
            await voidJournalEntry(
              sale.journalEntryId,
              request.reason,
              executedByUserId
            );
          }

          // Restore inventory quantities
          const items = await db
            .select()
            .from(saleItems)
            .where(eq(saleItems.saleId, sale.id));
          for (const item of items) {
            await db
              .update(internetCards)
              .set({
                quantity: sql`${internetCards.quantity} + ${item.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(internetCards.id, item.cardId));
          }

          await db
            .update(sales)
            .set({ isVoid: true, updatedAt: new Date() })
            .where(eq(sales.id, sale.id));
        }
      }
      break;
    }

    default:
      // Unknown entity type: nothing to execute automatically
      break;
  }

  await createAuditLog({
    userId: executedByUserId,
    userName: "system",
    action: `execute_${request.operationType}`,
    entityType: request.entityType,
    entityId: request.entityId ?? undefined,
    oldData: request.oldData,
    newData: request.newData,
    approvalRequestId: request.id,
  });
}
