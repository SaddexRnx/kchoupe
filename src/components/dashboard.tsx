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
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { dashboardStats } from "@/lib/orders.functions";
import { channelSummary, type ChannelRow } from "@/lib/channels.functions";
import { getMyWorkspace, activatePlan } from "@/lib/workspace.functions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/pages/_shared";
import { useQueryClient } from "@tanstack/react-query";
import { Send as SendIcon, LifeBuoy, AlertTriangle } from "lucide-react";
import { Link as RouterLink } from "@tanstack/react-router";

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

const PERIODS: { key: "1D" | "7D" | "30D" | "90D"; days: number; label: string }[] = [
  { key: "1D", days: 1, label: "Today" },
  { key: "7D", days: 7, label: "7D" },
  { key: "30D", days: 30, label: "30D" },
  { key: "90D", days: 90, label: "90D" },
];

export function Dashboard() {
  const t = useT();
  const stats = useServerFn(dashboardStats);
  const chFn = useServerFn(channelSummary);
  const [period, setPeriod] = useState<"1D" | "7D" | "30D" | "90D">("30D");
  const periodDays = PERIODS.find((p) => p.key === period)!.days;
  const { data } = useQuery({ queryKey: ["dashboard_stats", periodDays], queryFn: () => stats({ data: { periodDays } }) });
  const { data: chData } = useQuery({ queryKey: ["channel_summary"], queryFn: () => chFn() });

  const statDefs = [
    { key: "dash.stat.ai_employees", value: data?.aiEmployees ?? 0, delta: t("dash.stat.thisweek"), icon: Bot, tone: "violet" as const, to: "/ai-employees" },
    { key: "dash.stat.products",     value: data?.products ?? 0,    delta: "", icon: Package, tone: "emerald" as const, to: "/products" },
    { key: "dash.stat.orders",       value: data?.orders ?? 0,      delta: "", icon: ShoppingCart, tone: "violet" as const, to: "/orders" },
    { key: "dash.stat.conversations",value: data?.conversations ?? 0, delta: "", icon: MessageSquare, tone: "emerald" as const, to: "/conversations" },
  ];

  const employees = data?.aiAgents ?? [];
  const conversations = data?.recentMessages ?? [];
  const confirmed = data?.confirmedToday ?? [];

  return (
    <div className="space-y-6">
      <Header />
      <TrialBanner />
      <SinceYouWereAway channels={chData?.channels ?? []} escalations={chData?.escalations ?? 0} />




      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Stat cards row */}
        {statDefs.map((s) => (
          <StatCard key={s.key} label={t(s.key)} value={s.value} delta={s.delta} icon={s.icon} tone={s.tone} to={s.to} />
        ))}

        {/* Hero: activity + spark */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-8">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("dash.conv_volume")}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="font-display text-4xl font-bold tracking-tight">{(data?.periodConversations ?? 0).toLocaleString()}</span>
                <span className="flex items-center gap-1 text-sm text-accent">
                  <TrendingUp className="h-4 w-4" /> {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(data?.periodRevenue ?? 0)}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {data?.periodOrders ?? 0} {t("dash.stat.orders")} · {periodDays === 1 ? "today" : `last ${periodDays}d`}
              </div>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={
                    "rounded-md px-2.5 py-1 font-medium transition " +
                    (period === p.key ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Sparkline data={(data?.series ?? []).map((s) => s.conversations)} />
        </div>

        {/* Aurora highlight card */}
        <div className="relative col-span-12 overflow-hidden rounded-2xl p-6 lg:col-span-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/30" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur">
              <Sparkles className="h-3 w-3" /> {t("dash.suggestion")}
            </div>
            <h3 className="font-display text-xl font-bold leading-tight">
              {t("dash.train_title")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dash.train_desc")}
            </p>
            <Link to="/ai-employees" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90 hover:-translate-y-0.5">
              {t("dash.start_training")} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* AI employees */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-7">
          <SectionHeader title={t("dash.your_employees")} cta={t("dash.manage_all")} to="/ai-employees" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {employees.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">No AI employees yet — <Link to="/ai-employees" className="text-primary hover:underline">create one</Link>.</div>}
            {employees.map((e) => (
              <EmployeeCard key={e.id} name={e.name} role={e.role ?? ""} model={e.model ?? ""} status={e.status} chats={e.chats} avatar={e.name[0]?.toUpperCase() ?? "?"} />
            ))}
          </div>
        </div>

        {/* Live conversations */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-5">
          <SectionHeader title={t("dash.live_conv")} cta={t("dash.open_inbox")} to="/conversations" />
          <ul className="mt-4 space-y-1">
            {conversations.length === 0 && <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">No conversations yet.</li>}
            {conversations.map((c) => (
              <li key={c.id}>
              <Link
                to="/conversations"
                className="group flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all duration-300 hover:bg-white/5 hover:translate-x-1"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 text-xs font-semibold">
                  {c.external_user[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.external_user}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{ago(c.updated_at)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.last_message ?? "—"}</div>
                  {c.ai_employee_name && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
                    <Zap className="h-2.5 w-2.5" /> {t("dash.handled_by")} {c.ai_employee_name}
                  </div>
                  )}
                </div>
              </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick actions row */}
        {/* AI-confirmed orders */}
        <div className="glass-panel col-span-12 rounded-2xl p-6">
          <SectionHeader title={t("dash.confirmed_today")} cta={t("dash.open_orders")} to="/orders" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {confirmed.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">No AI-confirmed orders today.</div>}
            {confirmed.map((o) => (
              <Link key={o.id} to="/orders" className="group block rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-emerald-400/10">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="font-mono">{o.order_no}</span>
                  <span>{ago(o.created_at)} {t("common.ago")}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold">{o.customer_name}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{o.product_summary}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-bold aurora-gradient-text">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency, maximumFractionDigits: 0 }).format(Number(o.amount))}
                  </span>
                  <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium " + (o.status === "paid" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300")}>
                    {o.status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {o.status === "paid" ? t("common.confirmed") : t("common.pending")}
                  </span>
                </div>
                {o.ai_employee_id && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">
                    <Zap className="h-2.5 w-2.5" /> {t("dash.closed_by")} AI
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions row — every button navigates */}
        <QuickAction span={4} icon={Bot} title={t("dash.qa.create_title")} desc={t("dash.qa.create_desc")} to="/ai-employees" />
        <QuickAction span={4} icon={Package} title={t("dash.qa.products_title")} desc={t("dash.qa.products_desc")} to="/products" />
        <QuickAction span={4} icon={MessageSquare} title={t("dash.qa.playground_title")} desc={t("dash.qa.playground_desc")} to="/playground" />
      </div>
    </div>
  );
}

function Header() {
  const t = useT();
  const [name, setName] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const dn = ((u.user_metadata as any)?.full_name as string) || ((u.user_metadata as any)?.name as string) || u.email?.split("@")[0] || "";
      setName(dn);
    });
  }, []);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("dash.weekday")}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t("dash.welcome")} <span className="aurora-gradient-text">{name || "there"}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dash.subtitle")}
        </p>
      </div>
      <div className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="font-medium">{t("dash.systems_ok")}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: string | number;
  delta: string;
  icon: typeof Bot;
  tone: "violet" | "emerald";
  to: string;
}) {
  const ring =
    tone === "violet"
      ? "from-primary/25 to-primary/0 text-primary"
      : "from-accent/25 to-accent/0 text-accent";
  return (
    <Link to={to} className="group glass-panel col-span-6 rounded-2xl p-5 lg:col-span-3 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
      <div className="flex items-start justify-between">
        <div className={"flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 " + ring}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">{delta}</span>
      </div>
      <div className="mt-4 font-display text-3xl font-bold tracking-tight transition-colors group-hover:aurora-gradient-text">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

function SectionHeader({ title, cta, to }: { title: string; cta: string; to?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {to ? (
        <Link to={to} className="group inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          {cta} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      ) : (
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          {cta} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function EmployeeCard({
  name,
  role,
  model,
  status,
  chats,
  avatar,
}: {
  name: string;
  role: string;
  model: string;
  status: string;
  chats: number;
  avatar: string;
}) {
  const t = useT();
  return (
    <Link to="/ai-employees" className="group relative block overflow-hidden rounded-xl border border-border bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-base font-bold text-primary-foreground transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          {avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold">{name}</span>
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest " +
                (status === "active"
                  ? "bg-accent/10 text-accent"
                  : "bg-primary/10 text-primary")
              }
            >
              <Circle className={"h-1.5 w-1.5 " + (status === "active" ? "fill-accent" : "fill-primary")} />
              {t("common." + status, status)}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{role}</div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="rounded-md border border-border px-1.5 py-0.5">{model}</span>
            <span>{chats.toLocaleString()} {t("dash.chats")}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  span,
  icon: Icon,
  title,
  desc,
  to,
}: {
  span: number;
  icon: typeof Bot;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className={
        "group glass-panel col-span-12 flex items-center gap-4 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-primary/10 lg:col-span-" +
        span
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-foreground transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:from-primary/40 group-hover:to-accent/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 800;
  const h = 160;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / (max - min || 1)) * (h - 20) - 10;
    return [x, y];
  });
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
          {i === points.length - 1 && (
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
          )}
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
  const now = Date.now();
  const msDay = 86400000;
  const daysLeft = Math.ceil((trialEnd - now) / msDay);
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
    } finally {
      setBusy(null);
    }
  };

  const title = trialExpired
    ? "Your free trial has ended"
    : `Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const body = trialExpired
    ? "Pick a plan to keep your AI employees on shift."
    : "Upgrade now to keep things running without interruption.";
  const tone = trialExpired ? "from-rose-500/20 to-primary/10 border-rose-400/40" : "from-primary/15 to-accent/10 border-primary/30";

  return (
    <div className={"glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r p-5 " + tone}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-base font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">{body}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => upgrade("growth")}
          disabled={busy !== null}
          className="rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {busy === "growth" ? "Activating…" : "Upgrade to Growth"}
        </button>
        <button
          onClick={() => upgrade("scale")}
          disabled={busy !== null}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-60"
        >
          {busy === "scale" ? "Activating…" : "Get Scale"}
        </button>
      </div>
    </div>
  );
}

function channelMeta(ch: string): { label: string; emoji: string; tone: string } {
  switch (ch) {
    case "telegram":  return { label: "Telegram",  emoji: "✈️", tone: "from-sky-400/20 to-sky-400/0 text-sky-300" };
    case "facebook":  return { label: "Facebook",  emoji: "📘", tone: "from-blue-400/20 to-blue-400/0 text-blue-300" };
    case "instagram": return { label: "Instagram", emoji: "📸", tone: "from-pink-400/20 to-pink-400/0 text-pink-300" };
    case "whatsapp":  return { label: "WhatsApp",  emoji: "🟢", tone: "from-emerald-400/20 to-emerald-400/0 text-emerald-300" };
    default:          return { label: "Web / Playground", emoji: "💬", tone: "from-primary/20 to-primary/0 text-primary" };
  }
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
    <div className="glass-panel rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Since you were away</div>
          <div className="mt-1 font-display text-xl font-bold tracking-tight">
            {total.conversations.toLocaleString()} conversations · {total.orders.toLocaleString()} orders · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(total.revenue)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">Multi-channel activity across Telegram, Facebook, Instagram, WhatsApp and Web.</div>
        </div>
        {escalations > 0 && (
          <RouterLink to="/conversations" className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:-translate-y-0.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {escalations} need a human
          </RouterLink>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">No channel activity yet — connect Telegram, WhatsApp or Meta in Integrations.</div>
        )}
        {rows.map((c) => {
          const meta = channelMeta(c.channel);
          return (
            <RouterLink key={c.channel} to="/conversations" className={"group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"}>
              <div className={"pointer-events-none absolute inset-0 bg-gradient-to-br " + meta.tone} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="text-sm font-semibold">{meta.label}</span>
                </div>
                {Number(c.unread || 0) > 0 && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">{c.unread} new</span>}
              </div>
              <div className="relative mt-3 grid grid-cols-3 gap-1 text-center">
                <div><div className="font-display text-base font-bold tabular-nums">{Number(c.conversations || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Convos</div></div>
                <div><div className="font-display text-base font-bold tabular-nums">{Number(c.messages || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Msgs</div></div>
                <div><div className="font-display text-base font-bold tabular-nums">{Number(c.orders || 0).toLocaleString()}</div><div className="text-[9px] uppercase tracking-widest text-muted-foreground">Orders</div></div>
              </div>
              {Number(c.escalations || 0) > 0 && (
                <div className="relative mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
                  <AlertTriangle className="h-2.5 w-2.5" /> {c.escalations} need help
                </div>
              )}
            </RouterLink>
          );
        })}
      </div>
    </div>
  );
}

