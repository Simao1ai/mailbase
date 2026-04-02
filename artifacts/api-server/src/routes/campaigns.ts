import { Router, type IRouter } from "express";
import { db, campaignsTable, contactsTable, listContactsTable, domainsTable, emailEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { business } = req.query as { business?: string };
    const campaigns = await db.select().from(campaignsTable)
      .where(business ? eq(campaignsTable.business, business) : undefined)
      .orderBy(campaignsTable.createdAt);
    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaigns");
    res.status(500).json({ error: "Failed to get campaigns" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    res.json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign");
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { business, name, subject, domainId, listId, templateId, htmlContent } = req.body;
    const [created] = await db.insert(campaignsTable).values({
      business,
      name,
      subject,
      domainId,
      listId,
      templateId: templateId ?? null,
      htmlContent,
      status: "draft",
      recipientCount: 0,
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, subject, domainId, listId, templateId, htmlContent } = req.body;
    const [updated] = await db.update(campaignsTable)
      .set({
        ...(name !== undefined && { name }),
        ...(subject !== undefined && { subject }),
        ...(domainId !== undefined && { domainId }),
        ...(listId !== undefined && { listId }),
        ...(templateId !== undefined && { templateId }),
        ...(htmlContent !== undefined && { htmlContent }),
        updatedAt: new Date(),
      })
      .where(eq(campaignsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Campaign not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete campaign");
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

router.post("/:id/send", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.status !== "draft") return res.status(400).json({ error: "Campaign is not in draft status" });

    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, campaign.domainId));
    if (!domain) return res.status(400).json({ error: "Domain not found" });

    const listContacts = await db
      .select({ contact: contactsTable })
      .from(listContactsTable)
      .innerJoin(contactsTable, eq(listContactsTable.contactId, contactsTable.id))
      .where(eq(listContactsTable.listId, campaign.listId));

    const activeContacts = listContacts
      .map((lc) => lc.contact)
      .filter((c) => !c.unsubscribed);

    await db.update(campaignsTable)
      .set({ status: "sending", updatedAt: new Date() })
      .where(eq(campaignsTable.id, id));

    res.json({ message: `Campaign send initiated for ${activeContacts.length} recipients` });

    setImmediate(async () => {
      try {
        const resendKey = process.env.RESEND_API_KEY;
        let successCount = 0;

        for (const contact of activeContacts) {
          const baseUrl = process.env.REPLIT_DOMAINS
            ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
            : "http://localhost";

          const trackingPixel = `<img src="${baseUrl}/track/open/${id}/${contact.id}" width="1" height="1" style="display:none" />`;
          const unsubscribeUrl = `${baseUrl}/unsubscribe/${contact.unsubscribeToken}`;
          const unsubscribeFooter = `
            <p style="font-size:12px;color:#999;margin-top:40px;text-align:center;">
              You received this email because you're subscribed to our list.
              <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a>
            </p>
          `;

          let html = campaign.htmlContent;
          html = html.replace(/<a\s+href="([^"]+)"/gi, (match, url) => {
            if (url.startsWith("/track/") || url.startsWith(`${baseUrl}/track/`)) return match;
            const encodedUrl = encodeURIComponent(url);
            return `<a href="${baseUrl}/track/click/${id}/${contact.id}?url=${encodedUrl}"`;
          });
          html += trackingPixel + unsubscribeFooter;

          if (resendKey) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: `${domain.fromName} <${domain.fromEmail}>`,
                  to: [contact.email],
                  subject: campaign.subject,
                  html,
                }),
              });
            } catch (sendErr) {
              logger.warn({ sendErr, contactId: contact.id }, "Failed to send email to contact");
            }
          }

          await db.insert(emailEventsTable).values({
            campaignId: id,
            contactId: contact.id,
            type: "sent",
          });

          successCount++;
          await new Promise((r) => setTimeout(r, 50));
        }

        await db.update(campaignsTable)
          .set({
            status: "sent",
            sentAt: new Date(),
            recipientCount: successCount,
            updatedAt: new Date(),
          })
          .where(eq(campaignsTable.id, id));
      } catch (bgErr) {
        logger.error({ bgErr }, "Campaign send background task failed");
        await db.update(campaignsTable)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(campaignsTable.id, id));
      }
    });
  } catch (err) {
    req.log.error({ err }, "Failed to initiate campaign send");
    res.status(500).json({ error: "Failed to initiate campaign send" });
  }
});

export default router;
