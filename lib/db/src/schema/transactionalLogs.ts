import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionalLogsTable = pgTable("transactional_logs", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  type: text("type").notNull(),
  toEmail: text("to_email").notNull(),
  status: text("status").notNull().default("sent"),
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const insertTransactionalLogSchema = createInsertSchema(transactionalLogsTable).omit({ id: true, sentAt: true });
export type InsertTransactionalLog = z.infer<typeof insertTransactionalLogSchema>;
export type TransactionalLog = typeof transactionalLogsTable.$inferSelect;
