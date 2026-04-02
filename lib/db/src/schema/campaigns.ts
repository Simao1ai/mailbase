import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { domainsTable } from "./domains";
import { listsTable } from "./lists";
import { templatesTable } from "./templates";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  domainId: integer("domain_id").notNull().references(() => domainsTable.id),
  listId: integer("list_id").notNull().references(() => listsTable.id),
  templateId: integer("template_id").references(() => templatesTable.id),
  htmlContent: text("html_content").notNull(),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
