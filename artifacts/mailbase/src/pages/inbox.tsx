import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Plus, Trash2, Send, Reply, Pencil, Settings, Paperclip, ChevronLeft } from "lucide-react";

interface Message {
  uid: number;
  seq: number;
  flags: string[];
  read: boolean;
  subject: string;
  from: { name?: string; address?: string } | null;
  to: Array<{ name?: string; address?: string }>;
  date: string | null;
  hasAttachment: boolean;
}

interface MessageDetail {
  uid: number;
  subject: string;
  from: Array<{ name?: string; address?: string }>;
  to: Array<{ name?: string; address?: string }>;
  date: string | null;
  html: string | null;
  text: string | null;
  attachments: Array<{ filename?: string; contentType: string; size: number }>;
  messageId: string | null;
  references: string[];
}

interface EmailAccount {
  id: number;
  business: string;
  displayName: string;
  email: string;
  imapHost: string;
  smtpHost: string;
  isActive: boolean;
}

export default function Inbox() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [folder, setFolder] = useState("INBOX");
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [connectForm, setConnectForm] = useState({
    displayName: "", email: "", username: "", password: "",
    imapHost: "imap.zoho.com", imapPort: "993",
    smtpHost: "smtp.zoho.com", smtpPort: "465",
  });

  // Reset on business change
  useEffect(() => {
    setSelectedUid(null);
    setPage(1);
    setFolder("INBOX");
  }, [business]);

  const { data: account } = useQuery<EmailAccount | null>({
    queryKey: ["inbox-account", business],
    queryFn: async () => {
      const accounts = await apiFetch<EmailAccount[]>(`/api/inbox/accounts?business=${business}`);
      return accounts[0] ?? null;
    },
  });

  const { data: messagesData, isLoading, refetch, isRefetching } = useQuery<{
    messages: Message[]; total: number; folder: string;
  }>({
    queryKey: ["inbox-messages", business, folder, page],
    queryFn: () => apiFetch(`/api/inbox/${business}/messages?folder=${encodeURIComponent(folder)}&page=${page}&limit=30`),
    enabled: !!account,
    staleTime: 30_000,
  });

  const { data: messageDetail } = useQuery<MessageDetail>({
    queryKey: ["inbox-message", business, folder, selectedUid],
    queryFn: () => apiFetch(`/api/inbox/${business}/messages/${selectedUid}?folder=${encodeURIComponent(folder)}`),
    enabled: selectedUid !== null,
  });

  const connectAccount = useMutation({
    mutationFn: (body: typeof connectForm) =>
      apiFetch("/api/inbox/accounts", {
        method: "POST",
        body: JSON.stringify({
          business,
          displayName: body.displayName,
          email: body.email,
          username: body.username,
          password: body.password,
          imapHost: body.imapHost,
          imapPort: parseInt(body.imapPort),
          smtpHost: body.smtpHost,
          smtpPort: parseInt(body.smtpPort),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-account", business] });
      qc.invalidateQueries({ queryKey: ["inbox-messages", business] });
      setConnectOpen(false);
      toast({ title: "Email account connected" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    },
  });

  const disconnectAccount = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/inbox/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-account", business] });
      qc.invalidateQueries({ queryKey: ["inbox-messages", business] });
      setShowSettings(false);
      toast({ title: "Account disconnected" });
    },
  });

  const sendEmail = useMutation({
    mutationFn: (body: { to: string; subject: string; html: string; inReplyTo?: string; references?: string[] }) =>
      apiFetch(`/api/inbox/${business}/send`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setComposeOpen(false);
      setReplyOpen(false);
      setCompose({ to: "", subject: "", body: "" });
      toast({ title: "Email sent" });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to send";
      toast({ title: "Send failed", description: msg, variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (uid: number) =>
      apiFetch(`/api/inbox/${business}/messages/${uid}?folder=${encodeURIComponent(folder)}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-messages", business, folder] });
      if (selectedUid === deleteConfirm) setSelectedUid(null);
      setDeleteConfirm(null);
      toast({ title: "Message deleted" });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const senderName = (from: { name?: string; address?: string } | null) => {
    if (!from) return "Unknown";
    return from.name || from.address || "Unknown";
  };

  const handleReply = () => {
    if (!messageDetail) return;
    const replyTo = messageDetail.from[0];
    setCompose({
      to: replyTo?.address ?? "",
      subject: messageDetail.subject.startsWith("Re:") ? messageDetail.subject : `Re: ${messageDetail.subject}`,
      body: "",
    });
    setReplyOpen(true);
  };

  const messages = messagesData?.messages ?? [];
  const total = messagesData?.total ?? 0;
  const totalPages = Math.ceil(total / 30);

  // No account configured
  if (!account) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "#edf2f7" }}>
          <Send className="w-5 h-5 text-[#64748b]" />
        </div>
        <p className="text-[15px] font-semibold text-[#1a202c] mb-1">No inbox connected</p>
        <p className="text-[13px] text-[#64748b] mb-5 max-w-sm">
          Connect a Zoho Mail (or any IMAP) account to manage emails for <strong>{business}</strong> right here.
        </p>
        <Button onClick={() => setConnectOpen(true)} style={{ background: "#1a82e2", color: "#fff" }}>
          <Plus className="w-4 h-4 mr-1.5" />
          Connect Email Account
        </Button>

        <ConnectDialog
          open={connectOpen}
          onOpenChange={setConnectOpen}
          form={connectForm}
          setForm={setConnectForm}
          onSubmit={() => connectAccount.mutate(connectForm)}
          isPending={connectAccount.isPending}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-112px)] -m-6 overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">

      {/* Message list */}
      <div className="w-[320px] shrink-0 flex flex-col border-r border-[#e2e8f0]">
        {/* Toolbar */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-[#e2e8f0] shrink-0" style={{ background: "#f8fafc" }}>
          <span className="text-[13px] font-semibold text-[#1a202c]">{folder}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded hover:bg-[#e2e8f0] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#64748b] ${isRefetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setComposeOpen(true)}
              className="p-1.5 rounded hover:bg-[#e2e8f0] transition-colors"
              title="Compose"
            >
              <Pencil className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded hover:bg-[#e2e8f0] transition-colors"
              title="Account settings"
            >
              <Settings className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
          </div>
        </div>

        {/* Account badge */}
        <div className="px-3 py-2 border-b border-[#e2e8f0] shrink-0" style={{ background: "#f8fafc" }}>
          <span className="text-[11px] text-[#64748b] truncate block">{account.email}</span>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-[13px] text-[#64748b]">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#64748b]">No messages</div>
          ) : (
            messages.map(msg => (
              <button
                key={msg.uid}
                onClick={() => setSelectedUid(msg.uid)}
                className="w-full text-left px-3 py-3 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors"
                style={{
                  background: selectedUid === msg.uid ? "#eff6ff" : undefined,
                  borderLeft: selectedUid === msg.uid ? "3px solid #1a82e2" : "3px solid transparent",
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-[13px] truncate max-w-[180px]"
                    style={{ fontWeight: msg.read ? 400 : 700, color: msg.read ? "#64748b" : "#1a202c" }}
                  >
                    {senderName(msg.from)}
                  </span>
                  <span className="text-[11px] text-[#94a3b8] shrink-0 ml-2">{formatDate(msg.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-[12px] truncate flex-1"
                    style={{ color: msg.read ? "#94a3b8" : "#475569", fontWeight: msg.read ? 400 : 500 }}
                  >
                    {msg.subject}
                  </span>
                  {msg.hasAttachment && <Paperclip className="w-3 h-3 shrink-0 text-[#94a3b8]" />}
                  {!msg.read && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#1a82e2" }} />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="h-10 flex items-center justify-between px-3 border-t border-[#e2e8f0] shrink-0" style={{ background: "#f8fafc" }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="text-[12px] text-[#1a82e2] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
            >
              Newer
            </button>
            <span className="text-[11px] text-[#94a3b8]">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-[12px] text-[#1a82e2] disabled:text-[#94a3b8] disabled:cursor-not-allowed"
            >
              Older
            </button>
          </div>
        )}
      </div>

      {/* Message detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedUid ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#94a3b8]">
            Select a message to read it
          </div>
        ) : !messageDetail ? (
          <div className="flex-1 flex items-center justify-center text-[13px] text-[#94a3b8]">
            Loading...
          </div>
        ) : (
          <>
            {/* Message header */}
            <div className="px-6 py-4 border-b border-[#e2e8f0] shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-semibold text-[#1a202c] mb-2">{messageDetail.subject}</h2>
                  <div className="space-y-0.5">
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium">From:</span>{" "}
                      {messageDetail.from.map(f => f.name ? `${f.name} <${f.address}>` : f.address).join(", ")}
                    </p>
                    <p className="text-[12px] text-[#64748b]">
                      <span className="font-medium">To:</span>{" "}
                      {messageDetail.to.map(t => t.address).join(", ")}
                    </p>
                    {messageDetail.date && (
                      <p className="text-[12px] text-[#94a3b8]">
                        {new Date(messageDetail.date).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={handleReply} className="gap-1.5 text-[12px]">
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </Button>
                  <button
                    onClick={() => setDeleteConfirm(selectedUid)}
                    className="p-1.5 rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {messageDetail.attachments.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f1f5f9]">
                  <Paperclip className="w-3.5 h-3.5 text-[#64748b]" />
                  {messageDetail.attachments.map((a, i) => (
                    <span key={i} className="text-[12px] text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                      {a.filename ?? "attachment"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-auto">
              {messageDetail.html ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={messageDetail.html}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  title="Email content"
                />
              ) : (
                <div className="p-6 text-[13px] text-[#475569] whitespace-pre-wrap font-mono leading-relaxed">
                  {messageDetail.text}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen || replyOpen}
        onOpenChange={open => { if (!open) { setComposeOpen(false); setReplyOpen(false); } }}
        title={replyOpen ? "Reply" : "New Message"}
        compose={compose}
        setCompose={setCompose}
        onSend={() => sendEmail.mutate({
          to: compose.to,
          subject: compose.subject,
          html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${compose.body.replace(/\n/g, "<br>")}</div>`,
          ...(replyOpen && messageDetail ? {
            inReplyTo: messageDetail.messageId ?? undefined,
            references: [...(messageDetail.references ?? []), ...(messageDetail.messageId ? [messageDetail.messageId] : [])],
          } : {}),
        })}
        isPending={sendEmail.isPending}
      />

      {/* Connect Account Dialog */}
      <ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        form={connectForm}
        setForm={setConnectForm}
        onSubmit={() => connectAccount.mutate(connectForm)}
        isPending={connectAccount.isPending}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Email Account Settings</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div className="p-3 rounded-lg border border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
              <p className="text-[13px] font-medium text-[#1a202c]">{account.displayName}</p>
              <p className="text-[12px] text-[#64748b]">{account.email}</p>
              <p className="text-[12px] text-[#94a3b8]">IMAP: {account.imapHost}</p>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => disconnectAccount.mutate(account.id)}
              disabled={disconnectAccount.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Disconnect Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteConfirm !== null && deleteMessage.mutate(deleteConfirm)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange, title, compose, setCompose, onSend, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  compose: { to: string; subject: string; body: string };
  setCompose: React.Dispatch<React.SetStateAction<{ to: string; subject: string; body: string }>>;
  onSend: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input placeholder="recipient@example.com" value={compose.to}
              onChange={e => setCompose(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input placeholder="Subject" value={compose.subject}
              onChange={e => setCompose(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <textarea
              className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1a82e2] resize-none"
              rows={10}
              placeholder="Write your message..."
              value={compose.body}
              onChange={e => setCompose(f => ({ ...f, body: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            style={{ background: "#1a82e2", color: "#fff" }}
            disabled={!compose.to || !compose.subject || isPending}
            onClick={onSend}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConnectDialog({ open, onOpenChange, form, setForm, onSubmit, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Connect Email Account</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 rounded-lg text-[12px] text-[#475569]" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            For Zoho Mail, use your full email as username and generate an App Password in Zoho Account Security settings.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Display Name</Label>
              <Input placeholder="Acme Support" value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email Address</Label>
              <Input placeholder="info@yourdomain.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="info@yourdomain.com" value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Password / App Password</Label>
              <Input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>IMAP Host</Label>
              <Input value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>IMAP Port</Label>
              <Input value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            style={{ background: "#1a82e2", color: "#fff" }}
            disabled={!form.email || !form.password || isPending}
            onClick={onSubmit}
          >
            {isPending ? "Connecting..." : "Connect Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
