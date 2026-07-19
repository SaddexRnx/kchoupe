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
import { useT } from "@/lib/i18n";

const statDefs = [
  { key: "dash.stat.ai_employees", value: 6, deltaKey: "dash.stat.thisweek", icon: Bot, tone: "violet" as const },
  { key: "dash.stat.products",     value: 148, delta: "+12",  icon: Package, tone: "emerald" as const },
  { key: "dash.stat.orders",       value: 342, delta: "+18%", icon: ShoppingCart, tone: "violet" as const },
  { key: "dash.stat.conversations",value: "2.1k", delta: "+412", icon: MessageSquare, tone: "emerald" as const },
];

const employees = [
  { name: "Nova", role: "Sales Concierge", model: "Claude Sonnet 4.5", status: "active", chats: 428, avatar: "N" },
  { name: "Atlas", role: "Support Lead", model: "GPT-5", status: "active", chats: 1204, avatar: "A" },
  { name: "Ember", role: "Product Guide", model: "Gemini 2.5 Pro", status: "training", chats: 89, avatar: "E" },
  { name: "Kai", role: "Order Tracker", model: "Groq Llama 4", status: "active", chats: 612, avatar: "K" },
];

const conversations = [
  { customer: "Sara M.", preview: "Can I change the delivery address for #4821?", agent: "Kai", time: "2m" },
  { customer: "Omar A.", preview: "Do you ship to Riyadh on weekends?", agent: "Atlas", time: "8m" },
  { customer: "Lena K.", preview: "Which shade would suit warm undertones?", agent: "Ember", time: "17m" },
  { customer: "Jon P.", preview: "Bulk pricing for 200 units?", agent: "Nova", time: "34m" },
];

const spark = [8, 14, 11, 19, 17, 24, 22, 31, 28, 36, 33, 41, 44];

export function Dashboard() {
  const t = useT();
  return (
    <div className="space-y-6">
      <Header />

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Stat cards row */}
        {statDefs.map((s) => (
          <StatCard key={s.key} label={t(s.key)} value={s.value} delta={s.deltaKey ? t(s.deltaKey) : s.delta!} icon={s.icon} tone={s.tone} />
        ))}

        {/* Hero: activity + spark */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t("dash.conv_volume")}
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-display text-4xl font-bold tracking-tight">2,148</span>
                <span className="flex items-center gap-1 text-sm text-accent">
                  <TrendingUp className="h-4 w-4" /> +24.6%
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{t("dash.vs_prev")}</div>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-1 text-xs">
              {["7D", "30D", "90D"].map((t, i) => (
                <button
                  key={t}
                  className={
                    "rounded-md px-2.5 py-1 font-medium transition " +
                    (i === 1 ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Sparkline data={spark} />
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
            <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90">
              {t("dash.start_training")} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* AI employees */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-7">
          <SectionHeader title={t("dash.your_employees")} cta={t("dash.manage_all")} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {employees.map((e) => (
              <EmployeeCard key={e.name} {...e} />
            ))}
          </div>
        </div>

        {/* Live conversations */}
        <div className="glass-panel col-span-12 rounded-2xl p-6 lg:col-span-5">
          <SectionHeader title={t("dash.live_conv")} cta={t("dash.open_inbox")} />
          <ul className="mt-4 space-y-1">
            {conversations.map((c) => (
              <li
                key={c.customer + c.time}
                className="group flex cursor-pointer items-start gap-3 rounded-xl p-3 transition hover:bg-white/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 text-xs font-semibold">
                  {c.customer[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.customer}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
                    <Zap className="h-2.5 w-2.5" /> {t("dash.handled_by")} {c.agent}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick actions row */}
        {/* AI-confirmed orders */}
        <div className="glass-panel col-span-12 rounded-2xl p-6">
          <SectionHeader title={t("dash.confirmed_today")} cta={t("dash.open_orders")} />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { id: "ORD-2841", customer: "Sara M.",   product: "Argan hair oil ×2",     amount: 2980, cur: "DZD", agent: "Nova",  status: "confirmed" as const, time: "3m" },
              { id: "ORD-2840", customer: "Omar A.",   product: "Saffron 5g + Mint tea", amount: 2990, cur: "DZD", agent: "Nova",  status: "confirmed" as const, time: "11m" },
              { id: "ORD-2839", customer: "Lena K.",   product: "Ceramic tagine 28cm",   amount: 4800, cur: "DZD", agent: "Ember", status: "confirmed" as const, time: "24m" },
              { id: "ORD-2838", customer: "Jon P.",    product: "Dates 1kg ×4",          amount: 5000, cur: "DZD", agent: "Kai",   status: "pending"   as const, time: "38m" },
            ].map((o) => (
              <div key={o.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-emerald-400/30 hover:bg-white/[0.04]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="font-mono">{o.id}</span>
                  <span>{o.time} {t("common.ago")}</span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold">{o.customer}</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{o.product}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-bold aurora-gradient-text">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.cur, maximumFractionDigits: 0 }).format(o.amount)}
                  </span>
                  <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium " + (o.status === "confirmed" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300")}>
                    {o.status === "confirmed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {o.status === "confirmed" ? t("common.confirmed") : t("common.pending")}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">
                  <Zap className="h-2.5 w-2.5" /> {t("dash.closed_by")} {o.agent}
                </div>
              </div>
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
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("dash.weekday")}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t("dash.welcome")} <span className="aurora-gradient-text">Khalid</span>
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
}: {
  label: string;
  value: string | number;
  delta: string;
  icon: typeof Bot;
  tone: "violet" | "emerald";
}) {
  const ring =
    tone === "violet"
      ? "from-primary/25 to-primary/0 text-primary"
      : "from-accent/25 to-accent/0 text-accent";
  return (
    <div className="glass-panel col-span-6 rounded-2xl p-5 lg:col-span-3">
      <div className="flex items-start justify-between">
        <div className={"flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br " + ring}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">{delta}</span>
      </div>
      <div className="mt-4 font-display text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionHeader({ title, cta }: { title: string; cta: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <button className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
        {cta} <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
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
    <div className="group relative overflow-hidden rounded-xl border border-border bg-white/[0.02] p-4 transition hover:border-primary/40 hover:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-base font-bold text-primary-foreground">
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
    </div>
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
        "group glass-panel col-span-12 flex items-center gap-4 rounded-2xl p-5 text-left transition hover:border-primary/40 hover:bg-white/[0.06] lg:col-span-" +
        span
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-foreground transition group-hover:from-primary/40 group-hover:to-accent/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
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