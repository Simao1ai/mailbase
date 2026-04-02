import { useState } from "react";
import { useGetAnalyticsOverview, getGetAnalyticsOverviewQueryKey } from "@workspace/api-client-react";
import { useBusiness } from "@/lib/business-context";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer, Legend
} from "recharts";
import { motion } from "framer-motion";

const SG_BLUE = "#1a82e2";

const tooltipStyle = {
  contentStyle: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", fontSize: 13 },
  labelStyle: { color: "#718096", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "#1a202c" },
};

export default function Analytics() {
  const { business } = useBusiness();
  const [days, setDays] = useState("14");

  const { data, isLoading } = useGetAnalyticsOverview(
    { business, days: parseInt(days) },
    { query: { queryKey: getGetAnalyticsOverviewQueryKey({ business, days: parseInt(days) }) } }
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-4">
      {/* Page header */}
      <div className="bg-white rounded border border-[#e2e8f0]">
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1a202c]">Analytics</h1>
            <p className="text-[13px] text-[#718096] mt-0.5">Deliverability and engagement trends</p>
          </div>
          {/* Day range toggle */}
          <div className="flex rounded border border-[#e2e8f0] overflow-hidden text-[13px] font-medium" style={{ background: "#f8fafc" }}>
            {["7", "14", "30"].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-4 py-2 transition-colors"
                style={{
                  background: days === d ? SG_BLUE : "transparent",
                  color: days === d ? "#fff" : "#718096",
                  borderRight: d !== "30" ? "1px solid #e2e8f0" : undefined,
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        {data && !isLoading && (
          <div className="grid grid-cols-4 divide-x divide-[#e2e8f0]">
            {[
              { label: "Sent", value: data.totalSent },
              { label: "Opened", value: data.totalOpened },
              { label: "Clicked", value: data.totalClicked },
              { label: "Bounced", value: data.totalBounced },
            ].map(s => (
              <div key={s.label} className="px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096] mb-1">{s.label}</p>
                <p className="text-[22px] font-bold text-[#1a202c]">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-72 bg-white rounded border border-[#e2e8f0]" />
          <div className="h-56 bg-white rounded border border-[#e2e8f0]" />
        </div>
      ) : data ? (
        <>
          {/* Engagement timeline */}
          <div className="bg-white rounded border border-[#e2e8f0]">
            <div className="px-6 py-4 border-b border-[#e2e8f0]">
              <h2 className="text-[14px] font-semibold text-[#1a202c]">Engagement Timeline</h2>
              <p className="text-[12px] text-[#718096] mt-0.5">Opens and clicks over the selected period</p>
            </div>
            <div className="px-6 pt-4 pb-6" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} />
                  <RechartsTip {...tooltipStyle} />
                  <Legend iconType="line" iconSize={16} wrapperStyle={{ fontSize: 12, color: "#718096", paddingTop: 8 }} />
                  <Line type="monotone" dataKey="sent"    name="Sent"    stroke={SG_BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="opened"  name="Opened"  stroke="#38a169" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="clicked" name="Clicked" stroke="#805ad5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bounce analysis */}
          <div className="bg-white rounded border border-[#e2e8f0]">
            <div className="px-6 py-4 border-b border-[#e2e8f0]">
              <h2 className="text-[14px] font-semibold text-[#1a202c]">Bounce Analysis</h2>
              <p className="text-[12px] text-[#718096] mt-0.5">Hard and soft bounces per day</p>
            </div>
            <div className="px-6 pt-4 pb-6" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 11, fill: "#718096" }} tickLine={false} axisLine={false} />
                  <RechartsTip {...tooltipStyle} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="bounced" name="Bounces" fill="#e53e3e" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
