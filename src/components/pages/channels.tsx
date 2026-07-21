import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Send, Bot, Loader2, MessageCircle, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Plus, Cpu, Eye, EyeOff, PlugZap, ShieldCheck, TestTube2, Save,
} from "lucide-react";
import { PageHeader, Panel, Chip, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
import {
  listSocialChannels, saveSocialChannel, testSocialChannel, disconnectSocialChannel,
  type SocialChannel, type SocialProvider,
} from "@/lib/social.functions";
import {
  listCustomModels, saveCustomModel, testCustomModel, deleteCustomModel,
  type CustomModelRow,
} from "@/lib/custom-models.functions";
import { askCustomerAssistant } from "@/lib/customer-chat.functions";

// ─────────────────────────────────────────────────────────────
// Sales channels (Telegram + Facebook) + Custom AI models
// ─────────────────────────────────────────────────────────────

export function ChannelsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const list = useServerFn(listSocialChannels);
  const listCM = useServerFn(listCustomModels);
  const { data: channels = [], isLoading } = useQuery({ queryKey: ["channels"], queryFn: () => list() });
  const { data: customModels = [] } = useQuery({ queryKey: ["custom_models"], queryFn: () => listCM() });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Live channels"
        title="Sales channels & AI models"
        description="Connect Telegram bots, Facebook pages, and OpenAI-compatible model endpoints. Every save runs a real handshake so you know it works."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <SocialCard
          provider="telegram"
          title="Telegram Bot"
          blurb="Create a bot with @BotFather, then paste the token. We'll ping getMe to verify."
          initial={channels.find((c) => c.provider === "telegram")}
          fields={[{ key: "botToken", label: "Bot token", placeholder: "123456:ABC-DEF…", secret: true }]}
          onChanged={() => qc.invalidateQueries({ queryKey: ["channels"] })}
        />
        <SocialCard
          provider="facebook_page"
          title="Facebook Page"
          blurb="Generate a long-lived Page Access Token in Meta for Developers, then paste it here."
          initial={channels.find((c) => c.provider === "facebook_page")}
          fields={[{ key: "pageAccessToken", label: "Page access token", placeholder: "EAAG…", secret: true }]}
          onChanged={() => qc.invalidateQueries({ queryKey: ["channels"] })}
        />
      </section>

      <CustomModelsSection models={customModels} />

      <TestChatPanel customModels={customModels} />

      {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
    </div>
  );
}

// ── Social provider card ────────────────────────────────────
function SocialCard({
  provider, title, blurb, initial, fields, onChanged,
}: {
  provider: SocialProvider;
  title: string;
  blurb: string;
  initial?: SocialChannel;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const { ask, node } = useConfirm();
  const save = useServerFn(saveSocialChannel);
  const test = useServerFn(testSocialChannel);
  const disc = useServerFn(disconnectSocialChannel);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"save" | "test" | "disc" | null>(null);

  const connected = !!initial?.connected;
  const lastOk = initial?.last_test_status === "ok";
  const lastMsg = initial?.last_test_message;

  const handleSave = async () => {
    setBusy("save");
    try {
      const row = await save({ data: { provider, credentials: creds } });
      if (row.connected) toast.push({ kind: "success", title: `${title} connected`, body: row.handle ? `Verified · ${row.handle}` : "Handshake ok" });
      else toast.push({ kind: "error", title: `${title} handshake failed`, body: row.last_test_message || "Check your credentials." });
      setCreds({});
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Save failed", body: e?.message });
    } finally { setBusy(null); }
  };
  const handleTest = async () => {
    setBusy("test");
    try {
      const row = await test({ data: { provider } });
      if (row.connected) toast.push({ kind: "success", title: "Connection OK", body: row.handle ?? row.last_test_message ?? "" });
      else toast.push({ kind: "error", title: "Test failed", body: row.last_test_message || "" });
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Test failed", body: e?.message });
    } finally { setBusy(null); }
  };
  const handleDisconnect = async () => {
    if (!(await ask({ title: `Disconnect ${title}?`, danger: true }))) return;
    setBusy("disc");
    try {
      await disc({ data: { provider } });
      toast.push({ kind: "info", title: `${title} disconnected` });
      onChanged();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Disconnect failed", body: e?.message });
    } finally { setBusy(null); }
  };

  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            {connected
              ? <Chip tone="emerald"><CheckCircle2 className="h-3 w-3" /> Connected</Chip>
              : <Chip tone="muted">Not connected</Chip>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>
          {initial?.handle && <div className="mt-1 text-xs">Handle: <span className="font-mono">{initial.handle}</span></div>}
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{f.label}</span>
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
              placeholder={initial?.has_credentials ? "•••••• (leave blank to keep saved)" : f.placeholder}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </label>
        ))}
      </div>

      {lastMsg && (
        <div className={"flex items-start gap-2 rounded-lg border px-3 py-2 text-xs " + (lastOk ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" : "border-rose-500/30 bg-rose-500/5 text-rose-200")}>
          {lastOk ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          <div><span className="font-medium">Last test: </span>{lastMsg}</div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={handleSave} disabled={busy === "save"}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save & verify
        </PrimaryButton>
        {initial?.has_credentials && (
          <>
            <GhostButton onClick={handleTest}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              Test connection
            </GhostButton>
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
  const [draft, setDraft] = useState({ label: "", base_url: "https://openrouter.ai/api/v1", model_id: "openai/gpt-4o-mini", api_key: "" });
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["custom_models"] });

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await save({ data: draft });
      const ok = row.last_test_status === "ok";
      toast.push({
        kind: ok ? "success" : "error",
        title: ok ? "Model saved & verified" : "Saved but handshake failed",
        body: row.last_test_message ?? "",
      });
      setAddOpen(false);
      setDraft({ label: "", base_url: "https://openrouter.ai/api/v1", model_id: "openai/gpt-4o-mini", api_key: "" });
      invalidate();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Save failed", body: e?.message });
    } finally { setSaving(false); }
  };
  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const row = await test({ data: { id } });
      const ok = row.last_test_status === "ok";
      toast.push({ kind: ok ? "success" : "error", title: ok ? "Handshake OK" : "Test failed", body: row.last_test_message ?? "" });
      invalidate();
    } catch (e: any) {
      toast.push({ kind: "error", title: "Test failed", body: e?.message });
    } finally { setTesting(null); }
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
            Any OpenAI-compatible endpoint — OpenRouter, Gemini's OpenAI proxy, Groq, Together, self-hosted vLLM… Paste base URL + model id + API key, we ping <code className="font-mono text-[11px]">/chat/completions</code> to verify.
          </p>
        </div>
        <PrimaryButton onClick={() => setAddOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> {addOpen ? "Close" : "Add model"}
        </PrimaryButton>
      </div>

      {addOpen && (
        <Panel className="mb-4">
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Display name" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} placeholder="OpenRouter · gpt-4o-mini" />
            <TextField label="Base URL" value={draft.base_url} onChange={(v) => setDraft({ ...draft, base_url: v })} placeholder="https://openrouter.ai/api/v1" />
            <TextField label="Model id" value={draft.model_id} onChange={(v) => setDraft({ ...draft, model_id: v })} placeholder="openai/gpt-4o-mini" />
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>API key</span>
                <button type="button" onClick={() => setReveal((r) => !r)} className="rounded p-0.5 hover:bg-white/10">
                  {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              <input type={reveal ? "text" : "password"} value={draft.api_key} onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                placeholder="sk-…" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Keys stay server-side and are shown masked.</div>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Save & verify
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
                <div className="flex gap-2">
                  <GhostButton onClick={() => handleTest(m.id)}>
                    {testing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test
                  </GhostButton>
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
      const res = await ask({ data: {
        message: text,
        history: next.slice(0, -1),
        customModelId: modelId || undefined,
      }});
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
