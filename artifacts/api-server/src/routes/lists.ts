import { Router, type IRouter } from "express";
import { db, listsTable, listContactsTable, contactsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { business } = req.query as { business?: string };
    const lists = await db.select().from(listsTable)
      .where(business ? eq(listsTable.business, business) : undefined)
      .orderBy(listsTable.createdAt);

    const listsWithCount = await Promise.all(
      lists.map(async (list) => {
        const [{ value }] = await db.select({ value: count() }).from(listContactsTable).where(eq(listContactsTable.listId, list.id));
        return { ...list, contactCount: Number(value) };
      })
    );
    res.json(listsWithCount);
  } catch (err) {
    req.log.error({ err }, "Failed to get lists");
    res.status(500).json({ error: "Failed to get lists" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [list] = await db.select().from(listsTable).where(eq(listsTable.id, id));
    if (!list) return res.status(404).json({ error: "List not found" });
    const [{ value }] = await db.select({ value: count() }).from(listContactsTable).where(eq(listContactsTable.listId, id));
    res.json({ ...list, contactCount: Number(value) });
  } catch (err) {
    req.log.error({ err }, "Failed to get list");
    res.status(500).json({ error: "Failed to get list" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { business, name, description } = req.body;
    const [created] = await db.insert(listsTable).values({ business, name, description: description ?? null }).returning();
    res.status(201).json({ ...created, contactCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create list");
    res.status(500).json({ error: "Failed to create list" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [updated] = await db.update(listsTable)
      .set({ ...(name !== undefined && { name }), ...(description !== undefined && { description }) })
      .where(eq(listsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "List not found" });
    const [{ value }] = await db.select({ value: count() }).from(listContactsTable).where(eq(listContactsTable.listId, id));
    res.json({ ...updated, contactCount: Number(value) });
  } catch (err) {
    req.log.error({ err }, "Failed to update list");
    res.status(500).json({ error: "Failed to update list" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(listsTable).where(eq(listsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete list");
    res.status(500).json({ error: "Failed to delete list" });
  }
});

router.get("/:id/contacts", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const contacts = await db
      .select({ contact: contactsTable })
      .from(listContactsTable)
      .innerJoin(contactsTable, eq(listContactsTable.contactId, contactsTable.id))
      .where(eq(listContactsTable.listId, id));
    res.json(contacts.map((c) => c.contact));
  } catch (err) {
    req.log.error({ err }, "Failed to get list contacts");
    res.status(500).json({ error: "Failed to get list contacts" });
  }
});

router.post("/:id/contacts", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { contactIds } = req.body as { contactIds: number[] };
    for (const contactId of contactIds) {
      await db.insert(listContactsTable).values({ listId: id, contactId }).onConflictDoNothing();
    }
    res.json({ message: `Added ${contactIds.length} contacts to list` });
  } catch (err) {
    req.log.error({ err }, "Failed to add contacts to list");
    res.status(500).json({ error: "Failed to add contacts to list" });
  }
});

export default router;
