import { Router, type IRouter } from "express";
import { db, emailAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../lib/crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { requireMasterKey } from "../middleware/apiKey";

const router: IRouter = Router();

// ─── Account Management (master key only) ────────────────────

router.get("/accounts", requireMasterKey, async (req, res) => {
  try {
    const { business } = req.query as { business?: string };
    const accounts = await db.select({
      id: emailAccountsTable.id,
      business: emailAccountsTable.business,
      displayName: emailAccountsTable.displayName,
      email: emailAccountsTable.email,
      imapHost: emailAccountsTable.imapHost,
      imapPort: emailAccountsTable.imapPort,
      smtpHost: emailAccountsTable.smtpHost,
      smtpPort: emailAccountsTable.smtpPort,
      username: emailAccountsTable.username,
      isActive: emailAccountsTable.isActive,
      createdAt: emailAccountsTable.createdAt,
    }).from(emailAccountsTable)
      .where(business ? eq(emailAccountsTable.business, business) : undefined);
    res.json(accounts);
  } catch (err) {
    req.log.error({ err }, "Failed to list email accounts");
    res.status(500).json({ error: "Failed to list email accounts" });
  }
});

router.post("/accounts", requireMasterKey, async (req, res) => {
  try {
    const { business, displayName, email, username, password,
      imapHost = "imap.zoho.com", imapPort = 993,
      smtpHost = "smtp.zoho.com", smtpPort = 465 } = req.body;

    if (!business || !email || !username || !password) {
      return res.status(400).json({ error: "business, email, username, and password are required" });
    }

    // Test IMAP connection before saving
    try {
      const client = new ImapFlow({
        host: imapHost, port: imapPort, secure: true,
        auth: { user: username, pass: password },
        logger: false,
        tls: { rejectUnauthorized: false },
      });
      await client.connect();
      await client.logout();
    } catch (testErr) {
      return res.status(422).json({ error: "Could not connect to mail server. Check your credentials and settings." });
    }

    const passwordEncrypted = encrypt(password);
    const [account] = await db.insert(emailAccountsTable).values({
      business, displayName: displayName ?? email, email,
      imapHost, imapPort, smtpHost, smtpPort,
      username, passwordEncrypted,
    }).returning({
      id: emailAccountsTable.id, business: emailAccountsTable.business,
      displayName: emailAccountsTable.displayName, email: emailAccountsTable.email,
      imapHost: emailAccountsTable.imapHost, imapPort: emailAccountsTable.imapPort,
      smtpHost: emailAccountsTable.smtpHost, smtpPort: emailAccountsTable.smtpPort,
      username: emailAccountsTable.username, isActive: emailAccountsTable.isActive,
      createdAt: emailAccountsTable.createdAt,
    });
    res.status(201).json(account);
  } catch (err) {
    req.log.error({ err }, "Failed to add email account");
    res.status(500).json({ error: "Failed to add email account" });
  }
});

router.delete("/accounts/:id", requireMasterKey, async (req, res) => {
  try {
    await db.delete(emailAccountsTable).where(eq(emailAccountsTable.id, parseInt(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete email account");
    res.status(500).json({ error: "Failed to delete email account" });
  }
});

// ─── Helpers ─────────────────────────────────────────────────

async function getAccount(business: string) {
  const [account] = await db.select().from(emailAccountsTable)
    .where(and(eq(emailAccountsTable.business, business), eq(emailAccountsTable.isActive, true)))
    .limit(1);
  return account ?? null;
}

async function withImap<T>(account: typeof emailAccountsTable.$inferSelect, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: true,
    auth: { user: account.username, pass: decrypt(account.passwordEncrypted) },
    logger: false,
    tls: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

// ─── Messages ────────────────────────────────────────────────

router.get("/:business/messages", async (req, res) => {
  try {
    const { business } = req.params;
    const { folder = "INBOX", page = "1", limit = "30" } = req.query as Record<string, string>;

    const account = await getAccount(business);
    if (!account) return res.status(404).json({ error: "No email account configured for this business" });

    const messages = await withImap(account, async (client) => {
      const mailbox = await client.mailboxOpen(folder);
      const total = mailbox.exists;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const end = Math.max(1, total - (pageNum - 1) * limitNum);
      const start = Math.max(1, end - limitNum + 1);

      if (total === 0) return { messages: [], total: 0 };

      const msgs: unknown[] = [];
      for await (const msg of client.fetch(`${start}:${end}`, {
        uid: true, flags: true, envelope: true, bodyStructure: true,
      })) {
        msgs.unshift({
          uid: msg.uid,
          seq: msg.seq,
          flags: [...(msg.flags ?? [])],
          read: msg.flags?.has("\\Seen") ?? false,
          subject: msg.envelope?.subject ?? "(no subject)",
          from: msg.envelope?.from?.[0] ?? null,
          to: msg.envelope?.to ?? [],
          date: msg.envelope?.date ?? null,
          hasAttachment: !!msg.bodyStructure && checkHasAttachment(msg.bodyStructure),
        });
      }
      return { messages: msgs, total, folder };
    });

    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.get("/:business/messages/:uid", async (req, res) => {
  try {
    const { business, uid } = req.params;
    const { folder = "INBOX" } = req.query as { folder?: string };

    const account = await getAccount(business);
    if (!account) return res.status(404).json({ error: "No email account configured" });

    const message = await withImap(account, async (client) => {
      await client.mailboxOpen(folder);

      // Mark as read
      await client.messageFlagsAdd({ uid: parseInt(uid) }, ["\\Seen"], { uid: true });

      let rawMsg: Buffer | null = null;
      for await (const msg of client.fetch({ uid: parseInt(uid) }, { source: true }, { uid: true })) {
        rawMsg = msg.source;
      }
      if (!rawMsg) return null;

      const parsed = await simpleParser(rawMsg);
      return {
        uid: parseInt(uid),
        subject: parsed.subject ?? "(no subject)",
        from: parsed.from?.value ?? [],
        to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.flatMap(a => a.value) : parsed.to.value) : [],
        date: parsed.date ?? null,
        html: parsed.html || null,
        text: parsed.text ?? null,
        attachments: (parsed.attachments ?? []).map(a => ({
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
        })),
        inReplyTo: parsed.inReplyTo ?? null,
        messageId: parsed.messageId ?? null,
        references: parsed.references ?? [],
      };
    });

    if (!message) return res.status(404).json({ error: "Message not found" });
    res.json(message);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch message");
    res.status(500).json({ error: "Failed to fetch message" });
  }
});

router.delete("/:business/messages/:uid", async (req, res) => {
  try {
    const { business, uid } = req.params;
    const { folder = "INBOX" } = req.query as { folder?: string };

    const account = await getAccount(business);
    if (!account) return res.status(404).json({ error: "No email account configured" });

    await withImap(account, async (client) => {
      await client.mailboxOpen(folder);
      await client.messageDelete({ uid: parseInt(uid) }, { uid: true });
    });

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete message");
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// ─── Send / Reply ─────────────────────────────────────────────

router.post("/:business/send", async (req, res) => {
  try {
    const { business } = req.params;
    const { to, subject, html, text, inReplyTo, references } = req.body as {
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      inReplyTo?: string;
      references?: string[];
    };

    if (!to || !subject) return res.status(400).json({ error: "to and subject are required" });

    const account = await getAccount(business);
    if (!account) return res.status(404).json({ error: "No email account configured" });

    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: { user: account.username, pass: decrypt(account.passwordEncrypted) },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `${account.displayName} <${account.email}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html: html ?? undefined,
      text: text ?? undefined,
      inReplyTo: inReplyTo ?? undefined,
      references: references ? references.join(" ") : undefined,
    });

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to send email");
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ─── Folders ─────────────────────────────────────────────────

router.get("/:business/folders", async (req, res) => {
  try {
    const { business } = req.params;
    const account = await getAccount(business);
    if (!account) return res.status(404).json({ error: "No email account configured" });

    const folders = await withImap(account, async (client) => {
      const list = await client.list();
      return list.map(f => ({ path: f.path, name: f.name, delimiter: f.delimiter }));
    });

    res.json(folders);
  } catch (err) {
    req.log.error({ err }, "Failed to list folders");
    res.status(500).json({ error: "Failed to list folders" });
  }
});

function checkHasAttachment(bodyStructure: unknown): boolean {
  if (!bodyStructure || typeof bodyStructure !== "object") return false;
  const bs = bodyStructure as { disposition?: { type?: string }; childNodes?: unknown[] };
  if (bs.disposition?.type?.toLowerCase() === "attachment") return true;
  return (bs.childNodes ?? []).some(child => checkHasAttachment(child));
}

export default router;
