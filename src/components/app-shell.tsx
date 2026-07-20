import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  MessageSquare,
  Package,
  ShoppingCart,
  Play,
  Settings,
  Bell,
  Search,
  Plus,
  Plug,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { usePrefs, LANGS, type Lang } from "@/lib/preferences";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/pages/_shared";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotifications, markNotificationsRead } from "@/lib/notifications.functions";

type NavKey =
  | "dashboard"
  | "ai-employees"
  | "knowledge"
  | "playground"
  | "conversations"
  | "products"
  | "orders"
  | "integrations"
  | "settings";

const nav: { key: NavKey; icon: typeof LayoutDashboard; to: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { key: "ai-employees", icon: Bot, to: "/ai-employees" },
  { key: "playground", icon: Play, to: "/playground" },
  { key: "knowledge", icon: BookOpen, to: "/knowledge" },
  { key: "conversations", icon: MessageSquare, to: "/conversations" },
  { key: "products", icon: Package, to: "/products" },
  { key: "orders", icon: ShoppingCart, to: "/orders" },
  { key: "integrations", icon: Plug, to: "/integrations" },
  { key: "settings", icon: Settings, to: "/settings" },
];

export function AppShell({ active, children }: { active: NavKey; children: ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) navigate({ to: "/login" });
      else setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/login" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);
  if (!checked) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 lg:px-8">
        <Sidebar active={active} />
        <main className="min-w-0 flex-1">
          <TopBar />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: NavKey }) {
  const t = useT();
  return (
    <aside className="glass-panel sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-2xl p-4 lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 animate-gradient transition duration-500 hover:rotate-6 hover:scale-110">
          <span className="font-display text-lg font-bold text-primary-foreground">A</span>
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-bold tracking-tight">Atlas AI</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("nav.command_center")}</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {nav.map(({ key, icon: Icon, to }, idx) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              to={to}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={
                "group animate-fade-up flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300 hover:translate-x-0.5 " +
                (isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground shadow-inner"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
              }
            >
              <Icon className={"h-4 w-4 transition duration-300 group-hover:scale-110 " + (isActive ? "text-primary" : "")} />
              <span className="font-medium">{t(`nav.${key}`)}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent pulse-emerald shadow-[0_0_8px] shadow-accent" />}
            </Link>
          );
        })}
      </nav>

      <UserChip />
    </aside>
  );
}

function UserChip() {
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [initials, setInitials] = useState<string>("··");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const dn = ((u.user_metadata as any)?.full_name as string) || ((u.user_metadata as any)?.name as string) || u.email?.split("@")[0] || "You";
      setName(dn);
      setInitials(dn.split(/\s+/).map((p: string) => p[0]).join("").slice(0, 2).toUpperCase());
    });
  }, []);
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };
  return (
    <div className="glass-panel mt-6 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-sm font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{name || "You"}</div>
          <div className="truncate text-xs text-muted-foreground">{t("nav.pro_plan")}</div>
        </div>
        <button onClick={signOut} className="ml-auto rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground">
          Sign out
        </button>
      </div>
    </div>
  );
}

function TopBar() {
  const t = useT();
  const { lang, setLang } = usePrefs();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false); };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, []);

  const SEARCH_MAP: { label: string; to: string; kw: string[] }[] = [
    { label: "Dashboard",     to: "/dashboard",     kw: ["home", "dashboard", "overview"] },
    { label: "AI employees",  to: "/ai-employees",  kw: ["employee", "agent", "bot", "team"] },
    { label: "Playground",    to: "/playground",    kw: ["playground", "chat", "test", "model"] },
    { label: "Knowledge",     to: "/knowledge",     kw: ["knowledge", "docs", "source"] },
    { label: "Conversations", to: "/conversations", kw: ["conversation", "inbox", "chat", "message"] },
    { label: "Products",      to: "/products",      kw: ["product", "catalog", "sku", "stock"] },
    { label: "Orders",        to: "/orders",        kw: ["order", "invoice", "payment", "sale"] },
    { label: "Integrations",  to: "/integrations",  kw: ["integration", "connect", "shop", "social", "facebook", "shopify", "instagram", "tiktok"] },
    { label: "Settings",      to: "/settings",      kw: ["setting", "billing", "api", "team", "language", "theme"] },
  ];
  const matches = query.trim() ? SEARCH_MAP.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()) || s.kw.some((k) => k.includes(query.toLowerCase()))) : [];

  const listFn = useServerFn(listNotifications);
  const markFn = useServerFn(markNotificationsRead);
  const qc = useQueryClient();
  const notifQ = useQuery({ queryKey: ["notifications"], queryFn: () => listFn(), refetchInterval: 60000 });
  const markMut = useMutation({ mutationFn: (v: { id?: string; all?: boolean }) => markFn({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
  const iconFor = (kind: string) => kind === "success" ? { Icon: CheckCircle2, tone: "text-emerald-300" } : kind === "warning" ? { Icon: AlertTriangle, tone: "text-amber-300" } : { Icon: Zap, tone: "text-primary" };
  const timeAgo = (iso: string) => {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`;
  };
  const notifications = notifQ.data?.items ?? [];
  const unread = notifQ.data?.unread ?? 0;

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && matches[0]) { navigate({ to: matches[0].to }); setQuery(""); }
    if (e.key === "Escape") setQuery("");
  };

  const createNew = () => {
    navigate({ to: "/ai-employees" });
    // Employees page listens for this to open its Add modal.
    setTimeout(() => window.dispatchEvent(new CustomEvent("atlas:new-employee")), 60);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="glass-panel relative flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder={t("top.search")}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border border-border bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
        {matches.length > 0 && (
          <div className="glass-panel absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-auto rounded-xl p-1 text-sm">
            {matches.map((m) => (
              <button key={m.to} onMouseDown={(e) => { e.preventDefault(); navigate({ to: m.to }); setQuery(""); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10">
                <span>{m.label}</span>
                <span className="text-[10px] text-muted-foreground">{m.to}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <LangSwitcher lang={lang} onChange={setLang} />
      <div ref={bellRef} className="relative">
        <button onClick={() => setBellOpen((v) => !v)} className="glass-panel relative flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/10">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent shadow-[0_0_8px] shadow-accent" />}
        </button>
        {bellOpen && (
          <div className="glass-panel absolute right-0 z-50 mt-2 w-80 rounded-xl p-2">
            <div className="mb-1 flex items-center justify-between px-2 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Notifications {unread > 0 && <span className="ml-1 rounded bg-accent/20 px-1.5 text-accent">{unread}</span>}</span>
              <button onClick={() => { markMut.mutate({ all: true }); toast.push({ kind: "success", title: "All caught up" }); }} className="text-[11px] normal-case text-muted-foreground hover:text-foreground">Mark all read</button>
            </div>
            {notifications.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications yet.</div>
            )}
            {notifications.map((n) => {
              const { Icon, tone } = iconFor(n.kind);
              const unreadRow = !n.read_at;
              return (
                <button key={n.id} onClick={() => { if (unreadRow) markMut.mutate({ id: n.id }); if (n.link) { setBellOpen(false); navigate({ to: n.link as any }); } }}
                  className={"flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5 " + (unreadRow ? "bg-white/[0.03]" : "")}>
                  <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + tone} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{n.title}</div>
                    {n.body && <div className="truncate text-[11px] text-muted-foreground">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                  </div>
                  {unreadRow && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={createNew} className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">{t("top.new_employee")}</span>
      </button>
    </div>
  );
}

function LangSwitcher({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <label className="glass-panel relative flex h-11 items-center gap-2 rounded-xl pl-3 pr-2 text-sm transition hover:bg-white/10">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <select
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
        className="cursor-pointer bg-transparent pr-1 text-sm font-medium outline-none"
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.id} value={l.id}>{l.native}</option>
        ))}
      </select>
    </label>
  );
}