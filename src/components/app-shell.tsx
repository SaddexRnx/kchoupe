import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";

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

const nav: { key: NavKey; label: string; icon: typeof LayoutDashboard; to: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { key: "ai-employees", label: "AI Employees", icon: Bot, to: "/ai-employees" },
  { key: "playground", label: "Playground", icon: Play, to: "/playground" },
  { key: "knowledge", label: "Knowledge", icon: BookOpen, to: "/knowledge" },
  { key: "conversations", label: "Conversations", icon: MessageSquare, to: "/conversations" },
  { key: "products", label: "Products", icon: Package, to: "/products" },
  { key: "orders", label: "Orders", icon: ShoppingCart, to: "/orders" },
  { key: "integrations", label: "Integrations", icon: Plug, to: "/integrations" },
  { key: "settings", label: "Settings", icon: Settings, to: "/settings" },
];

export function AppShell({ active, children }: { active: NavKey; children: ReactNode }) {
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
  return (
    <aside className="glass-panel sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-2xl p-4 lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
          <span className="font-display text-lg font-bold text-primary-foreground">A</span>
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-bold tracking-tight">Atlas AI</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Command center</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {nav.map(({ key, label, icon: Icon, to }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              to={to}
              className={
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all " +
                (isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground shadow-inner"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
              }
            >
              <Icon className={"h-4 w-4 " + (isActive ? "text-primary" : "")} />
              <span className="font-medium">{label}</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px] shadow-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="glass-panel mt-6 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-sm font-semibold text-primary-foreground">
            KC
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">Khalid</div>
            <div className="truncate text-xs text-muted-foreground">Pro plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="flex items-center gap-3">
      <div className="glass-panel flex flex-1 items-center gap-2 rounded-xl px-3.5 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search employees, products, conversations…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded border border-border bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </div>
      <button className="glass-panel flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-white/10">
        <Bell className="h-4 w-4" />
      </button>
      <button className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New employee</span>
      </button>
    </div>
  );
}