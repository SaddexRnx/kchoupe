import { useState } from "react";
import { Send, Bot, User, Sparkles, RotateCcw, Sliders } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

type Msg = { role: "user" | "assistant"; content: string };

const seed: Msg[] = [
  { role: "assistant", content: "Hey! I'm Nova. Ask me anything about our pricing, integrations or onboarding flow." },
  { role: "user", content: "How long does it take to spin up a new AI employee?" },
  { role: "assistant", content: "Under 3 minutes. Pick a template, connect your knowledge base, and I'll train against your last 30 days of conversations automatically." },
];

export function Playground() {
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: input },
      { role: "assistant", content: "(demo) I'd normally reply here using your selected model and prompt." },
    ]);
    setInput("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Playground"
        title="Prompt Playground"
        description="Rapidly iterate on prompts, tools and personas before you promote to production."
        actions={
          <button className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Panel className="flex h-[640px] flex-col p-0">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Bot className="h-4 w-4" /></div>
            <div className="text-sm font-semibold">Nova · Sales Lead</div>
            <Chip tone="emerald">live</Chip>
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
                placeholder="Ask Nova something…"
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
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sliders className="h-4 w-4 text-primary" /> Model</div>
            <div className="space-y-2 text-sm">
              {["Claude Sonnet 4.5", "GPT-5", "Gemini 2.5 Pro"].map((m, i) => (
                <label key={m} className="flex cursor-pointer items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 hover:border-primary/30">
                  <span>{m}</span>
                  <input type="radio" name="model" defaultChecked={i === 0} className="accent-primary" />
                </label>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Parameters</div>
            <div className="space-y-4 text-xs">
              {[["Temperature", "0.7"], ["Top P", "0.9"], ["Max tokens", "2048"]].map(([label, val]) => (
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