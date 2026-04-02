import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";

export const listsTable = pgTable("lists", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listContactsTable = pgTable("list_contacts", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull().references(() => listsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertListSchema = createInsertSchema(listsTable).omit({ id: true, createdAt: true });
export type InsertList = z.infer<typeof insertListSchema>;
export type List = typeof listsTable.$inferSelect;
