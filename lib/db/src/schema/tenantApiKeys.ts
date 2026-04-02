import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const tenantApiKeysTable = pgTable("tenant_api_keys", {
  id: serial("id").primaryKey(),
  business: text("business").notNull(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export type TenantApiKey = typeof tenantApiKeysTable.$inferSelect;
