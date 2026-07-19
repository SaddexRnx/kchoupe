import { useMemo, useState } from "react";
import { Package, Plus, Search, Upload, Filter, Edit3, Trash2, Eye, MoreHorizontal, TrendingUp } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";
import { useT } from "@/lib/i18n";

// User's OWN products — sold on their store. Shown as a compact list, not big cards.
type Row = {
  sku: string;
  name: string;
  category: string;
  price: number;
  currency: "DZD" | "TND" | "MAD" | "EUR" | "USD";
  stock: number;
  status: "active" | "draft" | "out";
  sold30: number;
  aiSold: number; // sold via an AI employee
  image: string;
};

const seed: Row[] = [
  { sku: "AT-1001", name: "Argan hair oil 60ml",       category: "Beauty",      price: 1490, currency: "DZD", stock: 128, status: "active", sold30: 84,  aiSold: 41,  image: "💧" },
  { sku: "AT-1002", name: "Berber wool throw",         category: "Home",        price: 6500, currency: "DZD", stock: 22,  status: "active", sold30: 12,  aiSold: 7,   image: "🧣" },
  { sku: "AT-1003", name: "Saffron 5g jar",            category: "Grocery",     price: 890,  currency: "DZD", stock: 240, status: "active", sold30: 156, aiSold: 92,  image: "🌾" },
  { sku: "AT-1004", name: "Handmade leather wallet",   category: "Accessories", price: 3200, currency: "DZD", stock: 0,   status: "out",    sold30: 32,  aiSold: 18,  image: "👛" },
  { sku: "AT-1005", name: "Ceramic tagine 28cm",       category: "Home",        price: 4800, currency: "DZD", stock: 40,  status: "active", sold30: 21,  aiSold: 9,   image: "🍲" },
  { sku: "AT-1006", name: "Mint tea gift set",         category: "Grocery",     price: 2100, currency: "DZD", stock: 88,  status: "active", sold30: 44,  aiSold: 22,  image: "🍵" },
  { sku: "AT-1007", name: "Kaftan — size M",           category: "Fashion",     price: 8900, currency: "DZD", stock: 12,  status: "draft",  sold30: 0,   aiSold: 0,   image: "👗" },
  { sku: "AT-1008", name: "Dates Deglet Nour 1kg",     category: "Grocery",     price: 1250, currency: "DZD", stock: 310, status: "active", sold30: 201, aiSold: 118, image: "🌴" },
  { sku: "AT-1009", name: "Copper coffee pot",         category: "Home",        price: 2750, currency: "DZD", stock: 14,  status: "active", sold30: 6,   aiSold: 3,   image: "☕" },
  { sku: "AT-1010", name: "Rose water 250ml",          category: "Beauty",      price: 690,  currency: "DZD", stock: 62,  status: "active", sold30: 39,  aiSold: 25,  image: "🌹" },
];

function fmt(v: number, cur: Row["currency"]) {
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v); }
  catch { return `${v} ${cur}`; }
}

export function Products() {
  const t = useT();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const categories = useMemo(() => ["all", ...Array.from(new Set(seed.map(r => r.category)))], []);

  const rows = useMemo(() => seed.filter(r =>
    (cat === "all" || r.category === cat) &&
    (status === "all" || r.status === status) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, status]);

  const totals = useMemo(() => ({
    products: seed.length,
    active: seed.filter(r => r.status === "active").length,
    stock: seed.reduce((s, r) => s + r.stock, 0),
    ai: seed.reduce((s, r) => s + r.aiSold, 0),
  }), []);

  return (
    <div>
      <PageHeader
        eyebrow={t("prod.eyebrow")}
        title={t("prod.title")}
        description={t("prod.desc")}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
              <Upload className="h-4 w-4" /> {t("common.import")}
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110">
              <Plus className="h-4 w-4" /> {t("prod.new")}
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: t("prod.title"), v: totals.products, sub: t("prod.in_catalog") },
          { l: t("common.active"),   v: totals.active,   sub: t("prod.live_on_store") },
          { l: t("prod.total_stock"), v: totals.stock, sub: t("prod.units") },
          { l: t("prod.sold_ai"), v: totals.ai, sub: t("prod.auto_fulfilled") },
        ].map((s) => (
          <Panel key={s.l} className="animate-fade-up">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.v.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">{s.sub}</div>
          </Panel>
        ))}
      </div>

      <Panel className="mb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("prod.search")} className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
              {categories.map(c => <option key={c} value={c}>{c === "all" ? t("common.all_categories") : c}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm">
              <option value="all">{t("common.any_status")}</option>
              <option value="active">{t("common.active")}</option>
              <option value="draft">{t("common.draft")}</option>
              <option value="out">{t("common.out_of_stock")}</option>
            </select>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="hidden grid-cols-[minmax(260px,2fr)_1fr_120px_100px_140px_140px_60px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[11px] uppercase tracking-widest text-muted-foreground md:grid">
          <div>{t("prod.col.product")}</div>
          <div>{t("prod.col.category")}</div>
          <div className="text-right">{t("prod.col.price")}</div>
          <div className="text-right">{t("prod.col.stock")}</div>
          <div className="text-right">{t("prod.col.sold30")}</div>
          <div className="text-right">{t("prod.col.sold_ai")}</div>
          <div />
        </div>
        <ul className="divide-y divide-white/5">
          {rows.map((r, i) => (
            <li key={r.sku}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                className="animate-fade-up grid grid-cols-1 items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/5 md:grid-cols-[minmax(260px,2fr)_1fr_120px_100px_140px_140px_60px]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-lg">{r.image}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.name}</span>
                    {r.status === "draft" && <Chip tone="amber">{t("common.draft")}</Chip>}
                    {r.status === "out" && <Chip tone="rose">{t("common.out_of_stock")}</Chip>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{r.sku}</span>
                    {r.aiSold > 0 && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <TrendingUp className="h-3 w-3" /> {t("prod.ai_drove", { pct: Math.round(r.aiSold / Math.max(1, r.sold30) * 100) })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground md:text-sm">{r.category}</div>
              <div className="text-right font-display font-semibold">{fmt(r.price, r.currency)}</div>
              <div className={"text-right text-xs md:text-sm " + (r.stock === 0 ? "text-rose-300" : r.stock < 20 ? "text-amber-300" : "text-foreground")}>{r.stock}</div>
              <div className="text-right text-xs text-muted-foreground md:text-sm">{r.sold30}</div>
              <div className="text-right text-xs md:text-sm">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">{r.aiSold}</span>
              </div>
              <div className="flex justify-end gap-1 text-muted-foreground">
                <button title={t("common.view")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>
                <button title={t("common.edit")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /></button>
                <button title={t("common.more")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="p-10 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 h-5 w-5 opacity-50" />
              {t("prod.empty")}
            </li>
          )}
        </ul>
      </Panel>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Trash2 className="h-3 w-3" /> {t("prod.bulk")}
      </div>
    </div>
  );
}