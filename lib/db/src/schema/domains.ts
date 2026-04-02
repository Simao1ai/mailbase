import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const domainsTable = pgTable("domains", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  businessLabel: text("business_label").notNull(),
  domain: text("domain").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  resendDomainId: text("resend_domain_id"),
  status: text("status").notNull().default("pending"),
  dnsRecords: jsonb("dns_records"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export const insertDomainSchema = createInsertSchema(domainsTable).omit({ id: true, createdAt: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domainsTable.$inferSelect;
