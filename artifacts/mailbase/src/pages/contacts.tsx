import { useState, useRef } from "react";
import { useGetContacts, useCreateContact, useBulkImportContacts, useUpdateContact, getGetContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBusiness } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, Plus, Users } from "lucide-react";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

export default function Contacts() {
  const { business } = useBusiness();
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useGetContacts(
    { business, search: search.length > 2 ? search : undefined },
    { query: { queryKey: getGetContactsQueryKey({ business, search: search.length > 2 ? search : undefined }) } }
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const bulkImport = useBulkImportContacts();

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tagsStr = fd.get("tags") as string;
    const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : [];
    createContact.mutate({
      data: { business, email: fd.get("email") as string, firstName: fd.get("firstName") as string, lastName: fd.get("lastName") as string, tags }
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Contact added" });
        queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
      }
    });
  };

  const handleToggleSubscribe = (id: number, unsubscribed: boolean) => {
    updateContact.mutate({ id, data: { unsubscribed: !unsubscribed } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() })
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const rows = text.split("\n").filter(Boolean);
      const headers = rows[0].toLowerCase().split(",");
      const emailIdx = headers.findIndex(h => h.includes("email"));
      const firstIdx = headers.findIndex(h => h.includes("first"));
      const lastIdx = headers.findIndex(h => h.includes("last"));
      if (emailIdx === -1) { toast({ title: "CSV must include an 'email' column", variant: "destructive" }); return; }
      const importedContacts = rows.slice(1).map(row => {
        const cols = row.split(",");
        return { business, email: cols[emailIdx]?.trim(), firstName: firstIdx > -1 ? cols[firstIdx]?.trim() : undefined, lastName: lastIdx > -1 ? cols[lastIdx]?.trim() : undefined };
      }).filter(c => c.email);
      bulkImport.mutate({ data: { business, contacts: importedContacts } }, {
        onSuccess: res => {
          toast({ title: "Import complete", description: `${res.imported} contacts imported` });
          queryClient.invalidateQueries({ queryKey: getGetContactsQueryKey() });
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      });
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      <div className="bg-white rounded border border-[#e2e8f0]">
        {/* Page header */}
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a202c]">Contacts</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Manage your subscriber lists and contact records</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkImport.isPending}
              className="h-9 rounded border-[#e2e8f0] text-[13px] font-medium text-[#4a5568]"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {bulkImport.isPending ? "Importing..." : "Import CSV"}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="text-white text-[13px] font-semibold h-9 px-4 rounded" style={{ background: SG_BLUE }}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-white border-[#e2e8f0] shadow-xl p-0 overflow-hidden rounded">
                <div className="px-6 py-4 border-b border-[#e2e8f0]">
                  <DialogTitle className="text-[16px] font-semibold text-[#1a202c]">Add Contact</DialogTitle>
                </div>
                <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Email</Label>
                    <Input name="email" type="email" required placeholder="john@example.com" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium text-[#2d3748]">First Name</Label>
                      <Input name="firstName" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium text-[#2d3748]">Last Name</Label>
                      <Input name="lastName" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#2d3748]">Tags <span className="font-normal text-[#718096]">(comma separated)</span></Label>
                    <Input name="tags" placeholder="lead, vip, active" className="h-9 rounded border-[#e2e8f0] text-[13px]" />
                  </div>
                  <div className="pt-1 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 rounded border-[#e2e8f0] text-[13px] font-medium text-[#4a5568]">Cancel</Button>
                    <Button type="submit" disabled={createContact.isPending} className="h-9 rounded text-white text-[13px] font-semibold" style={{ background: SG_BLUE }}>
                      {createContact.isPending ? "Adding..." : "Add Contact"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0aec0]" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 rounded border-[#e2e8f0] text-[13px] bg-white"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[13px] text-[#718096]">Loading contacts...</div>
        ) : !contacts?.length ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-center">
            <Users className="w-10 h-10 text-[#cbd5e0]" />
            <p className="text-[14px] font-semibold text-[#2d3748]">{search.length > 2 ? "No contacts match your search" : "No contacts yet"}</p>
            <p className="text-[13px] text-[#718096] max-w-sm">Add contacts manually or import a CSV to build your audience.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Email</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Name</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Tags</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Status</th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Added</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e2e8f0] transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
                  >
                    <td className="px-6 py-3.5 text-[13px] font-medium text-[#1a202c]">{c.email}</td>
                    <td className="px-6 py-3.5 text-[13px] text-[#4a5568]">{[c.firstName, c.lastName].filter(Boolean).join(" ") || <span className="text-[#cbd5e0]">—</span>}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {c.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#edf2f7] text-[#4a5568]">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {c.unsubscribed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium bg-[#fff5f5] text-[#742a2a]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e53e3e]" /> Unsubscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium bg-[#f0fff4] text-[#276749]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#38a169]" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-[13px] text-[#718096]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleSubscribe(c.id, c.unsubscribed)}
                        className="text-[12px] font-medium transition-colors"
                        style={{ color: c.unsubscribed ? SG_BLUE : "#718096" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.7"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                      >
                        {c.unsubscribed ? "Resubscribe" : "Unsubscribe"}
                      </button>
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
