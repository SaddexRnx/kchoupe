import { PageHeader, Panel, Chip } from "./_shared";
import { Download } from "lucide-react";
import { useT } from "@/lib/i18n";

const orders = [
  { id: "ORD-2841", customer: "Sarah Kim", product: "Team", amount: 99, status: "paid", date: "Jul 19" },
  { id: "ORD-2840", customer: "Mike Ross", product: "Starter", amount: 29, status: "paid", date: "Jul 19" },
  { id: "ORD-2839", customer: "Lea Park", product: "Business", amount: 299, status: "pending", date: "Jul 18" },
  { id: "ORD-2838", customer: "Jon Yu", product: "Team", amount: 99, status: "paid", date: "Jul 18" },
  { id: "ORD-2837", customer: "Amy Chen", product: "Enterprise", amount: 999, status: "paid", date: "Jul 17" },
  { id: "ORD-2836", customer: "Kai Nakamura", product: "Voice add-on", amount: 49, status: "refunded", date: "Jul 17" },
  { id: "ORD-2835", customer: "Raj Patel", product: "Team", amount: 99, status: "paid", date: "Jul 16" },
];

const tones = { paid: "emerald", pending: "amber", refunded: "rose" } as const;
const statusKey = { paid: "common.paid", pending: "common.pending", refunded: "common.refunded" } as const;

export function Orders() {
  const t = useT();
  return (
    <div>
      <PageHeader
        eyebrow={t("ord.eyebrow")}
        title={t("ord.title")}
        description={t("ord.desc")}
        actions={
          <button className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
            <Download className="h-4 w-4" /> {t("common.export")}
          </button>
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
              <tr key={o.id} className="transition hover:bg-white/5">
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
    </div>
  );
}