import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Panel, Chip, Modal, GhostButton, PrimaryButton, TextField, useToast } from "./_shared";
import { Download, Mail, RefreshCcw, Plus, Loader2, Zap, Eye, EyeOff, Save, Trash2, CheckCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { listOrders, createOrder, updateOrder, deleteOrder, type OrderRow, type OrderStatus } from "@/lib/orders.functions";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";

const STATUS_META: Record<OrderStatus, { label: string; tone: "emerald" | "amber" | "rose" | "muted" | "sky" | "violet" }> = {
  pending:   { label: "Pending",   tone: "amber" },
  paid:      { label: "Paid",      tone: "emerald" },
  delivered: { label: "Delivered", tone: "sky" },
  cancelled: { label: "Cancelled", tone: "muted" },
  returned:  { label: "Returned",  tone: "violet" },
  refunded:  { label: "Refunded",  tone: "rose" },
};
const STATUS_ORDER: OrderStatus[] = ["pending", "paid", "delivered", "cancelled", "returned", "refunded"];

function fmt(v: number, cur: string) {
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v); }
  catch { return `${v} ${cur}`; }
}

export function Orders() {
  const t = useT();
  const toast = useToast();
  const qc = useQueryClient();
  const list = useServerFn(listOrders);
  const create = useServerFn(createOrder);
  const update = useServerFn(updateOrder);
  const remove = useServerFn(deleteOrder);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingPatch, setSavingPatch] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all" | "unseen">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ customer_name: "", customer_email: "", product_summary: "", amount: "", currency: "DZD", status: "pending" as OrderStatus, confirmed_by_ai: false });

  useEffect(() => { setNoteDraft(viewing?.notes ?? ""); }, [viewing?.id]);

  const stats = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 86400000;
    const weekAgo = now - 7 * 86400000;
    const paid = orders.filter((o) => o.status === "paid" || o.status === "delivered");
    const mrr = paid.filter((o) => new Date(o.created_at).getTime() >= monthAgo).reduce((s, o) => s + Number(o.amount), 0);
    const week = paid.filter((o) => new Date(o.created_at).getTime() >= weekAgo).reduce((s, o) => s + Number(o.amount), 0);
    const counts: Record<OrderStatus, number> = { pending: 0, paid: 0, delivered: 0, cancelled: 0, returned: 0, refunded: 0 };
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const unseen = orders.filter((o) => !o.seen).length;
    return { mrr, week, counts, unseen, total: orders.length };
  }, [orders]);

  const chartData = useMemo(() => {
    const days = 14;
    const buckets: { key: string; label: string; revenue: number; orders: number }[] = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(start); d.setDate(start.getDate() - i);
      buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), revenue: 0, orders: 0 });
    }
    const map = new Map(buckets.map((b) => [b.key, b]));
    orders.forEach((o) => {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      const b = map.get(k); if (!b) return;
      b.orders += 1;
      if (o.status === "paid" || o.status === "delivered") b.revenue += Number(o.amount);
    });
    return buckets;
  }, [orders]);

  const pieData = useMemo(() =>
    STATUS_ORDER.map((s) => ({ name: STATUS_META[s].label, value: stats.counts[s], status: s })).filter((d) => d.value > 0),
    [stats.counts]);
  const PIE_COLORS: Record<OrderStatus, string> = {
    pending: "#f59e0b", paid: "#10b981", delivered: "#0ea5e9", cancelled: "#6b7280", returned: "#8b5cf6", refunded: "#f43f5e",
  };

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "unseen") return orders.filter((o) => !o.seen);
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const toggleOne = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o) => o.id)));
  };

  const bulkStatus = async (status: OrderStatus) => {
    if (!selected.size) return;
    try {
      await Promise.all([...selected].map((id) => update({ data: { id, status } })));
      await invalidate();
      toast.push({ kind: "success", title: `${selected.size} order(s) → ${STATUS_META[status].label}` });
      setSelected(new Set());
    } catch (e: any) { toast.push({ kind: "error", title: "Bulk update failed", body: e?.message }); }
  };
  const bulkSeen = async (seen: boolean) => {
    if (!selected.size) return;
    try {
      await Promise.all([...selected].map((id) => update({ data: { id, seen } })));
      await invalidate();
      toast.push({ kind: "success", title: `${selected.size} marked ${seen ? "seen" : "unseen"}` });
      setSelected(new Set());
    } catch (e: any) { toast.push({ kind: "error", title: "Update failed", body: e?.message }); }
  };
  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} order(s)? This cannot be undone.`)) return;
    try {
      await Promise.all([...selected].map((id) => remove({ data: { id } })));
      await invalidate();
      toast.push({ kind: "success", title: `${selected.size} deleted` });
      setSelected(new Set());
    } catch (e: any) { toast.push({ kind: "error", title: "Delete failed", body: e?.message }); }
  };

  const patchOne = async (patch: { status?: OrderStatus; notes?: string | null; seen?: boolean }) => {
    if (!viewing) return;
    setSavingPatch(true);
    try {
      await update({ data: { id: viewing.id, ...patch } });
      await invalidate();
      setViewing({ ...viewing, ...patch, notes: patch.notes !== undefined ? patch.notes : viewing.notes } as OrderRow);
      toast.push({ kind: "success", title: "Order updated" });
    } catch (e: any) { toast.push({ kind: "error", title: "Update failed", body: e?.message }); }
    finally { setSavingPatch(false); }
  };

  const exportCsv = () => {
    const rows = [["id","order_no","customer","email","product","amount","currency","status","seen","confirmed_by_ai","notes","date"],
      ...orders.map((o) => [o.id, o.order_no, o.customer_name, o.customer_email ?? "", o.product_summary, String(o.amount), o.currency, o.status, String(o.seen), String(o.confirmed_by_ai), o.notes ?? "", o.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.push({ kind: "success", title: "Orders exported", body: `${orders.length} rows downloaded as CSV.` });
  };

  const openOrder = async (o: OrderRow) => {
    setViewing(o);
    if (!o.seen) {
      try { await update({ data: { id: o.id, seen: true } }); await invalidate(); } catch {}
    }
  };

  const handleCreate = async () => {
    const amount = parseFloat(draft.amount || "0");
    if (!draft.customer_name.trim() || !draft.product_summary.trim() || !amount) {
      toast.push({ kind: "warn", title: "Missing details", body: "Customer, product and amount are required." });
      return;
    }
    setSaving(true);
    try {
      await create({ data: { customer_name: draft.customer_name.trim(), customer_email: draft.customer_email.trim() || undefined, product_summary: draft.product_summary.trim(), amount, currency: draft.currency, status: draft.status, confirmed_by_ai: draft.confirmed_by_ai } });
      await invalidate();
      setAddOpen(false);
      setDraft({ customer_name: "", customer_email: "", product_summary: "", amount: "", currency: "DZD", status: "pending", confirmed_by_ai: false });
      toast.push({ kind: "success", title: "Order added" });
    } catch (e: any) { toast.push({ kind: "error", title: "Could not add order", body: e?.message }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("ord.eyebrow")}
        title={t("ord.title")}
        description={t("ord.desc")}
        actions={
          <div className="flex gap-2">
            <GhostButton onClick={exportCsv}><Download className="h-4 w-4" /> {t("common.export")}</GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New order</PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Revenue (30d)</div><div className="mt-1 font-display text-2xl font-bold">{fmt(stats.mrr, "DZD")}</div></Panel>
        <Panel><div className="text-[11px] uppercase tracking-widest text-muted-foreground">This week</div><div className="mt-1 font-display text-2xl font-bold">{fmt(stats.week, "DZD")}</div></Panel>
        <Panel><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Total orders</div><div className="mt-1 font-display text-2xl font-bold">{stats.total}</div></Panel>
        <Panel><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Unseen</div><div className="mt-1 font-display text-2xl font-bold">{stats.unseen}</div></Panel>
      </div>

      {/* Status filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === "all" ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
          All <span className="ml-1 opacity-70">{stats.total}</span>
        </button>
        <button onClick={() => setFilter("unseen")} className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === "unseen" ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
          Unseen <span className="ml-1 opacity-70">{stats.unseen}</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1.5 text-xs transition ${filter === s ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
            {STATUS_META[s].label} <span className="ml-1 opacity-70">{stats.counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Panel className="mb-3 flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <button key={s} onClick={() => bulkStatus(s)} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10">→ {STATUS_META[s].label}</button>
            ))}
            <button onClick={() => bulkSeen(true)} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"><Eye className="mr-1 inline h-3 w-3" />Seen</button>
            <button onClick={() => bulkSeen(false)} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] hover:bg-white/10"><EyeOff className="mr-1 inline h-3 w-3" />Unseen</button>
            <button onClick={bulkDelete} className="rounded-md border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20"><Trash2 className="mr-1 inline h-3 w-3" />Delete</button>
          </div>
        </Panel>
      )}

      <Panel className="p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-3"><input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} /></th>
              <th className="px-4 py-3 font-medium">{t("ord.col.order")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.customer")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.product")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("ord.col.amount")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.status")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("ord.col.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((o) => (
              <tr key={o.id} className={`transition hover:bg-white/5 ${!o.seen ? "bg-primary/5" : ""}`}>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                </td>
                <td className="cursor-pointer whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground" onClick={() => openOrder(o)}>
                  {!o.seen && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
                  {o.order_no}
                  {o.confirmed_by_ai && <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-primary"><Zap className="h-2.5 w-2.5" /> AI</span>}
                </td>
                <td className="cursor-pointer px-4 py-3 font-medium" onClick={() => openOrder(o)}>{o.customer_name}</td>
                <td className="max-w-[240px] cursor-pointer truncate px-4 py-3 text-muted-foreground" onClick={() => openOrder(o)}>{o.product_summary}</td>
                <td className="cursor-pointer whitespace-nowrap px-4 py-3 text-right font-display font-semibold" onClick={() => openOrder(o)}>{fmt(Number(o.amount), o.currency)}</td>
                <td className="cursor-pointer px-4 py-3" onClick={() => openOrder(o)}><Chip tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Chip></td>
                <td className="cursor-pointer whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground" onClick={() => openOrder(o)}>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">No orders match this filter.</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={7} className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin opacity-70" /></td></tr>
            )}
          </tbody>
        </table>
        </div>
      </Panel>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.order_no} description={`${viewing.customer_name} · ${new Date(viewing.created_at).toLocaleString()}`}
          footer={<>
            <GhostButton onClick={() => patchOne({ seen: !viewing.seen })}>
              {viewing.seen ? <><EyeOff className="h-3.5 w-3.5" /> Mark unseen</> : <><Eye className="h-3.5 w-3.5" /> Mark seen</>}
            </GhostButton>
            <GhostButton onClick={() => toast.push({ kind: "success", title: "Receipt sent", body: `Emailed to ${viewing.customer_name}.` })}>
              <Mail className="h-3.5 w-3.5" /> Resend receipt
            </GhostButton>
            <PrimaryButton onClick={() => setViewing(null)}>Close</PrimaryButton>
          </>}>
          <div className="grid gap-4 text-sm">
            <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="text-right">{viewing.product_summary}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-display text-lg font-bold">{fmt(Number(viewing.amount), viewing.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{viewing.customer_name}{viewing.customer_email ? ` · ${viewing.customer_email}` : ""}</span></div>
              {viewing.confirmed_by_ai && <div className="flex justify-between"><span className="text-muted-foreground">Confirmed by AI</span><span className="inline-flex items-center gap-1 text-primary"><Zap className="h-3 w-3" /> Yes</span></div>}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Status</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button key={s} disabled={savingPatch} onClick={() => patchOne({ status: s })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${viewing.status === s ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                    {viewing.status === s && <CheckCircle2 className="h-3 w-3" />}
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Private note</div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                placeholder="Add a note only you and your team can see…"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
              <div className="mt-2 flex justify-end">
                <PrimaryButton onClick={() => patchOne({ notes: noteDraft.trim() || null })} disabled={savingPatch || (noteDraft ?? "") === (viewing.notes ?? "")}>
                  {savingPatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save note
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New order" description="Log an order manually or on behalf of a customer."
        footer={<>
          <GhostButton onClick={() => setAddOpen(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add order
          </PrimaryButton>
        </>}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Customer name" value={draft.customer_name} onChange={(v) => setDraft({ ...draft, customer_name: v })} placeholder="Sara M." />
          <TextField label="Email" value={draft.customer_email} onChange={(v) => setDraft({ ...draft, customer_email: v })} placeholder="sara@example.com" />
          <TextField label="Product summary" value={draft.product_summary} onChange={(v) => setDraft({ ...draft, product_summary: v })} placeholder="Argan oil ×2" />
          <TextField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} placeholder="2980" type="number" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Currency</div>
            <select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              {["DZD","TND","MAD","EUR","USD"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Status</div>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OrderStatus })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </label>
          <label className="col-span-full flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.confirmed_by_ai} onChange={(e) => setDraft({ ...draft, confirmed_by_ai: e.target.checked })} />
            <span>Confirmed by an AI employee</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
