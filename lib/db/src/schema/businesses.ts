import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const businessesTable = pgTable("businesses", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Business = typeof businessesTable.$inferSelect;
