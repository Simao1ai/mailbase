import { Router, type IRouter } from "express";
import { db, businessesTable, tenantApiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { requireMasterKey } from "../middleware/apiKey";

const router: IRouter = Router();

router.use(requireMasterKey);

// ─── Businesses ───────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const businesses = await db.select().from(businessesTable).orderBy(businessesTable.createdAt);
    const keys = await db.select().from(tenantApiKeysTable).where(eq(tenantApiKeysTable.isActive, true));

    const keyCountByBusiness: Record<string, number> = {};
    for (const k of keys) {
      keyCountByBusiness[k.business] = (keyCountByBusiness[k.business] ?? 0) + 1;
    }

    res.json(businesses.map(b => ({ ...b, activeKeyCount: keyCountByBusiness[b.slug] ?? 0 })));
  } catch (err) {
    req.log.error({ err }, "Failed to list tenants");
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { slug, label } = req.body as { slug: string; label: string };
    if (!slug || !label) return res.status(400).json({ error: "slug and label are required" });

    const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.slug, normalizedSlug)).limit(1);
    if (existing) return res.status(409).json({ error: "A tenant with this slug already exists" });

    const [created] = await db.insert(businessesTable).values({ slug: normalizedSlug, label }).returning();
    res.status(201).json({ ...created, activeKeyCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create tenant");
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.patch("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { label, isActive } = req.body as { label?: string; isActive?: boolean };

    const updates: Partial<{ label: string; isActive: boolean }> = {};
    if (label !== undefined) updates.label = label;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(businessesTable).set(updates).where(eq(businessesTable.slug, slug)).returning();
    if (!updated) return res.status(404).json({ error: "Tenant not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update tenant");
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

router.delete("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    await db.update(tenantApiKeysTable).set({ isActive: false }).where(eq(tenantApiKeysTable.business, slug));
    await db.delete(businessesTable).where(eq(businessesTable.slug, slug));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tenant");
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

// ─── Tenant API Keys ──────────────────────────────────────────

router.get("/:slug/keys", async (req, res) => {
  try {
    const { slug } = req.params;
    const keys = await db.select({
      id: tenantApiKeysTable.id,
      business: tenantApiKeysTable.business,
      name: tenantApiKeysTable.name,
      keyPrefix: tenantApiKeysTable.keyPrefix,
      isActive: tenantApiKeysTable.isActive,
      createdAt: tenantApiKeysTable.createdAt,
      lastUsedAt: tenantApiKeysTable.lastUsedAt,
    }).from(tenantApiKeysTable).where(and(eq(tenantApiKeysTable.business, slug), eq(tenantApiKeysTable.isActive, true)));
    res.json(keys);
  } catch (err) {
    req.log.error({ err }, "Failed to list tenant keys");
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

router.post("/:slug/keys", async (req, res) => {
  try {
    const { slug } = req.params;
    const { name } = req.body as { name: string };
    if (!name) return res.status(400).json({ error: "name is required" });

    const [tenant] = await db.select().from(businessesTable).where(eq(businessesTable.slug, slug)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const rawKey = `mb_tenant_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 20);

    const [created] = await db.insert(tenantApiKeysTable).values({
      business: slug,
      name,
      keyPrefix,
      keyHash,
    }).returning({
      id: tenantApiKeysTable.id,
      business: tenantApiKeysTable.business,
      name: tenantApiKeysTable.name,
      keyPrefix: tenantApiKeysTable.keyPrefix,
      isActive: tenantApiKeysTable.isActive,
      createdAt: tenantApiKeysTable.createdAt,
      lastUsedAt: tenantApiKeysTable.lastUsedAt,
    });

    // Return full key ONCE — it cannot be retrieved again
    res.status(201).json({ ...created, fullKey: rawKey });
  } catch (err) {
    req.log.error({ err }, "Failed to create tenant key");
    res.status(500).json({ error: "Failed to generate API key" });
  }
});

router.delete("/:slug/keys/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(tenantApiKeysTable).set({ isActive: false }).where(eq(tenantApiKeysTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to revoke tenant key");
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

export default router;
