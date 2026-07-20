import { useState } from "react";
import { useToast } from "./_shared";
import { Send, Bot, User, Sparkles, RotateCcw, Sliders, Plus, Trash2, Cpu, Eye, EyeOff } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";
import { useT } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

const seed: Msg[] = [
  { role: "assistant", content: "Hey! I'm Nova. Ask me anything about our pricing, integrations or onboarding flow." },
  { role: "user", content: "How long does it take to spin up a new AI employee?" },
  { role: "assistant", content: "Under 3 minutes. Pick a template, connect your knowledge base, and I'll train against your last 30 days of conversations automatically." },
];

export function Playground() {
  const t = useT();
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [customModels, setCustomModels] = useState<{ id: string; label: string; base: string; model: string; key: string; revealed: boolean }[]>([
    { id: "m1", label: "My Llama (local)", base: "http://localhost:11434/v1", model: "llama-3.1-70b", key: "sk-local", revealed: false },
  ]);
  const [selected, setSelected] = useState<string>("Claude Sonnet 4.5");
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ label: "", base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" });

  const addModel = () => {
    if (!draft.label.trim() || !draft.model.trim()) { toast.push({ kind: "warn", title: "Name and model id required" }); return; }
    setCustomModels((m) => [...m, { id: Math.random().toString(36).slice(2), ...draft, revealed: false }]);
    setDraft({ label: "", base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" });
    setShowAdd(false);
    toast.push({ kind: "success", title: "Model added", body: "Available for selection." });
  };

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: input },
      { role: "assistant", content: "(demo) I'd normally reply here using your selected model and prompt." },
    ]);
    setInput("");
  };

  const resetChat = () => { setMessages(seed); toast.push({ kind: "info", title: "Conversation reset" }); };

  return (
    <div>
      <PageHeader
        eyebrow={t("pg.eyebrow")}
        title={t("pg.title")}
        description={t("pg.desc")}
        actions={
          <button onClick={resetChat} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
            <RotateCcw className="h-4 w-4" /> {t("common.reset")}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Panel className="flex h-[640px] flex-col p-0">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Bot className="h-4 w-4" /></div>
            <div className="text-sm font-semibold">Nova · Sales Lead</div>
            <Chip tone="emerald">{t("common.live")}</Chip>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
            {messages.map((m, i) => (
              <div key={i} className={"flex gap-3 " + (m.role === "user" ? "flex-row-reverse" : "")}>
                <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + (m.role === "user" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary")}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={"max-w-[75%] rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/5 text-foreground")}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={2}
                placeholder={t("pg.ask")}
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sliders className="h-4 w-4 text-primary" /> {t("pg.model")}</div>
              <button onClick={() => setShowAdd((s) => !s)} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                <Plus className="h-3 w-3" /> {t("pg.add")}
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {["Claude Sonnet 4.5", "GPT-5", "Gemini 2.5 Pro"].map((m) => (
                <label key={m} className={"flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 " + (selected === m ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/5 hover:border-primary/30")}>
                  <span>{m}</span>
                  <input type="radio" name="model" checked={selected === m} onChange={() => setSelected(m)} className="accent-primary" />
                </label>
              ))}
              {customModels.length > 0 && (
                <div className="mt-3 mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Cpu className="h-3 w-3" /> {t("pg.custom_endpoints")}
                </div>
              )}
              {customModels.map((m) => (
                <div key={m.id} className={"rounded-lg border px-3 py-2 " + (selected === m.label ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/5")}>
                  <label className="flex cursor-pointer items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.label}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{m.model} · {m.base}</div>
                    </div>
                    <input type="radio" name="model" checked={selected === m.label} onChange={() => setSelected(m.label)} className="accent-primary" />
                  </label>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="font-mono">{m.revealed ? m.key : "•".repeat(Math.min(m.key.length, 12))}</span>
                    <button onClick={() => setCustomModels((cm) => cm.map((x) => x.id === m.id ? { ...x, revealed: !x.revealed } : x))} className="rounded p-0.5 hover:bg-white/10">
                      {m.revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                    <button onClick={() => setCustomModels((cm) => cm.filter((x) => x.id !== m.id))} className="ml-auto rounded p-0.5 text-rose-300 hover:bg-rose-500/10">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {showAdd && (
              <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-background/40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("pg.add_model")}</div>
                <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={t("pg.display_name")} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/50" />
                <input value={draft.base}  onChange={(e) => setDraft({ ...draft, base:  e.target.value })} placeholder={t("pg.base_url")} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/50" />
                <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder={t("pg.model_id")} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/50" />
                <input value={draft.key} type="password" onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder={t("pg.api_key")} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-primary/50" />
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowAdd(false)} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">{t("common.cancel")}</button>
                  <button onClick={addModel} className="rounded-md bg-gradient-to-r from-primary to-accent px-2 py-1 text-[11px] font-semibold text-primary-foreground">{t("pg.add_btn")}</button>
                </div>
                <div className="text-[10px] text-muted-foreground">{t("pg.add_model_hint")}</div>
              </div>
            )}
          </Panel>
          <Panel>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> {t("pg.params")}</div>
            <div className="space-y-4 text-xs">
              {[[t("pg.temperature"), "0.7"], [t("pg.top_p"), "0.9"], [t("pg.max_tokens"), "2048"]].map(([label, val]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between"><span className="text-muted-foreground">{label}</span><span>{val}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-accent" /></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}