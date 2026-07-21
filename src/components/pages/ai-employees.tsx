import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Plus, Sparkles, MessageSquare, TrendingUp, Zap, Play, Pause, Trash2, Settings2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
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

  const currentModelStatus = (modelId: string) => modelOptions.find((m) => m.id === modelId)?.status ?? "ok";

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AiEmployeeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", role: "", model: MODELS[0].id, emoji: EMOJI[0], prompt: "" });

  // Listen for "New employee" from the top bar
  useEffect(() => {
    const handler = () => setAddOpen(true);
    window.addEventListener("atlas:new-employee", handler);
    return () => window.removeEventListener("atlas:new-employee", handler);
  }, []);

  const resetDraft = () => setDraft({ name: "", role: "", model: MODELS[0].id, emoji: EMOJI[0], prompt: "" });
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

  const applyRec = () => toast.push({ kind: "success", title: "Recommendation applied", body: "Added an Order-Tracker AI employee to your team." });

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{t("emp.recommend_title")}</div>
              <div className="text-xs text-muted-foreground">{t("emp.recommend_desc")}</div>
            </div>
            <button onClick={applyRec} className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/5">{t("common.apply")}</button>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("emp.team_csat")}</div>
              <div className="mt-1 font-display text-3xl font-bold">94.2</div>
            </div>
            <Chip tone="emerald"><TrendingUp className="h-3 w-3" /> +2.1</Chip>
          </div>
        </Panel>
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
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> {t("emp.convos")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">0</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> {t("emp.csat")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">—</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Bot className="h-3 w-3" /> {t("emp.skills")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">—</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
              <button onClick={() => toggleStatus(e)} title={e.status === "active" ? "Pause" : "Resume"}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                {e.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
              </button>
              <button onClick={() => setEditing(e)} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                <Settings2 className="h-3 w-3" /> Configure
              </button>
              <button onClick={() => remove(e)} className="ml-auto rounded-md p-1 text-rose-300 hover:bg-rose-500/10">
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
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="e.g. Nova" />
          <TextField label="Role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} placeholder="Sales lead" />
          <ModelPicker
            value={draft.model}
            onChange={(v) => setDraft({ ...draft, model: v })}
            options={modelOptions}
            onTest={runTestCustom}
            testing={testingCM}
          />

          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Avatar</div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI.map((e) => (
                <button key={e} type="button" onClick={() => setDraft({ ...draft, emoji: e })}
                  className={"flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition " +
                    (draft.emoji === e ? "border-primary/60 bg-primary/10 scale-110" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                  {e}
                </button>
              ))}
            </div>
          </label>
          <label className="block md:col-span-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">System prompt (optional)</div>
            <textarea value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              rows={4} placeholder="You are a warm, concise sales concierge for Atlas. Always answer in the customer's language."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
          </label>
        </div>
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
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField label="Role" value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} />
            <div className="md:col-span-2">
              <ModelPicker
                value={editing.model}
                onChange={(v) => setEditing({ ...editing, model: v })}
                options={modelOptions}
                onTest={runTestCustom}
                testing={testingCM}
              />
            </div>

            <label className="block md:col-span-2">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">System prompt</div>
              <textarea value={editing.system_prompt ?? ""} onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
                rows={4} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </label>
          </div>
        </Modal>
      )}

      {confirmNode}
    </div>
  );
}