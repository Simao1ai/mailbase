import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useBusiness } from "@/lib/business-context";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard, Globe, Megaphone, Users, BarChart3,
  Zap, HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Building2, Settings, Network, Mail, PlusCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { business, setBusiness } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [bizOpen, setBizOpen] = useState(false);

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery<Array<{ slug: string; label: string }>>({
    queryKey: ["tenants"],
    queryFn: () => apiFetch("/api/tenants"),
    staleTime: 60_000,
    retry: 3,
  });

  const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/domains", label: "Domains", icon: Globe },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/transactional", label: "Transactional", icon: Zap },
    { href: "/inbox", label: "Inbox", icon: Mail },
    { href: "/tenants", label: "Tenants", icon: Network },
    { href: "/settings", label: "API & Settings", icon: Settings },
  ];

  const currentPage = navItems.find(
    item => location === item.href || (item.href !== "/" && location.startsWith(item.href))
  )?.label || "Dashboard";

  const activeTenant = tenants.find(t => t.slug === business);

  // If the active business was deleted or is no longer in the list, switch to the first available
  useEffect(() => {
    if (tenants.length > 0 && !activeTenant) {
      setBusiness(tenants[0].slug);
    }
  }, [tenants, activeTenant]);

  const bizLabel = activeTenant?.label ?? (tenants[0]?.label ?? business);
  const bizInitial = bizLabel[0]?.toUpperCase() ?? "?";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[100dvh] overflow-hidden" style={{ background: "#f0f4f8" }}>
        {/* ── Sidebar ── */}
        <aside
          className="flex flex-col shrink-0 text-white transition-[width] duration-200 ease-in-out overflow-hidden"
          style={{ width: collapsed ? 56 : 230, background: "#294661" }}
        >
          {/* Logo */}
          <div
            className="h-14 flex items-center shrink-0 border-b select-none"
            style={{ borderColor: "rgba(255,255,255,0.1)", padding: collapsed ? "0 16px" : "0 20px" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-7 w-7 rounded flex items-center justify-center shrink-0"
                style={{ background: "#1a82e2" }}
              >
                <Zap className="text-white w-4 h-4" />
              </div>
              {!collapsed && (
                <span className="font-bold text-[15px] tracking-tight text-white whitespace-nowrap">
                  MailBase
                </span>
              )}
            </div>
          </div>

          {/* Business selector */}
          <div className="px-3 pt-3 pb-1 relative">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setBizOpen(o => !o)}
                    className="h-9 w-full flex items-center justify-center rounded border text-white/70 text-[13px] font-semibold hover:bg-white/10 transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.18)" }}
                  >
                    {bizInitial}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{bizLabel}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setBizOpen(o => !o)}
                  className="w-full flex items-center gap-2.5 px-3 h-9 rounded border text-[13px] font-medium text-white/80 hover:bg-white/10 transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.05)" }}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="flex-1 text-left truncate">{bizLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
                </button>
                {bizOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 rounded border py-1 z-50"
                    style={{ background: "#1e3552", borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    {tenants.map(t => (
                      <button
                        key={t.slug}
                        onClick={() => { setBusiness(t.slug); setBizOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-white/10 transition-colors"
                        style={{ color: business === t.slug ? "#fff" : "rgba(255,255,255,0.65)", fontWeight: business === t.slug ? 600 : 400 }}
                      >
                        {t.label}
                      </button>
                    ))}
                    {tenantsLoading && (
                      <p className="px-3 py-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Loading...
                      </p>
                    )}
                    {!tenantsLoading && tenants.length === 0 && (
                      <Link
                        href="/tenants"
                        onClick={() => setBizOpen(false)}
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] hover:bg-white/10 transition-colors"
                        style={{ color: "#60a5fa" }}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add a business
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav section label */}
          {!collapsed && (
            <div className="px-5 pt-4 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                Navigation
              </span>
            </div>
          )}

          {/* Nav items */}
          <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className="flex items-center justify-center h-9 w-full rounded transition-colors"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                          color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <item.icon className="w-[17px] h-[17px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-[7px] rounded text-[13.5px] font-medium transition-colors"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.58)",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <item.icon className="w-[17px] h-[17px] shrink-0" style={{ opacity: isActive ? 1 : 0.75 }} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: help + collapse */}
          <div className="p-2 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="#"
                    className="flex items-center justify-center h-9 w-full rounded transition-colors"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <HelpCircle className="w-[17px] h-[17px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Help & Support</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="#"
                className="flex items-center gap-2.5 px-3 py-[7px] rounded text-[13px] transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                <HelpCircle className="w-[17px] h-[17px] shrink-0" />
                <span>Help & Support</span>
              </Link>
            )}

            <button
              onClick={() => setCollapsed(c => !c)}
              className="w-full flex items-center justify-center h-8 rounded transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6 shrink-0">
            <span className="font-semibold text-[14px] text-[#1a202c]">{currentPage}</span>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-medium px-2.5 py-1 rounded"
                style={{ background: "#edf2f7", color: "#4a5568" }}
              >
                {bizLabel}
              </span>
            </div>
          </header>

          {/* Page scroll area */}
          <main className="flex-1 overflow-y-auto" style={{ background: "#f0f4f8" }}>
            <div className="p-6 max-w-[1200px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
