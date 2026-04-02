import { useState } from "react";
import { useGetCampaigns, useCreateCampaign, useSendCampaign, getGetCampaignsQueryKey, useGetDomains, useGetLists } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string; label: string }> = {
    draft:   { bg: "#ebf8ff", color: "#2b6cb0", dot: SG_BLUE,   label: "Draft"   },
    sending: { bg: "#fffaf0", color: "#744210", dot: "#d69e2e", label: "Sending" },
    sent:    { bg: "#f0fff4", color: "#276749", dot: "#38a169", label: "Sent"    },
    failed:  { bg: "#fff5f5", color: "#742a2a", dot: "#e53e3e", label: "Failed"  },
  };
  const s = map[status] || map.draft;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function Campaigns() {
  const { business } = useBusiness();
  const { data: campaigns, isLoading } = useGetCampaigns({ business }, { query: { queryKey: getGetCampaignsQueryKey({ business }) } });
  const { data: domains } = useGetDomains();
  const { data: lists } = useGetLists({ business });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const businessDomains = domains?.filter(d => d.business === business && d.status === "verified") || [];
  const businessLists = lists || [];

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createCampaign.mutate({
      data: {
        business,
        name: fd.get("name") as string,
        subject: fd.get("subject") as string,
        domainId: Number(fd.get("domainId")),
        listId: Number(fd.get("listId")),
        htmlContent: fd.get("htmlContent") as string,
      }
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Campaign saved as draft" });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsQueryKey({ business }) });
      }
    });
  };

  const handleSend = (id: number) => {
    sendCampaign.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Campaign is sending" });
        queryClient.invalidateQueries({ queryKey: getGetCampaignsQueryKey({ business }) });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      <div className="bg-white rounded border border-[#e2e8f0]">
        {/* Page header */}
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a202c]">Campaigns</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Create and send bulk email campaigns</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="text-white text-[13px] font-semibold h-9 px-4 rounded" style={{ background: SG_BLUE }}>
                <Plus className="w-4 h-4 mr-1.5" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[580px] bg-white border-[#e2e8f0] shadow-xl p-0 overflow-hidden rounded">
              <div className="px-6 py-4 border-b border-[#e2e8f0]">
                <DialogTitle className="text-[16px] font-semibold text-[#1a202c]">Create Campaign</DialogTitle>
                <p className="text-[12px] text-[#718096] mt-0.5">Campaign will be saved as a draft</p>
              </div>
              <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Campaign Name</Label>
                    <Input name="name" required placeholder="Q3 Newsletter" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Subject Line</Label>
                    <Input name="subject" required placeholder="Latest updates inside!" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Sender Domain</Label>
                    <Select name="domainId" required>
                      <SelectTrigger className="h-9 rounded border-[#e2e8f0] text-[13px]">
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessDomains.length === 0
                          ? <SelectItem value="none" disabled>No verified domains</SelectItem>
                          : businessDomains.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.domain}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Recipient List</Label>
                    <Select name="listId" required>
                      <SelectTrigger className="h-9 rounded border-[#e2e8f0] text-[13px]">
                        <SelectValue placeholder="Select list" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessLists.length === 0
                          ? <SelectItem value="none" disabled>No lists</SelectItem>
                          : businessLists.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.contactCount})</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#2d3748]">HTML Content</Label>
                  <Textarea name="htmlContent" required rows={7} className="font-mono text-[12px] rounded border-[#e2e8f0] resize-none" placeholder="<html>...</html>" />
                </div>
                <div className="pt-1 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 rounded border-[#e2e8f0] text-[13px] font-medium text-[#4a5568]">Cancel</Button>
                  <Button type="submit" disabled={createCampaign.isPending} className="h-9 rounded text-white text-[13px] font-semibold" style={{ background: SG_BLUE }}>
                    {createCampaign.isPending ? "Saving..." : "Save Draft"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[13px] text-[#718096]">Loading campaigns...</div>
        ) : !campaigns?.length ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-center">
            <Megaphone className="w-10 h-10 text-[#cbd5e0]" />
            <p className="text-[14px] font-semibold text-[#2d3748]">No campaigns yet</p>
            <p className="text-[13px] text-[#718096] max-w-sm">Create your first campaign to start sending bulk email to your lists.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Name</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Status</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Recipients</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Created</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e2e8f0] transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
                  >
                    <td className="px-6 py-3.5">
                      <div className="text-[13px] font-medium text-[#1a202c]">{c.name}</div>
                      <div className="text-[12px] text-[#718096] truncate max-w-xs mt-0.5">{c.subject}</div>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-3.5 text-[13px] text-[#4a5568]">{c.recipientCount.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-[13px] text-[#718096]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      {c.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSend(c.id)}
                          disabled={sendCampaign.isPending}
                          className="h-7 rounded border-[#e2e8f0] text-[12px] font-medium"
                          style={{ color: SG_BLUE }}
                        >
                          <Play className="w-3 h-3 mr-1 fill-current" /> Send
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
