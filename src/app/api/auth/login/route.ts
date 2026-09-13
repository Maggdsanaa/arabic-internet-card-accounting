import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signToken, COOKIE_NAME_EXPORT } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Initialize DB on first login
    await seedDatabase();

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { username, password } = parsed.data;

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const user = userRows[0];

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const authUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      partnerId: user.partnerId,
    };

    const token = signToken(authUser);

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "login",
      entityType: "user",
      entityId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const response = NextResponse.json({ user: authUser, success: true });
    response.cookies.set(COOKIE_NAME_EXPORT, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
