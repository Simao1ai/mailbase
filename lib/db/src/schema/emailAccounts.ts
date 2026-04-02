import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailAccountsTable = pgTable("email_accounts", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull(),
  imapHost: text("imap_host").notNull().default("imap.zoho.com"),
  imapPort: integer("imap_port").notNull().default(993),
  smtpHost: text("smtp_host").notNull().default("smtp.zoho.com"),
  smtpPort: integer("smtp_port").notNull().default(465),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EmailAccount = typeof emailAccountsTable.$inferSelect;
