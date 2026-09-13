import {
  pgTable,
  serial,
  text,
  varchar,
  decimal,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===================== ENUMS =====================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "partner",
  "accountant",
  "viewer",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "sale",
  "purchase",
  "payment",
  "receipt",
  "expense",
  "journal",
  "opening_balance",
  "partner_deposit",
  "partner_withdrawal",
  "profit_distribution",
]);

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const entryTypeEnum = pgEnum("entry_type", ["debit", "credit"]);

export const approvalActionEnum = pgEnum("approval_action", [
  "approve",
  "reject",
]);

export const cardTypeEnum = pgEnum("card_type", [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

export const operationTypeEnum = pgEnum("operation_type", [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
]);

// ===================== USERS & AUTH =====================

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    username: varchar("username", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("accountant"),
    partnerId: integer("partner_id"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)]
);

// ===================== CHART OF ACCOUNTS =====================

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    nameAr: varchar("name_ar", { length: 255 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    parentId: integer("parent_id"),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("accounts_code_idx").on(t.code)]
);

// ===================== PARTNERS =====================

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  capitalAccountId: integer("capital_account_id"),
  drawingsAccountId: integer("drawings_account_id"),
  profitAccountId: integer("profit_account_id"),
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  userId: integer("user_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===================== CUSTOMERS =====================

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    accountId: integer("account_id"),
    creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).default(
      "0"
    ),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("customers_name_idx").on(t.name)]
);

// ===================== SUPPLIERS =====================

export const suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 20 }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    accountId: integer("account_id"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("suppliers_name_idx").on(t.name)]
);

// ===================== INTERNET CARDS (PRODUCTS) =====================

export const internetCards = pgTable("internet_cards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cardType: cardTypeEnum("card_type").notNull(),
  durationDays: integer("duration_days"),
  speed: varchar("speed", { length: 50 }),
  provider: varchar("provider", { length: 100 }),
  purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  sellingPrice: decimal("selling_price", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(5),
  inventoryAccountId: integer("inventory_account_id"),
  revenueAccountId: integer("revenue_account_id"),
  costAccountId: integer("cost_account_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===================== JOURNAL ENTRIES =====================

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    entryNumber: varchar("entry_number", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    description: text("description").notNull(),
    transactionType: transactionTypeEnum("transaction_type").notNull(),
    referenceId: integer("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    totalDebit: decimal("total_debit", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    totalCredit: decimal("total_credit", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    isVoid: boolean("is_void").notNull().default(false),
    voidReason: text("void_reason"),
    voidedBy: integer("voided_by"),
    voidedAt: timestamp("voided_at"),
    reversalEntryId: integer("reversal_entry_id"),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("journal_entries_number_idx").on(t.entryNumber),
    index("journal_entries_date_idx").on(t.date),
    index("journal_entries_type_idx").on(t.transactionType),
  ]
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id").notNull(),
    accountId: integer("account_id").notNull(),
    description: text("description"),
    debit: decimal("debit", { precision: 15, scale: 2 }).notNull().default("0"),
    credit: decimal("credit", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("journal_lines_entry_idx").on(t.entryId),
    index("journal_lines_account_idx").on(t.accountId),
  ]
);

// ===================== SALES =====================

export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    saleNumber: varchar("sale_number", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    customerId: integer("customer_id"),
    customerName: varchar("customer_name", { length: 255 }),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
    paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default(
      "0"
    ),
    dueAmount: decimal("due_amount", { precision: 15, scale: 2 }).default("0"),
    paymentMethod: varchar("payment_method", { length: 50 }).default("cash"),
    journalEntryId: integer("journal_entry_id"),
    notes: text("notes"),
    isVoid: boolean("is_void").notNull().default(false),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sales_number_idx").on(t.saleNumber),
    index("sales_date_idx").on(t.date),
    index("sales_customer_idx").on(t.customerId),
  ]
);

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  cardId: integer("card_id").notNull(),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===================== PURCHASES =====================

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    purchaseNumber: varchar("purchase_number", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    supplierId: integer("supplier_id"),
    supplierName: varchar("supplier_name", { length: 255 }),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
    paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default(
      "0"
    ),
    dueAmount: decimal("due_amount", { precision: 15, scale: 2 }).default("0"),
    paymentMethod: varchar("payment_method", { length: 50 }).default("cash"),
    journalEntryId: integer("journal_entry_id"),
    notes: text("notes"),
    isVoid: boolean("is_void").notNull().default(false),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("purchases_number_idx").on(t.purchaseNumber),
    index("purchases_date_idx").on(t.date),
  ]
);

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  cardId: integer("card_id").notNull(),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===================== EXPENSES =====================

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    expenseNumber: varchar("expense_number", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    categoryAccountId: integer("category_account_id").notNull(),
    description: text("description").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }).default("cash"),
    journalEntryId: integer("journal_entry_id"),
    notes: text("notes"),
    isVoid: boolean("is_void").notNull().default(false),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("expenses_date_idx").on(t.date)]
);

// ===================== TREASURY (CASH ACCOUNTS) =====================

export const treasury = pgTable("treasury", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  accountId: integer("account_id"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===================== PAYMENTS & RECEIPTS =====================

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    paymentNumber: varchar("payment_number", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'receipt' or 'payment'
    partyType: varchar("party_type", { length: 20 }).notNull(), // 'customer', 'supplier', 'partner'
    partyId: integer("party_id").notNull(),
    partyName: varchar("party_name", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }).default("cash"),
    treasuryId: integer("treasury_id"),
    journalEntryId: integer("journal_entry_id"),
    notes: text("notes"),
    isVoid: boolean("is_void").notNull().default(false),
    createdBy: integer("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("payments_date_idx").on(t.date)]
);

// ===================== APPROVAL REQUESTS =====================

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: serial("id").primaryKey(),
    requestNumber: varchar("request_number", { length: 50 }).notNull(),
    operationType: operationTypeEnum("operation_type").notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: integer("entity_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    reason: text("reason").notNull(),
    status: approvalStatusEnum("status").notNull().default("pending"),
    requestedBy: integer("requested_by").notNull(),
    partner1Id: integer("partner1_id").notNull(),
    partner1Status: approvalStatusEnum("partner1_status")
      .notNull()
      .default("pending"),
    partner1Comment: text("partner1_comment"),
    partner1ActionAt: timestamp("partner1_action_at"),
    partner2Id: integer("partner2_id").notNull(),
    partner2Status: approvalStatusEnum("partner2_status")
      .notNull()
      .default("pending"),
    partner2Comment: text("partner2_comment"),
    partner2ActionAt: timestamp("partner2_action_at"),
    partner3Id: integer("partner3_id").notNull(),
    partner3Status: approvalStatusEnum("partner3_status")
      .notNull()
      .default("pending"),
    partner3Comment: text("partner3_comment"),
    partner3ActionAt: timestamp("partner3_action_at"),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("approval_requests_number_idx").on(t.requestNumber),
    index("approval_requests_status_idx").on(t.status),
  ]
);

// ===================== AUDIT LOG =====================

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: integer("entity_id"),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data"),
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    approvalRequestId: integer("approval_request_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("audit_log_user_idx").on(t.userId),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_created_idx").on(t.createdAt),
  ]
);

// ===================== RELATIONS =====================

export const usersRelations = relations(users, ({ one }) => ({
  partner: one(partners, {
    fields: [users.partnerId],
    references: [partners.id],
  }),
}));

export const partnersRelations = relations(partners, ({ one }) => ({
  capitalAccount: one(accounts, {
    fields: [partners.capitalAccountId],
    references: [accounts.id],
    relationName: "capitalAccount",
  }),
  drawingsAccount: one(accounts, {
    fields: [partners.drawingsAccountId],
    references: [accounts.id],
    relationName: "drawingsAccount",
  }),
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ many }) => ({
    lines: many(journalLines),
  })
);

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.entryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
}));

export const salesRelations = relations(sales, ({ many, one }) => ({
  items: many(saleItems),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ many, one }) => ({
  items: many(purchaseItems),
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  account: one(accounts, {
    fields: [customers.accountId],
    references: [accounts.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one }) => ({
  account: one(accounts, {
    fields: [suppliers.accountId],
    references: [accounts.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type InternetCard = typeof internetCards.$inferSelect;
export type NewInternetCard = typeof internetCards.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Treasury = typeof treasury.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
