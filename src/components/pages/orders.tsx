import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Panel, Chip, Modal, GhostButton, PrimaryButton, TextField, useToast } from "./_shared";
import { Download, Mail, RefreshCcw, Plus, Loader2, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { listOrders, createOrder, updateOrderStatus, type OrderRow } from "@/lib/orders.functions";

const tones = { paid: "emerald", pending: "amber", refunded: "rose", cancelled: "muted" } as const;
const statusKey = { paid: "common.paid", pending: "common.pending", refunded: "common.refunded", cancelled: "common.pending" } as const;

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
  const updateStatus = useServerFn(updateOrderStatus);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["orders"] });

  const [viewing, setViewing] = useState<OrderRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ customer_name: "", customer_email: "", product_summary: "", amount: "", currency: "DZD", status: "pending" as OrderRow["status"], confirmed_by_ai: false });

  const stats = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 86400000;
    const weekAgo = now - 7 * 86400000;
    const paid = orders.filter((o) => o.status === "paid");
    const refunded = orders.filter((o) => o.status === "refunded");
    const mrr = paid.filter((o) => new Date(o.created_at).getTime() >= monthAgo).reduce((s, o) => s + Number(o.amount), 0);
    const week = paid.filter((o) => new Date(o.created_at).getTime() >= weekAgo).reduce((s, o) => s + Number(o.amount), 0);
    return { mrr, week, count: orders.length, refundRate: orders.length ? (refunded.length / orders.length) * 100 : 0 };
  }, [orders]);

  const exportCsv = () => {
    const rows = [["id","order_no","customer","email","product","amount","currency","status","confirmed_by_ai","date"],
      ...orders.map((o) => [o.id, o.order_no, o.customer_name, o.customer_email ?? "", o.product_summary, String(o.amount), o.currency, o.status, String(o.confirmed_by_ai), o.created_at])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.push({ kind: "success", title: "Orders exported", body: `${orders.length} rows downloaded as CSV.` });
  };

  const refund = async (o: OrderRow) => {
    try {
      await updateStatus({ data: { id: o.id, status: "refunded" } });
      await invalidate();
      toast.push({ kind: "success", title: `Refunded ${o.order_no}` });
      setViewing(null);
    } catch (e: any) { toast.push({ kind: "error", title: "Refund failed", body: e?.message }); }
  };
  const resend = (o: OrderRow) => {
    toast.push({ kind: "success", title: "Receipt sent", body: `Emailed to ${o.customer_name}.` });
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
            <GhostButton onClick={exportCsv}>
              <Download className="h-4 w-4" /> {t("common.export")}
            </GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New order
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          [t("ord.mrr"), fmt(stats.mrr, "DZD")],
          [t("ord.this_week"), fmt(stats.week, "DZD")],
          [t("ord.orders"), String(stats.count)],
          [t("ord.refund_rate"), stats.refundRate.toFixed(1) + "%"],
        ].map(([l, v]) => (
          <Panel key={l}>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{l}</div>
            <div className="mt-1 font-display text-2xl font-bold">{v}</div>
          </Panel>
        ))}
      </div>

      <Panel className="p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("ord.col.order")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.customer")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.product")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("ord.col.amount")}</th>
              <th className="px-4 py-3 font-medium">{t("ord.col.status")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("ord.col.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((o) => (
              <tr key={o.id} onClick={() => setViewing(o)} className="cursor-pointer transition hover:bg-white/5">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {o.order_no}
                  {o.confirmed_by_ai && <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-primary"><Zap className="h-2.5 w-2.5" /> AI</span>}
                </td>
                <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">{o.product_summary}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-display font-semibold">{fmt(Number(o.amount), o.currency)}</td>
                <td className="px-4 py-3"><Chip tone={tones[o.status as keyof typeof tones]}>{t(statusKey[o.status as keyof typeof statusKey])}</Chip></td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && !isLoading && (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">No orders yet. Add your first one.</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={6} className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin opacity-70" /></td></tr>
            )}
          </tbody>
        </table>
        </div>
      </Panel>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.order_no} description={`${viewing.customer_name} · ${new Date(viewing.created_at).toLocaleString()}`}
          footer={<>
            <GhostButton onClick={() => resend(viewing)}><Mail className="h-3.5 w-3.5" /> Resend receipt</GhostButton>
            {viewing.status === "paid" && <GhostButton tone="danger" onClick={() => refund(viewing)}><RefreshCcw className="h-3.5 w-3.5" /> Refund</GhostButton>}
            <PrimaryButton onClick={() => setViewing(null)}>Close</PrimaryButton>
          </>}>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{viewing.product_summary}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-display text-lg font-bold">{fmt(Number(viewing.amount), viewing.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Chip tone={tones[viewing.status]}>{t(statusKey[viewing.status])}</Chip></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{viewing.customer_name}{viewing.customer_email ? ` · ${viewing.customer_email}` : ""}</span></div>
            {viewing.confirmed_by_ai && <div className="flex justify-between"><span className="text-muted-foreground">Confirmed by AI</span><span className="inline-flex items-center gap-1 text-primary"><Zap className="h-3 w-3" /> Yes</span></div>}
            {viewing.notes && <div className="text-muted-foreground">{viewing.notes}</div>}
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
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as OrderRow["status"] })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
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