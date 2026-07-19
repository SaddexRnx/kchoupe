import { Package, Plus, TrendingUp } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

const products = [
  { name: "Starter", price: 29, subs: 428, trend: "+12%", tone: "emerald" as const },
  { name: "Team", price: 99, subs: 214, trend: "+8%", tone: "violet" as const },
  { name: "Business", price: 299, subs: 87, trend: "+21%", tone: "emerald" as const },
  { name: "Enterprise", price: 999, subs: 14, trend: "+3%", tone: "amber" as const },
  { name: "Add-on: Voice", price: 49, subs: 132, trend: "+18%", tone: "violet" as const },
  { name: "Add-on: Analytics", price: 39, subs: 96, trend: "+9%", tone: "emerald" as const },
];

export function Products() {
  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Plans, add-ons and offers your AI employees can quote, upsell and provision."
        actions={
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110">
            <Plus className="h-4 w-4" /> New product
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Panel key={p.name} className="group transition hover:border-primary/30">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <Chip tone={p.tone}><TrendingUp className="h-3 w-3" /> {p.trend}</Chip>
            </div>
            <div className="mt-4 font-display text-xl font-semibold">{p.name}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold aurora-gradient-text">${p.price}</span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-muted-foreground">
              <span>Active subscribers</span>
              <span className="font-semibold text-foreground">{p.subs.toLocaleString()}</span>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}