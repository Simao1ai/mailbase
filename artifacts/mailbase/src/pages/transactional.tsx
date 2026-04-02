import { useBusiness } from "@/lib/business-context";
import { useSendTransactional, useGetTransactionalLog, getGetTransactionalLogQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, Activity } from "lucide-react";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

export default function Transactional() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sendTx = useSendTransactional();
  const { data: logs, isLoading } = useGetTransactionalLog(
    { business, limit: 20 },
    { query: { queryKey: getGetTransactionalLogQueryKey({ business, limit: 20 }) } }
  );

  const types = business === "equifind" ? ["case_update", "welcome"] : ["report_ready", "appointment_confirm"];

  const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    let parsedData = {};
    try {
      parsedData = JSON.parse((fd.get("data") as string) || "{}");
    } catch {
      toast({ title: "Invalid JSON payload", variant: "destructive" });
      return;
    }
    sendTx.mutate({
      data: { business, type: fd.get("type") as string, toEmail: fd.get("toEmail") as string, data: parsedData }
    }, {
      onSuccess: () => {
        toast({ title: "Transactional email triggered" });
        queryClient.invalidateQueries({ queryKey: getGetTransactionalLogQueryKey({ business }) });
        (e.target as HTMLFormElement).reset();
      },
      onError: (err: any) => toast({ title: "Failed to send", description: err.message, variant: "destructive" })
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {/* Page header */}
      <div className="bg-white rounded border border-[#e2e8f0] mb-4">
        <div className="px-6 py-5 border-b border-[#e2e8f0]">
          <h1 className="text-[18px] font-bold text-[#1a202c]">Transactional Email</h1>
          <p className="text-[13px] text-[#718096] mt-0.5">Trigger system and event-driven emails instantly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trigger form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded border border-[#e2e8f0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: SG_BLUE }} />
              <span className="text-[14px] font-semibold text-[#1a202c]">Trigger Event</span>
            </div>
            <form onSubmit={handleSend} className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#2d3748]">Event Type</Label>
                <Select name="type" required>
                  <SelectTrigger className="h-9 rounded border-[#e2e8f0] text-[13px]">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#2d3748]">Recipient Email</Label>
                <Input name="toEmail" type="email" required placeholder="user@example.com" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-[#2d3748]">
                  Payload <span className="font-normal text-[#718096]">(JSON)</span>
                </Label>
                <Textarea
                  name="data"
                  required
                  rows={7}
                  className="font-mono text-[12px] rounded border-[#e2e8f0] resize-none"
                  defaultValue={'{\n  "name": "John"\n}'}
                />
              </div>

              <Button
                type="submit"
                disabled={sendTx.isPending}
                className="w-full h-9 rounded text-white text-[13px] font-semibold"
                style={{ background: SG_BLUE }}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {sendTx.isPending ? "Triggering..." : "Trigger Event"}
              </Button>
            </form>
          </div>
        </div>

        {/* Activity log */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded border border-[#e2e8f0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: SG_BLUE }} />
              <span className="text-[14px] font-semibold text-[#1a202c]">Recent Activity</span>
              <span className="ml-auto text-[12px] text-[#718096]">Last 20 events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Time</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Event Type</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Recipient</th>
                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="px-5 py-12 text-center text-[13px] text-[#718096]">Loading activity...</td></tr>
                  ) : !logs?.length ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center">
                        <p className="text-[13px] font-medium text-[#2d3748]">No events yet</p>
                        <p className="text-[12px] text-[#718096] mt-1">Trigger an event using the form to see it here.</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr
                        key={log.id}
                        className="border-b border-[#e2e8f0] transition-colors"
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
                      >
                        <td className="px-5 py-3.5 text-[12px] text-[#718096] whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="px-2 py-0.5 rounded text-[12px] bg-[#f8fafc] border border-[#e2e8f0] text-[#4a5568]">{log.type}</code>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-medium text-[#1a202c]">{log.toEmail}</td>
                        <td className="px-5 py-3.5">
                          {log.status === "sent" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium bg-[#f0fff4] text-[#276749]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#38a169]" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium bg-[#fff5f5] text-[#742a2a]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#e53e3e]" /> Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
