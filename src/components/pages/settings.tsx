import { useState, type ReactNode } from "react";
import {
  User,
  Key,
  CreditCard,
  Bell,
  Shield,
  Puzzle,
  Users,
  Palette,
  Globe,
  Webhook,
  Trash2,
  Copy,
  Check,
  Plus,
  Eye,
  EyeOff,
  Save,
  Upload,
  Smartphone,
  Mail,
  MessageSquare,
  Slack,
  Zap,
} from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

type SectionKey =
  | "profile"
  | "workspace"
  | "team"
  | "appearance"
  | "api-keys"
  | "webhooks"
  | "billing"
  | "notifications"
  | "security"
  | "danger";

const SECTIONS: { key: SectionKey; label: string; icon: typeof User; tone: "violet" | "emerald" | "amber" | "rose" }[] = [
  { key: "profile", label: "Profile", icon: User, tone: "violet" },
  { key: "workspace", label: "Workspace", icon: Globe, tone: "violet" },
  { key: "team", label: "Team & roles", icon: Users, tone: "emerald" },
  { key: "appearance", label: "Appearance", icon: Palette, tone: "violet" },
  { key: "api-keys", label: "API keys", icon: Key, tone: "emerald" },
  { key: "webhooks", label: "Webhooks", icon: Webhook, tone: "emerald" },
  { key: "billing", label: "Billing", icon: CreditCard, tone: "amber" },
  { key: "notifications", label: "Notifications", icon: Bell, tone: "violet" },
  { key: "security", label: "Security", icon: Shield, tone: "emerald" },
  { key: "danger", label: "Danger zone", icon: Trash2, tone: "rose" },
];

export function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your profile, workspace, teammates, billing and every connected system."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Panel className="animate-slide-in-left h-fit lg:sticky lg:top-6">
          <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">Sections</div>
          <div className="space-y-1">
            {SECTIONS.map((s, i) => {
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={
                    "group animate-fade-up flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all duration-300 hover:translate-x-0.5 " +
                    (isActive
                      ? "bg-gradient-to-r from-primary/20 to-accent/10 text-foreground shadow-inner"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground")
                  }
                >
                  <s.icon className={"h-4 w-4 transition duration-300 group-hover:scale-110 " + (isActive ? "text-primary" : "")} />
                  <span className="font-medium">{s.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent pulse-emerald shadow-[0_0_8px] shadow-accent" />}
                </button>
              );
            })}
          </div>
        </Panel>

        <div key={active} className="animate-fade-up min-w-0 space-y-4">
          {active === "profile" && <ProfileSection />}
          {active === "workspace" && <WorkspaceSection />}
          {active === "team" && <TeamSection />}
          {active === "appearance" && <AppearanceSection />}
          {active === "api-keys" && <ApiKeysSection />}
          {active === "webhooks" && <WebhooksSection />}
          {active === "billing" && <BillingSection />}
          {active === "notifications" && <NotificationsSection />}
          {active === "security" && <SecuritySection />}
          {active === "danger" && <DangerSection />}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function SectionShell({ title, desc, actions, children }: { title: string; desc: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Panel className="animate-scale-in">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
        </div>
        {actions}
      </div>
      {children}
    </Panel>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
      {help && <div className="mt-1 text-[11px] text-muted-foreground/70">{help}</div>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10";

function PrimaryBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, tone = "default" }: { children: ReactNode; onClick?: () => void; tone?: "default" | "danger" }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-lg border border-border bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10 active:scale-[0.98] " +
        (tone === "danger" ? "text-rose-300 hover:border-rose-400/40 hover:bg-rose-500/10" : "")
      }
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors " +
        (checked ? "border-accent/40 bg-accent/40" : "border-border bg-white/5")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}

/* ---------- sections ---------- */

function ProfileSection() {
  const [name, setName] = useState("Khalid Chennoufi");
  const [email, setEmail] = useState("khalid@atlas.ai");
  const [bio, setBio] = useState("Building AI teammates for commerce.");
  const [saved, setSaved] = useState(false);

  return (
    <SectionShell
      title="Profile"
      desc="How you appear to your team and inside AI-employee handoffs."
      actions={
        <PrimaryBtn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}>
          {saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save changes</>}
        </PrimaryBtn>
      }
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="animate-glow flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
          KC
        </div>
        <div className="flex gap-2">
          <GhostBtn><Upload className="h-3.5 w-3.5" /> Upload avatar</GhostBtn>
          <GhostBtn tone="danger"><Trash2 className="h-3.5 w-3.5" /> Remove</GhostBtn>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Full name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Timezone">
          <select className={inputCls}>
            <option>Europe / Casablanca (GMT+1)</option>
            <option>America / New York</option>
            <option>Asia / Dubai</option>
          </select>
        </Field>
        <Field label="Language">
          <select className={inputCls}>
            <option>English</option>
            <option>Français</option>
            <option>العربية</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Bio" help="Shown to teammates on your profile card.">
            <textarea rows={3} className={inputCls} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
        </div>
      </div>
    </SectionShell>
  );
}

function WorkspaceSection() {
  const [name, setName] = useState("Atlas AI");
  return (
    <SectionShell
      title="Workspace"
      desc="Global settings for everyone in this workspace."
      actions={<PrimaryBtn><Save className="h-4 w-4" /> Save</PrimaryBtn>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Workspace name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Workspace URL" help="Used for shared links and API callbacks.">
          <input className={inputCls} defaultValue="atlas-ai.lovable.app" />
        </Field>
        <Field label="Default AI model">
          <select className={inputCls}>
            <option>Claude Sonnet 4.5</option>
            <option>GPT-5</option>
            <option>Gemini 2.5 Pro</option>
          </select>
        </Field>
        <Field label="Fallback model">
          <select className={inputCls}>
            <option>GPT-5 Mini</option>
            <option>Claude Haiku</option>
          </select>
        </Field>
      </div>
    </SectionShell>
  );
}

function TeamSection() {
  const members = [
    { name: "Khalid Chennoufi", email: "khalid@atlas.ai", role: "Owner", tone: "violet" as const },
    { name: "Sara Idrissi", email: "sara@atlas.ai", role: "Admin", tone: "emerald" as const },
    { name: "Mehdi Alaoui", email: "mehdi@atlas.ai", role: "Editor", tone: "emerald" as const },
    { name: "Lina Berrada", email: "lina@atlas.ai", role: "Viewer", tone: "muted" as const },
  ];
  return (
    <SectionShell
      title="Team & roles"
      desc="Invite teammates and control what they can edit."
      actions={<PrimaryBtn><Plus className="h-4 w-4" /> Invite</PrimaryBtn>}
    >
      <div className="overflow-hidden rounded-xl border border-border">
        {members.map((m, i) => (
          <div
            key={m.email}
            style={{ animationDelay: `${i * 60}ms` }}
            className={"animate-fade-up flex items-center gap-3 px-4 py-3 " + (i > 0 ? "border-t border-border" : "")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/20 text-xs font-semibold">
              {m.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.name}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            <Chip tone={m.tone}>{m.role}</Chip>
            <GhostBtn>Manage</GhostBtn>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<"aurora" | "midnight" | "cloud">("aurora");
  const [density, setDensity] = useState<"cozy" | "compact">("cozy");
  const themes: { id: typeof theme; name: string; swatches: string[] }[] = [
    { id: "aurora", name: "Glass Aurora", swatches: ["#1a1a2e", "#16213e", "#a78bfa", "#4ade80"] },
    { id: "midnight", name: "Midnight Indigo", swatches: ["#0f172a", "#1e293b", "#6366f1", "#22d3ee"] },
    { id: "cloud", name: "Cloud White", swatches: ["#f8fafc", "#e2e8f0", "#8b5cf6", "#10b981"] },
  ];
  return (
    <SectionShell title="Appearance" desc="Theme, density and the vibe of your workspace.">
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {themes.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{ animationDelay: `${i * 80}ms` }}
            className={
              "animate-scale-in group rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 " +
              (theme === t.id ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/20" : "border-border bg-white/5 hover:border-white/20")
            }
          >
            <div className="flex h-16 overflow-hidden rounded-lg">
              {t.swatches.map((c) => <div key={c} className="flex-1" style={{ background: c }} />)}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              {theme === t.id && <Check className="h-4 w-4 text-accent" />}
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Density">
          <div className="flex gap-2">
            {(["cozy", "compact"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={"flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition " + (density === d ? "border-primary/50 bg-primary/10" : "border-border bg-white/5 hover:bg-white/10")}
              >{d}</button>
            ))}
          </div>
        </Field>
        <Field label="Accent motion" help="Aurora background drift and micro-animations.">
          <div className="flex items-center justify-between rounded-lg border border-border bg-white/5 px-3 py-2">
            <span className="text-sm">Enable animated aurora</span>
            <Toggle checked={true} onChange={() => {}} />
          </div>
        </Field>
      </div>
    </SectionShell>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState([
    { id: "1", name: "Production", key: "atl_live_9f2b7c8e4d1a", created: "Mar 12, 2026", last: "2h ago", revealed: false },
    { id: "2", name: "Playground", key: "atl_test_a1b2c3d4e5f6", created: "Jan 04, 2026", last: "yesterday", revealed: false },
  ]);
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <SectionShell
      title="API keys"
      desc="Programmatic access to the Atlas AI API. Keep secret keys server-side."
      actions={<PrimaryBtn><Plus className="h-4 w-4" /> New key</PrimaryBtn>}
    >
      <div className="space-y-2">
        {keys.map((k, i) => (
          <div key={k.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-up flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/5 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{k.name}</span>
                <Chip tone="emerald">active</Chip>
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span>{k.revealed ? k.key : "•".repeat(16)}</span>
                <button onClick={() => setKeys((ks) => ks.map((x) => x.id === k.id ? { ...x, revealed: !x.revealed } : x))} className="rounded p-1 hover:bg-white/10">
                  {k.revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(k.key); setCopied(k.id); setTimeout(() => setCopied(null), 1200); }} className="rounded p-1 hover:bg-white/10">
                  {copied === k.id ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Created {k.created}</div>
              <div>Used {k.last}</div>
            </div>
            <GhostBtn tone="danger" onClick={() => setKeys((ks) => ks.filter((x) => x.id !== k.id))}><Trash2 className="h-3.5 w-3.5" /> Revoke</GhostBtn>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function WebhooksSection() {
  const hooks = [
    { url: "https://atlas-ai.com/hooks/orders", events: ["order.paid", "order.refunded"], status: "healthy" as const },
    { url: "https://n8n.atlas.ai/webhook/conv", events: ["conversation.resolved"], status: "failing" as const },
  ];
  return (
    <SectionShell
      title="Webhooks"
      desc="Send events to your own services when things happen in Atlas."
      actions={<PrimaryBtn><Plus className="h-4 w-4" /> New endpoint</PrimaryBtn>}
    >
      <div className="space-y-2">
        {hooks.map((h, i) => (
          <div key={h.url} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-up rounded-xl border border-border bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="truncate font-mono text-xs">{h.url}</span>
              <Chip tone={h.status === "healthy" ? "emerald" : "rose"}>{h.status}</Chip>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {h.events.map((e) => <Chip key={e} tone="muted">{e}</Chip>)}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function BillingSection() {
  return (
    <div className="space-y-4">
      <SectionShell title="Plan" desc="Your subscription and included quota." actions={<PrimaryBtn>Upgrade</PrimaryBtn>}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Current</div>
            <div className="mt-1 font-display text-xl font-bold">Pro</div>
            <div className="text-xs text-muted-foreground">$149 / month · renews May 12</div>
          </div>
          <UsageBar label="Conversations" used={12480} cap={25000} />
          <UsageBar label="Knowledge tokens" used={840000} cap={2000000} />
        </div>
      </SectionShell>

      <SectionShell title="Payment method" desc="Card on file for auto-renewal." actions={<GhostBtn>Update</GhostBtn>}>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-white/5 p-4">
          <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-purple-400 text-xs font-bold text-primary-foreground">VISA</div>
          <div className="flex-1">
            <div className="text-sm font-medium">•••• •••• •••• 4242</div>
            <div className="text-xs text-muted-foreground">Expires 08 / 2028</div>
          </div>
        </div>
      </SectionShell>

      <SectionShell title="Invoices" desc="Downloadable receipts for your records.">
        <div className="overflow-hidden rounded-xl border border-border">
          {[
            { d: "Apr 12, 2026", a: "$149.00", s: "paid" as const },
            { d: "Mar 12, 2026", a: "$149.00", s: "paid" as const },
            { d: "Feb 12, 2026", a: "$149.00", s: "paid" as const },
          ].map((inv, i) => (
            <div key={inv.d} className={"flex items-center px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-border" : "")}>
              <span className="flex-1">{inv.d}</span>
              <span className="w-24">{inv.a}</span>
              <Chip tone="emerald">{inv.s}</Chip>
              <button className="ml-3 text-xs text-primary hover:underline">Download</button>
            </div>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function UsageBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, (used / cap) * 100);
  return (
    <div className="rounded-xl border border-border bg-white/5 p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{used.toLocaleString()}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">of {cap.toLocaleString()}</div>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    emailDigest: true,
    emailAlerts: true,
    slack: false,
    sms: false,
    inApp: true,
  });
  const rows: { key: keyof typeof prefs; icon: typeof Mail; title: string; desc: string }[] = [
    { key: "emailDigest", icon: Mail, title: "Weekly digest", desc: "Summary of conversations, CSAT and top employees." },
    { key: "emailAlerts", icon: Bell, title: "Email alerts", desc: "Failed integrations, quota warnings, escalations." },
    { key: "slack", icon: Slack, title: "Slack", desc: "Ping #atlas-alerts on critical events." },
    { key: "sms", icon: Smartphone, title: "SMS", desc: "Text on P0 incidents only." },
    { key: "inApp", icon: MessageSquare, title: "In-app", desc: "Bell notifications and toasts." },
  ];
  return (
    <SectionShell title="Notifications" desc="Choose where and how Atlas reaches you.">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.key} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up flex items-center gap-3 rounded-xl border border-border bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <r.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.desc}</div>
            </div>
            <Toggle checked={prefs[r.key]} onChange={(v) => setPrefs((p) => ({ ...p, [r.key]: v }))} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function SecuritySection() {
  const [twofa, setTwofa] = useState(true);
  return (
    <div className="space-y-4">
      <SectionShell title="Two-factor authentication" desc="Require a code from your authenticator app on sign-in.">
        <div className="flex items-center justify-between rounded-xl border border-border bg-white/5 p-4">
          <div>
            <div className="text-sm font-medium">Authenticator app</div>
            <div className="text-xs text-muted-foreground">{twofa ? "Enabled · backup codes generated" : "Disabled"}</div>
          </div>
          <Toggle checked={twofa} onChange={setTwofa} />
        </div>
      </SectionShell>

      <SectionShell title="Active sessions" desc="Devices currently signed in. Revoke anything unfamiliar." actions={<GhostBtn tone="danger">Sign out all</GhostBtn>}>
        <div className="overflow-hidden rounded-xl border border-border">
          {[
            { d: "MacBook Pro · Chrome", loc: "Casablanca, MA", now: true },
            { d: "iPhone 15 · Safari", loc: "Casablanca, MA", now: false },
            { d: "Windows · Firefox", loc: "Paris, FR", now: false },
          ].map((s, i) => (
            <div key={s.d} className={"flex items-center gap-3 px-4 py-3 " + (i > 0 ? "border-t border-border" : "")}>
              <div className="flex-1">
                <div className="text-sm">{s.d}</div>
                <div className="text-xs text-muted-foreground">{s.loc}</div>
              </div>
              {s.now ? <Chip tone="emerald">this device</Chip> : <GhostBtn>Revoke</GhostBtn>}
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Audit log" desc="Recent security-relevant actions.">
        <div className="space-y-1 text-xs text-muted-foreground">
          {[
            "10:24  API key rotated — Production",
            "09:12  Sara Idrissi invited as Admin",
            "Yesterday  WhatsApp Business re-authorized",
          ].map((l) => (<div key={l} className="rounded-md px-2 py-1 hover:bg-white/5">{l}</div>))}
        </div>
      </SectionShell>
    </div>
  );
}

function DangerSection() {
  return (
    <SectionShell title="Danger zone" desc="Irreversible actions. Please double-check before proceeding.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
          <div>
            <div className="text-sm font-medium">Transfer ownership</div>
            <div className="text-xs text-muted-foreground">Hand the workspace over to another admin.</div>
          </div>
          <GhostBtn tone="danger"><Zap className="h-3.5 w-3.5" /> Transfer</GhostBtn>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
          <div>
            <div className="text-sm font-medium">Delete workspace</div>
            <div className="text-xs text-muted-foreground">This deletes all employees, conversations, and integrations.</div>
          </div>
          <GhostBtn tone="danger"><Trash2 className="h-3.5 w-3.5" /> Delete</GhostBtn>
        </div>
      </div>
    </SectionShell>
  );
}

// silence unused import warnings for icons kept for future rows
void Puzzle;