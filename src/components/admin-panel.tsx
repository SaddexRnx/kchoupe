import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Users, Building2, Bot, ShoppingCart, MessageSquare, BookOpen,
  Plug, Bell, TrendingUp, Search, Trash2, Crown, UserMinus, Send, LogOut, Sparkles, ArrowUpRight,
  Activity, DollarSign, Zap,
} from "lucide-react";
import {
  getPlatformStats, getPlatformTimeseries, listAllUsers, listAllWorkspaces, listAllEmployees, listAllOrders,
  listAllConversations, listAllIntegrations, setUserAdmin, updateWorkspacePlan,
  deleteWorkspace, deleteUser, broadcastNotification,
} from "@/lib/admin.functions";
import {
  ResponsiveContainer, ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast, Modal, useConfirm } from "@/components/pages/_shared";

type Tab = "overview" | "users" | "workspaces" | "employees" | "orders" | "conversations" | "integrations" | "system";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "users", label: "Users", icon: Users },
  { key: "workspaces", label: "Workspaces", icon: Building2 },
  { key: "employees", label: "AI Employees", icon: Bot },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "system", label: "System", icon: Bell },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Aurora backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="animate-float absolute -right-40 bottom-0 h-[32rem] w-[32rem] rounded-full bg-accent/20 blur-[120px]" style={{ animationDelay: "1.4s" }} />
        <div className="animate-float absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" style={{ animationDelay: "0.8s" }} />
      </div>

      {/* Minimal header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/50 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
              <Shield className="h-4 w-4 text-primary-foreground" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background pulse-emerald" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-[15px] font-black tracking-tight truncate">Atlas Admin</span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">Root</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Platform command center</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 hover:bg-white/10 sm:inline-flex">
              User view
            </Link>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 hover:bg-white/10">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Floating pill nav */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <PillNav active={tab} onChange={setTab} />
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
  );
}

function PillNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLButtonElement>(`button[data-key="${active}"]`);
    if (el && containerRef.current) {
      const parent = containerRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicator({ left: rect.left - parent.left, width: rect.width });
    }
  }, [active]);

  return (
    <div ref={containerRef} className="glass-panel relative flex gap-1 overflow-x-auto rounded-2xl p-1.5 backdrop-blur-xl">
      {indicator && (
        <div
          className="absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/40 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = tab_eq(t.key, active);
        return (
          <button
            key={t.key}
            data-key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors duration-300 ${
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
function tab_eq(a: Tab, b: Tab) { return a === b; }

function KpiRing({ icon: Icon, label, value, hint, pct, tone = "primary", delay = 0 }: {
  icon: typeof Users; label: string; value: string | number; hint?: string; pct: number; tone?: "primary" | "accent" | "cyan" | "amber"; delay?: number;
}) {
  const toneColor = tone === "accent" ? "hsl(var(--accent))" : tone === "cyan" ? "#22d3ee" : tone === "amber" ? "#f59e0b" : "hsl(var(--primary))";
  const p = Math.max(0, Math.min(100, pct));
  const R = 26;
  const C = 2 * Math.PI * R;
  const dash = (p / 100) * C;
  return (
    <div className="glass-panel group animate-fade-up relative overflow-hidden rounded-2xl p-4 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90 transition-transform duration-700 group-hover:scale-110">
            <circle cx="32" cy="32" r={R} stroke="hsl(var(--border))" strokeWidth="4" fill="none" opacity="0.4" />
            <circle
              cx="32" cy="32" r={R} stroke={toneColor} strokeWidth="4" fill="none" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 6px ${toneColor})` }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <Icon className="h-4 w-4" style={{ color: toneColor }} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="font-display text-xl font-black tabular-nums leading-tight">{value}</div>
          {hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22d3ee", "#f59e0b", "#ec4899", "#84cc16", "#8b5cf6", "#f43f5e"];

type Metric = "revenue" | "orders" | "users" | "messages";
const METRICS: { key: Metric; label: string; icon: typeof Users; color: string }[] = [
  { key: "revenue", label: "Revenue", icon: DollarSign, color: "hsl(var(--primary))" },
  { key: "orders", label: "Orders", icon: ShoppingCart, color: "hsl(var(--accent))" },
  { key: "users", label: "New users", icon: Users, color: "#22d3ee" },
  { key: "messages", label: "Messages", icon: MessageSquare, color: "#f59e0b" },
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
  const topWs = ((t.top_workspaces ?? []) as any[]).slice(0, 6).map((w) => ({ name: w.name?.slice(0, 18) ?? "—", revenue: Number(w.revenue), orders: Number(w.orders) }));

  const [primary, setPrimary] = useState<Metric>("revenue");
  const [secondary, setSecondary] = useState<Metric>("orders");

  const growthPct = (curr: number, prev: number) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const kpis = [
    { icon: Users, label: "Users", value: fmt(s.users), hint: `+${fmt(s.new_users_7d)} this week`, pct: Math.min(100, (s.new_users_7d ?? 0) * 10), tone: "primary" as const },
    { icon: Building2, label: "Workspaces", value: fmt(s.workspaces), hint: `${fmt(s.trials_active)} on trial`, pct: s.workspaces ? (s.trials_active / s.workspaces) * 100 : 0, tone: "accent" as const },
    { icon: DollarSign, label: "Revenue", value: fmt(s.revenue), hint: `+${fmt(s.revenue_7d)} this week`, pct: Math.min(100, growthPct(s.revenue_7d ?? 0, (s.revenue ?? 0) - (s.revenue_7d ?? 0))), tone: "cyan" as const },
    { icon: ShoppingCart, label: "Orders", value: fmt(s.orders), hint: `+${fmt(s.orders_7d)} this week`, pct: Math.min(100, growthPct(s.orders_7d ?? 0, (s.orders ?? 0) - (s.orders_7d ?? 0))), tone: "amber" as const },
    { icon: Bot, label: "AI Employees", value: fmt(s.ai_employees), pct: Math.min(100, (s.ai_employees ?? 0) * 5), tone: "primary" as const },
    { icon: MessageSquare, label: "Conversations", value: fmt(s.conversations), hint: `${fmt(s.messages)} messages`, pct: Math.min(100, (s.conversations ?? 0) * 2), tone: "accent" as const },
    { icon: BookOpen, label: "Knowledge", value: fmt(s.knowledge_sources), pct: Math.min(100, (s.knowledge_sources ?? 0) * 5), tone: "cyan" as const },
    { icon: Plug, label: "Integrations", value: fmt(s.integrations), pct: Math.min(100, (s.integrations ?? 0) * 8), tone: "amber" as const },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel h-24 animate-pulse rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    );
  }

  const primaryDef = METRICS.find((m) => m.key === primary)!;
  const secondaryDef = METRICS.find((m) => m.key === secondary)!;

  // Total for center label on donut
  const donutTotal = (arr: { value: number }[]) => arr.reduce((a, b) => a + b.value, 0);
  const channelsTotal = donutTotal(channels);
  const orderTotal = donutTotal(orderStatus);

  // Radial data for employees/integrations combined
  const radialData = [
    ...employeeStatus.map((e, i) => ({ name: `Emp: ${e.name}`, value: e.value, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    ...integrationStatus.map((e, i) => ({ name: `Int: ${e.name}`, value: e.value, fill: CHART_COLORS[(i + 3) % CHART_COLORS.length] })),
  ];

  return (
    <div className="space-y-5">
      {/* KPI ring grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => <KpiRing key={k.label} {...k} delay={i * 60} />)}
      </div>

      {/* HERO chart — unified composed */}
      <div className="glass-panel animate-fade-up relative overflow-hidden rounded-3xl p-5 sm:p-6" style={{ animationDelay: "480ms" }}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" /> Live · last 30 days
            </div>
            <div className="mt-1 font-display text-xl font-black tracking-tight sm:text-2xl">Platform pulse</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => {
              const Icon = m.icon;
              const isP = primary === m.key;
              const isS = secondary === m.key;
              const state = isP ? "primary" : isS ? "secondary" : "off";
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    if (isP) return;
                    if (isS) { setSecondary(primary); setPrimary(m.key); }
                    else { setSecondary(primary); setPrimary(m.key); }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 ${
                    state === "primary" ? "border-transparent bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30"
                    : state === "secondary" ? "border-white/10 bg-white/[0.08] text-foreground"
                    : "border-white/5 bg-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={days} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryDef.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={primaryDef.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" opacity={0.5} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v?.slice(5)} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card) / 0.95)", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, backdropFilter: "blur(12px)" }}
                cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2, strokeWidth: 2 }}
              />
              <Area yAxisId="left" type="monotone" dataKey={primary} name={primaryDef.label} stroke={primaryDef.color} strokeWidth={2.5} fill="url(#primaryGrad)" animationDuration={900} />
              <Bar yAxisId="right" dataKey={secondary} name={secondaryDef.label} fill={secondaryDef.color} radius={[6, 6, 0, 0]} opacity={0.85} animationDuration={900} maxBarSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Circle chart row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <DonutCard title="Conversation channels" data={channels} total={channelsTotal} totalLabel="chats" delay={560} />
        <DonutCard title="Order status" data={orderStatus} total={orderTotal} totalLabel="orders" colorOffset={2} delay={620} />

        <div className="glass-panel animate-fade-up rounded-2xl p-4" style={{ animationDelay: "680ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">System health</div>
              <div className="text-[11px] text-muted-foreground">Employees & integrations</div>
            </div>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--border))", opacity: 0.3 }} animationDuration={900} />
                <Tooltip contentStyle={{ background: "hsl(var(--card) / 0.95)", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top workspaces */}
      <div className="glass-panel animate-fade-up rounded-2xl p-5" style={{ animationDelay: "740ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Top workspaces</div>
            <div className="text-[11px] text-muted-foreground">Ranked by revenue</div>
          </div>
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-2.5">
          {topWs.length === 0 && <div className="py-6 text-center text-xs text-muted-foreground">No workspace revenue yet.</div>}
          {topWs.map((w, i) => {
            const max = Math.max(...topWs.map((x) => x.revenue), 1);
            const pct = (w.revenue / max) * 100;
            return (
              <div key={i} className="group animate-fade-up" style={{ animationDelay: `${800 + i * 60}ms` }}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-white/5 text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
                    {w.name}
                  </div>
                  <div className="tabular-nums text-muted-foreground">{w.revenue.toLocaleString()} · {w.orders} orders</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan + trial + admins */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="glass-panel animate-fade-up rounded-2xl p-5" style={{ animationDelay: "860ms" }}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4 text-primary" /> Plan breakdown</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries((s.plan_breakdown ?? {}) as Record<string, number>).map(([plan, count]) => (
              <div key={plan} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:-translate-y-0.5 hover:bg-white/10">
                <span className="font-semibold capitalize">{plan}</span>
                <span className="ml-2 text-muted-foreground">{count}</span>
              </div>
            ))}
            {Object.keys(s.plan_breakdown ?? {}).length === 0 && <div className="text-xs text-muted-foreground">No workspaces yet.</div>}
          </div>
        </div>
        <div className="glass-panel animate-fade-up rounded-2xl p-5" style={{ animationDelay: "920ms" }}>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Trial status</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="font-display text-3xl font-black tabular-nums">{fmt(s.trials_active)}</div>
            <div className="text-xs text-muted-foreground">active · {fmt(s.trials_expired)} expired</div>
          </div>
        </div>
        <div className="glass-panel animate-fade-up rounded-2xl p-5" style={{ animationDelay: "980ms" }}>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Root admins</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="font-display text-3xl font-black tabular-nums">{fmt(s.admins)}</div>
            <div className="text-xs text-muted-foreground">with full access</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DonutCard({ title, data, total, totalLabel, colorOffset = 0, delay = 0 }: {
  title: string; data: { name: string; value: number }[]; total: number; totalLabel: string; colorOffset?: number; delay?: number;
}) {
  return (
    <div className="glass-panel animate-fade-up rounded-2xl p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="relative" style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={3} stroke="none" animationDuration={900}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + colorOffset) % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card) / 0.95)", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-black tabular-nums">{total.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{totalLabel}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-[10px]">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[(i + colorOffset) % CHART_COLORS.length] }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="tabular-nums font-semibold">{d.value}</span>
          </div>
        ))}
        {data.length === 0 && <div className="text-[11px] text-muted-foreground">No data.</div>}
      </div>
    </div>
  );
}

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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10"
      />
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
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Workspaces</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-muted-foreground">No users yet.</td></tr>}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.display_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3 tabular-nums">{u.workspace_count}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><Crown className="h-3 w-3" /> Admin</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => toggleAdmin.mutate({ userId: u.id, makeAdmin: !u.is_admin })}
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10"
                      >
                        {u.is_admin ? <><UserMinus className="h-3 w-3" /> Demote</> : <><Crown className="h-3 w-3" /> Promote</>}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete user?", body: `${u.email} will be permanently removed.`, danger: true });
                          if (ok) del.mutate(u.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

  return (
    <div className="animate-fade-up space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder="Search workspaces…" />
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-muted-foreground">No workspaces yet.</td></tr>}
              {filtered.map((w) => {
                const trialLeft = w.plan === "trial" ? Math.ceil((new Date(w.trial_ends_at).getTime() - Date.now()) / 86400_000) : null;
                return (
                  <tr key={w.id} className="border-b border-white/5 transition hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{w.country ?? "—"} · {w.currency}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold capitalize">{w.plan}</span>
                      {trialLeft !== null && <div className={`mt-1 text-[10px] ${trialLeft < 3 ? "text-red-300" : "text-muted-foreground"}`}>{trialLeft > 0 ? `${trialLeft}d left` : "expired"}</div>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{w.member_count}</td>
                    <td className="px-4 py-3 tabular-nums">{w.employee_count}</td>
                    <td className="px-4 py-3 tabular-nums">{w.order_count}</td>
                    <td className="px-4 py-3 tabular-nums">{Number(w.revenue).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditing(w)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10">Edit</button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({ title: "Delete workspace?", body: `${w.name} and all its data will be permanently removed.`, danger: true });
                            if (ok) del.mutate(w.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
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
        </div>
      </div>

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
      <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60">
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function SimpleListTab({ kind }: { kind: "employees" | "orders" | "conversations" | "integrations" }) {
  const map = {
    employees: { fn: listAllEmployees, key: "employees", searchKeys: ["name", "role", "status"], label: "AI Employees" },
    orders: { fn: listAllOrders, key: "orders", searchKeys: ["order_number", "status", "currency"], label: "Orders" },
    conversations: { fn: listAllConversations, key: "conversations", searchKeys: ["subject", "status", "channel"], label: "Conversations" },
    integrations: { fn: listAllIntegrations, key: "integrations", searchKeys: ["provider", "status"], label: "Integrations" },
  }[kind];
  const fn = useServerFn(map.fn as any);
  const { data, isLoading } = useQuery({ queryKey: ["admin", map.key], queryFn: () => (fn as any)() });
  const rows = (data ?? []) as any[];
  const { q, setQ, filtered } = useSearch(rows, map.searchKeys as any);
  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="animate-fade-up space-y-4">
      <SearchBar value={q} onChange={setQ} placeholder={`Search ${map.label.toLowerCase()}…`} />
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{cols.map((c) => <th key={c} className="px-3 py-3">{c.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={cols.length || 1} className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={cols.length || 1} className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing here yet.</td></tr>}
              {filtered.map((row, i) => (
                <tr key={row.id ?? i} className="border-b border-white/5 transition hover:bg-white/5">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 text-xs">
                      {typeof row[c] === "string" && row[c].length > 40 ? row[c].slice(0, 40) + "…" : String(row[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Send className="h-4 w-4 text-primary" /> Broadcast notification</div>
        <p className="mb-4 text-xs text-muted-foreground">Send an in-app notification to every workspace on the platform.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (!title) return; mut.mutate(); }} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message body (optional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Alert</option>
          </select>
          <button disabled={mut.isPending || !title} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60">
            {mut.isPending ? "Sending…" : "Send to everyone"}
          </button>
        </form>
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Quick links</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">Dashboard <ArrowUpRight className="h-3 w-3" /></Link>
          <Link to="/integrations" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">Integrations <ArrowUpRight className="h-3 w-3" /></Link>
          <Link to="/settings" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">Settings <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </div>
  );
}
