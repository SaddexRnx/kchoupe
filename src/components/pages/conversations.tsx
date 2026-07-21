import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Search, Filter, ChevronRight, Send, X, Check, CheckCheck, Plus, Loader2 } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast } from "./_shared";
import { useT } from "@/lib/i18n";
import {
  listConversations, listMessages, createConversation, sendReply, updateConversationStatus,
  type InboxConvo,
} from "@/lib/inbox.functions";
import { listProducts } from "@/lib/products.functions";

const tones = { won: "emerald", open: "violet", risk: "rose", resolved: "muted" } as const;
const statusKey = { won: "common.won", open: "common.open", risk: "common.risk", resolved: "common.resolved" } as const;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export function Conversations() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const listMsg = useServerFn(listMessages);
  const createConv = useServerFn(createConversation);
  const send = useServerFn(sendReply);
  const setStatus = useServerFn(updateConversationStatus);

  const { data: convos = [], isLoading } = useQuery({ queryKey: ["inbox_conversations"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["inbox_conversations"] });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDraft, setNewDraft] = useState({ external_user: "", channel: "web", first_message: "" });

  const open = convos.find((c) => c.id === openId) || null;
  const { data: messages = [] } = useQuery({
    queryKey: ["inbox_messages", openId],
    queryFn: () => listMsg({ data: { conversation_id: openId! } }),
    enabled: !!openId,
  });

  const filtered = useMemo(() => convos.filter((c) =>
    (filter === "all" || c.status === filter) &&
    (q === "" || c.external_user.toLowerCase().includes(q.toLowerCase()) || (c.last_message ?? "").toLowerCase().includes(q.toLowerCase()))
  ), [convos, q, filter]);

  const openConvo = (c: InboxConvo) => {
    setOpenId(c.id);
  };

  const doSend = async () => {
    if (!open || !reply.trim()) return;
    setSending(true);
    try {
      await send({ data: { conversation_id: open.id, body: reply.trim() } });
      setReply("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["inbox_messages", open.id] }),
        invalidate(),
      ]);
      toast.push({ kind: "success", title: "Reply sent" });
    } catch (e: any) { toast.push({ kind: "error", title: "Send failed", body: e?.message }); }
    finally { setSending(false); }
  };

  const markResolved = async (c: InboxConvo) => {
    try {
      await setStatus({ data: { id: c.id, status: "resolved" } });
      await invalidate();
      toast.push({ kind: "success", title: `${c.external_user} marked resolved` });
      setOpenId(null);
    } catch (e: any) { toast.push({ kind: "error", title: "Update failed", body: e?.message }); }
  };

  const handleCreate = async () => {
    if (!newDraft.external_user.trim()) {
      toast.push({ kind: "warn", title: "Contact required" });
      return;
    }
    setSaving(true);
    try {
      await createConv({ data: { external_user: newDraft.external_user.trim(), channel: newDraft.channel, first_message: newDraft.first_message.trim() || undefined } });
      await invalidate();
      setAddOpen(false);
      setNewDraft({ external_user: "", channel: "web", first_message: "" });
      toast.push({ kind: "success", title: "Conversation started" });
    } catch (e: any) { toast.push({ kind: "error", title: "Failed", body: e?.message }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("conv.eyebrow")}
        title={t("conv.title")}
        description={t("conv.desc")}
        actions={<PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New conversation</PrimaryButton>}
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
                  {c.external_user[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{c.external_user}</div>
                    <Chip tone={tones[c.status as keyof typeof tones]}>{t(statusKey[c.status as keyof typeof statusKey])}</Chip>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.ai_employee_name && <span className="text-primary/80">{c.ai_employee_name} · </span>}{c.last_message ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">{c.unread_count}</span>}
                  <span>{ago(c.updated_at)}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </div>
              </div>
            ))}
            {filtered.length === 0 && !isLoading && <div className="p-10 text-center text-sm text-muted-foreground">No conversations yet.</div>}
            {isLoading && <div className="p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> {t("common.today")}</div>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                [t("common.active"), convos.filter((c) => c.status === "open").length],
                [t("common.won"), convos.filter((c) => c.status === "won").length],
                [t("common.risk"), convos.filter((c) => c.status === "risk").length],
                [t("common.resolved"), convos.filter((c) => c.status === "resolved").length],
              ].map(([l, v]) => (
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
              {(() => {
                const counts = new Map<string, number>();
                convos.forEach((c) => { if (c.ai_employee_name) counts.set(c.ai_employee_name, (counts.get(c.ai_employee_name) ?? 0) + 1); });
                const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
                const max = top[0]?.[1] ?? 1;
                if (top.length === 0) return <div className="text-xs text-muted-foreground">No AI-handled conversations yet.</div>;
                return top.map(([n, v]) => (
                  <div key={n}>
                    <div className="mb-1 flex justify-between"><span>{n}</span><span className="text-muted-foreground">{v}</span></div>
                    <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(v / max) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
          </Panel>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-up" onClick={() => setOpenId(null)} />
          <div className="glass-panel animate-drawer-in relative flex h-full w-full max-w-lg flex-col rounded-none border-l border-white/10 p-4 sm:p-6">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 font-bold text-primary">{open.external_user[0]?.toUpperCase() ?? "?"}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-semibold">{open.external_user}</div>
                <div className="text-xs text-muted-foreground">
                  {open.ai_employee_name ? <>Handled by <span className="text-primary">{open.ai_employee_name}</span></> : `Channel: ${open.channel}`}
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] p-3">
              {messages.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">No messages yet — send the first reply.</div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={"flex " + (m.role === "agent" ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[80%] rounded-2xl px-3 py-2 text-sm " + (m.role === "agent" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-white/5")}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Type a reply…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" />
              <button onClick={doSend} disabled={sending} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground hover:brightness-110 disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { toast.push({ kind: "info", title: "Assigned to a teammate" }); setOpenId(null); }} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"><Check className="mr-1 inline h-3 w-3" /> Assign</button>
              <button onClick={() => markResolved(open)} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30"><CheckCheck className="mr-1 inline h-3 w-3" /> Mark resolved</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New conversation" description="Start a manual conversation from a customer contact."
        footer={<>
          <GhostButton onClick={() => setAddOpen(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </PrimaryButton>
        </>}>
        <div className="grid gap-4">
          <TextField label="Customer / handle" value={newDraft.external_user} onChange={(v) => setNewDraft({ ...newDraft, external_user: v })} placeholder="sara@example.com or @handle" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Channel</div>
            <select value={newDraft.channel} onChange={(e) => setNewDraft({ ...newDraft, channel: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              {["web","whatsapp","instagram","messenger","email","sms"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">First message (optional)</div>
            <textarea value={newDraft.first_message} onChange={(e) => setNewDraft({ ...newDraft, first_message: e.target.value })} rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
          </label>
        </div>
      </Modal>
    </div>
  );
}