import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { search, business } = req.query as { search?: string; business?: string };
    let query = db.select().from(contactsTable);
    const conditions = [];
    if (business) conditions.push(eq(contactsTable.business, business));
    if (search) {
      conditions.push(
        or(
          ilike(contactsTable.email, `%${search}%`),
          ilike(contactsTable.firstName, `%${search}%`),
          ilike(contactsTable.lastName, `%${search}%`)
        )
      );
    }
    if (conditions.length > 0) {
      const contacts = await query.where(and(...conditions)).orderBy(contactsTable.createdAt);
      return res.json(contacts);
    }
    const contacts = await query.orderBy(contactsTable.createdAt);
    res.json(contacts);
  } catch (err) {
    req.log.error({ err }, "Failed to get contacts");
    res.status(500).json({ error: "Failed to get contacts" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, id));
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (err) {
    req.log.error({ err }, "Failed to get contact");
    res.status(500).json({ error: "Failed to get contact" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { business, email, firstName, lastName, tags, metadata } = req.body;
    const [created] = await db.insert(contactsTable).values({
      business,
      email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      tags: tags ?? [],
      unsubscribeToken: randomUUID(),
      metadata: metadata ?? null,
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create contact");
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { business, contacts } = req.body as {
      business: string;
      contacts: Array<{ email: string; firstName?: string; lastName?: string; tags?: string[] }>;
    };
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of contacts) {
      try {
        await db.insert(contactsTable).values({
          business,
          email: c.email,
          firstName: c.firstName ?? null,
          lastName: c.lastName ?? null,
          tags: c.tags ?? [],
          unsubscribeToken: randomUUID(),
        }).onConflictDoNothing();
        imported++;
      } catch (e) {
        skipped++;
        errors.push(`${c.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    res.json({ imported, skipped, errors });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk import contacts");
    res.status(500).json({ error: "Failed to bulk import contacts" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, firstName, lastName, tags, unsubscribed, metadata } = req.body;
    const [updated] = await db.update(contactsTable)
      .set({
        ...(email !== undefined && { email }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(tags !== undefined && { tags }),
        ...(unsubscribed !== undefined && { unsubscribed }),
        ...(metadata !== undefined && { metadata }),
      })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Contact not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update contact");
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete contact");
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
