import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Search, Filter, ChevronRight, Send, X, Check, CheckCheck, Plus, Loader2, ShoppingBag } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast } from "./_shared";
import { useT } from "@/lib/i18n";
import {
  listConversations, listMessages, createConversation, sendReply, updateConversationStatus,
  type InboxConvo,
} from "@/lib/inbox.functions";
import { listProducts } from "@/lib/products.functions";
import { createOrder } from "@/lib/orders.functions";

const tones = { won: "emerald", open: "violet", risk: "rose", resolved: "muted" } as const;
const statusKey = { won: "common.won", open: "common.open", risk: "common.risk", resolved: "common.resolved" } as const;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

type ProductLite = {
  id: string; name: string; sku: string; price: number | string; currency: string;
  stock: number; image_emoji: string; status?: string;
};

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[*_`~]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProductMatches(text: string, products: ProductLite[]): ProductLite[] {
  if (!text || !products.length) return [];
  const norm = normalize(text);
  const seen = new Set<string>();
  const out: { p: ProductLite; score: number }[] = [];
  for (const p of products) {
    const nName = normalize(p.name || "");
    const nSku = normalize(p.sku || "");
    let score = 0;
    if (nSku && nSku.length >= 3 && norm.includes(nSku)) score = 1000;
    else if (nName && nName.length >= 4 && norm.includes(nName)) score = 500 + nName.length;
    else if (nName) {
      const tokens = nName.split(" ").filter((w) => w.length >= 3);
      if (tokens.length >= 2) {
        const hits = tokens.filter((w) => norm.includes(w)).length;
        const ratio = hits / tokens.length;
        if (hits >= 2 && ratio >= 0.6) score = 100 + hits * 10;
      }
    }
    if (score > 0 && !seen.has(p.id)) {
      seen.add(p.id);
      out.push({ p, score });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 4).map((x) => x.p);
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

  const listProd = useServerFn(listProducts);
  const { data: convos = [], isLoading } = useQuery({ queryKey: ["inbox_conversations"], queryFn: () => list() });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => listProd() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["inbox_conversations"] });

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDraft, setNewDraft] = useState({ external_user: "", channel: "web", first_message: "" });

  const placeOrder = useServerFn(createOrder);
  const [orderProduct, setOrderProduct] = useState<ProductLite | null>(null);
  const [orderForm, setOrderForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", qty: 1, notes: "" });
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const openOrder = (p: ProductLite) => {
    setOrderProduct(p);
    const seedUser = open?.external_user ?? "";
    setOrderForm({
      customer_name: seedUser && !seedUser.includes("@") ? seedUser : "",
      customer_email: seedUser.includes("@") ? seedUser : "",
      customer_phone: "",
      shipping_address: "",
      qty: 1,
      notes: "",
    });
    setOrderErrors({});
  };
  const validateOrder = () => {
    const e: Record<string, string> = {};
    if (orderForm.customer_name.trim().length < 2) e.customer_name = "Enter the customer's full name";
    if (orderForm.customer_phone.replace(/\D/g, "").length < 6) e.customer_phone = "Enter a valid phone number";
    if (orderForm.shipping_address.trim().length < 8) e.shipping_address = "Enter the delivery address";
    if (orderForm.customer_email.trim() && !/^\S+@\S+\.\S+$/.test(orderForm.customer_email.trim())) e.customer_email = "Invalid email";
    const qty = Number(orderForm.qty);
    if (!Number.isFinite(qty) || qty < 1) e.qty = "Quantity must be at least 1";
    return e;
  };
  const submitOrder = async () => {
    if (!orderProduct) return;
    const errs = validateOrder();
    setOrderErrors(errs);
    if (Object.keys(errs).length) {
      toast.push({ kind: "warn", title: "Missing details", body: "Please fill in name, phone and delivery address." });
      return;
    }
    const qty = Math.max(1, Number(orderForm.qty) || 1);
    setPlacing(true);
    try {
      const amount = Number(orderProduct.price) * qty;
      const summary = `${qty}× ${orderProduct.name} (${orderProduct.sku})`;
      const composedNotes = [
        `Phone: ${orderForm.customer_phone.trim()}`,
        `Address: ${orderForm.shipping_address.trim()}`,
        orderForm.notes.trim() ? `Notes: ${orderForm.notes.trim()}` : null,
      ].filter(Boolean).join("\n");
      const res = await placeOrder({ data: {
        customer_name: orderForm.customer_name.trim(),
        customer_email: orderForm.customer_email.trim() || undefined,
        product_summary: summary,
        amount,
        currency: orderProduct.currency,
        status: "pending",
        confirmed_by_ai: false,
        notes: composedNotes,
      }});
      toast.push({ kind: "success", title: `Order ${res.order_no} placed`, body: summary });
      setOrderProduct(null);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Order failed", body: e?.message });
    } finally {
      setPlacing(false);
    }
  };


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
              {messages.map((m) => {
                const matches = findProductMatches(m.body, products);
                return (
                  <div key={m.id} className={"flex flex-col gap-2 " + (m.role === "agent" ? "items-end" : "items-start")}>
                    <div className={"max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm " + (m.role === "agent" ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-white/5")}>
                      {m.body}
                    </div>
                    {matches.length > 0 && (
                      <div className="flex w-full max-w-[85%] flex-col gap-2">
                        {matches.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xl">{p.image_emoji}</div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">{p.name}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono">{p.sku}</span>
                                <span>·</span>
                                {(() => {
                                  const unknown = p.status === "draft" || p.stock == null;
                                  const out = !unknown && (p.status === "out" || p.stock === 0);
                                  const cls = out ? "text-rose-300" : unknown ? "text-amber-300" : "text-emerald-300";
                                  const label = out ? "Out of stock" : unknown ? "Check website for stock" : `${p.stock} in stock`;
                                  return <span className={cls}>{label}</span>;
                                })()}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-display text-sm font-bold">{Number(p.price).toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">{p.currency}</span></div>
                              {(() => {
                                const out = p.status === "out" || (p.status !== "draft" && p.stock === 0);
                                return (
                                  <button
                                    onClick={() => openOrder(p)}
                                    disabled={out}
                                    className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-primary to-accent px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:brightness-110 disabled:opacity-40"
                                  >
                                    <ShoppingBag className="h-3 w-3" /> Order
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

      <Modal open={!!orderProduct} onClose={() => setOrderProduct(null)}
        title={orderProduct ? `Order — ${orderProduct.name}` : "Place order"}
        description="Confirm the customer details to record this order."
        footer={<>
          <GhostButton onClick={() => setOrderProduct(null)}>Cancel</GhostButton>
          <PrimaryButton onClick={submitOrder} disabled={placing}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />} Place order
          </PrimaryButton>
        </>}>
        {orderProduct && (
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xl">{orderProduct.image_emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{orderProduct.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{orderProduct.sku}</div>
              </div>
              <div className="text-right"><div className="font-display text-sm font-bold">{Number(orderProduct.price).toLocaleString()} <span className="text-[10px] text-muted-foreground">{orderProduct.currency}</span></div></div>
            </div>
            <TextField label="Customer name" value={orderForm.customer_name} onChange={(v) => setOrderForm({ ...orderForm, customer_name: v })} placeholder="Full name" />
            <TextField label="Customer email" value={orderForm.customer_email} onChange={(v) => setOrderForm({ ...orderForm, customer_email: v })} placeholder="name@example.com" />
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Quantity</div>
              <input type="number" min={1} value={orderForm.qty} onChange={(e) => setOrderForm({ ...orderForm, qty: Number(e.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
            </label>
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Notes (optional)</div>
              <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
            </label>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{(Number(orderProduct.price) * Math.max(1, Number(orderForm.qty) || 1)).toLocaleString()} {orderProduct.currency}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}