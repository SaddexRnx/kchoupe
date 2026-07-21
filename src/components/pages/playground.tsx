import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Bot, User, Sparkles, RotateCcw, Sliders, Plus, Trash2, Cpu, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast } from "./_shared";
import { useT } from "@/lib/i18n";
import { sendPlaygroundMessage, resetPlaygroundConversation } from "@/lib/playground.functions";
import { listAiEmployees } from "@/lib/ai-employees.functions";
import { listProducts, type ProductRow } from "@/lib/products.functions";
import { createOrder } from "@/lib/orders.functions";

const MODELS: { id: string; label: string }[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, default)" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { id: "openai/gpt-5.5", label: "GPT-5.5" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra" },
];

type Msg = { role: "user" | "assistant"; content: string };

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-") // unify dashes
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[*_`~]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findProductMatches(text: string, products: ProductRow[]): ProductRow[] {
  if (!text || !products.length) return [];
  const norm = normalize(text);
  const seen = new Set<string>();
  const out: { p: ProductRow; score: number }[] = [];
  for (const p of products) {
    const nName = normalize(p.name || "");
    const nSku = normalize(p.sku || "");
    let score = 0;
    if (nSku && nSku.length >= 3 && norm.includes(nSku)) score = 1000;
    else if (nName && nName.length >= 4 && norm.includes(nName)) score = 500 + nName.length;
    else if (nName) {
      // token-based fallback: count matching tokens (length>=3)
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

export function Playground() {
  const t = useT();
  const toast = useToast();
  const send = useServerFn(sendPlaygroundMessage);
  const resetConvo = useServerFn(resetPlaygroundConversation);
  const listEmployees = useServerFn(listAiEmployees);
  const listProd = useServerFn(listProducts);
  const placeOrder = useServerFn(createOrder);

  const { data: employees = [] } = useQuery({
    queryKey: ["ai_employees"],
    queryFn: () => listEmployees(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProd(),
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
  const [input, setInput] = useState("");
  const [customModels, setCustomModels] = useState<{ id: string; label: string; base: string; model: string; key: string; revealed: boolean }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ label: "", base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" });

  const [orderProduct, setOrderProduct] = useState<ProductRow | null>(null);
  const [orderForm, setOrderForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", qty: 1, notes: "" });
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const activeEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const activeModel = activeEmployee?.model ?? selectedModel;
  const activePrompt = activeEmployee?.system_prompt ?? undefined;
  const activeName = activeEmployee?.name ?? "Atlas Playground";

  const productsByMessage = useMemo(() => {
    return messages.map((m) => (m.role === "assistant" ? findProductMatches(m.content, products) : []));
  }, [messages, products]);

  const addModel = () => {
    if (!draft.label.trim() || !draft.model.trim()) { toast.push({ kind: "warn", title: "Name and model id required" }); return; }
    setCustomModels((m) => [...m, { id: Math.random().toString(36).slice(2), ...draft, revealed: false }]);
    setDraft({ label: "", base: "https://api.openai.com/v1", model: "gpt-4o-mini", key: "" });
    setShowAdd(false);
    toast.push({ kind: "info", title: "Saved locally", body: "Custom endpoints go live in a later phase." });
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await send({ data: {
        conversationId,
        message: text,
        model: activeModel,
        systemPrompt: activePrompt,
        aiEmployeeId: activeEmployee?.id,
      }});
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.assistant.content }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.push({ kind: "warn", title: "Chat failed", body: msg });
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  };

  const resetChat = async () => {
    if (conversationId) {
      try { await resetConvo({ data: { conversationId } }); } catch { /* ignore */ }
    }
    setMessages([]);
    setConversationId(undefined);
    toast.push({ kind: "info", title: "Conversation reset" });
  };

  const openOrder = (p: ProductRow) => {
    setOrderProduct(p);
    setOrderForm({ customer_name: "", customer_email: "", customer_phone: "", shipping_address: "", qty: 1, notes: "" });
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
        confirmed_by_ai: true,
        ai_employee_id: activeEmployee?.id ?? null,
        notes: composedNotes,
      }});
      toast.push({ kind: "success", title: `Order ${res.order_no} placed`, body: `${summary} — ${amount.toLocaleString()} ${orderProduct.currency}` });
      setMessages((m) => [...m, { role: "assistant", content: `✅ Order **${res.order_no}** confirmed for **${orderForm.customer_name.trim()}** (${orderForm.customer_phone.trim()}): ${summary} — ${amount.toLocaleString()} ${orderProduct.currency}. Shipping to: ${orderForm.shipping_address.trim()}. Status: pending confirmation.` }]);
      setOrderProduct(null);
    } catch (e: any) {
      toast.push({ kind: "error", title: "Order failed", body: e?.message });
    } finally {
      setPlacing(false);
    }
  };


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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-base">
              {activeEmployee?.avatar_emoji ?? <Bot className="h-4 w-4" />}
            </div>
            <div className="text-sm font-semibold">
              {activeName}{activeEmployee ? ` · ${activeEmployee.role}` : ""}
            </div>
            <Chip tone="emerald">{t("common.live")}</Chip>
            <div className="ml-auto truncate text-[10px] text-muted-foreground">{activeModel}</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
            {messages.length === 0 && (
              <div className="mx-auto max-w-md rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
                Ask anything — {activeName} will reply using <span className="font-mono text-foreground">{activeModel}</span>.
              </div>
            )}
            {messages.map((m, i) => {
              const matches = productsByMessage[i] ?? [];
              return (
                <div key={i} className={"flex gap-3 " + (m.role === "user" ? "flex-row-reverse" : "")}>
                  <div className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + (m.role === "user" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary")}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={"flex max-w-[75%] flex-col gap-2 " + (m.role === "user" ? "items-end" : "items-start")}>
                    <div className={"whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm " + (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/5 text-foreground")}>
                      {m.content}
                    </div>
                    {matches.length > 0 && (
                      <div className="flex w-full flex-col gap-2">
                        {matches.map((p) => {
                          const unknown = p.status === "draft" || p.stock == null;
                          const out = !unknown && (p.status === "out" || p.stock === 0);
                          const cls = out ? "text-rose-300" : unknown ? "text-amber-300" : "text-emerald-300";
                          const label = out ? "Out of stock" : unknown ? "Check website for stock" : `${p.stock} in stock`;
                          return (
                            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xl">{p.image_emoji}</div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{p.name}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <span className="font-mono">{p.sku}</span>
                                  <span>·</span>
                                  <span className={cls}>{label}</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="font-display text-sm font-bold">{Number(p.price).toLocaleString()} <span className="text-[10px] font-medium text-muted-foreground">{p.currency}</span></div>
                                <button
                                  onClick={() => openOrder(p)}
                                  disabled={out}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-primary to-accent px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm shadow-primary/30 hover:brightness-110 disabled:opacity-40"
                                >
                                  <ShoppingBag className="h-3 w-3" /> Order
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Bot className="h-4 w-4" /></div>
                <div className="rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-muted-foreground"><Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Thinking…</div>
              </div>
            )}
          </div>
          <div className="border-t border-white/5 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
                placeholder={t("pg.ask")}
                disabled={sending}
                className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              <button onClick={sendMessage} disabled={sending || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          {employees.length > 0 && (
            <Panel>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-primary" /> AI employee</div>
              <div className="space-y-2 text-sm">
                <label className={"flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 " + (!selectedEmployeeId ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/5 hover:border-primary/30")}>
                  <span>None (raw model)</span>
                  <input type="radio" name="emp" checked={!selectedEmployeeId} onChange={() => setSelectedEmployeeId("")} className="accent-primary" />
                </label>
                {employees.map((e) => (
                  <label key={e.id} className={"flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 " + (selectedEmployeeId === e.id ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/5 hover:border-primary/30")}>
                    <span className="flex items-center gap-2"><span className="text-base">{e.avatar_emoji}</span><span>{e.name} <span className="text-[10px] text-muted-foreground">· {e.role}</span></span></span>
                    <input type="radio" name="emp" checked={selectedEmployeeId === e.id} onChange={() => setSelectedEmployeeId(e.id)} className="accent-primary" />
                  </label>
                ))}
              </div>
            </Panel>
          )}
          <Panel>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sliders className="h-4 w-4 text-primary" /> {t("pg.model")}</div>
              <button onClick={() => setShowAdd((s) => !s)} className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10">
                <Plus className="h-3 w-3" /> {t("pg.add")}
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {MODELS.map((m) => (
                <label key={m.id} className={"flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 " + (selectedModel === m.id && !selectedEmployeeId ? "border-primary/40 bg-primary/10" : "border-white/5 bg-white/5 hover:border-primary/30") + (selectedEmployeeId ? " opacity-50" : "")}>
                  <span>{m.label}</span>
                  <input type="radio" name="model" checked={selectedModel === m.id} onChange={() => setSelectedModel(m.id)} disabled={!!selectedEmployeeId} className="accent-primary" />
                </label>
              ))}
              {customModels.length > 0 && (
                <div className="mt-3 mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Cpu className="h-3 w-3" /> {t("pg.custom_endpoints")}
                </div>
              )}
              {customModels.map((m) => (
                <div key={m.id} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.label}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{m.model} · {m.base}</div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">soon</span>
                  </div>
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

      <Modal
        open={!!orderProduct}
        onClose={() => setOrderProduct(null)}
        title={orderProduct ? `Place order — ${orderProduct.name}` : "Place order"}
        description="Confirms as a pending order in your Orders page."
        footer={<>
          <GhostButton onClick={() => setOrderProduct(null)}>Cancel</GhostButton>
          <PrimaryButton onClick={submitOrder} disabled={placing || Object.keys(orderErrors).length > 0 && !orderForm.customer_name}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />} Place order
          </PrimaryButton>
        </>}
      >
        {orderProduct && (
          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xl">{orderProduct.image_emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{orderProduct.name}</div>
                <div className="text-[11px] text-muted-foreground">{orderProduct.sku} · {Number(orderProduct.price).toLocaleString()} {orderProduct.currency} each</div>
              </div>
            </div>
            <TextField label="Customer name *" value={orderForm.customer_name} onChange={(v) => setOrderForm({ ...orderForm, customer_name: v })} placeholder="Sara Ait" help={orderErrors.customer_name} />
            <TextField label="Phone number *" value={orderForm.customer_phone} onChange={(v) => setOrderForm({ ...orderForm, customer_phone: v })} placeholder="+213 555 12 34 56" help={orderErrors.customer_phone} />
            <TextField label="Delivery address *" value={orderForm.shipping_address} onChange={(v) => setOrderForm({ ...orderForm, shipping_address: v })} placeholder="Street, city, wilaya / country" help={orderErrors.shipping_address} />
            <TextField label="Email (optional)" value={orderForm.customer_email} onChange={(v) => setOrderForm({ ...orderForm, customer_email: v })} placeholder="sara@example.com" help={orderErrors.customer_email} />
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Quantity *</div>
              <input type="number" min={1} value={orderForm.qty} onChange={(e) => setOrderForm({ ...orderForm, qty: Number(e.target.value) })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" />
              {orderErrors.qty && <div className="mt-1 text-[11px] text-rose-400">{orderErrors.qty}</div>}
            </label>
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Notes (optional)</div>
              <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none" placeholder="Shade, size, delivery notes…" />
            </label>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-display text-lg font-bold">
                  {(Number(orderProduct.price) * Math.max(1, Number(orderForm.qty) || 1)).toLocaleString()} {orderProduct.currency}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
