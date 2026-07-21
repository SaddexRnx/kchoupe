import {
  Bot,
  Package,
  ShoppingCart,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  Zap,
  TrendingUp,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plug,
  BookOpen,
  LifeBuoy,
} from "lucide-react";
import { Link, Link as RouterLink } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { dashboardStats, dashboardExtras } from "@/lib/orders.functions";
import { channelSummary, type ChannelRow } from "@/lib/channels.functions";
import { getMyWorkspace, activatePlan } from "@/lib/workspace.functions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/pages/_shared";
import { useQueryClient } from "@tanstack/react-query";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

const PERIODS: { key: "1D" | "7D" | "30D" | "90D"; days: number; label: string }[] = [
  { key: "1D", days: 1, label: "24H" },
  { key: "7D", days: 7, label: "7D" },
  { key: "30D", days: 30, label: "30D" },
  { key: "90D", days: 90, label: "90D" },
];

const fmtDzd = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(n);

export function Dashboard() {
  const t = useT();
  const stats = useServerFn(dashboardStats);
  const extras = useServerFn(dashboardExtras);
  const chFn = useServerFn(channelSummary);
  const [period, setPeriod] = useState<"1D" | "7D" | "30D" | "90D">("30D");
  const periodDays = PERIODS.find((p) => p.key === period)!.days;
  const { data } = useQuery({ queryKey: ["dashboard_stats", periodDays], queryFn: () => stats({ data: { periodDays } }) });
  const { data: ex } = useQuery({ queryKey: ["dashboard_extras"], queryFn: () => extras() });
  const { data: chData } = useQuery({ queryKey: ["channel_summary"], queryFn: () => chFn() });

  const channels = chData?.channels ?? [];
  const totalConv = channels.reduce((a, c) => a + Number(c.conversations || 0), 0) || 1;
  const employees = data?.aiAgents ?? [];
  const conversations = data?.recentMessages ?? [];
  const confirmed = data?.confirmedToday ?? [];
  const status = ex?.statusCounts ?? {};
  const statusOrder = ["pending", "paid", "delivered", "cancelled", "returned", "refunded"];

  return (
    <div className="space-y-6">
      <Header />
      <TrialBanner />

      {/* Global KPI rail */}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.02] p-5 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Revenue" value={fmtDzd(ex?.totalRevenue ?? 0)} sub={`${(data?.orders ?? 0).toLocaleString()} orders`} to="/orders" />
        <Kpi label="AI resolution" value={`${Math.round((ex?.aiResolutionRate ?? 0) * 100)}%`} sub={`${data?.aiEmployees ?? 0} employees`} to="/ai-employees" />
        <Kpi label="Conversations" value={(data?.conversations ?? 0).toLocaleString()} sub={`${(ex?.totalMessages ?? 0).toLocaleString()} msgs`} to="/conversations" />
        <Kpi label="Avg order" value={fmtDzd(ex?.avgOrderValue ?? 0)} sub={`${status.paid ?? 0} paid`} to="/orders" />
        <Kpi label="Products" value={(data?.products ?? 0).toLocaleString()} sub={`${ex?.lowStock.length ?? 0} low stock`} to="/products" />
        <Kpi label="Support" value={(ex?.openTickets ?? 0).toString()} sub={`${ex?.learningsCount ?? 0} learnings`} to="/support" tone={ex?.openTickets ? "warn" : "ok"} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Performance matrix */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Performance matrix</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{fmtDzd(data?.periodRevenue ?? 0)}</span>
                <span className="inline-flex items-center gap-1 text-sm text-accent"><TrendingUp className="h-4 w-4" />{(data?.periodConversations ?? 0).toLocaleString()} chats</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{data?.periodOrders ?? 0} orders · {periodDays === 1 ? "today" : `last ${periodDays} days`}</div>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p.key)} className={"rounded-md px-2.5 py-1 font-medium transition " + (period === p.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{p.label}</button>
              ))}
            </div>
          </div>
          <Sparkline data={(data?.series ?? []).map((s) => s.conversations)} />
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4">
            <MiniStat label="Avg order value" value={fmtDzd(ex?.avgOrderValue ?? 0)} />
            <MiniStat label="AI autonomy" value={`${Math.round((ex?.aiResolutionRate ?? 0) * 100)}%`} />
            <MiniStat label="Volume 7d" value={fmtDzd(data?.volume7d ?? 0)} />
            <MiniStat label="Volume 30d" value={fmtDzd(data?.volume30d ?? 0)} />
          </div>
        </section>

        {/* Channel breakdown */}
        <section className="glass-panel col-span-12 flex flex-col rounded-2xl p-6 lg:col-span-4">
          <SectionHeader title="Channel distribution" cta="Integrations" to="/integrations" />
          <div className="mt-4 space-y-3 flex-1">
            {channels.length === 0 && <EmptyLine text="Connect Telegram, Meta or WhatsApp to see traffic." to="/integrations" />}
            {channels.map((c) => {
              const share = Math.round((Number(c.conversations || 0) / totalConv) * 100);
              return (
                <div key={c.channel} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest">
                    <span className="text-muted-foreground">{channelLabel(c.channel)}</span>
                    <span className="text-foreground tabular-nums">{share}% · {Number(c.conversations || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Integration health</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(ex?.integrations ?? []).slice(0, 8).map((i, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-2 py-1 text-[10px]">
                  <span className={"h-1.5 w-1.5 rounded-full " + healthDot(i.last_test_status ?? i.status)} />
                  {i.provider}
                </span>
              ))}
              {(!ex?.integrations || ex.integrations.length === 0) && <span className="text-[10px] text-muted-foreground">No integrations yet.</span>}
            </div>
          </div>
        </section>

        {/* Live inbox */}
        <section className="glass-panel col-span-12 overflow-hidden rounded-2xl lg:col-span-4">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Live inbox</h2>
            <Link to="/conversations" className="text-[10px] font-semibold uppercase tracking-widest text-foreground hover:underline">Open →</Link>
          </div>
          <ul className="divide-y divide-border/60">
            {conversations.length === 0 && <li className="p-6 text-center text-xs text-muted-foreground">No conversations yet.</li>}
            {conversations.map((c) => (
              <li key={c.id}>
                <Link to="/conversations" className="group flex items-start gap-3 p-4 transition hover:bg-white/[0.03]">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 text-xs font-semibold">{c.external_user[0]?.toUpperCase() ?? "?"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{c.external_user}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{ago(c.updated_at)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.last_message ?? "—"}</div>
                    {c.ai_employee_name && <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary"><Zap className="h-2.5 w-2.5" />{c.ai_employee_name}</div>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Order status matrix */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-5">
          <SectionHeader title="Order status" cta="All orders" to="/orders" />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {statusOrder.map((s) => (
              <Link key={s} to="/orders" className="rounded-xl border border-border bg-white/[0.02] p-3 text-center transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="font-display text-lg font-bold tabular-nums">{status[s] ?? 0}</div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{s}</div>
              </Link>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {confirmed.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No AI-confirmed orders yet.</td></tr>}
                {confirmed.slice(0, 5).map((o) => (
                  <tr key={o.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-3 py-2 font-mono text-foreground">{o.order_no}</td>
                    <td className="px-3 py-2 truncate">{o.customer_name}</td>
                    <td className="px-3 py-2"><StatusPill status={o.status} /></td>
                    <td className="px-3 py-2 text-right font-mono">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency, maximumFractionDigits: 0 }).format(Number(o.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity feed */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-3">
          <SectionHeader title="Activity" cta="Inbox" to="/conversations" />
          <ol className="mt-4 space-y-4">
            {(ex?.activity ?? []).length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
            {(ex?.activity ?? []).map((a) => (
              <li key={a.id} className="flex gap-3">
                <div className={"mt-1 h-2 w-2 shrink-0 rounded-full " + (a.kind === "ai_order" ? "bg-accent" : "bg-primary")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-foreground">{a.label}</div>
                  <div className="text-[10px] text-muted-foreground">{a.sub} · {ago(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* AI employees leaderboard */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-4">
          <SectionHeader title="AI employees" cta="Manage" to="/ai-employees" />
          <div className="mt-4 space-y-2">
            {employees.length === 0 && <EmptyLine text="No AI employees yet — create one." to="/ai-employees" />}
            {employees.map((e) => (
              <Link key={e.id} to="/ai-employees" className="group flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3 transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-primary-foreground">{e.name[0]?.toUpperCase() ?? "?"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{e.name}</span>
                    <span className={"inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest " + (e.status === "active" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                      <Circle className={"h-1.5 w-1.5 " + (e.status === "active" ? "fill-accent" : "fill-primary")} />{e.status}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{e.role ?? "—"} · <span className="font-mono">{e.model ?? ""}</span></div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-bold tabular-nums">{e.chats}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">chats</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Top products */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-5">
          <SectionHeader title="Top products (30d)" cta="Catalog" to="/products" />
          <div className="mt-4 space-y-2">
            {(ex?.topProducts ?? []).length === 0 && <EmptyLine text="Import products to see best sellers." to="/products" />}
            {(ex?.topProducts ?? []).map((p) => (
              <Link key={p.id} to="/products" className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] p-3 transition hover:-translate-y-0.5 hover:border-primary/40">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-white/[0.03] text-xl">{p.image_emoji ?? "📦"}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(Number(p.price))} · stock {p.stock}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-base font-bold tabular-nums">{p.sold_30}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">sold</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Low stock */}
        <section className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-3">
          <SectionHeader title="Low stock" cta="Restock" to="/products" />
          <div className="mt-4 space-y-2">
            {(ex?.lowStock ?? []).length === 0 && <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">All products in stock.</div>}
            {(ex?.lowStock ?? []).map((p) => (
              <Link key={p.id} to="/products" className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.03] p-3 transition hover:-translate-y-0.5 hover:border-amber-400/40">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.sku ?? "no SKU"}</div>
                </div>
                <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold " + (p.stock === 0 ? "bg-rose-400/20 text-rose-200" : "bg-amber-400/20 text-amber-200")}>{p.stock} left</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Since you were away (compact channels rail) */}
        <SinceYouWereAway channels={chData?.channels ?? []} escalations={chData?.escalations ?? 0} />

        {/* Quick actions */}
        <QuickAction icon={Bot} title="Create AI employee" desc="Ship a new agent in under 2 minutes" to="/ai-employees" />
        <QuickAction icon={Package} title="Import products" desc="Sync catalog, stock & pricing" to="/products" />
        <QuickAction icon={Plug} title="Connect a channel" desc="WhatsApp · Telegram · Meta" to="/integrations" />
        <QuickAction icon={BookOpen} title="Playground" desc="Test any prompt live" to="/playground" />
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function Header() {
  const t = useT();
  const [name, setName] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user; if (!u) return;
      const dn = ((u.user_metadata as any)?.full_name as string) || ((u.user_metadata as any)?.name as string) || u.email?.split("@")[0] || "";
      setName(dn);
    });
  }, []);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("dash.weekday")} · Command center</div>
        <h1 className="mt-2 truncate font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          {t("dash.welcome")} <span className="aurora-gradient-text">{name || "there"}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dash.subtitle")}</p>
      </div>
      <div className="glass-panel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="font-medium">{t("dash.systems_ok")}</span>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, to, tone }: { label: string; value: string; sub: string; to: string; tone?: "ok" | "warn" }) {
  return (
    <Link to={to} className="group block rounded-xl border border-transparent p-3 transition hover:border-primary/30 hover:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={"mt-1 font-display text-xl font-bold tabular-nums " + (tone === "warn" ? "text-amber-300" : "text-foreground")}>{value}</div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</div>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function SectionHeader({ title, cta, to }: { title: string; cta: string; to?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {to && (
        <Link to={to} className="group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-foreground hover:underline">
          {cta} <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    delivered: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    pending: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    cancelled: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    returned: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    refunded: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return (
    <span className={"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium " + (tone[status] ?? "border-border bg-white/5 text-muted-foreground")}>
      {status === "paid" || status === "delivered" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}

function EmptyLine({ text, to }: { text: string; to: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
      {text}
    </Link>
  );
}

function channelLabel(ch: string) {
  switch (ch) {
    case "telegram": return "Telegram";
    case "facebook": return "Messenger";
    case "instagram": return "Instagram";
    case "whatsapp": return "WhatsApp";
    default: return "Web / Playground";
  }
}
function healthDot(s: string | null) {
  if (s === "ok" || s === "connected" || s === "active") return "bg-emerald-400";
  if (s === "warn" || s === "pending") return "bg-amber-400";
  if (s === "error" || s === "failed") return "bg-rose-400";
  return "bg-muted-foreground/50";
}

function QuickAction({ icon: Icon, title, desc, to }: { icon: typeof Bot; title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="group glass-panel col-span-12 flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.05] sm:col-span-6 lg:col-span-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-foreground transition group-hover:from-primary/40 group-hover:to-accent/40"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display font-semibold">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 800, h = 160;
  if (!data.length) return <div className="h-40 w-full rounded-xl border border-dashed border-border" />;
  const max = Math.max(...data), min = Math.min(...data);
  const stepX = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => [i * stepX, h - ((v - min) / (max - min || 1)) * (h - 20) - 10] as [number, number]);
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.19 152)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="oklch(0.78 0.19 152)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.72 0.15 295)" />
          <stop offset="100%" stopColor="oklch(0.78 0.19 152)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke="url(#sparkStroke)" strokeWidth="2.5" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 5 : 0} fill="oklch(0.78 0.19 152)">
          {i === points.length - 1 && <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />}
        </circle>
      ))}
    </svg>
  );
}

function TrialBanner() {
  const getWs = useServerFn(getMyWorkspace);
  const activate = useServerFn(activatePlan);
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: ws } = useQuery({ queryKey: ["my_workspace"], queryFn: () => getWs() });
  if (!ws) return null;
  const trialEnd = new Date(ws.trial_ends_at).getTime();
  const daysLeft = Math.ceil((trialEnd - Date.now()) / 86400000);
  const onPaidPlan = ws.plan === "growth" || ws.plan === "scale";
  const trialExpired = ws.plan === "trial" && daysLeft <= 0;
  const trialEndingSoon = ws.plan === "trial" && daysLeft > 0 && daysLeft <= 5;
  if (onPaidPlan || (!trialExpired && !trialEndingSoon && ws.plan !== "starter" && ws.plan !== "trial")) return null;
  if (ws.plan === "trial" && daysLeft > 5) return null;
  const upgrade = async (plan: "growth" | "scale") => {
    setBusy(plan);
    try {
      await activate({ data: { plan } });
      toast.push({ kind: "success", title: `${plan[0].toUpperCase() + plan.slice(1)} plan activated`, body: "Enjoy every feature — no interruption." });
      qc.invalidateQueries({ queryKey: ["my_workspace"] });
    } catch (e: any) {
      toast.push({ kind: "error", title: "Couldn't activate plan", body: e?.message ?? "Try again." });
    } finally { setBusy(null); }
  };
  const title = trialExpired ? "Your free trial has ended" : `Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const body = trialExpired ? "Pick a plan to keep your AI employees on shift." : "Upgrade now to keep things running without interruption.";
  const tone = trialExpired ? "from-rose-500/20 to-primary/10 border-rose-400/40" : "from-primary/15 to-accent/10 border-primary/30";
  return (
    <div className={"glass-panel grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border bg-gradient-to-r p-5 sm:flex sm:flex-wrap sm:justify-between " + tone}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{body}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={() => upgrade("growth")} disabled={busy !== null} className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {busy === "growth" ? "Activating…" : "Upgrade to Growth"}
        </button>
        <button onClick={() => upgrade("scale")} disabled={busy !== null} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60">
          {busy === "scale" ? "Activating…" : "Get Scale"}
        </button>
      </div>
    </div>
  );
}

function SinceYouWereAway({ channels, escalations }: { channels: ChannelRow[]; escalations: number }) {
  const total = channels.reduce(
    (acc, c) => ({
      conversations: acc.conversations + Number(c.conversations || 0),
      messages: acc.messages + Number(c.messages || 0),
      orders: acc.orders + Number(c.orders || 0),
      revenue: acc.revenue + Number(c.revenue || 0),
    }),
    { conversations: 0, messages: 0, orders: 0, revenue: 0 }
  );
  const rows = channels.filter((c) => Number(c.conversations || 0) + Number(c.orders || 0) + Number(c.messages || 0) > 0);
  if (total.conversations + total.orders + total.messages === 0) return null;
  return (
    <section className="glass-panel col-span-12 rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Since you were away</div>
          <div className="mt-1 truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            {total.conversations.toLocaleString()} conversations · {total.orders.toLocaleString()} orders · {fmtDzd(total.revenue)}
          </div>
        </div>
        {escalations > 0 && (
          <RouterLink to="/conversations" className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:-translate-y-0.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {escalations} need a human
          </RouterLink>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((c) => (
          <RouterLink key={c.channel} to="/conversations" className="group rounded-xl border border-border bg-white/[0.02] p-3 transition hover:-translate-y-0.5 hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{channelLabel(c.channel)}</span>
              {Number(c.unread || 0) > 0 && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{c.unread} new</span>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center">
              <div><div className="font-display text-base font-bold tabular-nums">{Number(c.conversations || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Convos</div></div>
              <div><div className="font-display text-base font-bold tabular-nums">{Number(c.messages || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Msgs</div></div>
              <div><div className="font-display text-base font-bold tabular-nums">{Number(c.orders || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Orders</div></div>
            </div>
          </RouterLink>
        ))}
      </div>
    </section>
  );
}
