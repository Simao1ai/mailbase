import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Key, Trash2, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";

interface Tenant {
  id: number;
  slug: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  activeKeyCount: number;
}

interface TenantKey {
  id: number;
  business: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  fullKey?: string;
}

export default function Tenants() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState<Tenant | null>(null);
  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<Tenant | null>(null);
  const [revokeOpen, setRevokeOpen] = useState<TenantKey | null>(null);

  const [addForm, setAddForm] = useState({ slug: "", label: "" });
  const [newKeyName, setNewKeyName] = useState("");
  const [showFullKey, setShowFullKey] = useState(false);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: () => apiFetch("/api/tenants"),
  });

  const { data: tenantKeys = [] } = useQuery<TenantKey[]>({
    queryKey: ["tenant-keys", keysOpen?.slug],
    queryFn: () => apiFetch(`/api/tenants/${keysOpen!.slug}/keys`),
    enabled: !!keysOpen,
  });

  const createTenant = useMutation({
    mutationFn: (body: { slug: string; label: string }) =>
      apiFetch("/api/tenants", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      setAddOpen(false);
      setAddForm({ slug: "", label: "" });
      toast({ title: "Tenant created" });
    },
    onError: async (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create tenant";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteTenant = useMutation({
    mutationFn: (slug: string) =>
      apiFetch(`/api/tenants/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
      setDeleteOpen(null);
      toast({ title: "Business removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove business", variant: "destructive" });
    },
  });

  const generateKey = useMutation({
    mutationFn: ({ slug, name }: { slug: string; name: string }) =>
      apiFetch(`/api/tenants/${slug}/keys`, { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (data: TenantKey) => {
      qc.invalidateQueries({ queryKey: ["tenant-keys", keysOpen?.slug] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      setNewKeyOpen(false);
      setNewKeyName("");
      setRevealedKey(data.fullKey ?? null);
      setShowFullKey(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate API key", variant: "destructive" });
    },
  });

  const revokeKey = useMutation({
    mutationFn: ({ slug, id }: { slug: string; id: number }) =>
      apiFetch(`/api/tenants/${slug}/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-keys", keysOpen?.slug] });
      qc.invalidateQueries({ queryKey: ["tenants"] });
      setRevokeOpen(null);
      toast({ title: "API key revoked" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const labelToSlug = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a202c]">Tenants</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            Manage businesses and their scoped API keys
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-1.5"
          style={{ background: "#1a82e2", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          Add Tenant
        </Button>
      </div>

      {isLoading ? (
        <div className="text-[13px] text-[#64748b] py-12 text-center">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="border border-[#e2e8f0] rounded-lg bg-white py-16 text-center">
          <p className="text-[14px] font-medium text-[#1a202c]">No tenants yet</p>
          <p className="text-[13px] text-[#64748b] mt-1 mb-4">
            Add your first tenant to generate scoped API keys
          </p>
          <Button onClick={() => setAddOpen(true)} style={{ background: "#1a82e2", color: "#fff" }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Tenant
          </Button>
        </div>
      ) : (
        <div className="border border-[#e2e8f0] rounded-lg bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Tenant</th>
                <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Slug</th>
                <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-[#64748b]">API Keys</th>
                <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, i) => (
                <tr
                  key={t.id}
                  className="border-b border-[#e2e8f0] last:border-0"
                  style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td className="px-5 py-3.5 font-medium text-[#1a202c]">{t.label}</td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b]">{t.slug}</td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant="outline"
                      className="text-[11px]"
                      style={t.isActive
                        ? { borderColor: "#22c55e", color: "#16a34a", background: "#f0fdf4" }
                        : { borderColor: "#e2e8f0", color: "#94a3b8" }}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setKeysOpen(t)}
                      className="flex items-center gap-1.5 text-[#1a82e2] hover:underline"
                    >
                      <Key className="w-3.5 h-3.5" />
                      {t.activeKeyCount} key{t.activeKeyCount !== 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-[#64748b]">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setDeleteOpen(t)}
                      className="p-1.5 rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-500 transition-colors"
                      title="Remove business"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Tenant Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input
                placeholder="Acme Corp"
                value={addForm.label}
                onChange={e => {
                  const label = e.target.value;
                  setAddForm(f => ({ label, slug: f.slug || labelToSlug(label) }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                placeholder="acme-corp"
                value={addForm.slug}
                onChange={e => setAddForm(f => ({ ...f, slug: e.target.value }))}
              />
              <p className="text-[12px] text-[#64748b]">
                Used as the <code className="bg-[#f1f5f9] px-1 rounded">business</code> identifier in API calls
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              style={{ background: "#1a82e2", color: "#fff" }}
              disabled={!addForm.slug || !addForm.label || createTenant.isPending}
              onClick={() => createTenant.mutate(addForm)}
            >
              {createTenant.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={!!keysOpen} onOpenChange={open => !open && setKeysOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>{keysOpen?.label} — API Keys</DialogTitle>
              <Button
                size="sm"
                onClick={() => setNewKeyOpen(true)}
                style={{ background: "#1a82e2", color: "#fff" }}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                New Key
              </Button>
            </div>
          </DialogHeader>

          <div className="py-2">
            {tenantKeys.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#64748b]">
                No API keys yet. Generate one to connect this tenant.
              </div>
            ) : (
              <div className="border border-[#e2e8f0] rounded-lg overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#64748b]">Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#64748b]">Key</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-[#64748b]">Last Used</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {tenantKeys.map(k => (
                      <tr key={k.id} className="border-b border-[#e2e8f0] last:border-0">
                        <td className="px-4 py-3 font-medium text-[#1a202c]">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-[12px] text-[#64748b]">
                          {k.keyPrefix}...
                        </td>
                        <td className="px-4 py-3 text-[#64748b]">
                          {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setRevokeOpen(k)}
                            className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg text-[12px] text-[#64748b]" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <strong className="text-[#1a202c]">How to use:</strong> Pass the key via{" "}
              <code className="bg-white border border-[#e2e8f0] px-1 rounded">x-api-key</code> header.
              Tenant keys are scoped to <code className="bg-white border border-[#e2e8f0] px-1 rounded">{keysOpen?.slug}</code> only
              and can only call <code className="bg-white border border-[#e2e8f0] px-1 rounded">POST /api/transactional/send</code>.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Key Name Dialog */}
      <Dialog open={newKeyOpen} onOpenChange={setNewKeyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Key Name</Label>
            <Input
              placeholder="e.g. Production Server"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
            />
            <p className="text-[12px] text-[#64748b]">A label to help identify where this key is used</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewKeyOpen(false)}>Cancel</Button>
            <Button
              style={{ background: "#1a82e2", color: "#fff" }}
              disabled={!newKeyName || generateKey.isPending}
              onClick={() => generateKey.mutate({ slug: keysOpen!.slug, name: newKeyName })}
            >
              {generateKey.isPending ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal Key Dialog */}
      <Dialog open={!!revealedKey} onOpenChange={open => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="p-3 rounded-lg border border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[12px] font-mono text-[#1a202c] break-all">
                  {showFullKey ? revealedKey : `${revealedKey?.slice(0, 20)}${"•".repeat(30)}`}
                </code>
                <button onClick={() => setShowFullKey(v => !v)} className="text-[#64748b] hover:text-[#1a202c] shrink-0">
                  {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copyToClipboard(revealedKey!)} className="text-[#64748b] hover:text-[#1a202c] shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg text-[12px]" style={{ background: "#fefce8", border: "1px solid #fde047" }}>
              <RefreshCw className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-yellow-800">
                Copy this key now. For security, it will not be shown again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => copyToClipboard(revealedKey!)} variant="outline" className="gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              Copy Key
            </Button>
            <Button onClick={() => setRevealedKey(null)} style={{ background: "#1a82e2", color: "#fff" }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Business Confirm */}
      <AlertDialog open={!!deleteOpen} onOpenChange={open => !open && setDeleteOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteOpen?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this business and revoke all its API keys. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteOpen && deleteTenant.mutate(deleteOpen.slug)}
            >
              Remove Business
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Key Confirm */}
      <AlertDialog open={!!revokeOpen} onOpenChange={open => !open && setRevokeOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke "{revokeOpen?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Any integrations using this key will immediately lose access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => revokeOpen && keysOpen && revokeKey.mutate({ slug: keysOpen.slug, id: revokeOpen.id })}
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
