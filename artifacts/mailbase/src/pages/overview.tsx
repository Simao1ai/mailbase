import { useGetAnalyticsOverview, getGetAnalyticsOverviewQueryKey } from "@workspace/api-client-react";
import { useBusiness } from "@/lib/business-context";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Send, MailOpen, MousePointerClick, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

function StatCard({ label, value, rate, rateLabel, icon: Icon, iconColor, trend }: {
  label: string; value: number; rate?: string; rateLabel?: string;
  icon: React.ElementType; iconColor: string; trend?: number;
}) {
  return (
    <div className="bg-white rounded border border-[#e2e8f0] p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#718096]">{label}</span>
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div className="text-[28px] font-bold text-[#1a202c] leading-none">{value.toLocaleString()}</div>
      {rate !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[13px] font-semibold text-[#1a202c]">{rate}</span>
          {rateLabel && <span className="text-[12px] text-[#718096]">{rateLabel}</span>}
        </div>
      )}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-[12px] font-medium ${trend >= 0 ? "text-[#38a169]" : "text-[#e53e3e]"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last period
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", fontSize: 13 },
  labelStyle: { color: "#718096", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#1a202c" },
};

export default function Overview() {
  const { business } = useBusiness();
  const { data, isLoading } = useGetAnalyticsOverview(
    { business, days: 14 },
    { query: { queryKey: getGetAnalyticsOverviewQueryKey({ business, days: 14 }) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#e2e8f0] rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white border border-[#e2e8f0] rounded" />)}
        </div>
        <div className="h-72 bg-white border border-[#e2e8f0] rounded" />
      </div>
    );
  }

  if (!data) return <p className="text-[#718096] text-sm">No data available.</p>;

  const openRate = data.totalSent > 0 ? ((data.totalOpened / data.totalSent) * 100).toFixed(1) + "%" : "—";
  const clickRate = data.totalSent > 0 ? ((data.totalClicked / data.totalSent) * 100).toFixed(1) + "%" : "—";
  const bounceRate = data.totalSent > 0 ? ((data.totalBounced / data.totalSent) * 100).toFixed(1) + "%" : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {/* Page header */}
      <div className="bg-white rounded border border-[#e2e8f0] mb-4">
        <div className="px-6 py-5 border-b border-[#e2e8f0]">
          <h1 className="text-[18px] font-bold text-[#1a202c]">Stats at a glance</h1>
          <p className="text-[13px] text-[#718096] mt-0.5">Last 14 days — {business === "equifind" ? "Equifind" : "Inspection"}</p>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e2e8f0]">
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" style={{ color: SG_BLUE }} /> Emails Sent
            </p>
            <p className="text-[28px] font-bold text-[#1a202c] leading-none">{data.totalSent.toLocaleString()}</p>
            <p className="text-[12px] text-[#718096] mt-1.5">Total delivered</p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-2 flex items-center gap-1.5">
              <MailOpen className="w-3.5 h-3.5 text-[#38a169]" /> Open Rate
            </p>
            <p className="text-[28px] font-bold text-[#1a202c] leading-none">{openRate}</p>
            <p className="text-[12px] text-[#718096] mt-1.5">{data.totalOpened.toLocaleString()} unique opens</p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-2 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-[#805ad5]" /> Click Rate
            </p>
            <p className="text-[28px] font-bold text-[#1a202c] leading-none">{clickRate}</p>
            <p className="text-[12px] text-[#718096] mt-1.5">{data.totalClicked.toLocaleString()} unique clicks</p>
          </div>
          <div className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#e53e3e]" /> Bounce Rate
            </p>
            <p className="text-[28px] font-bold text-[#1a202c] leading-none">{bounceRate}</p>
            <p className="text-[12px] text-[#718096] mt-1.5">{data.totalBounced.toLocaleString()} bounced</p>
          </div>
        </div>
      </div>

      {/* Delivery timeline */}
      <div className="bg-white rounded border border-[#e2e8f0]">
        <div className="px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="text-[14px] font-semibold text-[#1a202c]">Email Activity</h2>
          <p className="text-[12px] text-[#718096] mt-0.5">Daily send, open, and click volume</p>
        </div>
        <div className="px-6 pt-4 pb-6" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SG_BLUE} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={SG_BLUE} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38a169" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#38a169" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} dy={8} />
              <YAxis tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} />
              <RechartsTip {...tooltipStyle} />
              <Legend
                iconType="line"
                iconSize={16}
                wrapperStyle={{ fontSize: 12, color: "#718096", paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="sent" name="Sent" stroke={SG_BLUE} strokeWidth={2} fill="url(#gSent)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="opened" name="Opened" stroke="#38a169" strokeWidth={2} fill="url(#gOpen)" dot={false} activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="clicked" name="Clicked" stroke="#805ad5" strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
