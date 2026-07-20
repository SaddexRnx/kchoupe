import { useState } from "react";
import { PageHeader, Panel, Chip, Modal, GhostButton, PrimaryButton, useToast } from "./_shared";
import { Download, Mail, RefreshCcw } from "lucide-react";
import { useT } from "@/lib/i18n";

type Order = { id: string; customer: string; product: string; amount: number; status: "paid" | "pending" | "refunded"; date: string };

const seedOrders: Order[] = [
  { id: "ORD-2841", customer: "Sarah Kim", product: "Team", amount: 99, status: "paid", date: "Jul 19" },
  { id: "ORD-2840", customer: "Mike Ross", product: "Starter", amount: 29, status: "paid", date: "Jul 19" },
  { id: "ORD-2839", customer: "Lea Park", product: "Business", amount: 299, status: "pending", date: "Jul 18" },
  { id: "ORD-2838", customer: "Jon Yu", product: "Team", amount: 99, status: "paid", date: "Jul 18" },
  { id: "ORD-2837", customer: "Amy Chen", product: "Enterprise", amount: 999, status: "paid", date: "Jul 17" },
  { id: "ORD-2836", customer: "Kai Nakamura", product: "Voice add-on", amount: 49, status: "refunded", date: "Jul 17" },
  { id: "ORD-2835", customer: "Raj Patel",   product: "Team",         amount: 99,  status: "paid",     date: "Jul 16" },
];

const tones = { paid: "emerald", pending: "amber", refunded: "rose" } as const;
const statusKey = { paid: "common.paid", pending: "common.pending", refunded: "common.refunded" } as const;

export function Orders() {
  const t = useT();
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [viewing, setViewing] = useState<Order | null>(null);

  const exportCsv = () => {
    const rows = [["id","customer","product","amount","status","date"], ...orders.map((o) => [o.id, o.customer, o.product, String(o.amount), o.status, o.date])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.push({ kind: "success", title: "Orders exported", body: `${orders.length} rows downloaded as CSV.` });
  };

  const refund = (o: Order) => {
    setOrders((os) => os.map((x) => x.id === o.id ? { ...x, status: "refunded" } : x));
    toast.push({ kind: "success", title: `Refunded ${o.id}` });
    setViewing(null);
  };
  const resend = (o: Order) => {
    toast.push({ kind: "success", title: "Receipt sent", body: `Emailed to ${o.customer}.` });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("ord.eyebrow")}
        title={t("ord.title")}
        description={t("ord.desc")}
        actions={
          <GhostButton onClick={exportCsv}>
            <Download className="h-4 w-4" /> {t("common.export")}
          </GhostButton>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[[t("ord.mrr"), "$28,421"], [t("ord.this_week"), "$4,182"], [t("ord.orders"), "142"], [t("ord.refund_rate"), "1.2%"]].map(([l, v]) => (
          <Panel key={l}>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{l}</div>
            <div className="mt-1 font-display text-2xl font-bold">{v}</div>
          </Panel>
        ))}
      </div>

      <Panel className="p-0">
        <table className="w-full text-sm">
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
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                <td className="px-4 py-3 font-medium">{o.customer}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.product}</td>
                <td className="px-4 py-3 text-right font-display font-semibold">${o.amount}</td>
                <td className="px-4 py-3"><Chip tone={tones[o.status as keyof typeof tones]}>{t(statusKey[o.status as keyof typeof statusKey])}</Chip></td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.id} description={`${viewing.customer} · ${viewing.date}`}
          footer={<>
            <GhostButton onClick={() => resend(viewing)}><Mail className="h-3.5 w-3.5" /> Resend receipt</GhostButton>
            {viewing.status === "paid" && <GhostButton tone="danger" onClick={() => refund(viewing)}><RefreshCcw className="h-3.5 w-3.5" /> Refund</GhostButton>}
            <PrimaryButton onClick={() => setViewing(null)}>Close</PrimaryButton>
          </>}>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{viewing.product}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-display text-lg font-bold">${viewing.amount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Chip tone={tones[viewing.status]}>{t(statusKey[viewing.status])}</Chip></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{viewing.customer}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
}