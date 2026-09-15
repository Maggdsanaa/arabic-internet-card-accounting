import { db } from "@/db";
import {
  users,
  accounts,
  partners,
  treasury,
} from "@/db/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) return;

  // Create chart of accounts
  const accountsData = [
    // Assets
    { code: "1000", name: "Assets", nameAr: "الأصول", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1100", name: "Current Assets", nameAr: "الأصول المتداولة", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1110", name: "Cash", nameAr: "النقدية", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1120", name: "Bank", nameAr: "البنك", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1200", name: "Accounts Receivable", nameAr: "ذمم مدينة", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1300", name: "Inventory", nameAr: "المخزون", type: "asset" as const, parentId: null, isSystem: true },
    { code: "1310", name: "Internet Cards Inventory", nameAr: "مخزون كروت الإنترنت", type: "asset" as const, parentId: null, isSystem: true },
    // Liabilities
    { code: "2000", name: "Liabilities", nameAr: "الالتزامات", type: "liability" as const, parentId: null, isSystem: true },
    { code: "2100", name: "Accounts Payable", nameAr: "ذمم دائنة", type: "liability" as const, parentId: null, isSystem: true },
    // Equity
    { code: "3000", name: "Equity", nameAr: "حقوق الملكية", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3100", name: "Partner 1 Capital", nameAr: "رأس مال الشريك الأول", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3110", name: "Partner 1 Drawings", nameAr: "مسحوبات الشريك الأول", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3200", name: "Partner 2 Capital", nameAr: "رأس مال الشريك الثاني", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3210", name: "Partner 2 Drawings", nameAr: "مسحوبات الشريك الثاني", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3300", name: "Partner 3 Capital", nameAr: "رأس مال الشريك الثالث", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3310", name: "Partner 3 Drawings", nameAr: "مسحوبات الشريك الثالث", type: "equity" as const, parentId: null, isSystem: true },
    { code: "3400", name: "Retained Earnings", nameAr: "الأرباح المحتجزة", type: "equity" as const, parentId: null, isSystem: true },
    // Revenue
    { code: "4000", name: "Revenue", nameAr: "الإيرادات", type: "revenue" as const, parentId: null, isSystem: true },
    { code: "4100", name: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "revenue" as const, parentId: null, isSystem: true },
    { code: "4200", name: "Other Revenue", nameAr: "إيرادات أخرى", type: "revenue" as const, parentId: null, isSystem: true },
    // Expenses
    { code: "5000", name: "Expenses", nameAr: "المصروفات", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5100", name: "Cost of Goods Sold", nameAr: "تكلفة البضاعة المباعة", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5200", name: "Salary Expense", nameAr: "مصروف الرواتب", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5300", name: "Rent Expense", nameAr: "مصروف الإيجار", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5400", name: "Utilities Expense", nameAr: "مصروف المرافق", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5500", name: "Marketing Expense", nameAr: "مصروف التسويق", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5600", name: "General Expense", nameAr: "مصروفات عامة", type: "expense" as const, parentId: null, isSystem: true },
    { code: "5700", name: "Transportation Expense", nameAr: "مصروف النقل", type: "expense" as const, parentId: null, isSystem: true },
  ];

  const insertedAccounts = await db.insert(accounts).values(accountsData).returning();

  const getAccountId = (code: string) =>
    insertedAccounts.find((a) => a.code === code)?.id!;

  // Create partners
  const partnersData = [
    {
      name: "الشريك الأول - أحمد",
      phone: "0501234567",
      email: "partner1@company.com",
      capitalAccountId: getAccountId("3100"),
      drawingsAccountId: getAccountId("3110"),
      sharePercentage: "33.33",
      isActive: true,
    },
    {
      name: "الشريك الثاني - محمد",
      phone: "0507654321",
      email: "partner2@company.com",
      capitalAccountId: getAccountId("3200"),
      drawingsAccountId: getAccountId("3210"),
      sharePercentage: "33.33",
      isActive: true,
    },
    {
      name: "الشريك الثالث - خالد",
      phone: "0509876543",
      email: "partner3@company.com",
      capitalAccountId: getAccountId("3300"),
      drawingsAccountId: getAccountId("3310"),
      sharePercentage: "33.34",
      isActive: true,
    },
  ];

  const insertedPartners = await db.insert(partners).values(partnersData).returning();

  // Create users — partners only. No admin/accountant accounts: every action
  // that touches money or records requires the 3 partners, and each partner
  // manages their own password after first login.
  const password1 = await hashPassword("Partner1@2024");
  const password2 = await hashPassword("Partner2@2024");
  const password3 = await hashPassword("Partner3@2024");

  await db.insert(users).values([
    {
      name: "الشريك الأول - أحمد",
      username: "partner1",
      passwordHash: password1,
      role: "partner",
      partnerId: insertedPartners[0].id,
      isActive: true,
    },
    {
      name: "الشريك الثاني - محمد",
      username: "partner2",
      passwordHash: password2,
      role: "partner",
      partnerId: insertedPartners[1].id,
      isActive: true,
    },
    {
      name: "الشريك الثالث - خالد",
      username: "partner3",
      passwordHash: password3,
      role: "partner",
      partnerId: insertedPartners[2].id,
      isActive: true,
    },
  ]);

  // Update partners with user IDs
  const allUsers = await db.select().from(users);
  const p1User = allUsers.find(u => u.username === "partner1");
  const p2User = allUsers.find(u => u.username === "partner2");
  const p3User = allUsers.find(u => u.username === "partner3");

  if (p1User) await db.update(partners).set({ userId: p1User.id }).where(eq(partners.id, insertedPartners[0].id));
  if (p2User) await db.update(partners).set({ userId: p2User.id }).where(eq(partners.id, insertedPartners[1].id));
  if (p3User) await db.update(partners).set({ userId: p3User.id }).where(eq(partners.id, insertedPartners[2].id));

  // Create treasury
  await db.insert(treasury).values([
    {
      name: "الخزينة الرئيسية",
      accountId: getAccountId("1110"),
      currentBalance: "0",
      isDefault: true,
      isActive: true,
    },
    {
      name: "البنك",
      accountId: getAccountId("1120"),
      currentBalance: "0",
      isDefault: false,
      isActive: true,
    },
  ]);

  console.log("Database seeded successfully");
}
