import { Router, type IRouter } from "express";
import { db, emailEventsTable, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

router.get("/open/:campaignId/:contactId", async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    const contactId = parseInt(req.params.contactId);
    await db.insert(emailEventsTable).values({ campaignId, contactId, type: "opened" });
  } catch (_) {}
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.send(TRACKING_PIXEL);
});

router.get("/click/:campaignId/:contactId", async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);
    const contactId = parseInt(req.params.contactId);
    const url = req.query.url as string;
    await db.insert(emailEventsTable).values({
      campaignId,
      contactId,
      type: "clicked",
      metadata: { url },
    });
    if (url) {
      const decoded = decodeURIComponent(url);
      return res.redirect(decoded);
    }
  } catch (_) {}
  res.status(204).send();
});

router.get("/unsubscribe/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const [contact] = await db.select().from(contactsTable)
      .where(eq(contactsTable.unsubscribeToken, token));
    if (contact) {
      await db.update(contactsTable)
        .set({ unsubscribed: true })
        .where(eq(contactsTable.id, contact.id));
    }
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Unsubscribed - MailBase</title>
        <style>
          body { font-family: Arial, sans-serif; background: #07080f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #0d0f1a; border: 1px solid #1e2035; border-radius: 12px; padding: 48px; text-align: center; max-width: 400px; }
          h1 { color: #3effa0; margin-bottom: 16px; }
          p { color: #888; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Unsubscribed</h1>
          <p>You have been successfully unsubscribed and will no longer receive emails from this list.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error processing unsubscribe request");
  }
});

export default router;
