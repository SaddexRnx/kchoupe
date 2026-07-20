import { useMemo, useState } from "react";
import { MessageSquare, Search, Filter, ChevronRight, Send, X, Check, CheckCheck } from "lucide-react";
import { PageHeader, Panel, Chip, useToast } from "./_shared";
import { useT } from "@/lib/i18n";

type Convo = { id: string; user: string; employee: string; last: string; time: string; status: "won" | "open" | "risk" | "resolved"; unread: number; thread: { role: "user" | "agent"; text: string }[] };

const seedConvos: Convo[] = [
  { id: "c1", user: "sarah@northwind.io", employee: "Nova",  last: "Perfect, I'll upgrade to the team plan.", time: "2m",  status: "won",      unread: 2, thread: [
    { role: "user", text: "Hey, can I upgrade from Starter?" },
    { role: "agent", text: "Absolutely — Team is $99/mo and unlocks 5 AI employees. Want me to switch you now?" },
    { role: "user", text: "Perfect, I'll upgrade to the team plan." },
  ]},
  { id: "c2", user: "mike@acme.co",       employee: "Atlas", last: "Can you send the invoice to billing@?",   time: "8m",  status: "open",     unread: 0, thread: [
    { role: "user", text: "Can you send the invoice to billing@?" },
  ]},
  { id: "c3", user: "lea@figment.dev",    employee: "Sage",  last: "How do I add teammates?",                 time: "14m", status: "open",     unread: 1, thread: [{ role: "user", text: "How do I add teammates?" }]},
  { id: "c4", user: "jon@paperclip.ai",   employee: "Nova",  last: "Thanks — booked for Thursday.",           time: "22m", status: "won",      unread: 0, thread: [{ role: "user", text: "Thanks — booked for Thursday." }]},
  { id: "c5", user: "amy@vertex.io",      employee: "Lumen", last: "Not sure this fits us tbh.",              time: "38m", status: "risk",     unread: 0, thread: [{ role: "user", text: "Not sure this fits us tbh." }]},
  { id: "c6", user: "kai@bloom.co",       employee: "Echo",  last: "Loved the demo — sending to CTO.",        time: "1h",  status: "open",     unread: 0, thread: [{ role: "user", text: "Loved the demo — sending to CTO." }]},
  { id: "c7", user: "raj@lumen.dev",      employee: "Atlas", last: "Refund processed, thanks.",               time: "2h",  status: "resolved", unread: 0, thread: [{ role: "user", text: "Refund processed, thanks." }]},
];

const tones = { won: "emerald", open: "violet", risk: "rose", resolved: "muted" } as const;
const statusKey = { won: "common.won", open: "common.open", risk: "common.risk", resolved: "common.resolved" } as const;

export function Conversations() {
  const t = useT();
  const toast = useToast();
  const [convos, setConvos] = useState<Convo[]>(seedConvos);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const open = convos.find((c) => c.id === openId) || null;

  const filtered = useMemo(() => convos.filter((c) =>
    (filter === "all" || c.status === filter) &&
    (q === "" || c.user.toLowerCase().includes(q.toLowerCase()) || c.last.toLowerCase().includes(q.toLowerCase()))
  ), [convos, q, filter]);

  const openConvo = (c: Convo) => {
    setOpenId(c.id);
    setConvos((list) => list.map((x) => x.id === c.id ? { ...x, unread: 0 } : x));
  };

  const send = () => {
    if (!open || !reply.trim()) return;
    setConvos((list) => list.map((x) => x.id === open.id ? { ...x, thread: [...x.thread, { role: "agent", text: reply }, { role: "user", text: "Thanks!" }], last: "Thanks!" } : x));
    setReply("");
    toast.push({ kind: "success", title: "Reply sent" });
  };

  const markResolved = (c: Convo) => {
    setConvos((list) => list.map((x) => x.id === c.id ? { ...x, status: "resolved" } : x));
    toast.push({ kind: "success", title: `${c.user} marked resolved` });
    setOpenId(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("conv.eyebrow")}
        title={t("conv.title")}
        description={t("conv.desc")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Panel className="p-0">
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("conv.search")} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="risk">Risk</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="divide-y divide-white/5">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => openConvo(c)} className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-sm font-bold text-primary">
                  {c.user[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{c.user}</div>
                    <Chip tone={tones[c.status as keyof typeof tones]}>{t(statusKey[c.status as keyof typeof statusKey])}</Chip>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    <span className="text-primary/80">{c.employee}</span> · {c.last}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{c.unread}</span>}
                  <span>{c.time}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No conversations match your filters.</div>}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> {t("common.today")}</div>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[[t("common.active"), 24], [t("common.won"), 8], [t("common.risk"), 2], [t("common.resolved"), 41]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="font-display text-2xl font-bold">{v}</div>
                  <div className="text-[11px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="mb-3 text-sm font-semibold">{t("conv.top_performing")}</div>
            <div className="space-y-3 text-sm">
              {[["Nova", 47], ["Lumen", 32], ["Atlas", 28]].map(([n, v]) => (
                <div key={n as string}>
                  <div className="mb-1 flex justify-between"><span>{n}</span><span className="text-muted-foreground">{v}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(v as number) * 2}%` }} /></div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up" onClick={() => setOpenId(null)} />
          <div className="glass-panel animate-drawer-in relative flex h-full w-full max-w-lg flex-col rounded-none border-l border-white/10 p-4 sm:p-6">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 font-bold text-primary">{open.user[0].toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-semibold">{open.user}</div>
                <div className="text-xs text-muted-foreground">Handled by <span className="text-primary">{open.employee}</span></div>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
              {open.thread.map((m, i) => (
                <div key={i} className={"flex " + (m.role === "agent" ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[80%] rounded-2xl px-3 py-2 text-sm " + (m.role === "agent" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-white/5")}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Type a reply…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" />
              <button onClick={send} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground hover:brightness-110">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { toast.push({ kind: "info", title: "Assigned to a teammate" }); setOpenId(null); }} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"><Check className="mr-1 inline h-3 w-3" /> Assign</button>
              <button onClick={() => markResolved(open)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"><CheckCheck className="mr-1 inline h-3 w-3" /> Mark resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}