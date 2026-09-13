import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "accounting-secret-key-2024";
const COOKIE_NAME = "auth_token";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: string;
  partnerId: number | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    // Verify user still exists and is active
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id))
      .limit(1);
    if (!user[0] || !user[0].isActive) return null;
    return {
      id: user[0].id,
      name: user[0].name,
      username: user[0].username,
      role: user[0].role,
      partnerId: user[0].partnerId,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function requireRole(user: AuthUser, roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
