import React, { useState } from "react";
import { useGetDomains, useCreateDomain, useVerifyDomain, useDeleteDomain, getGetDomainsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, ChevronDown, ChevronUp, AlertCircle, Plus, Check, Globe, ShieldCheck, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    verified: { bg: "#f0fff4", color: "#276749", dot: "#38a169", label: "Verified" },
    failed:   { bg: "#fff5f5", color: "#742a2a", dot: "#e53e3e", label: "Failed"   },
    pending:  { bg: "#fffaf0", color: "#744210", dot: "#d69e2e", label: "Pending"  },
  };
  const s = map[status] || map.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function Domains() {
  const { business } = useBusiness();
  const { data: domains, isLoading } = useGetDomains({ query: { queryKey: getGetDomainsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const createDomain = useCreateDomain();
  const verifyDomain = useVerifyDomain();
  const deleteDomain = useDeleteDomain();

  const businessDomains = domains?.filter(d => d.business === business) || [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createDomain.mutate({
      data: {
        business,
        domain: fd.get("domain") as string,
        businessLabel: business,
        fromName: fd.get("fromName") as string,
        fromEmail: fd.get("fromEmail") as string,
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Domain added successfully" });
        queryClient.invalidateQueries({ queryKey: getGetDomainsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleVerify = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    verifyDomain.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "DNS verification triggered" });
        queryClient.invalidateQueries({ queryKey: getGetDomainsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteDomain.mutate({ id }, {
      onSuccess: () => {
        setConfirmDeleteId(null);
        if (expandedId === id) setExpandedId(null);
        toast({ title: "Domain removed" });
        queryClient.invalidateQueries({ queryKey: getGetDomainsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {/* Page header */}
      <div className="bg-white rounded border border-[#e2e8f0] mb-4">
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a202c]">Sender Domains</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Authenticate domains for email sending via Resend</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="text-white text-[13px] font-semibold h-9 px-4 rounded" style={{ background: SG_BLUE }}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-white border-[#e2e8f0] shadow-xl p-0 overflow-hidden rounded">
              <div className="px-6 py-4 border-b border-[#e2e8f0]">
                <DialogTitle className="text-[16px] font-semibold text-[#1a202c]">Add New Domain</DialogTitle>
                <p className="text-[12px] text-[#718096] mt-0.5">DNS records will be generated for verification</p>
              </div>
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#2d3748]">Domain Name</Label>
                  <Input name="domain" required placeholder="notifications.example.com" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#2d3748]">Default From Name</Label>
                  <Input name="fromName" required placeholder="Support Team" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#2d3748]">Default From Email</Label>
                  <Input name="fromEmail" required placeholder="support@example.com" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 rounded border-[#e2e8f0] text-[13px] font-medium text-[#4a5568]">Cancel</Button>
                  <Button type="submit" disabled={createDomain.isPending} className="h-9 rounded text-white text-[13px] font-semibold" style={{ background: SG_BLUE }}>
                    {createDomain.isPending ? "Adding..." : "Add Domain"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[13px] text-[#718096]">Loading domains...</div>
        ) : businessDomains.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-center">
            <Globe className="w-10 h-10 text-[#cbd5e0]" />
            <p className="text-[14px] font-semibold text-[#2d3748]">No domains yet</p>
            <p className="text-[13px] text-[#718096] max-w-sm">Add a sender domain and verify DNS records to start sending email from your domain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Domain</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Status</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">From Email</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">From Name</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Default</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businessDomains.map(d => (
                  <React.Fragment key={d.id}>
                    <tr
                      className="border-b border-[#e2e8f0] cursor-pointer transition-colors"
                      style={{ background: expandedId === d.id ? "#f8fafc" : "#fff" }}
                      onMouseEnter={e => { if (expandedId !== d.id) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (expandedId !== d.id) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                      onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {expandedId === d.id
                            ? <ChevronUp className="w-3.5 h-3.5 text-[#a0aec0]" />
                            : <ChevronDown className="w-3.5 h-3.5 text-[#a0aec0]" />}
                          <span className="text-[13px] font-medium text-[#1a202c]">{d.domain}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5"><StatusBadge status={d.status} /></td>
                      <td className="px-6 py-3.5 text-[13px] text-[#4a5568]">{d.fromEmail}</td>
                      <td className="px-6 py-3.5 text-[13px] text-[#4a5568]">{d.fromName}</td>
                      <td className="px-6 py-3.5">
                        {d.isDefault && <Check className="w-4 h-4 text-[#38a169]" />}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {d.status !== "verified" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={e => handleVerify(d.id, e)}
                              disabled={verifyDomain.isPending}
                              className="h-7 rounded border-[#e2e8f0] text-[12px] font-medium"
                              style={{ color: SG_BLUE }}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verify DNS
                            </Button>
                          )}
                          {confirmDeleteId === d.id ? (
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <span className="text-[12px] text-[#718096]">Remove?</span>
                              <Button
                                size="sm"
                                onClick={e => { e.stopPropagation(); handleDelete(d.id); }}
                                disabled={deleteDomain.isPending}
                                className="h-7 px-2.5 rounded text-[12px] font-medium text-white"
                                style={{ background: "#e53e3e" }}
                              >
                                Yes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="h-7 px-2.5 rounded border-[#e2e8f0] text-[12px] font-medium text-[#4a5568]"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(d.id); }}
                              className="h-7 w-7 rounded text-[#a0aec0] hover:text-[#e53e3e] hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedId === d.id && d.dnsRecords && (
                      <tr className="border-b border-[#e2e8f0]">
                        <td colSpan={6} className="px-6 py-5" style={{ background: "#f8fafc" }}>
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4" style={{ color: SG_BLUE }} />
                            <span className="text-[13px] font-semibold text-[#1a202c]">Required DNS Records</span>
                          </div>
                          <div className="rounded border border-[#e2e8f0] overflow-hidden bg-white">
                            <table className="w-full text-left text-[12px]">
                              <thead>
                                <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                                  <th className="px-4 py-2 font-semibold text-[#718096] uppercase tracking-wider w-24">Type</th>
                                  <th className="px-4 py-2 font-semibold text-[#718096] uppercase tracking-wider w-64">Name</th>
                                  <th className="px-4 py-2 font-semibold text-[#718096] uppercase tracking-wider">Value</th>
                                  <th className="px-4 py-2 w-10" />
                                </tr>
                              </thead>
                              <tbody>
                                {d.dnsRecords.map((r, i) => (
                                  <tr key={i} className="border-b last:border-0 border-[#e2e8f0]">
                                    <td className="px-4 py-2.5 font-mono text-[#4a5568]">{r.type}</td>
                                    <td className="px-4 py-2.5 font-mono text-[#1a202c] break-all">{r.name}</td>
                                    <td className="px-4 py-2.5 font-mono text-[#4a5568] break-all">{r.value}</td>
                                    <td className="px-4 py-2.5 text-right">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-[#a0aec0] hover:text-[#4a5568]"
                                        onClick={ev => { ev.stopPropagation(); navigator.clipboard.writeText(r.value); toast({ title: "Copied" }); }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-[11px] text-[#718096] mt-2.5">DNS changes may take up to 24 hours to propagate globally.</p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
