import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Key, Code2, BookOpen, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const API_KEY = "mb_live_0f48224b9a544922df1c317d961aca71bfcbf58e9b2936399134c2a5d0a3a4b5";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[12px] font-medium transition-colors"
      style={{
        borderColor: copied ? "#38a169" : "#e2e8f0",
        color: copied ? "#276749" : "#4a5568",
        background: copied ? "#f0fff4" : "#f8fafc",
      }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label ?? (copied ? "Copied!" : "Copy")}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="rounded border border-[#e2e8f0] overflow-hidden text-[12px]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
        <span className="font-mono text-[11px] text-[#718096] uppercase tracking-wider">{language}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copied to clipboard" }); }}
          className="flex items-center gap-1 text-[11px] text-[#718096] hover:text-[#1a202c] transition-colors"
        >
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="px-4 py-4 overflow-x-auto bg-[#1a202c] text-[#e2e8f0] leading-relaxed whitespace-pre">{code.trim()}</pre>
    </div>
  );
}

const BASE_URL = window.location.origin;

const examples = [
  {
    label: "Send a transactional email",
    icon: Terminal,
    lang: "bash",
    code: `curl -X POST ${BASE_URL}/api/transactional/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}" \\
  -d '{
    "business": "equifind",
    "type": "case_update",
    "toEmail": "client@example.com",
    "data": { "name": "John", "caseId": "EQ-1234" }
  }'`,
  },
  {
    label: "Add a contact",
    icon: Terminal,
    lang: "bash",
    code: `curl -X POST ${BASE_URL}/api/contacts \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${API_KEY}" \\
  -d '{
    "business": "equifind",
    "email": "new.lead@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "tags": ["lead", "web"]
  }'`,
  },
  {
    label: "JavaScript / Node.js",
    icon: Code2,
    lang: "javascript",
    code: `const MAILBASE_API_KEY = "${API_KEY}";
const MAILBASE_URL = "${BASE_URL}";

async function sendEmail(type, toEmail, data, business = "equifind") {
  const res = await fetch(\`\${MAILBASE_URL}/api/transactional/send\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MAILBASE_API_KEY,
    },
    body: JSON.stringify({ business, type, toEmail, data }),
  });
  if (!res.ok) throw new Error(\`MailBase error: \${res.status}\`);
  return res.json();
}

// Example: fire a case update email
await sendEmail("case_update", "client@equifind.com", {
  name: "John",
  caseId: "EQ-1234",
});`,
  },
  {
    label: "Python",
    icon: Code2,
    lang: "python",
    code: `import requests

MAILBASE_API_KEY = "${API_KEY}"
MAILBASE_URL = "${BASE_URL}"

def send_email(type, to_email, data, business="equifind"):
    response = requests.post(
        f"{MAILBASE_URL}/api/transactional/send",
        headers={
            "Content-Type": "application/json",
            "x-api-key": MAILBASE_API_KEY,
        },
        json={
            "business": business,
            "type": type,
            "toEmail": to_email,
            "data": data,
        },
    )
    response.raise_for_status()
    return response.json()

# Example: fire an appointment confirmation
send_email(
    type="appointment_confirm",
    to_email="client@example.com",
    data={"name": "Jane", "date": "2026-04-01 10:00"},
    business="inspection",
)`,
  },
];

export default function Settings() {
  const [showKey, setShowKey] = useState(false);
  const maskedKey = API_KEY.slice(0, 12) + "••••••••••••••••••••••••••••••••••••••••••••••••••";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-4">

      {/* API Key */}
      <div className="bg-white rounded border border-[#e2e8f0]">
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center gap-3">
          <Key className="w-5 h-5 text-[#1a82e2]" />
          <div>
            <h1 className="text-[18px] font-bold text-[#1a202c]">API Access</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Use this key to authenticate requests from your internal systems</p>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="mb-1.5">
            <label className="text-[13px] font-medium text-[#2d3748]">API Key</label>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center h-10 px-3 rounded border font-mono text-[13px] bg-[#f8fafc] border-[#e2e8f0] text-[#1a202c] overflow-hidden"
              style={{ letterSpacing: showKey ? "normal" : "0.05em" }}
            >
              <span className="truncate">{showKey ? API_KEY : maskedKey}</span>
            </div>
            <button
              onClick={() => setShowKey(v => !v)}
              className="h-10 w-10 flex items-center justify-center rounded border border-[#e2e8f0] bg-[#f8fafc] text-[#718096] hover:text-[#1a202c] hover:bg-white transition-colors"
              title={showKey ? "Hide" : "Reveal"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <CopyButton text={API_KEY} label="Copy Key" />
          </div>
          <p className="text-[12px] text-[#718096] mt-2.5">
            Pass this key in the <code className="px-1.5 py-0.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#1a202c]">x-api-key</code> header on every request to <code className="px-1.5 py-0.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#1a202c]">/api/*</code> endpoints. Keep it confidential — treat it like a password.
          </p>
        </div>

        {/* Quick info row */}
        <div className="border-t border-[#e2e8f0] px-6 py-4 grid grid-cols-2 gap-6" style={{ background: "#f8fafc" }}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-1">Base URL</p>
            <div className="flex items-center gap-2">
              <code className="text-[12px] text-[#1a202c] font-mono">{BASE_URL}</code>
              <CopyButton text={BASE_URL} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-1">Auth Header</p>
            <code className="text-[12px] text-[#1a202c] font-mono">x-api-key: &lt;your key&gt;</code>
          </div>
        </div>
      </div>

      {/* Endpoints reference */}
      <div className="bg-white rounded border border-[#e2e8f0]">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#1a82e2]" />
          <h2 className="text-[14px] font-semibold text-[#1a202c]">Key Endpoints</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Method</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Endpoint</th>
                <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#718096]">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { method: "POST", path: "/api/transactional/send", desc: "Trigger a transactional email event" },
                { method: "GET",  path: "/api/contacts",           desc: "List contacts (filter by ?business=)" },
                { method: "POST", path: "/api/contacts",           desc: "Add a single contact" },
                { method: "POST", path: "/api/contacts/bulk",      desc: "Bulk import contacts from an array" },
                { method: "GET",  path: "/api/campaigns",          desc: "List campaigns for a business" },
                { method: "POST", path: "/api/campaigns",          desc: "Create a new campaign draft" },
                { method: "POST", path: "/api/campaigns/:id/send", desc: "Send a draft campaign" },
                { method: "GET",  path: "/api/analytics/overview", desc: "Fetch delivery & engagement stats" },
                { method: "GET",  path: "/api/domains",            desc: "List authenticated sender domains" },
              ].map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#e2e8f0] transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#fff"}
                >
                  <td className="px-6 py-3.5">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold font-mono"
                      style={{
                        background: row.method === "GET" ? "#ebf8ff" : "#f0fff4",
                        color: row.method === "GET" ? "#2b6cb0" : "#276749",
                      }}
                    >
                      {row.method}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <code className="text-[12px] text-[#1a202c] font-mono">{row.path}</code>
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-[#4a5568]">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code examples */}
      <div className="bg-white rounded border border-[#e2e8f0]">
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#1a82e2]" />
          <h2 className="text-[14px] font-semibold text-[#1a202c]">Code Examples</h2>
        </div>
        <div className="px-6 py-6 space-y-6">
          {examples.map((ex, i) => (
            <div key={i}>
              <p className="text-[13px] font-semibold text-[#2d3748] mb-2">{ex.label}</p>
              <CodeBlock code={ex.code} language={ex.lang} />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
