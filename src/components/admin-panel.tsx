import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Users, Building2, Bot, Package, ShoppingCart, MessageSquare, BookOpen,
  Plug, Bell, TrendingUp, Search, Trash2, Crown, UserMinus, Send, LogOut, Sparkles, ArrowUpRight,
} from "lucide-react";
import {
  getPlatformStats, listAllUsers, listAllWorkspaces, listAllEmployees, listAllOrders,
  listAllConversations, listAllIntegrations, setUserAdmin, updateWorkspacePlan,
  deleteWorkspace, deleteUser, broadcastNotification,
} from "@/lib/admin.functions";
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
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="animate-float absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="animate-float absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" style={{ animationDelay: "1.4s" }} />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-black truncate">Atlas Admin</span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Root</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Platform command center</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 sm:inline-flex">
              User view
            </Link>
            <button onClick={signOut} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

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

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass-panel group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-black tabular-nums">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 transition group-hover:scale-110">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

function Overview() {
  const fn = useServerFn(getPlatformStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: () => fn() });
  const s = (data ?? {}) as any;
  const fmt = (n: any) => (typeof n === "number" ? n.toLocaleString() : (n ?? 0));
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading platform stats…</div>;
  return (
    <div className="animate-fade-up space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Users" value={fmt(s.users)} hint={`+${fmt(s.new_users_7d)} this week`} />
        <StatCard icon={Building2} label="Workspaces" value={fmt(s.workspaces)} hint={`${fmt(s.trials_active)} on trial`} />
        <StatCard icon={Bot} label="AI Employees" value={fmt(s.ai_employees)} />
        <StatCard icon={ShoppingCart} label="Orders" value={fmt(s.orders)} hint={`+${fmt(s.orders_7d)} this week`} />
        <StatCard icon={TrendingUp} label="Revenue" value={fmt(s.revenue)} hint={`+${fmt(s.revenue_7d)} this week`} />
        <StatCard icon={MessageSquare} label="Conversations" value={fmt(s.conversations)} hint={`${fmt(s.messages)} messages`} />
        <StatCard icon={BookOpen} label="Knowledge sources" value={fmt(s.knowledge_sources)} />
        <StatCard icon={Plug} label="Integrations" value={fmt(s.integrations)} />
      </div>
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4 text-primary" /> Plan breakdown</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries((s.plan_breakdown ?? {}) as Record<string, number>).map(([plan, count]) => (
            <div key={plan} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span className="font-semibold capitalize">{plan}</span>
              <span className="ml-2 text-muted-foreground">{count} workspaces</span>
            </div>
          ))}
          {Object.keys(s.plan_breakdown ?? {}).length === 0 && <div className="text-xs text-muted-foreground">No workspaces yet.</div>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Trial status</div>
          <div className="mt-1 flex items-baseline gap-3">
            <div className="font-display text-3xl font-black">{fmt(s.trials_active)}</div>
            <div className="text-xs text-muted-foreground">active · {fmt(s.trials_expired)} expired</div>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Admins</div>
          <div className="mt-1 flex items-baseline gap-3">
            <div className="font-display text-3xl font-black">{fmt(s.admins)}</div>
            <div className="text-xs text-muted-foreground">accounts with root access</div>
          </div>
        </div>
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
  const confirm = useConfirm();
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
                          const ok = await confirm({ title: "Delete user?", body: `${u.email} will be permanently removed.`, confirmLabel: "Delete", danger: true });
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
    </div>
  );
}

function WorkspacesTab() {
  const listFn = useServerFn(listAllWorkspaces);
  const updateFn = useServerFn(updateWorkspacePlan);
  const deleteFn = useServerFn(deleteWorkspace);
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
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
                            const ok = await confirm({ title: "Delete workspace?", body: `${w.name} and all its data will be permanently removed.`, confirmLabel: "Delete", danger: true });
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
