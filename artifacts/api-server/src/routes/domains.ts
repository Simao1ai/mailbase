import { Router, type IRouter } from "express";
import { db, domainsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function fetchResendDomains(resendKey: string): Promise<Array<{ id: string; name: string; records?: unknown[] }>> {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: Array<{ id: string; name: string }> };
    return data.data ?? [];
  } catch {
    return [];
  }
}

async function fetchResendDomain(resendKey: string, domainId: string): Promise<{ id: string; status?: string; records?: unknown[] } | null> {
  try {
    const res = await fetch(`https://api.resend.com/domains/${domainId}`, {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!res.ok) return null;
    return await res.json() as { id: string; status?: string; records?: unknown[] };
  } catch {
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const domains = await db.select().from(domainsTable).orderBy(domainsTable.createdAt);
    res.json(domains);
  } catch (err) {
    req.log.error({ err }, "Failed to get domains");
    res.status(500).json({ error: "Failed to get domains" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, id));
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    res.json(domain);
  } catch (err) {
    req.log.error({ err }, "Failed to get domain");
    res.status(500).json({ error: "Failed to get domain" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { business, businessLabel, fromName, fromEmail, isDefault } = req.body;
    const domain = (req.body.domain as string)?.toLowerCase().trim();

    const resendKey = process.env.RESEND_API_KEY;
    let resendDomainId: string | null = null;
    let dnsRecords: unknown[] = [];
    let status = "pending";

    if (resendKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/domains", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json() as { id?: string; records?: unknown[] };
          resendDomainId = resendData.id ?? null;
          dnsRecords = resendData.records ?? [];
        } else {
          const errData = await resendRes.json().catch(() => ({})) as { message?: string; statusCode?: number };

          // Check if domain already exists in Resend (find and reuse it, case-insensitive)
          const allDomains = await fetchResendDomains(resendKey);
          const existing = allDomains.find(d => d.name.toLowerCase() === domain.toLowerCase());
          if (existing) {
            resendDomainId = existing.id;
            const detail = await fetchResendDomain(resendKey, existing.id);
            dnsRecords = detail?.records ?? [];
          } else if (resendRes.status === 403 && errData.message?.toLowerCase().includes("plan")) {
            // Only surface plan-limit errors when the domain truly isn't there
            return res.status(402).json({
              error: errData.message ?? "Resend plan limit reached. Delete an existing domain or upgrade your Resend plan.",
            });
          } else {
            req.log.warn({ status: resendRes.status, errData }, "Resend domain creation failed");
          }
        }
      } catch (resendErr) {
        req.log.warn({ resendErr }, "Resend domain registration failed, continuing without it");
      }
    }

    const [created] = await db.insert(domainsTable).values({
      business,
      businessLabel: businessLabel ?? business,
      domain,
      fromName,
      fromEmail,
      isDefault: isDefault ?? false,
      resendDomainId,
      status,
      dnsRecords: dnsRecords.length > 0 ? dnsRecords : null,
    }).returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to create domain");
    res.status(500).json({ error: "Failed to create domain" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fromName, fromEmail, isDefault, businessLabel } = req.body;
    const [updated] = await db.update(domainsTable)
      .set({ fromName, fromEmail, isDefault, businessLabel })
      .where(eq(domainsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Domain not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update domain");
    res.status(500).json({ error: "Failed to update domain" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(domainsTable).where(eq(domainsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete domain");
    res.status(500).json({ error: "Failed to delete domain" });
  }
});

router.post("/:id/verify", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [domain] = await db.select().from(domainsTable).where(eq(domainsTable.id, id));
    if (!domain) return res.status(404).json({ error: "Domain not found" });

    const resendKey = process.env.RESEND_API_KEY;
    let status = domain.status;
    let verifiedAt = domain.verifiedAt;
    let resendDomainId = domain.resendDomainId;
    let dnsRecords = domain.dnsRecords;

    if (resendKey) {
      // If we don't have a Resend ID yet, try to find the domain by name (case-insensitive)
      if (!resendDomainId) {
        const allDomains = await fetchResendDomains(resendKey);
        const existing = allDomains.find(d => d.name.toLowerCase() === domain.domain.toLowerCase());
        if (existing) {
          resendDomainId = existing.id;
        }
      }

      if (resendDomainId) {
        try {
          // Fetch current status first — if already verified, skip the trigger
          // (triggering re-verification resets Resend's status to "pending" temporarily)
          let detail = await fetchResendDomain(resendKey, resendDomainId);
          req.log.info({ resendDomainId, detailStatus: detail?.status, recordCount: (detail?.records as unknown[])?.length }, "Resend domain detail fetched (pre-trigger)");

          const isAlreadyVerified = detail?.status === "verified" ||
            (detail?.records as Array<{ status?: string }> | undefined)?.every(r => r.status === "verified");

          if (!isAlreadyVerified) {
            // Trigger Resend to re-check DNS and wait briefly for it to process
            await fetch(`https://api.resend.com/domains/${resendDomainId}/verify`, {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}` },
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            detail = await fetchResendDomain(resendKey, resendDomainId);
            req.log.info({ detailStatus: detail?.status }, "Resend domain detail fetched (post-trigger)");
          }

          if (detail) {
            const records = detail.records as Array<{ status?: string }> | undefined;
            const allRecordsVerified = records && records.length > 0 && records.every(r => r.status === "verified");
            if (detail.status === "verified" || allRecordsVerified) {
              status = "verified";
              verifiedAt = new Date();
            }
            if (records && records.length > 0) {
              dnsRecords = records;
            }
          }
        } catch (resendErr) {
          req.log.warn({ resendErr }, "Resend verify call failed");
        }
      }
    }

    const [updated] = await db.update(domainsTable)
      .set({ status, verifiedAt, resendDomainId, dnsRecords })
      .where(eq(domainsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to verify domain");
    res.status(500).json({ error: "Failed to verify domain" });
  }
});

export default router;
