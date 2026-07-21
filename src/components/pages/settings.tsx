import { useEffect, useState, type ReactNode } from "react";
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
  Keyboard,
  Database,
  Download,
  Activity,
  Sparkles,
  Languages,
  BarChart3,
} from "lucide-react";
import { PageHeader, Panel, Chip, Modal, PrimaryButton as BigPrimary, GhostButton as BigGhost, TextField, useToast, useConfirm } from "./_shared";
import { usePrefs, THEMES, LANGS, type Lang } from "@/lib/preferences";
import { useT } from "@/lib/i18n";

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
  | "data"
  | "shortcuts"
  | "activity"
  | "labs"
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
  { key: "data", label: "Data & privacy", icon: Database, tone: "emerald" },
  { key: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard, tone: "violet" },
  { key: "activity", label: "Activity log", icon: Activity, tone: "amber" },
  { key: "labs", label: "Labs", icon: Sparkles, tone: "violet" },
  { key: "danger", label: "Danger zone", icon: Trash2, tone: "rose" },
];

export function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");
  const t = useT();

  const labelFor = (k: SectionKey) => t(`settings.${k}`);

  return (
    <div>
      <PageHeader
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Panel className="animate-slide-in-left h-fit lg:sticky lg:top-6">
          <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">{t("settings.sections")}</div>
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
                  <span className="font-medium">{labelFor(s.key)}</span>
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
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  return (
    <SectionShell
      title="Workspace"
      desc="Global settings for everyone in this workspace."
      actions={<PrimaryBtn onClick={() => { setSaved(true); toast.push({ kind: "success", title: "Workspace saved" }); setTimeout(() => setSaved(false), 1600); }}>{saved ? <><Check className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save</>}</PrimaryBtn>}
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
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [members, setMembers] = useState([
    { name: "Khalid Chennoufi", email: "khalid@atlas.ai", role: "Owner", tone: "violet" as const },
    { name: "Sara Idrissi", email: "sara@atlas.ai", role: "Admin", tone: "emerald" as const },
    { name: "Mehdi Alaoui", email: "mehdi@atlas.ai", role: "Editor", tone: "emerald" as const },
    { name: "Lina Berrada", email: "lina@atlas.ai", role: "Viewer", tone: "muted" as const },
  ]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "Editor" });
  const [managing, setManaging] = useState<string | null>(null);

  const send = () => {
    if (!invite.email.includes("@")) { toast.push({ kind: "warn", title: "Enter a valid email" }); return; }
    const tone = invite.role === "Admin" ? "emerald" : invite.role === "Editor" ? "emerald" : "muted";
    setMembers((m) => [...m, { name: invite.email.split("@")[0], email: invite.email, role: invite.role, tone: tone as "violet" | "emerald" | "muted" }]);
    setInviteOpen(false);
    setInvite({ email: "", role: "Editor" });
    toast.push({ kind: "success", title: "Invitation sent", body: invite.email });
  };
  const remove = async (email: string) => {
    setManaging(null);
    const ok = await ask({ title: `Remove ${email}?`, danger: true });
    if (!ok) return;
    setMembers((m) => m.filter((x) => x.email !== email));
    toast.push({ kind: "success", title: "Member removed" });
  };
  return (
    <SectionShell
      title="Team & roles"
      desc="Invite teammates and control what they can edit."
      actions={<PrimaryBtn onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite</PrimaryBtn>}
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
            <div className="relative">
              <GhostBtn onClick={() => setManaging(managing === m.email ? null : m.email)}>Manage</GhostBtn>
              {managing === m.email && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setManaging(null)} />
                  <div className="glass-panel absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-lg text-left text-xs">
                    <button onClick={() => { setManaging(null); toast.push({ kind: "info", title: `Reset link sent to ${m.email}` }); }} className="block w-full px-3 py-2 hover:bg-white/10">Send reset link</button>
                    {m.role !== "Owner" && <button onClick={() => remove(m.email)} className="block w-full px-3 py-2 text-left text-rose-300 hover:bg-rose-500/10">Remove</button>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite teammate"
        footer={<><BigGhost onClick={() => setInviteOpen(false)}>Cancel</BigGhost><BigPrimary onClick={send}>Send invite</BigPrimary></>}>
        <div className="grid gap-4">
          <TextField label="Email" value={invite.email} onChange={(v) => setInvite({ ...invite, email: v })} placeholder="teammate@company.com" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Role</div>
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} className={inputCls}>
              {["Admin", "Editor", "Viewer"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </Modal>
      {confirmNode}
    </SectionShell>
  );
}

function AppearanceSection() {
  const t = useT();
  const { theme, setTheme, motion, setMotion, lang, setLang } = usePrefs();
  const [density, setDensity] = useState<"cozy" | "compact">("cozy");
  return (
    <SectionShell title={t("settings.appearance")} desc={t("appearance.theme.desc")}>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("appearance.theme.title")}</div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {THEMES.map((th, i) => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            style={{ animationDelay: `${i * 80}ms` }}
            className={
              "animate-scale-in group rounded-xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 " +
              (theme === th.id ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/20" : "border-border bg-white/5 hover:border-white/20")
            }
          >
            <div className="flex h-16 overflow-hidden rounded-lg">
              {th.swatches.map((c) => <div key={c} className="flex-1" style={{ background: c }} />)}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium">{th.name}</span>
              {theme === th.id && <Check className="h-4 w-4 text-accent" />}
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("appearance.language.title")} help={t("appearance.language.desc")}>
          <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>{l.native} — {l.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t("appearance.motion.title")} help={t("appearance.motion.desc")}>
          <div className="flex items-center justify-between rounded-lg border border-border bg-white/5 px-3 py-2">
            <span className="text-sm">{motion ? t("appearance.motion.on") : t("appearance.motion.off")}</span>
            <Toggle checked={motion} onChange={setMotion} />
          </div>
        </Field>
        <Field label={t("appearance.density.title")}>
          <div className="flex gap-2">
            {(["cozy", "compact"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={"flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition " + (density === d ? "border-primary/50 bg-primary/10" : "border-border bg-white/5 hover:bg-white/10")}
              >{t("appearance.density." + d, d)}</button>
            ))}
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
  const toast = useToast();
  const [country, setCountry] = useState<"DZ" | "TN" | "MA">("DZ");
  const [method, setMethod] = useState<string>("cib");
  const cfg = {
    DZ: {
      label: "Algeria",
      flag: "🇩🇿",
      currency: "DZD",
      price: 2900,
      methods: [
        { id: "cib",       name: "CIB card",             desc: "Interbank card (SATIM)",           tone: "emerald" as const },
        { id: "edahabia",  name: "EDAHABIA",             desc: "Algérie Poste gold card",          tone: "amber"   as const },
        { id: "baridimob", name: "BaridiMob",            desc: "Mobile wallet — Algérie Poste",    tone: "violet"  as const },
        { id: "chargily",  name: "Chargily Pay",         desc: "CIB + EDAHABIA aggregator",        tone: "emerald" as const },
        { id: "cod",       name: "Cash on delivery",     desc: "Yalidine / ZR Express / Noest",    tone: "muted"   as const },
        { id: "wire",      name: "Bank transfer",        desc: "Virement bancaire",                tone: "muted"   as const },
      ],
    },
    TN: {
      label: "Tunisia",
      flag: "🇹🇳",
      currency: "TND",
      price: 79,
      methods: [
        { id: "d17",       name: "D17",                  desc: "La Poste mobile wallet",           tone: "emerald" as const },
        { id: "flouci",    name: "Flouci",               desc: "Mobile payments + QR",             tone: "violet"  as const },
        { id: "clictopay", name: "ClicToPay",            desc: "SMT gateway — Visa / MC / e-DINAR",tone: "amber"   as const },
        { id: "konnect",   name: "Konnect",              desc: "Local card gateway",               tone: "emerald" as const },
        { id: "paymee",    name: "Paymee",               desc: "Cards + wallets aggregator",       tone: "violet"  as const },
        { id: "cod",       name: "Cash on delivery",     desc: "First Delivery / Aramex TN",       tone: "muted"   as const },
      ],
    },
    MA: {
      label: "Morocco",
      flag: "🇲🇦",
      currency: "MAD",
      price: 249,
      methods: [
        { id: "cmi",       name: "CMI",                  desc: "Centre Monétique Interbancaire",   tone: "emerald" as const },
        { id: "payzone",   name: "Payzone",              desc: "Cards + local wallets",            tone: "amber"   as const },
        { id: "youcan",    name: "YouCan Pay",           desc: "MA online payments",               tone: "violet"  as const },
        { id: "cashplus",  name: "Cash Plus",            desc: "Cash payment network",             tone: "muted"   as const },
        { id: "wafacash",  name: "Wafacash",             desc: "Cash + transfer",                  tone: "muted"   as const },
        { id: "cod",       name: "Cash on delivery",     desc: "Amana / CTM / Speedaf",            tone: "muted"   as const },
      ],
    },
  }[country];

  const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: cfg.currency, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <SectionShell
        title="Region & currency"
        desc="Atlas AI launches first for North Africa — pick your country to see local prices and payment methods."
      >
        <div className="grid grid-cols-3 gap-2">
          {(["DZ", "TN", "MA"] as const).map((c) => {
            const info = { DZ: { flag: "🇩🇿", name: "Algeria", cur: "DZD" }, TN: { flag: "🇹🇳", name: "Tunisia", cur: "TND" }, MA: { flag: "🇲🇦", name: "Morocco", cur: "MAD" } }[c];
            const on = country === c;
            return (
              <button key={c} onClick={() => setCountry(c)} className={"rounded-xl border p-4 text-left transition " + (on ? "border-primary/50 bg-primary/10" : "border-border bg-white/5 hover:bg-white/10")}>
                <div className="text-2xl">{info.flag}</div>
                <div className="mt-1 text-sm font-semibold">{info.name}</div>
                <div className="text-[11px] text-muted-foreground">Billed in {info.cur}</div>
              </button>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell title="Plan" desc="Local pricing — no hidden FX fees." actions={<PrimaryBtn onClick={() => toast.push({ kind: "info", title: "Upgrade flow", body: "Redirecting to secure checkout…" })}>Upgrade</PrimaryBtn>}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Current — {cfg.flag} {cfg.label}</div>
            <div className="mt-1 font-display text-2xl font-bold aurora-gradient-text">{fmt(cfg.price)}</div>
            <div className="text-xs text-muted-foreground">/ month · Pro plan · renews May 12</div>
          </div>
          <UsageBar label="Conversations" used={12480} cap={25000} />
          <UsageBar label="Knowledge tokens" used={840000} cap={2000000} />
        </div>
      </SectionShell>

      <SectionShell title="Payment method" desc={"Choose how you'd like to pay in " + cfg.label + "."}>
        <div className="grid gap-2 md:grid-cols-2">
          {cfg.methods.map((m) => {
            const on = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={"flex items-center gap-3 rounded-xl border p-3 text-left transition " + (on ? "border-primary/50 bg-primary/10" : "border-border bg-white/5 hover:bg-white/10")}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{m.name}</span>
                    <Chip tone={m.tone}>{m.tone === "muted" ? "offline" : "online"}</Chip>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{m.desc}</div>
                </div>
                {on && <Check className="h-4 w-4 text-accent" />}
              </button>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell title="Invoices" desc="Downloadable receipts for your records.">
        <div className="overflow-hidden rounded-xl border border-border">
          {[
            { d: "Apr 12, 2026", a: fmt(cfg.price), s: "paid" as const },
            { d: "Mar 12, 2026", a: fmt(cfg.price), s: "paid" as const },
            { d: "Feb 12, 2026", a: fmt(cfg.price), s: "paid" as const },
          ].map((inv, i) => (
            <div key={inv.d} className={"flex items-center px-4 py-2.5 text-sm " + (i > 0 ? "border-t border-border" : "")}>
              <span className="flex-1">{inv.d}</span>
              <span className="w-28 font-mono text-xs">{inv.a}</span>
              <Chip tone="emerald">{inv.s}</Chip>
              <button onClick={() => toast.push({ kind: "success", title: `Invoice ${inv.d} downloaded` })} className="ml-3 text-xs text-primary hover:underline">Download</button>
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
  const toast = useToast();
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
    <SectionShell title="Notifications" desc="Choose where and how Atlas reaches you."
      actions={<PrimaryBtn onClick={() => toast.push({ kind: "success", title: "Preferences saved" })}><Save className="h-4 w-4" /> Save</PrimaryBtn>}>
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
            <Toggle checked={prefs[r.key]} onChange={(v) => { setPrefs((p) => ({ ...p, [r.key]: v })); toast.push({ kind: "info", title: `${r.title} ${v ? "on" : "off"}` }); }} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function SecuritySection() {
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [twofa, setTwofa] = useState(true);
  const [sessions, setSessions] = useState([
    { d: "MacBook Pro · Chrome", loc: "Casablanca, MA", now: true },
    { d: "iPhone 15 · Safari",    loc: "Casablanca, MA", now: false },
    { d: "Windows · Firefox",     loc: "Paris, FR",      now: false },
  ]);
  const revoke = async (d: string) => {
    const ok = await ask({ title: `Sign out ${d}?`, danger: true });
    if (!ok) return;
    setSessions((s) => s.filter((x) => x.d !== d));
    toast.push({ kind: "success", title: `Signed out ${d}` });
  };
  const signOutAll = async () => {
    const ok = await ask({ title: "Sign out every device?", danger: true });
    if (!ok) return;
    setSessions((s) => s.filter((x) => x.now));
    toast.push({ kind: "success", title: "All other sessions revoked" });
  };
  return (
    <div className="space-y-4">
      <SectionShell title="Two-factor authentication" desc="Require a code from your authenticator app on sign-in.">
        <div className="flex items-center justify-between rounded-xl border border-border bg-white/5 p-4">
          <div>
            <div className="text-sm font-medium">Authenticator app</div>
            <div className="text-xs text-muted-foreground">{twofa ? "Enabled · backup codes generated" : "Disabled"}</div>
          </div>
          <Toggle checked={twofa} onChange={(v) => { setTwofa(v); toast.push({ kind: v ? "success" : "warn", title: `Two-factor ${v ? "enabled" : "disabled"}` }); }} />
        </div>
      </SectionShell>

      <SectionShell title="Active sessions" desc="Devices currently signed in. Revoke anything unfamiliar." actions={<GhostBtn tone="danger" onClick={signOutAll}>Sign out all</GhostBtn>}>
        <div className="overflow-hidden rounded-xl border border-border">
          {sessions.map((s, i) => (
            <div key={s.d} className={"flex items-center gap-3 px-4 py-3 " + (i > 0 ? "border-t border-border" : "")}>
              <div className="flex-1">
                <div className="text-sm">{s.d}</div>
                <div className="text-xs text-muted-foreground">{s.loc}</div>
              </div>
              {s.now ? <Chip tone="emerald">this device</Chip> : <GhostBtn onClick={() => revoke(s.d)}>Revoke</GhostBtn>}
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
      {confirmNode}
    </div>
  );
}

function DangerSection() {
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const doTransfer = async () => {
    const ok = await ask({ title: "Transfer workspace ownership?", body: "You'll lose owner permissions immediately.", danger: true });
    if (ok) toast.push({ kind: "success", title: "Ownership transferred" });
  };
  const doDelete = async () => {
    const ok = await ask({ title: "Delete this workspace forever?", body: "Every employee, conversation and integration will be lost.", danger: true });
    if (ok) toast.push({ kind: "success", title: "Workspace scheduled for deletion" });
  };
  return (
    <SectionShell title="Danger zone" desc="Irreversible actions. Please double-check before proceeding.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
          <div>
            <div className="text-sm font-medium">Transfer ownership</div>
            <div className="text-xs text-muted-foreground">Hand the workspace over to another admin.</div>
          </div>
          <GhostBtn tone="danger" onClick={doTransfer}><Zap className="h-3.5 w-3.5" /> Transfer</GhostBtn>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
          <div>
            <div className="text-sm font-medium">Delete workspace</div>
            <div className="text-xs text-muted-foreground">This deletes all employees, conversations, and integrations.</div>
          </div>
          <GhostBtn tone="danger" onClick={doDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</GhostBtn>
        </div>
      </div>
      {confirmNode}
    </SectionShell>
  );
}

// silence unused import warnings for icons kept for future rows
void Puzzle;