import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { customers, accounts, journalEntries } from "@/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import { createJournalEntry } from "@/lib/accounting";

const customerSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().optional(),
  openingBalance: z.number().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    let query = db.select().from(customers).where(eq(customers.isActive, true));

    if (search) {
      const results = await db
        .select()
        .from(customers)
        .where(
          or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.phone, `%${search}%`)
          )
        );
      return NextResponse.json(results);
    }

    const results = await query;
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
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get next customer code
    const count = await db.select({ count: sql<string>`COUNT(*)` }).from(customers);
    const code = `CUST-${String(parseInt(count[0]?.count || "0") + 1).padStart(4, "0")}`;

    // Create customer AR account
    const arParent = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "1200"))
      .limit(1);

    const [customerAccount] = await db
      .insert(accounts)
      .values({
        code: `1200-${code}`,
        name: `Customer - ${data.name}`,
        nameAr: `عميل - ${data.name}`,
        type: "asset",
        parentId: arParent[0]?.id,
        isSystem: false,
      })
      .returning();

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        code,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        accountId: customerAccount.id,
        creditLimit: String(data.creditLimit),
        notes: data.notes,
        createdBy: user.id,
      })
      .returning();

    // Create opening balance journal entry if provided
    if (data.openingBalance > 0) {
      const cashAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.code, "3400"))
        .limit(1);

      await createJournalEntry({
        date: new Date(),
        description: `رصيد افتتاحي - ${data.name}`,
        transactionType: "opening_balance",
        referenceId: customer.id,
        referenceType: "customer",
        createdBy: user.id,
        lines: [
          {
            accountId: customerAccount.id,
            description: `رصيد افتتاحي للعميل ${data.name}`,
            debit: data.openingBalance,
            credit: 0,
          },
          {
            accountId: cashAccount[0]?.id || customerAccount.id,
            description: `رصيد افتتاحي للعميل ${data.name}`,
            debit: 0,
            credit: data.openingBalance,
          },
        ],
      });
    }

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "customer",
      entityId: customer.id,
      newData: customer,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
