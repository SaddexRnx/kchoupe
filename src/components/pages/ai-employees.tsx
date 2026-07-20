import { useEffect, useState } from "react";
import { Bot, Plus, Sparkles, MessageSquare, TrendingUp, Zap, Play, Pause, Trash2, Settings2 } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
import { useT } from "@/lib/i18n";

type Emp = { id: string; name: string; role: string; model: string; status: "active" | "training" | "paused"; convos: number; csat: number; tone: "violet" | "emerald" | "amber" | "muted"; emoji: string };

const seedEmployees: Emp[] = [
  { id: "e1", name: "Nova",  role: "Sales Lead",           model: "Claude Sonnet 4.5", status: "active",   convos: 1284, csat: 97, tone: "violet",  emoji: "🚀" },
  { id: "e2", name: "Atlas", role: "Support Concierge",    model: "GPT-5",             status: "active",   convos: 892,  csat: 94, tone: "emerald", emoji: "🛎️" },
  { id: "e3", name: "Sage",  role: "Onboarding Coach",     model: "Gemini 2.5 Pro",    status: "training", convos: 341,  csat: 91, tone: "amber",   emoji: "🌿" },
  { id: "e4", name: "Echo",  role: "Marketing Analyst",    model: "Claude Opus",       status: "active",   convos: 512,  csat: 96, tone: "violet",  emoji: "📡" },
  { id: "e5", name: "Orbit", role: "Product Advisor",      model: "GPT-5 Mini",        status: "paused",   convos: 128,  csat: 89, tone: "muted",   emoji: "🪐" },
  { id: "e6", name: "Lumen", role: "Retention Specialist", model: "Claude Sonnet 4.5", status: "active",   convos: 678,  csat: 98, tone: "emerald", emoji: "💡" },
];

const EMOJI = ["🚀", "🛎️", "🌿", "📡", "🪐", "💡", "🤖", "🧠", "✨", "🎯", "📚", "🛍️"];
const MODELS = ["Claude Sonnet 4.5", "GPT-5", "GPT-5 Mini", "Gemini 2.5 Pro", "Claude Opus", "Groq Llama 4"];

export function AiEmployees() {
  const t = useT();
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const [employees, setEmployees] = useState<Emp[]>(seedEmployees);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Emp | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "", model: MODELS[0], emoji: EMOJI[0], prompt: "" });

  // Listen for "New employee" from the top bar
  useEffect(() => {
    const handler = () => setAddOpen(true);
    window.addEventListener("atlas:new-employee", handler);
    return () => window.removeEventListener("atlas:new-employee", handler);
  }, []);

  const resetDraft = () => setDraft({ name: "", role: "", model: MODELS[0], emoji: EMOJI[0], prompt: "" });

  const create = () => {
    if (!draft.name.trim() || !draft.role.trim()) {
      toast.push({ kind: "warn", title: "Missing details", body: "Give your AI employee a name and role." });
      return;
    }
    const emp: Emp = {
      id: Math.random().toString(36).slice(2),
      name: draft.name.trim(),
      role: draft.role.trim(),
      model: draft.model,
      status: "training",
      convos: 0,
      csat: 0,
      tone: "amber",
      emoji: draft.emoji,
    };
    setEmployees((e) => [emp, ...e]);
    setAddOpen(false);
    resetDraft();
    toast.push({ kind: "success", title: `${emp.name} added`, body: "Training on your knowledge base — takes ~3 minutes." });
    // Simulate training completion
    setTimeout(() => {
      setEmployees((list) => list.map((x) => x.id === emp.id ? { ...x, status: "active", tone: "emerald" } : x));
      toast.push({ kind: "success", title: `${emp.name} is live`, body: "Training complete — ready to take conversations." });
    }, 3200);
  };

  const toggleStatus = (id: string) => {
    setEmployees((list) => list.map((x) => {
      if (x.id !== id) return x;
      const next = x.status === "active" ? "paused" : "active";
      toast.push({ kind: "info", title: `${x.name} ${next === "active" ? "resumed" : "paused"}` });
      return { ...x, status: next, tone: next === "active" ? "emerald" : "muted" };
    }));
  };

  const remove = async (e: Emp) => {
    const ok = await ask({ title: `Delete ${e.name}?`, body: "This removes the AI employee and its history from the mock.", danger: true });
    if (!ok) return;
    setEmployees((list) => list.filter((x) => x.id !== e.id));
    toast.push({ kind: "success", title: `${e.name} deleted` });
  };

  const saveEdit = () => {
    if (!editing) return;
    setEmployees((list) => list.map((x) => x.id === editing.id ? editing : x));
    toast.push({ kind: "success", title: `${editing.name} updated` });
    setEditing(null);
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
        {employees.map((e) => (
          <Panel key={e.id} className="group transition hover:border-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-2xl">
                {e.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-lg font-semibold">{e.name}</div>
                  <Chip tone={e.status === "active" ? "emerald" : e.status === "training" ? "amber" : "muted"}>
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
                <div className="mt-0.5 font-display text-lg font-semibold">{e.convos}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> {t("emp.csat")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">{e.csat}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Bot className="h-3 w-3" /> {t("emp.skills")}</div>
                <div className="mt-0.5 font-display text-lg font-semibold">7</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
              <button onClick={() => toggleStatus(e.id)} title={e.status === "active" ? "Pause" : "Resume"}
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
            <PrimaryButton onClick={create}><Plus className="h-4 w-4" /> Create & train</PrimaryButton>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="e.g. Nova" />
          <TextField label="Role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} placeholder="Sales lead" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Model</div>
            <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/50">
              {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
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
              <PrimaryButton onClick={saveEdit}>Save changes</PrimaryButton>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField label="Role" value={editing.role} onChange={(v) => setEditing({ ...editing, role: v })} />
            <label className="block md:col-span-2">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Model</div>
              <select value={editing.model} onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
        </Modal>
      )}

      {confirmNode}
    </div>
  );
}