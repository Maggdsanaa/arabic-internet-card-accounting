import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { suppliers, accounts } from "@/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const supplierSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    if (search) {
      const results = await db
        .select()
        .from(suppliers)
        .where(
          or(
            ilike(suppliers.name, `%${search}%`),
            ilike(suppliers.phone, `%${search}%`)
          )
        );
      return NextResponse.json(results);
    }

    const results = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.isActive, true));
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
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;

    const count = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(suppliers);
    const code = `SUPP-${String(parseInt(count[0]?.count || "0") + 1).padStart(4, "0")}`;

    // Create supplier AP account
    const apParent = await db
      .select()
      .from(accounts)
      .where(eq(accounts.code, "2100"))
      .limit(1);

    const [supplierAccount] = await db
      .insert(accounts)
      .values({
        code: `2100-${code}`,
        name: `Supplier - ${data.name}`,
        nameAr: `مورد - ${data.name}`,
        type: "liability",
        parentId: apParent[0]?.id,
        isSystem: false,
      })
      .returning();

    const [supplier] = await db
      .insert(suppliers)
      .values({
        code,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        accountId: supplierAccount.id,
        notes: data.notes,
        createdBy: user.id,
      })
      .returning();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "create",
      entityType: "supplier",
      entityId: supplier.id,
      newData: supplier,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
