import { Router, type IRouter } from "express";
import { db, templatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { business } = req.query as { business?: string };
    const templates = await db.select().from(templatesTable)
      .where(business ? eq(templatesTable.business, business) : undefined)
      .orderBy(templatesTable.createdAt);
    res.json(templates);
  } catch (err) {
    req.log.error({ err }, "Failed to get templates");
    res.status(500).json({ error: "Failed to get templates" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (err) {
    req.log.error({ err }, "Failed to get template");
    res.status(500).json({ error: "Failed to get template" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { business, name, subject, htmlContent } = req.body;
    const [created] = await db.insert(templatesTable).values({ business, name, subject, htmlContent }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create template");
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, subject, htmlContent } = req.body;
    const [updated] = await db.update(templatesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
        updatedAt: new Date(),
      })
      .where(eq(templatesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Template not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update template");
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(templatesTable).where(eq(templatesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete template");
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export default router;
