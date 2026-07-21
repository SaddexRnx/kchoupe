import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Users, Building2, Bot, ShoppingCart, MessageSquare, BookOpen,
  Plug, Bell, Search, Trash2, Crown, UserMinus, Send, LogOut, Sparkles, ArrowUpRight,
  DollarSign, Command, ChevronRight, TrendingUp, TrendingDown, Radio, Layers, Gauge, ArrowRight,
} from "lucide-react";
import {
  getPlatformStats, getPlatformTimeseries, listAllUsers, listAllWorkspaces, listAllEmployees, listAllOrders,
  listAllConversations, listAllIntegrations, setUserAdmin, updateWorkspacePlan,
  deleteWorkspace, deleteUser, broadcastNotification,
} from "@/lib/admin.functions";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast, Modal, useConfirm } from "@/components/pages/_shared";

type Tab = "overview" | "users" | "workspaces" | "employees" | "orders" | "conversations" | "integrations" | "system";

const NAV: { key: Tab; label: string; icon: typeof Users; hint: string }[] = [
  { key: "overview",      label: "Overview",      icon: Gauge,         hint: "Pulse" },
  { key: "users",         label: "Users",         icon: Users,         hint: "People" },
  { key: "workspaces",    label: "Workspaces",    icon: Building2,     hint: "Tenants" },
  { key: "employees",     label: "AI Employees",  icon: Bot,           hint: "Agents" },
  { key: "orders",        label: "Orders",        icon: ShoppingCart,  hint: "Commerce" },
  { key: "conversations", label: "Conversations", icon: MessageSquare, hint: "Inbox" },
  { key: "integrations",  label: "Integrations",  icon: Plug,          hint: "Wiring" },
  { key: "system",        label: "System",        icon: Radio,         hint: "Ops" },
];

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const navigate = useNavigate();
  const toast = useToast();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.push({ kind: "success", title: "Signed out" });
    navigate({ to: "/login", replace: true });
  };

  const current = NAV.find((n) => n.key === tab)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient orbs — subtle, not busy */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary/[0.10] blur-[140px]" />
        <div className="absolute -right-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-accent/[0.10] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:py-8">
        {/* ---- Left rail ---- */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[248px] shrink-0 flex-col rounded-3xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-2xl lg:flex">
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent shadow-[0_10px_40px_-10px_var(--primary)]">
              <Shield className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card pulse-emerald" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[15px] font-bold tracking-tight">Atlas</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Control · Root</div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-0.5">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">Workspace</div>
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = n.key === tab;
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-300 ${
                    active
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_12px_var(--primary)]" />
                  )}
                  <span className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${active ? "bg-gradient-to-br from-primary/25 to-accent/20 text-foreground" : "bg-white/[0.03] text-muted-foreground group-hover:bg-white/[0.06]"}`}>
                    <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className="flex-1 truncate">{n.label}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-white/5 bg-black/20 p-3">
            <Link to="/dashboard" className="mb-2 flex items-center justify-between rounded-xl px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground">
              <span className="flex items-center gap-2"><ArrowUpRight className="h-3.5 w-3.5" /> User view</span>
            </Link>
            <button onClick={signOut} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-white/[0.04] hover:text-red-300">
              <span className="flex items-center gap-2"><LogOut className="h-3.5 w-3.5" /> Sign out</span>
            </button>
          </div>
        </aside>

        {/* ---- Main column ---- */}
        <main className="min-w-0 flex-1">
          {/* Mobile top nav */}
          <div className="lg:hidden mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="font-display text-sm font-bold">Atlas Admin</div>
            </div>
            <button onClick={signOut} className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px]"><LogOut className="h-3.5 w-3.5" /></button>
          </div>
          <div className="lg:hidden mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-card/50 p-1 backdrop-blur-xl">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = tab === n.key;
              return (
                <button key={n.key} onClick={() => setTab(n.key)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium transition ${active ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </button>
              );
            })}
          </div>

          {/* Page header */}
          <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span>Control</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground/80">{current.hint}</span>
              </div>
              <h1 className="mt-2 font-display text-[28px] font-bold leading-none tracking-tight sm:text-[34px]">
                {current.label}
              </h1>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-white/[0.06] bg-card/40 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-xl sm:flex">
              <Command className="h-3.5 w-3.5" />
              <span>All systems nominal</span>
              <span className="ml-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
            </div>
          </div>

          {tab === "overview" && <Overview />}
          {tab === "users" && <UsersTab />}
          {tab === "workspaces" && <WorkspacesTab />}
          {tab === "employees" && <SimpleListTab kind="employees" />}
          {tab === "orders" && <SimpleListTab kind="orders" />}
          {tab === "conversations" && <SimpleListTab kind="conversations" />}
          {tab === "integrations" && <SimpleListTab kind="integrations" />}
          {tab === "system" && <SystemTab />}
        </main>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */

const CHART_COLORS = [
  "var(--primary)", "var(--accent)", "#22d3ee", "#f59e0b", "#ec4899", "#84cc16", "#8b5cf6", "#f43f5e",
];

type Metric = "revenue" | "orders" | "users" | "messages";
const METRICS: { key: Metric; label: string; icon: typeof Users; color: string }[] = [
  { key: "revenue",  label: "Revenue",   icon: DollarSign,     color: "var(--primary)" },
  { key: "orders",   label: "Orders",    icon: ShoppingCart,   color: "var(--accent)" },
  { key: "users",    label: "New users", icon: Users,          color: "#22d3ee" },
  { key: "messages", label: "Messages",  icon: MessageSquare,  color: "#f59e0b" },
];

function Overview() {
  const statsFn = useServerFn(getPlatformStats);
  const tsFn = useServerFn(getPlatformTimeseries);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => statsFn() });
  const { data: ts } = useQuery({ queryKey: ["admin", "timeseries"], queryFn: () => tsFn() });
  const s = (data ?? {}) as any;
  const t = (ts ?? {}) as any;
  const fmt = (n: any) => (typeof n === "number" ? n.toLocaleString() : (n ?? 0));
  const days = (t.days ?? []) as Array<any>;
  const toEntries = (obj: any) => Object.entries((obj ?? {}) as Record<string, number>).map(([name, value]) => ({ name, value: Number(value) }));
  const channels = toEntries(t.channels);
  const orderStatus = toEntries(t.order_status);
  const employeeStatus = toEntries(t.employee_status);
  const integrationStatus = toEntries(t.integration_status);
  const topWs = ((t.top_workspaces ?? []) as any[]).slice(0, 6).map((w) => ({ name: w.name ?? "—", revenue: Number(w.revenue), orders: Number(w.orders) }));

  const [metric, setMetric] = useState<Metric>("revenue");
  const metricDef = METRICS.find((m) => m.key === metric)!;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-panel h-56 animate-pulse rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-panel h-28 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Sparkline helper — normalize an array of day values to a tiny path
  const spark = (key: string) => days.map((d) => ({ v: Number(d[key] ?? 0) }));

  const growth = (curr: number, prev: number) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const heroValue = s[metric === "revenue" ? "revenue" : metric === "orders" ? "orders" : metric === "users" ? "users" : "messages"] ?? 0;
  const heroWeek = s[metric === "revenue" ? "revenue_7d" : metric === "orders" ? "orders_7d" : metric === "users" ? "new_users_7d" : "messages"] ?? 0;
  const heroDelta = growth(heroWeek, heroValue - heroWeek);

  const kpiTiles = [
    { key: "users",     icon: Users,         label: "Users",        value: s.users,        delta: growth(s.new_users_7d ?? 0, (s.users ?? 0) - (s.new_users_7d ?? 0)), spark: spark("users"),   tone: "#22d3ee" },
    { key: "orders",    icon: ShoppingCart,  label: "Orders",       value: s.orders,       delta: growth(s.orders_7d ?? 0, (s.orders ?? 0) - (s.orders_7d ?? 0)),      spark: spark("orders"),  tone: "var(--accent)" },
    { key: "revenue",   icon: DollarSign,    label: "Revenue",      value: s.revenue,      delta: growth(s.revenue_7d ?? 0, (s.revenue ?? 0) - (s.revenue_7d ?? 0)),   spark: spark("revenue"), tone: "var(--primary)" },
    { key: "messages",  icon: MessageSquare, label: "Messages",     value: s.messages,     delta: 0,                                                                     spark: spark("messages"),tone: "#f59e0b" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* HERO — editorial big-number + inline chart */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-br from-card/70 via-card/40 to-card/60 p-6 backdrop-blur-2xl sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span>Live · last 30 days</span>
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <div className="font-display text-[64px] font-black leading-[0.9] tracking-[-0.04em] sm:text-[84px]">
                {fmt(heroValue)}
              </div>
              <DeltaPill value={heroDelta} />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {metricDef.label.toLowerCase()} — <span className="text-foreground/80 font-medium tabular-nums">{fmt(heroWeek)}</span> in the last 7 days
            </div>

            {/* metric switcher */}
            <div className="mt-6 inline-flex flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-black/20 p-1">
              {METRICS.map((m) => {
                const Icon = m.icon;
                const active = m.key === metric;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 ${
                      active
                        ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_24px_-8px_var(--primary)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline area chart */}
          <div className="relative min-w-0 flex-1 lg:max-w-[52%]">
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={days} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={metricDef.color} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={metricDef.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" opacity={0.4} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v?.slice(5)} axisLine={false} tickLine={false} interval={5} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, fontSize: 12, boxShadow: "0 20px 60px -20px rgb(0 0 0 / .5)" }} cursor={{ stroke: metricDef.color, strokeOpacity: 0.3, strokeWidth: 1.5, strokeDasharray: "4 4" }} />
                  <Area type="monotone" dataKey={metric} stroke={metricDef.color} strokeWidth={2.5} fill="url(#heroGrad)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* KPI TILES — horizontal, with mini sparklines */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiTiles.map((k, i) => (
          <KpiTile key={k.label} {...k} delay={i * 60} />
        ))}
      </div>

      {/* THREE-UP: donuts + top workspaces */}
      <div className="grid gap-4 lg:grid-cols-3">
        <DonutCard title="Conversation channels" subtitle="Where users chat"      data={channels}    label="chats"  />
        <DonutCard title="Order status"          subtitle="Fulfillment pipeline" data={orderStatus} label="orders" colorOffset={2} />
        <TopWorkspaces items={topWs} />
      </div>

      {/* SYSTEM ROW — smaller bar charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniBarCard title="AI Employees" subtitle="By status" data={employeeStatus} color="var(--primary)" icon={Bot} />
        <MiniBarCard title="Integrations" subtitle="By status" data={integrationStatus} color="var(--accent)" icon={Plug} />
      </div>

      {/* FOOTER SUMMARY */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Workspaces"  value={fmt(s.workspaces)} caption={`${fmt(s.trials_active)} on trial · ${fmt(s.trials_expired)} expired`} icon={Building2} />
        <SummaryCard label="Knowledge"   value={fmt(s.knowledge_sources)} caption="sources indexed" icon={BookOpen} />
        <SummaryCard label="Root admins" value={fmt(s.admins)} caption="with full access" icon={Crown} />
      </div>
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums ${
      up ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-red-400/25 bg-red-400/10 text-red-300"
    }`}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}{value}%
    </span>
  );
}

function KpiTile({
  icon: Icon, label, value, delta, spark, tone, delay = 0,
}: { icon: typeof Users; label: string; value: any; delta: number; spark: { v: number }[]; tone: string; delay?: number }) {
  const up = delta >= 0;
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_20px_60px_-20px_var(--primary)] animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.04] transition-transform duration-500 group-hover:scale-110" style={{ color: tone }}>
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        </div>
        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${up ? "text-emerald-300" : "text-red-300"}`}>
          {up ? "+" : ""}{delta}%
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="font-display text-[30px] font-black leading-none tracking-[-0.03em] tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : (value ?? 0)}
        </div>
        <div className="h-10 w-24 opacity-80">
          <ResponsiveContainer>
            <AreaChart data={spark} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={tone} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={tone} strokeWidth={1.5} fill={`url(#sp-${label})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DonutCard({ title, subtitle, data, label, colorOffset = 0 }: { title: string; subtitle: string; data: { name: string; value: number }[]; label: string; colorOffset?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-xl">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</div>
      <div className="mb-4 font-display text-[17px] font-bold tracking-tight">{title}</div>
      <div className="relative" style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data.length ? data : [{ name: "—", value: 1 }]} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={data.length > 1 ? 4 : 0} stroke="none" animationDuration={800}>
              {(data.length ? data : [{ name: "—", value: 1 }]).map((_, i) => (
                <Cell key={i} fill={data.length ? CHART_COLORS[(i + colorOffset) % CHART_COLORS.length] : "var(--border)"} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-black tabular-nums leading-none">{total.toLocaleString()}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        {data.slice(0, 4).map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_COLORS[(i + colorOffset) % CHART_COLORS.length] }} />
                <span className="truncate text-muted-foreground">{d.name}</span>
              </div>
              <div className="tabular-nums font-semibold">{pct}%</div>
            </div>
          );
        })}
        {data.length === 0 && <div className="text-[11px] text-muted-foreground">No data yet.</div>}
      </div>
    </div>
  );
}

function TopWorkspaces({ items }: { items: { name: string; revenue: number; orders: number }[] }) {
  const max = Math.max(...items.map((x) => x.revenue), 1);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-xl">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Leaderboard</div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-[17px] font-bold tracking-tight">Top workspaces</div>
        <Crown className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-3">
        {items.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No revenue yet.</div>}
        {items.map((w, i) => {
          const pct = (w.revenue / max) * 100;
          return (
            <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/[0.06] text-[10px] font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="truncate font-medium">{w.name}</span>
                </div>
                <div className="shrink-0 tabular-nums text-muted-foreground">{w.revenue.toLocaleString()}</div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniBarCard({ title, subtitle, data, color, icon: Icon }: { title: string; subtitle: string; data: { name: string; value: number }[]; color: string; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</div>
          <div className="mt-1 font-display text-[17px] font-bold tracking-tight">{title}</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.04]" style={{ color }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div style={{ width: "100%", height: 170 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -18, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" opacity={0.4} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
            <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} maxBarSize={44} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.length === 0 && <div className="mt-2 text-center text-[11px] text-muted-foreground">No data.</div>}
    </div>
  );
}

function SummaryCard({ label, value, caption, icon: Icon }: { label: string; value: string; caption: string; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-card/40 p-4 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/[0.12]">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className="font-display text-2xl font-black leading-tight tabular-nums">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{caption}</div>
      </div>
    </div>
  );
}

/* ---------------- Tables ---------------- */

function useSearch<T>(items: T[], keys: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter((it) => keys.some((k) => String((it as any)[k] ?? "").toLowerCase().includes(s)));
  }, [items, keys, q]);
  return { q, setQ, filtered };
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/[0.06] bg-card/40 py-2.5 pl-10 pr-3 text-sm outline-none backdrop-blur-xl transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-card/60"
      />
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function UsersTab() {
  const listFn = useServerFn(listAllUsers);
  const setAdminFn = useServerFn(setUserAdmin);
  const deleteFn = useServerFn(deleteUser);
  const qc = useQueryClient();
  const toast = useToast();
  const { ask: confirm, node: confirmNode } = useConfirm();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });
  const { q, setQ, filtered } = useSearch(data ?? [], ["email", "display_name"]);

  const toggleAdmin = useMutation({
    mutationFn: (v: { userId: string; makeAdmin: boolean }) => setAdminFn({ data: v }),
    onSuccess: () => { toast.push({ kind: "success", title: "Role updated" }); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.push({ kind: "error", title: "Failed", body: e?.message }),
  });
  const del = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => { toast.push({ kind: "success", title: "User deleted" }); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.push({ kind: "error", title: "Failed", body: e?.message }),
  });

  return (
    <div className="animate-fade-up space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder="Search by name or email…" />
      <TableShell>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3.5">User</th>
              <th className="px-4 py-3.5">Joined</th>
              <th className="px-4 py-3.5">Last seen</th>
              <th className="px-4 py-3.5">Workspaces</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">No users yet.</td></tr>}
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 font-display text-xs font-bold uppercase">
                      {(u.display_name || u.email || "?").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.display_name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}</td>
                <td className="px-4 py-3 tabular-nums">{u.workspace_count}</td>
                <td className="px-4 py-3">
                  {u.is_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"><Crown className="h-3 w-3" /> Admin</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Member</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !u.is_admin })}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
                    >
                      {u.is_admin ? <><UserMinus className="h-3 w-3" /> Demote</> : <><Crown className="h-3 w-3" /> Promote</>}
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await confirm({ title: "Delete user?", body: `${u.email} will be permanently removed.`, danger: true });
                        if (ok) del.mutate(u.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 transition hover:-translate-y-0.5 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
      {confirmNode}
    </div>
  );
}

function WorkspacesTab() {
  const listFn = useServerFn(listAllWorkspaces);
  const updateFn = useServerFn(updateWorkspacePlan);
  const deleteFn = useServerFn(deleteWorkspace);
  const qc = useQueryClient();
  const toast = useToast();
  const { ask: confirm, node: confirmNode } = useConfirm();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "workspaces"], queryFn: () => listFn() });
  const { q, setQ, filtered } = useSearch(data ?? [], ["name", "plan", "country"]);
  const [editing, setEditing] = useState<any | null>(null);

  const upd = useMutation({
    mutationFn: (v: { workspaceId: string; plan: string; extendDays?: number }) => updateFn({ data: v }),
    onSuccess: () => { toast.push({ kind: "success", title: "Workspace updated" }); qc.invalidateQueries({ queryKey: ["admin"] }); setEditing(null); },
    onError: (e: any) => toast.push({ kind: "error", title: "Failed", body: e?.message }),
  });
  const del = useMutation({
    mutationFn: (workspaceId: string) => deleteFn({ data: { workspaceId } }),
    onSuccess: () => { toast.push({ kind: "success", title: "Workspace deleted" }); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: any) => toast.push({ kind: "error", title: "Failed", body: e?.message }),
  });

  const planTone: Record<string, string> = {
    trial:   "bg-amber-400/10 text-amber-300 border-amber-400/25",
    starter: "bg-cyan-400/10 text-cyan-300 border-cyan-400/25",
    growth:  "bg-primary/10 text-primary border-primary/25",
    scale:   "bg-accent/10 text-accent border-accent/25",
  };

  return (
    <div className="animate-fade-up space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder="Search workspaces…" />
      <TableShell>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3.5">Workspace</th>
              <th className="px-4 py-3.5">Plan</th>
              <th className="px-4 py-3.5">Members</th>
              <th className="px-4 py-3.5">Employees</th>
              <th className="px-4 py-3.5">Orders</th>
              <th className="px-4 py-3.5">Revenue</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">No workspaces yet.</td></tr>}
            {filtered.map((w) => {
              const trialLeft = w.plan === "trial" ? Math.ceil((new Date(w.trial_ends_at).getTime() - Date.now()) / 86400_000) : null;
              return (
                <tr key={w.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.country ?? "—"} · {w.currency}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${planTone[w.plan] ?? "bg-white/5 text-muted-foreground border-white/10"}`}>{w.plan}</span>
                    {trialLeft !== null && <div className={`mt-1 text-[10px] ${trialLeft < 3 ? "text-red-300" : "text-muted-foreground"}`}>{trialLeft > 0 ? `${trialLeft}d left` : "expired"}</div>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{w.member_count}</td>
                  <td className="px-4 py-3 tabular-nums">{w.employee_count}</td>
                  <td className="px-4 py-3 tabular-nums">{w.order_count}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold">{Number(w.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setEditing(w)} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] transition hover:-translate-y-0.5 hover:bg-white/[0.08]">Edit</button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete workspace?", body: `${w.name} and all its data will be permanently removed.`, danger: true });
                          if (ok) del.mutate(w.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 transition hover:-translate-y-0.5 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Edit ${editing.name}`}>
          <EditWorkspaceForm workspace={editing} onSubmit={(v) => upd.mutate({ workspaceId: editing.id, ...v })} loading={upd.isPending} />
        </Modal>
      )}
      {confirmNode}
    </div>
  );
}

function EditWorkspaceForm({ workspace, onSubmit, loading }: { workspace: any; onSubmit: (v: { plan: string; extendDays?: number }) => void; loading: boolean }) {
  const [plan, setPlan] = useState(workspace.plan);
  const [extendDays, setExtendDays] = useState(0);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ plan, extendDays: extendDays || undefined }); }} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50">
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="scale">Scale</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Extend trial (days from now)</label>
        <input type="number" min={0} value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
        <div className="mt-1 text-[11px] text-muted-foreground">Leave 0 to keep current trial end date.</div>
      </div>
      <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60">
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function SimpleListTab({ kind }: { kind: "employees" | "orders" | "conversations" | "integrations" }) {
  const map = {
    employees:     { fn: listAllEmployees,     key: "employees",     searchKeys: ["name", "role", "status"],            label: "AI Employees" },
    orders:        { fn: listAllOrders,        key: "orders",        searchKeys: ["order_no", "status", "currency"],    label: "Orders" },
    conversations: { fn: listAllConversations, key: "conversations", searchKeys: ["channel", "status", "external_user"], label: "Conversations" },
    integrations:  { fn: listAllIntegrations,  key: "integrations",  searchKeys: ["integration_key", "status"],          label: "Integrations" },
  }[kind];
  const fn = useServerFn(map.fn as any);
  const { data, isLoading } = useQuery({ queryKey: ["admin", map.key], queryFn: () => (fn as any)() });
  const rows = (data ?? []) as any[];
  const { q, setQ, filtered } = useSearch(rows, map.searchKeys as any);
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="animate-fade-up space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder={`Search ${map.label.toLowerCase()}…`} />
      <TableShell>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-white/[0.06] text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>{cols.map((c) => <th key={c} className="px-3 py-3.5">{c.replace(/_/g, " ")}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={cols.length || 1} className="px-4 py-8 text-center text-xs text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={cols.length || 1} className="px-4 py-8 text-center text-xs text-muted-foreground">Nothing here yet.</td></tr>}
            {filtered.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2.5 text-xs">
                    {typeof row[c] === "string" && row[c].length > 40 ? row[c].slice(0, 40) + "…" : String(row[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function SystemTab() {
  const fn = useServerFn(broadcastNotification);
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("info");
  const mut = useMutation({
    mutationFn: () => fn({ data: { title, body, kind } }),
    onSuccess: (r: any) => { toast.push({ kind: "success", title: "Broadcast sent", body: `Delivered to ${r.count} workspaces.` }); setTitle(""); setBody(""); },
    onError: (e: any) => toast.push({ kind: "error", title: "Failed", body: e?.message }),
  });

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-4">
      <div className="rounded-3xl border border-white/[0.06] bg-card/40 p-6 backdrop-blur-xl">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Announce</div>
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-[18px] font-bold tracking-tight">Broadcast notification</div>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground"><Send className="h-4 w-4" /></div>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">Send an in-app notification to every workspace on the platform.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (!title) return; mut.mutate(); }} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message body (optional)" className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm outline-none transition focus:border-primary/50" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-sm outline-none focus:border-primary/50">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Alert</option>
          </select>
          <button disabled={mut.isPending || !title} className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_12px_40px_-12px_var(--primary)] transition hover:brightness-110 disabled:opacity-60">
            {mut.isPending ? "Sending…" : "Send to everyone"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      </div>
      <div className="rounded-3xl border border-white/[0.06] bg-card/40 p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Quick links</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">Dashboard <ArrowUpRight className="h-3 w-3" /></Link>
          <Link to="/integrations" className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">Integrations <ArrowUpRight className="h-3 w-3" /></Link>
          <Link to="/settings" className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]">Settings <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </div>
  );
}
