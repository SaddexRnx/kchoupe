import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Plus, MessageSquare, Zap, Play, Pause, Trash2, Settings2, Loader2, CheckCircle2, AlertTriangle, Users, Activity, Info } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm, HelpNote } from "./_shared";
import { useT } from "@/lib/i18n";
import {
  listAiEmployees,
  createAiEmployee,
  updateAiEmployee,
  deleteAiEmployee,
  type AiEmployeeRow,
} from "@/lib/ai-employees.functions";
import { listCustomModels, testCustomModel, type CustomModelRow } from "@/lib/custom-models.functions";

const EMOJI = ["🚀", "🛎️", "🌿", "📡", "🪐", "💡", "🤖", "🧠", "✨", "🎯", "📚", "🛍️"];
const BUILTIN_MODELS: { id: string; label: string }[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, default)" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "openai/gpt-5.5", label: "GPT-5.5" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
];
export const MODELS = BUILTIN_MODELS;

const LANGUAGES = [
  { id: "auto", label: "Auto (match customer)" },
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "ar", label: "العربية" },
  { id: "darija", label: "Darija (Maghrebi Arabic)" },
];

type DraftConfig = {
  name: string;
  role: string;
  model: string;
  emoji: string;
  prompt: string;
  greeting: string;
  language: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  escalate_to_human: boolean;
  use_knowledge: boolean;
  use_products: boolean;
};

const emptyDraft = (): DraftConfig => ({
  name: "",
  role: "",
  model: MODELS[0].id,
  emoji: EMOJI[0],
  prompt: "",
  greeting: "",
  language: "auto",
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1024,
  escalate_to_human: true,
  use_knowledge: true,
  use_products: true,
});

const toneFor = (status: AiEmployeeRow["status"]): "violet" | "emerald" | "amber" | "muted" =>
  status === "active" ? "emerald" : status === "training" ? "amber" : "muted";

export function AiEmployees() {
  const t = useT();
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const qc = useQueryClient();
  const list = useServerFn(listAiEmployees);
  const create = useServerFn(createAiEmployee);
  const update = useServerFn(updateAiEmployee);
  const del = useServerFn(deleteAiEmployee);
  const listCM = useServerFn(listCustomModels);
  const testCM = useServerFn(testCustomModel);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["ai_employees"],
    queryFn: () => list(),
  });
  const { data: customModels = [] } = useQuery<CustomModelRow[]>({
    queryKey: ["custom_models"],
    queryFn: () => listCM(),
  });

  const modelOptions = useMemo(() => ([
    ...BUILTIN_MODELS.map((m) => ({ id: m.id, label: m.label, group: "Built-in (Lovable AI)", status: "ok" as const, custom: false })),
    ...customModels.map((m) => ({
      id: `custom:${m.id}`,
      label: `${m.label} · ${m.model_id}`,
      group: "Your custom models",
      status: (m.last_test_status ?? "untested") as "ok" | "fail" | "untested",
      custom: true,
    })),
  ]), [customModels]);

  const [testingCM, setTestingCM] = useState<string | null>(null);
  const runTestCustom = async (rawModelId: string) => {
    if (!rawModelId.startsWith("custom:")) return;
    const id = rawModelId.slice(7);
    setTestingCM(id);
    try {
      const r = await testCM({ data: { id } });
      qc.setQueryData<CustomModelRow[]>(["custom_models"], (old) =>
        (old ?? []).map((m) => (m.id === id ? r : m))
      );
      toast.push({ kind: r.last_test_status === "ok" ? "success" : "warn", title: `${r.label}: ${r.last_test_status}`, body: r.last_test_message ?? undefined });
    } catch (e) {
      toast.push({ kind: "warn", title: "Test failed", body: e instanceof Error ? e.message : String(e) });
    } finally { setTestingCM(null); }
  };

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AiEmployeeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftConfig>(emptyDraft());

  useEffect(() => {
    const handler = () => setAddOpen(true);
    window.addEventListener("atlas:new-employee", handler);
    return () => window.removeEventListener("atlas:new-employee", handler);
  }, []);

  const resetDraft = () => setDraft(emptyDraft());
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai_employees"] });

  const handleCreate = async () => {
    if (!draft.name.trim() || !draft.role.trim()) {
      toast.push({ kind: "warn", title: "Missing details", body: "Give your AI employee a name and role." });
      return;
    }
    setSaving(true);
    try {
      const row = await create({ data: {
        name: draft.name,
        role: draft.role,
        model: draft.model,
        avatar_emoji: draft.emoji,
        system_prompt: draft.prompt || undefined,
        greeting: draft.greeting || undefined,
        language: draft.language,
        temperature: draft.temperature,
        top_p: draft.top_p,
        max_tokens: draft.max_tokens,
        escalate_to_human: draft.escalate_to_human,
        use_knowledge: draft.use_knowledge,
        use_products: draft.use_products,
      }});
      await invalidate();
      setAddOpen(false);
      resetDraft();
      toast.push({ kind: "success", title: `${row.name} is live`, body: "Ready to take conversations in the Playground." });
    } catch (e) {
      toast.push({ kind: "warn", title: "Could not create", body: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (emp: AiEmployeeRow) => {
    const next = emp.status === "active" ? "paused" : "active";
    try {
      await update({ data: { id: emp.id, status: next } });
      await invalidate();
      toast.push({ kind: "info", title: `${emp.name} ${next === "active" ? "resumed" : "paused"}` });
    } catch (e) {
      toast.push({ kind: "warn", title: "Update failed", body: e instanceof Error ? e.message : String(e) });
    }
  };

  const remove = async (e: AiEmployeeRow) => {
    const ok = await ask({ title: `Delete ${e.name}?`, body: "This removes the AI employee permanently.", danger: true });
    if (!ok) return;
    try {
      await del({ data: { id: e.id } });
      await invalidate();
      toast.push({ kind: "success", title: `${e.name} deleted` });
    } catch (err) {
      toast.push({ kind: "warn", title: "Delete failed", body: err instanceof Error ? err.message : String(err) });
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await update({ data: {
        id: editing.id,
        name: editing.name,
        role: editing.role,
        model: editing.model,
        system_prompt: editing.system_prompt,
        greeting: editing.greeting,
        language: editing.language,
        temperature: editing.temperature,
        top_p: editing.top_p,
        max_tokens: editing.max_tokens,
        escalate_to_human: editing.escalate_to_human,
        use_knowledge: editing.use_knowledge,
        use_products: editing.use_products,
      }});
      await invalidate();
      toast.push({ kind: "success", title: `${editing.name} updated` });
      setEditing(null);
    } catch (e) {
      toast.push({ kind: "warn", title: "Update failed", body: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  // Real team stats
  const teamStats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === "active").length;
    const paused = employees.filter((e) => e.status === "paused").length;
    const totalConvos = employees.reduce((s, e) => s + (e.convos ?? 0), 0);
    return { total, active, paused, totalConvos };
  }, [employees]);

  return (
    <div>
      <PageHeader
        eyebrow={t("emp.eyebrow")}
        title={t("emp.title")}
        description={t("emp.desc")}
        actions={
          <PrimaryButton onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> {t("emp.new")}
          </PrimaryButton>
        }
      />

      <HelpNote>
        <b>AI employees</b> are the personalities Atlas uses to reply to your customers. Each one has its own name, role,
        model, tone (temperature), preferred language, and knowledge scope. Pause an employee to stop them from replying;
        resume anytime. Delete removes them permanently.
      </HelpNote>

      {/* Real team stats replaces the mock "Aurora recommends / 94.2 CSAT" cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Users className="h-4 w-4" />} label="Team size" value={teamStats.total.toString()} hint="Total employees" />
        <StatTile icon={<Activity className="h-4 w-4" />} label="Active" value={teamStats.active.toString()} hint="Replying now" tone="emerald" />
        <StatTile icon={<Pause className="h-4 w-4" />} label="Paused" value={teamStats.paused.toString()} hint="Not replying" tone="muted" />
        <StatTile icon={<MessageSquare className="h-4 w-4" />} label="Conversations" value={teamStats.totalConvos.toLocaleString()} hint="Handled by team" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && (
          <Panel className="md:col-span-2 xl:col-span-3 flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your team…
          </Panel>
        )}
        {!isLoading && employees.length === 0 && (
          <Panel className="md:col-span-2 xl:col-span-3 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary"><Bot className="h-6 w-6" /></div>
            <div className="font-display text-lg font-semibold">No AI employees yet</div>
            <div className="mt-1 text-sm text-muted-foreground">Create your first one — Atlas will bring them online instantly.</div>
            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> {t("emp.new")}</PrimaryButton>
            </div>
          </Panel>
        )}
        {employees.map((e) => (
          <Panel key={e.id} className="group transition hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-2xl">
                {e.avatar_emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-lg font-semibold">{e.name}</div>
                  <Chip tone={toneFor(e.status)}>
                    {t("common." + e.status, e.status)}
                  </Chip>
                </div>
                <div className="text-xs text-muted-foreground">{e.role}</div>
                <div className="mt-1 text-[11px] text-muted-foreground/70">{e.model}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
              <div title="Conversations this employee has handled">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> {t("emp.convos")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{e.convos.toLocaleString()}</div>
              </div>
              <div title="Reply creativity — lower is more predictable">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> Tone</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{Number(e.temperature).toFixed(1)}</div>
              </div>
              <div title="Preferred reply language">
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Info className="h-3 w-3" /> Lang</div>
                <div className="mt-0.5 font-display text-sm font-semibold uppercase">{e.language ?? "auto"}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
              <button onClick={() => toggleStatus(e)} title={e.status === "active" ? "Pause replies" : "Resume replies"}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                {e.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
              </button>
              <button onClick={() => setEditing(e)} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                <Settings2 className="h-3 w-3" /> Configure
              </button>
              <button onClick={() => remove(e)} title="Delete permanently"
                className="ml-auto rounded-md p-1 text-rose-300 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); resetDraft(); }}
        title="Create AI employee"
        description="Give them a personality, pick a model, and Atlas will train them on your knowledge base."
        footer={
          <>
            <GhostButton onClick={() => { setAddOpen(false); resetDraft(); }}>Cancel</GhostButton>
            <PrimaryButton onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </PrimaryButton>
          </>
        }
      >
        <EmployeeForm
          value={draft}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
          modelOptions={modelOptions}
          onTest={runTestCustom}
          testing={testingCM}
        />
      </Modal>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Configure ${editing.name}`}
          footer={
            <>
              <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={saveEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
              </PrimaryButton>
            </>
          }
        >
          <EmployeeForm
            value={{
              name: editing.name,
              role: editing.role,
              model: editing.model,
              emoji: editing.avatar_emoji,
              prompt: editing.system_prompt ?? "",
              greeting: editing.greeting ?? "",
              language: editing.language ?? "auto",
              temperature: Number(editing.temperature ?? 0.7),
              top_p: Number(editing.top_p ?? 0.9),
              max_tokens: Number(editing.max_tokens ?? 1024),
              escalate_to_human: !!editing.escalate_to_human,
              use_knowledge: !!editing.use_knowledge,
              use_products: !!editing.use_products,
            }}
            onChange={(patch) =>
              setEditing({
                ...editing,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.role !== undefined ? { role: patch.role } : {}),
                ...(patch.model !== undefined ? { model: patch.model } : {}),
                ...(patch.emoji !== undefined ? { avatar_emoji: patch.emoji } : {}),
                ...(patch.prompt !== undefined ? { system_prompt: patch.prompt } : {}),
                ...(patch.greeting !== undefined ? { greeting: patch.greeting } : {}),
                ...(patch.language !== undefined ? { language: patch.language } : {}),
                ...(patch.temperature !== undefined ? { temperature: patch.temperature } : {}),
                ...(patch.top_p !== undefined ? { top_p: patch.top_p } : {}),
                ...(patch.max_tokens !== undefined ? { max_tokens: patch.max_tokens } : {}),
                ...(patch.escalate_to_human !== undefined ? { escalate_to_human: patch.escalate_to_human } : {}),
                ...(patch.use_knowledge !== undefined ? { use_knowledge: patch.use_knowledge } : {}),
                ...(patch.use_products !== undefined ? { use_products: patch.use_products } : {}),
              })
            }
            modelOptions={modelOptions}
            onTest={runTestCustom}
            testing={testingCM}
            hideEmoji
          />
        </Modal>
      )}

      {confirmNode}
    </div>
  );
}

function StatTile({ icon, label, value, hint, tone = "default" }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "default" | "emerald" | "muted" }) {
  const cls = tone === "emerald" ? "text-emerald-300" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <Panel className="!p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className={"mt-1 font-display text-2xl font-bold " + cls}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Panel>
  );
}

type ModelOption = { id: string; label: string; group: string; status: "ok" | "fail" | "untested"; custom: boolean };

function EmployeeForm({
  value, onChange, modelOptions, onTest, testing, hideEmoji,
}: {
  value: DraftConfig;
  onChange: (patch: Partial<DraftConfig>) => void;
  modelOptions: ModelOption[];
  onTest: (id: string) => void;
  testing: string | null;
  hideEmoji?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField label="Name" value={value.name} onChange={(v) => onChange({ name: v })} placeholder="e.g. Nova" />
      <TextField label="Role" value={value.role} onChange={(v) => onChange({ role: v })} placeholder="Sales lead" />

      <ModelPicker
        value={value.model}
        onChange={(v) => onChange({ model: v })}
        options={modelOptions}
        onTest={onTest}
        testing={testing}
      />

      <label className="block">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Reply language</div>
        <select value={value.language} onChange={(e) => onChange({ language: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50">
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </label>

      {!hideEmoji && (
        <label className="block md:col-span-2">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Avatar</div>
          <div className="flex flex-wrap gap-1.5">
            {EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => onChange({ emoji: e })}
                className={"flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition " +
                  (value.emoji === e ? "border-primary/60 bg-primary/10 scale-110" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                {e}
              </button>
            ))}
          </div>
        </label>
      )}

      <label className="block md:col-span-2">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">Opening greeting (optional)</div>
        <input value={value.greeting} onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder="Hi 👋 I'm Nova from Atlas. How can I help you today?"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
        <div className="mt-1 text-[11px] text-muted-foreground">Sent as the first reply on new conversations.</div>
      </label>

      <label className="block md:col-span-2">
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">System prompt (personality & rules)</div>
        <textarea value={value.prompt} onChange={(e) => onChange({ prompt: e.target.value })}
          rows={4} placeholder="You are a warm, concise sales concierge for Atlas. Always answer in the customer's language."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
        <div className="mt-1 text-[11px] text-muted-foreground">Tell the AI who it is, what to do, and what to avoid.</div>
      </label>

      <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Advanced controls</div>
        <div className="grid gap-4 md:grid-cols-3">
          <SliderField label="Tone (temperature)" value={value.temperature} min={0} max={1.5} step={0.1}
            onChange={(v) => onChange({ temperature: v })}
            hint="0 = strict facts · 1 = warm & creative" />
          <SliderField label="Diversity (top-p)" value={value.top_p} min={0.1} max={1} step={0.05}
            onChange={(v) => onChange({ top_p: v })}
            hint="Higher = more variety in phrasing" />
          <NumberField label="Max reply length" value={value.max_tokens} min={128} max={4096} step={64}
            onChange={(v) => onChange({ max_tokens: v })}
            hint="Approx. tokens per reply (~4 chars each)" />
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Toggle
            label="Use knowledge base"
            hint="Answer with your uploaded docs & sites"
            checked={value.use_knowledge}
            onChange={(v) => onChange({ use_knowledge: v })}
          />
          <Toggle
            label="Use product catalog"
            hint="Suggest & confirm real products"
            checked={value.use_products}
            onChange={(v) => onChange({ use_products: v })}
          />
          <Toggle
            label="Escalate to human"
            hint="Hand off when unsure or asked"
            checked={value.escalate_to_human}
            onChange={(v) => onChange({ escalate_to_human: v })}
          />
        </div>
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span><span className="font-mono text-foreground">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary" />
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

function NumberField({ label, value, min, max, step, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 hover:bg-white/10">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-primary" />
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function ModelPicker({
  value, onChange, options, onTest, testing,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ModelOption[];
  onTest: (id: string) => void;
  testing: string | null;
}) {
  const selected = options.find((o) => o.id === value);
  const groups = Array.from(new Set(options.map((o) => o.group)));
  const isCustom = selected?.custom;
  const customId = isCustom ? value.slice(7) : null;
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Model</span>
        {selected && (
          <span className="flex items-center gap-1.5">
            {selected.status === "ok" && <Chip tone="emerald"><CheckCircle2 className="h-3 w-3" /> Connected</Chip>}
            {selected.status === "fail" && <Chip tone="amber"><AlertTriangle className="h-3 w-3" /> Failing</Chip>}
            {selected.status === "untested" && <Chip tone="muted">Untested</Chip>}
            {isCustom && customId && (
              <button type="button" onClick={() => onTest(value)} disabled={testing === customId}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] hover:bg-white/10 disabled:opacity-50">
                {testing === customId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test connection"}
              </button>
            )}
          </span>
        )}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50">
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {options.filter((o) => o.group === g).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}{o.custom ? ` ${o.status === "ok" ? "✓" : o.status === "fail" ? "⚠" : "•"}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {options.filter((o) => o.custom).length === 0 && (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Add OpenAI-compatible endpoints (OpenRouter, Gemini, self-hosted) in <a href="/integrations" className="text-primary hover:underline">Integrations</a>.
        </div>
      )}
    </label>
  );
}
