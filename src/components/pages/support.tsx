import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Send, Plus, ShieldCheck, Circle, X } from "lucide-react";
import { listMyTickets, createTicket, listTicketMessages, sendTicketMessage, closeTicket } from "@/lib/support.functions";
import { Modal, useToast } from "@/components/pages/_shared";
import { supabase } from "@/integrations/supabase/client";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export function SupportPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const listFn = useServerFn(listMyTickets);
  const createFn = useServerFn(createTicket);

  const { data: tickets = [], isLoading } = useQuery({ queryKey: ["support", "mine"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");

  useEffect(() => {
    if (!selected && tickets.length) setSelected((tickets[0] as any).id);
  }, [tickets, selected]);

  // realtime refresh on ticket updates
  useEffect(() => {
    const ch = supabase
      .channel("support-tickets-mine")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["support"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["support"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const create = useMutation({
    mutationFn: () => createFn({ data: { subject, body, priority } }),
    onSuccess: (r: any) => {
      toast.push({ kind: "success", title: "Ticket opened", body: "Our team will reply shortly." });
      setOpenNew(false); setSubject(""); setBody(""); setPriority("normal");
      qc.invalidateQueries({ queryKey: ["support"] });
      setSelected(r?.id ?? null);
    },
    onError: (e: any) => toast.push({ kind: "error", title: "Could not open ticket", body: e?.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Support</div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Talk to Atlas team</h1>
          <p className="mt-1 text-sm text-muted-foreground">Open a ticket for anything — bugs, account issues, subscription help. Admin replies show up in real time.</p>
        </div>
        <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:opacity-90">
          <Plus className="h-4 w-4" /> New ticket
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
        <div className="glass-panel rounded-2xl p-3">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your tickets</div>
          {isLoading && <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>}
          {!isLoading && tickets.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
              <LifeBuoy className="mx-auto mb-2 h-6 w-6 opacity-60" />
              No tickets yet.
            </div>
          )}
          <ul className="space-y-1">
            {tickets.map((t: any) => (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t.id)}
                  className={
                    "w-full rounded-xl border px-3 py-2.5 text-left transition " +
                    (selected === t.id ? "border-primary/40 bg-primary/[0.06]" : "border-transparent hover:bg-white/[0.04]")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{t.subject}</span>
                    {t.unread_for_user && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className={"inline-flex items-center gap-1 " + (t.status === "closed" ? "text-muted-foreground" : "text-emerald-300")}>
                      <Circle className={"h-1.5 w-1.5 " + (t.status === "closed" ? "fill-muted-foreground" : "fill-emerald-300")} />
                      {t.status}
                    </span>
                    <span>{timeAgo(t.last_message_at ?? t.updated_at)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel rounded-2xl">
          {selected ? (
            <TicketThread ticketId={selected} />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-sm text-muted-foreground">
              Select a ticket or open a new one.
            </div>
          )}
        </div>
      </div>

      {openNew && (
        <Modal open onClose={() => setOpenNew(false)} title="Open a support ticket">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Describe the problem, steps to reproduce, screenshots…" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpenNew(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancel</button>
              <button
                onClick={() => {
                  if (!subject.trim() || !body.trim()) { toast.push({ kind: "error", title: "Missing details" }); return; }
                  create.mutate();
                }}
                disabled={create.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
              >
                {create.isPending ? "Opening…" : "Open ticket"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TicketThread({ ticketId }: { ticketId: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const listFn = useServerFn(listTicketMessages);
  const sendFn = useServerFn(sendTicketMessage);
  const closeFn = useServerFn(closeTicket);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ["support", "thread", ticketId],
    queryFn: () => listFn({ data: { ticketId } }),
    refetchInterval: 4000,
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { ticketId, body: text } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["support"] }); },
    onError: (e: any) => toast.push({ kind: "error", title: "Send failed", body: e?.message }),
  });
  const close = useMutation({
    mutationFn: (status: "open" | "closed") => closeFn({ data: { ticketId, status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support"] }); toast.push({ kind: "success", title: "Updated" }); },
  });

  return (
    <div className="flex h-[560px] flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Encrypted · direct line to Atlas team</div>
        <button onClick={() => close.mutate("closed")} className="text-[11px] text-muted-foreground hover:text-foreground">Close ticket</button>
      </div>
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">No messages yet.</div>}
        {messages.map((m: any) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div className={"max-w-[78%] rounded-2xl px-3 py-2 text-sm " + (mine
                ? "bg-primary/15 text-foreground"
                : m.sender_role === "admin"
                  ? "border border-accent/20 bg-accent/10 text-foreground"
                  : "bg-white/5 text-foreground")}>
                {m.sender_role === "admin" && !mine && <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">Atlas team</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { if (text.trim()) send.mutate(); } }}
            rows={2}
            placeholder="Type a reply… (Ctrl+Enter to send)"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => text.trim() && send.mutate()}
            disabled={send.isPending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
