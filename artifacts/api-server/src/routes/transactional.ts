import { Router, type IRouter } from "express";
import { db, transactionalLogsTable, domainsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const TEMPLATES: Record<string, Record<string, (data: Record<string, string>) => { subject: string; html: string }>> = {
  equifind: {
    case_update: (data) => ({
      subject: `Case Update: ${data.caseId ?? "Your Case"}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#07080f;color:#e0e0e0;padding:32px;border-radius:8px;">
          <div style="color:#3effa0;font-size:24px;font-weight:bold;margin-bottom:24px;">Equifind</div>
          <h2 style="color:#fff;margin-bottom:16px;">Case Update</h2>
          <p>Your case <strong style="color:#3effa0">${data.caseId ?? "N/A"}</strong> has been updated.</p>
          <p><strong>Status:</strong> ${data.status ?? "Pending"}</p>
          ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ""}
          <p style="color:#888;font-size:12px;margin-top:32px;">This is an automated update from Equifind.</p>
        </div>
      `,
    }),
    welcome: (data) => ({
      subject: "Welcome to Equifind",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#07080f;color:#e0e0e0;padding:32px;border-radius:8px;">
          <div style="color:#3effa0;font-size:24px;font-weight:bold;margin-bottom:24px;">Equifind</div>
          <h2 style="color:#fff;margin-bottom:16px;">Welcome, ${data.firstName ?? "there"}!</h2>
          <p>Thank you for joining Equifind. We're excited to have you on board.</p>
          ${data.loginUrl ? `<p><a href="${data.loginUrl}" style="background:#3effa0;color:#07080f;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Get Started</a></p>` : ""}
          <p style="color:#888;font-size:12px;margin-top:32px;">Welcome to the Equifind platform.</p>
        </div>
      `,
    }),
  },
  inspection: {
    report_ready: (data) => ({
      subject: `Your Inspection Report is Ready — ${data.propertyAddress ?? ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a0e09;color:#e0e0e0;padding:32px;border-radius:8px;">
          <div style="color:#ff6a3d;font-size:24px;font-weight:bold;margin-bottom:24px;">Inspection</div>
          <h2 style="color:#fff;margin-bottom:16px;">Your Report is Ready</h2>
          <p>The inspection report for <strong style="color:#ff6a3d">${data.propertyAddress ?? "your property"}</strong> is now available.</p>
          ${data.reportUrl ? `<p><a href="${data.reportUrl}" style="background:#ff6a3d;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">View Report</a></p>` : ""}
          <p style="color:#888;font-size:12px;margin-top:32px;">This is an automated notification from Inspection.</p>
        </div>
      `,
    }),
    appointment_confirm: (data) => ({
      subject: `Appointment Confirmed — ${data.date ?? ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a0e09;color:#e0e0e0;padding:32px;border-radius:8px;">
          <div style="color:#ff6a3d;font-size:24px;font-weight:bold;margin-bottom:24px;">Inspection</div>
          <h2 style="color:#fff;margin-bottom:16px;">Appointment Confirmed</h2>
          <p>Your appointment has been confirmed for <strong style="color:#ff6a3d">${data.date ?? "the scheduled date"}</strong> at ${data.time ?? "the scheduled time"}.</p>
          <p><strong>Location:</strong> ${data.propertyAddress ?? "N/A"}</p>
          <p><strong>Inspector:</strong> ${data.inspectorName ?? "N/A"}</p>
          <p style="color:#888;font-size:12px;margin-top:32px;">This is an automated notification from Inspection.</p>
        </div>
      `,
    }),
  },
};

router.post("/send", async (req, res) => {
  try {
    const { type, toEmail, data } = req.body as {
      business?: string;
      type: string;
      toEmail: string;
      data: Record<string, string>;
    };

    // Tenant keys are scoped to their business — ignore any business in the request body
    const business = (res.locals.tenantBusiness as string | undefined) ?? req.body.business;

    const businessTemplates = TEMPLATES[business];
    if (!businessTemplates || !businessTemplates[type]) {
      return res.status(400).json({ error: `Unknown template: ${business}/${type}` });
    }

    const { subject, html } = businessTemplates[type](data ?? {});

    const [domain] = await db.select().from(domainsTable)
      .where(eq(domainsTable.business, business))
      .limit(1);

    let status = "sent";
    let error: string | null = null;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && domain) {
      try {
        const result = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${domain.fromName} <${domain.fromEmail}>`,
            to: [toEmail],
            subject,
            html,
          }),
        });
        if (!result.ok) {
          const errBody = await result.text();
          status = "failed";
          error = errBody;
        }
      } catch (sendErr) {
        status = "failed";
        error = String(sendErr);
      }
    }

    const [log] = await db.insert(transactionalLogsTable).values({
      business,
      type,
      toEmail,
      status,
      error,
    }).returning();

    res.json({ message: status === "sent" ? "Email sent successfully" : `Email failed: ${error}`, log });
  } catch (err) {
    req.log.error({ err }, "Failed to send transactional email");
    res.status(500).json({ error: "Failed to send transactional email" });
  }
});

router.get("/log", async (req, res) => {
  try {
    const { business, limit: limitStr } = req.query as { business?: string; limit?: string };
    const limit = parseInt(limitStr ?? "50");
    const logs = await db.select().from(transactionalLogsTable)
      .where(business ? eq(transactionalLogsTable.business, business) : undefined)
      .orderBy(desc(transactionalLogsTable.sentAt))
      .limit(limit);
    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Failed to get transactional logs");
    res.status(500).json({ error: "Failed to get transactional logs" });
  }
});

export default router;
