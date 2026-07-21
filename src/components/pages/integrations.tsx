import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Send, Bot, Loader2, MessageCircle, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Plus, Cpu, Eye, EyeOff, PlugZap, ShieldCheck, TestTube2, Save, ShoppingBag, Pencil,
  ExternalLink, ChevronDown, Wifi, KeyRound, Ban, SearchX, Gauge, ServerCrash,
  FileWarning, Link2Off, HelpCircle, Clock, Timer, Copy,
} from "lucide-react";
import { PageHeader, Panel, Chip, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
import {
  PROVIDERS, listProviderConnections, saveProviderConnection, testProviderConnection,
  disconnectProviderConnection, scrapeWebsiteProducts,
  type ProviderConnection, type ProviderId, type ProviderMeta,
  type PingCode,
} from "@/lib/social.functions";
import {
  listCustomModels, saveCustomModel, testCustomModel, deleteCustomModel,
  type CustomModelRow,
} from "@/lib/custom-models.functions";
import { askCustomerAssistant } from "@/lib/customer-chat.functions";

// ─────────────────────────────────────────────────────────────
// Integrations hub — sales + messaging + AI models, all real handshakes.
// ─────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProviderConnections);
  const listCM = useServerFn(listCustomModels);
  const { data: conns = [], isLoading } = useQuery({ queryKey: ["provider_conns"], queryFn: () => list() });
  const { data: customModels = [] } = useQuery({ queryKey: ["custom_models"], queryFn: () => listCM() });

  const salesProviders = PROVIDERS.filter((p) => p.category === "sales");
  const messagingProviders = PROVIDERS.filter((p) => p.category === "messaging");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["provider_conns"] });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Integrations hub"
        title="Connect your commerce & channels"
        description="Everything you need in one place — Shopify, WooCommerce, any website, WhatsApp, Facebook, Instagram, Telegram, plus your own AI model endpoints. Every save runs a real handshake so you know it works."
      />

      <ProviderPicker
        icon={<ShoppingBag className="h-5 w-5 text-primary" />}
        title="Sales channels"
        blurb="Where your products live. Atlas syncs catalog, stock and orders from here."
        providers={salesProviders}
        conns={conns}
        onChanged={invalidate}
        placeholder="Select a sales channel to connect…"
      />

      <ProviderPicker
        icon={<MessageCircle className="h-5 w-5 text-primary" />}
        title="Messaging channels"
        blurb="Where your customers talk to you. Atlas replies here on your behalf."
        providers={messagingProviders}
        conns={conns}
        onChanged={invalidate}
        placeholder="Select a messaging channel to connect…"
      />

      <CustomModelsSection models={customModels} />

      <TestChatPanel customModels={customModels} />

      {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
    </div>
  );
}

function Section({ icon, title, blurb, children }: { icon: React.ReactNode; title: string; blurb: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          {icon} {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>
      </div>
      {children}
    </section>
  );
}

// ── Dropdown picker: one provider at a time ─────────────────
function ProviderPicker({
  icon, title, blurb, providers, conns, onChanged, placeholder,
}: {
  icon: React.ReactNode; title: string; blurb: string;
  providers: ProviderMeta[]; conns: ProviderConnection[];
  onChanged: () => void; placeholder: string;
}) {
  const connectedIds = new Set(conns.filter((c) => c.connected).map((c) => c.provider));
  const firstConnected = providers.find((p) => connectedIds.has(p.id))?.id ?? "";
  const [selected, setSelected] = useState<ProviderId | "">(firstConnected);
  const meta = providers.find((p) => p.id === selected);
  const initial = meta ? conns.find((c) => c.provider === meta.id) : undefined;

  return (
    <section>
      <div className="mb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">{icon} {title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>
      </div>

      <div className="relative mb-4 max-w-md">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as ProviderId | "")}
          className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-9 text-sm outline-none focus:border-primary/50"
        >
          <option value="">{placeholder}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}{connectedIds.has(p.id) ? "  ✓ connected" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {meta ? (
        <div className="max-w-2xl animate-in fade-in slide-in-from-top-1 duration-200">
          <ProviderCard key={meta.id} meta={meta} initial={initial} onChanged={onChanged} />
        </div>
      ) : (
        <Panel className="max-w-2xl text-sm text-muted-foreground">
          Pick a channel above to see the fields you need to fill in.
        </Panel>
      )}
    </section>
  );
}

// ── Detailed status / diagnostics panel ─────────────────────
const CODE_META: Record<PingCode, { label: string; tone: "emerald" | "rose" | "amber" | "sky" | "muted"; Icon: any }> = {
  ok:           { label: "Connected",       tone: "emerald", Icon: CheckCircle2 },
  network:      { label: "Network error",   tone: "rose",    Icon: Wifi },
  auth:         { label: "Auth rejected",   tone: "rose",    Icon: KeyRound },
  forbidden:    { label: "Missing scope",   tone: "amber",   Icon: Ban },
  not_found:    { label: "Not found",       tone: "amber",   Icon: SearchX },
  rate_limit:   { label: "Rate limited",    tone: "amber",   Icon: Gauge },
  server_error: { label: "Provider 5xx",    tone: "amber",   Icon: ServerCrash },
  bad_format:   { label: "Invalid field",   tone: "rose",    Icon: FileWarning },
  unlinked:     { label: "Not linked",      tone: "amber",   Icon: Link2Off },
  unknown:      { label: "Unknown error",   tone: "muted",   Icon: HelpCircle },
};

function fmtAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusPanel({ conn, meta, busy }: { conn?: ProviderConnection; meta: ProviderMeta; busy?: boolean }) {
  const toast = useToast();
  const untested = !conn || !conn.last_test_status;
  const ok = conn?.last_test_status === "ok";
  const code: PingCode = (conn?.last_test_code as PingCode) ?? (ok ? "ok" : untested ? "unknown" : "unknown");
  const c = CODE_META[code];
  const missing = conn?.missing_keys ?? meta.requiredKeys;
  const message = conn?.last_test_message;
  const hint = conn?.last_test_hint;
  const latency = conn?.last_test_latency_ms;
  const at = conn?.last_test_at ?? null;

  const barTone =
    untested ? "border-white/10 bg-white/5"
    : ok ? "border-emerald-500/30 bg-emerald-500/5"
    : c.tone === "amber" ? "border-amber-500/30 bg-amber-500/5"
    : "border-rose-500/30 bg-rose-500/5";
  const iconTone =
    untested ? "text-muted-foreground"
    : ok ? "text-emerald-300"
    : c.tone === "amber" ? "text-amber-300" : "text-rose-300";

  const copy = () => {
    if (!message) return;
    navigator.clipboard?.writeText(message).then(
      () => toast.push({ kind: "info", title: "Copied diagnostic message" }),
      () => {}
    );
  };

  return (
    <div className={"rounded-xl border p-3 " + barTone}>
      <div className="flex flex-wrap items-center gap-2">
        <div className={"flex items-center gap-1.5 text-sm font-medium " + iconTone}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <c.Icon className="h-4 w-4" />}
          {untested ? "Awaiting first test" : c.label}
        </div>
        {!untested && (
          <Chip tone={ok ? "emerald" : c.tone === "amber" ? "amber" : "rose"}>{code}</Chip>
        )}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          {typeof latency === "number" && (
            <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />{latency} ms</span>
          )}
          {at && (
            <span className="inline-flex items-center gap-1" title={new Date(at).toLocaleString()}>
              <Clock className="h-3 w-3" />{fmtAgo(at)}
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-foreground/80">
          <span className="min-w-0 flex-1 break-words">{message}</span>
          <button type="button" onClick={copy} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground" title="Copy">
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}

      {!ok && hint && (
        <div className="mt-2 text-xs text-foreground/85">
          <span className="font-medium">Fix:</span> {hint}
        </div>
      )}

      {missing.length > 0 && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-amber-300/90">Missing fields:</span>{" "}
          {missing.map((k, i) => {
            const label = meta.fields.find((f) => f.key === k)?.label ?? k;
            return <span key={k} className="font-mono">{i > 0 ? ", " : ""}{label}</span>;
          })}
        </div>
      )}

      {meta.helpUrl && !ok && !untested && (
        <div className="mt-2">
          <a href={meta.helpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
            Open {meta.title} docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ── One card per provider ───────────────────────────────────
function ProviderCard({ meta, initial, onChanged }: { meta: ProviderMeta; initial?: ProviderConnection; onChanged: () => void }) {
  const toast = useToast();
  const { ask, node } = useConfirm();
  const save = useServerFn(saveProviderConnection);
  const test = useServerFn(testProviderConnection);
  const disc = useServerFn(disconnectProviderConnection);
  const scrape = useServerFn(scrapeWebsiteProducts);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"save" | "test" | "disc" | "scrape" | null>(null);

  const connected = !!initial?.connected;
  const hasCreds = !!initial?.has_credentials;


  const handleSave = async () => {
    setBusy("save");
    try {
      const row = await save({ data: { provider: meta.id, credentials: creds } });
      if (row.connected) toast.push({ kind: "success", title: `${meta.title} connected`, body: row.handle ? `Verified · ${row.handle}` : "Handshake OK" });
      else toast.push({ kind: "error", title: `${meta.title} handshake failed`, body: row.last_test_message || "Check your credentials." });
      setCreds({});
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Save failed", body: e?.message });
    } finally { setBusy(null); }
  };
  const handleTest = async () => {
    setBusy("test");
    try {
      const row = await test({ data: { provider: meta.id } });
      if (row.connected) toast.push({ kind: "success", title: "Connection OK", body: row.handle ?? row.last_test_message ?? "" });
      else toast.push({ kind: "error", title: "Test failed", body: row.last_test_message || "" });
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Test failed", body: e?.message });
    } finally { setBusy(null); }
  };
  const handleDisconnect = async () => {
    if (!(await ask({ title: `Disconnect ${meta.title}?`, danger: true }))) return;
    setBusy("disc");
    try {
      await disc({ data: { provider: meta.id } });
      toast.push({ kind: "info", title: `${meta.title} disconnected` });
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Disconnect failed", body: e?.message });
    } finally { setBusy(null); }
  };
  const handleScrape = async () => {
    setBusy("scrape");
    try {
      const r = await scrape({ data: {} as any });
      const logLine = (r as any).log?.length ? ` · ${(r as any).log.join(" · ")}` : "";
      if (r.found === 0) {
        toast.push({ kind: "error", title: "No products found", body: `Scanned ${r.pages_scanned} page(s).${logLine}` });
      } else {
        toast.push({ kind: "success", title: `Imported ${r.inserted} product${r.inserted === 1 ? "" : "s"}`, body: `Found ${r.found} across ${r.pages_scanned} page(s)${r.sample.length ? ` · ${r.sample.slice(0, 3).join(", ")}${r.sample.length > 3 ? "…" : ""}` : ""}${logLine}` });
      }
    } catch (e: any) {
      toast.push({ kind: "error", title: "Scrape failed", body: e?.message });
    } finally { setBusy(null); }
  };

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold">{meta.title}</h3>
            {connected
              ? <Chip tone="emerald"><CheckCircle2 className="h-3 w-3" /> Connected</Chip>
              : hasCreds ? <Chip tone="amber"><AlertTriangle className="h-3 w-3" /> Needs re-test</Chip>
              : <Chip tone="muted">Not connected</Chip>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{meta.blurb}</p>
          {initial?.handle && <div className="mt-1 truncate text-xs">Handle: <span className="font-mono">{initial.handle}</span></div>}
        </div>
        {meta.helpUrl && (
          <a href={meta.helpUrl} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" title="Docs">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        {meta.fields.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{f.label}{f.required && <span className="ml-0.5 text-rose-400">*</span>}</span>
              {f.secret && (
                <button type="button" onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
                  className="rounded p-0.5 hover:bg-white/10">
                  {reveal[f.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              )}
            </div>
            <input
              type={f.secret && !reveal[f.key] ? "password" : "text"}
              value={creds[f.key] ?? ""}
              onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })}
              placeholder={initial?.present_keys.includes(f.key) ? "•••••• (leave blank to keep saved)" : f.placeholder}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            {f.help && <div className="mt-1 text-[10.5px] text-muted-foreground/70">{f.help}</div>}
          </label>
        ))}
      </div>

      <StatusPanel conn={initial} meta={meta} busy={busy === "test" || busy === "save"} />


      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={handleSave} disabled={busy === "save"}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save & verify
        </PrimaryButton>
        {hasCreds && (
          <>
            <GhostButton onClick={handleTest}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Test
            </GhostButton>
            {meta.id === "website" && (
              <GhostButton onClick={handleScrape}>
                {busy === "scrape" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                Scrape products
              </GhostButton>
            )}
            <GhostButton onClick={handleDisconnect} tone="danger">
              <Trash2 className="h-4 w-4" /> Disconnect
            </GhostButton>
          </>
        )}
      </div>
      {node}
    </Panel>
  );
}

// ── Custom AI models section ────────────────────────────────
function CustomModelsSection({ models }: { models: CustomModelRow[] }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { ask, node } = useConfirm();
  const save = useServerFn(saveCustomModel);
  const test = useServerFn(testCustomModel);
  const del = useServerFn(deleteCustomModel);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const emptyDraft = { label: "", base_url: "https://openrouter.ai/api/v1", model_id: "openai/gpt-4o-mini", api_key: "" };
  const [draft, setDraft] = useState(emptyDraft);
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["custom_models"] });

  const openAdd = () => { setEditId(null); setDraft(emptyDraft); setAddOpen(true); };
  const openEdit = (m: CustomModelRow) => {
    setEditId(m.id);
    setDraft({ label: m.label, base_url: m.base_url, model_id: m.model_id, api_key: "" });
    setAddOpen(true);
  };
  const closeForm = () => { setAddOpen(false); setEditId(null); setDraft(emptyDraft); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { label: draft.label, base_url: draft.base_url, model_id: draft.model_id };
      if (editId) payload.id = editId;
      if (draft.api_key) payload.api_key = draft.api_key;
      const row = await save({ data: payload });
      const ok = row.last_test_status === "ok";
      toast.push({ kind: ok ? "success" : "error", title: editId ? (ok ? "Model updated & verified" : "Updated but handshake failed") : (ok ? "Model saved & verified" : "Saved but handshake failed"), body: row.last_test_message ?? "" });
      closeForm();
      invalidate();
    } catch (e: any) { toast.push({ kind: "error", title: "Save failed", body: e?.message }); }
    finally { setSaving(false); }
  };
  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const row = await test({ data: { id } });
      const ok = row.last_test_status === "ok";
      toast.push({ kind: ok ? "success" : "error", title: ok ? "Handshake OK" : "Test failed", body: row.last_test_message ?? "" });
      invalidate();
    } catch (e: any) { toast.push({ kind: "error", title: "Test failed", body: e?.message }); }
    finally { setTesting(null); }
  };
  const handleDelete = async (row: CustomModelRow) => {
    if (!(await ask({ title: `Remove ${row.label}?`, danger: true }))) return;
    try { await del({ data: { id: row.id } }); invalidate(); toast.push({ kind: "info", title: "Model removed" }); }
    catch (e: any) { toast.push({ kind: "error", title: "Delete failed", body: e?.message }); }
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Cpu className="h-5 w-5 text-primary" /> Custom AI models
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Any OpenAI-compatible endpoint — OpenRouter, Gemini's OpenAI proxy, Groq, Together, self-hosted vLLM. We ping <code className="font-mono text-[11px]">/chat/completions</code> to verify.
          </p>
        </div>
        <PrimaryButton onClick={() => (addOpen ? closeForm() : openAdd())}>
          <Plus className="h-4 w-4" /> {addOpen ? "Close" : "Add model"}
        </PrimaryButton>
      </div>

      {addOpen && (
        <Panel className="mb-4">
          <div className="mb-3 text-sm font-medium">{editId ? "Edit model" : "Add a new model"}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Display name" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} placeholder="OpenRouter · gpt-4o-mini" />
            <TextField label="Base URL" value={draft.base_url} onChange={(v) => setDraft({ ...draft, base_url: v })} placeholder="https://openrouter.ai/api/v1" />
            <TextField label="Model id" value={draft.model_id} onChange={(v) => setDraft({ ...draft, model_id: v })} placeholder="openai/gpt-4o-mini" />
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>API key {editId && <span className="text-muted-foreground/70">(leave blank to keep current)</span>}</span>
                <button type="button" onClick={() => setReveal((r) => !r)} className="rounded p-0.5 hover:bg-white/10">
                  {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              <input type={reveal ? "text" : "password"} value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                placeholder={editId ? "•••• keep existing ••••" : "sk-…"} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Keys stay server-side and are shown masked.</div>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} {editId ? "Update & verify" : "Save & verify"}
            </PrimaryButton>
          </div>
        </Panel>
      )}

      {models.length === 0 ? (
        <Panel className="text-center text-sm text-muted-foreground">No custom models yet — add one to route Atlas to your OpenRouter / Gemini / any OpenAI-compatible endpoint.</Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {models.map((m) => {
            const ok = m.last_test_status === "ok";
            return (
              <Panel key={m.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.label}</span>
                      {m.last_test_status === "ok"  && <Chip tone="emerald"><CheckCircle2 className="h-3 w-3" /> Verified</Chip>}
                      {m.last_test_status === "fail" && <Chip tone="rose"><AlertTriangle className="h-3 w-3" /> Failed</Chip>}
                      {!m.last_test_status && <Chip tone="muted">Untested</Chip>}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground font-mono">{m.model_id}  ·  {m.base_url}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Key: <span className="font-mono">{m.api_key_masked}</span></div>
                    {m.last_test_message && <div className={"mt-2 text-[11px] " + (ok ? "text-emerald-300" : "text-rose-300")}>{m.last_test_message}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GhostButton onClick={() => handleTest(m.id)}>
                    {testing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test
                  </GhostButton>
                  <GhostButton onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /> Edit</GhostButton>
                  <GhostButton onClick={() => handleDelete(m)} tone="danger"><Trash2 className="h-4 w-4" /> Delete</GhostButton>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      {node}
    </section>
  );
}

// ── Scoped customer chat preview ────────────────────────────
type Msg = { role: "user" | "assistant"; content: string };
function TestChatPanel({ customModels }: { customModels: CustomModelRow[] }) {
  const toast = useToast();
  const ask = useServerFn(askCustomerAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [modelId, setModelId] = useState<string>("");
  const [catalogSize, setCatalogSize] = useState<number | null>(null);

  const send = async () => {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await ask({ data: { message: text, history: next.slice(0, -1), customModelId: modelId || undefined } });
      setCatalogSize(res.catalog_size);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Chat failed", body: e?.message });
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e?.message}` }]);
    } finally { setBusy(false); }
  };

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Bot className="h-5 w-5 text-primary" /> Test the customer assistant
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Atlas answers using <b>your product catalog only</b> and stays on-topic (products, prices, stock, orders, shipping). Off-topic questions are politely redirected.
          </p>
        </div>
        {catalogSize !== null && <Chip tone="emerald">{catalogSize} products in scope</Chip>}
      </div>
      <Panel className="flex h-[440px] flex-col p-0">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Model:</span>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs">
            <option value="">Lovable AI · gemini-2.5-flash (default)</option>
            {customModels.filter((m) => m.last_test_status === "ok").map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button onClick={() => setMessages([])} className="ml-auto flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] hover:bg-white/10">
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
              Ask like a customer would: <i>"Do you have argan oil in stock?"</i>, <i>"What's your cheapest hair product?"</i>, <i>"How long does shipping take?"</i>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"flex gap-2 " + (m.role === "user" ? "flex-row-reverse" : "")}>
              <div className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg " + (m.role === "user" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary")}>
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className={"max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm " + (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/5")}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> Thinking…</div>}
        </div>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask a customer question…"
              disabled={busy}
              className="flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" />
            <button onClick={send} disabled={busy || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
