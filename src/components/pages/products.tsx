import { useMemo, useRef, useState } from "react";
import { Package, Plus, Search, Upload, Filter, Edit3, Trash2, Eye, MoreHorizontal, TrendingUp } from "lucide-react";
import { PageHeader, Panel, Chip, Modal, TextField, PrimaryButton, GhostButton, useToast, useConfirm } from "./_shared";
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
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rowsState, setRowsState] = useState<Row[]>(seed);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", category: "Beauty", price: "", stock: "", image: "📦" });

  const categories = useMemo(() => ["all", ...Array.from(new Set(rowsState.map(r => r.category)))], [rowsState]);

  const rows = useMemo(() => rowsState.filter(r =>
    (cat === "all" || r.category === cat) &&
    (status === "all" || r.status === status) &&
    (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.sku.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, status, rowsState]);

  const totals = useMemo(() => ({
    products: rowsState.length,
    active: rowsState.filter(r => r.status === "active").length,
    stock: rowsState.reduce((s, r) => s + r.stock, 0),
    ai: rowsState.reduce((s, r) => s + r.aiSold, 0),
  }), [rowsState]);

  const create = () => {
    const price = parseInt(draft.price || "0", 10);
    const stock = parseInt(draft.stock || "0", 10);
    if (!draft.name.trim() || !price) {
      toast.push({ kind: "warn", title: "Missing details", body: "Product needs a name and price." });
      return;
    }
    const sku = "AT-" + Math.floor(1000 + Math.random() * 9000);
    const row: Row = { sku, name: draft.name.trim(), category: draft.category, price, currency: "DZD", stock, status: stock > 0 ? "active" : "draft", sold30: 0, aiSold: 0, image: draft.image };
    setRowsState((r) => [row, ...r]);
    setAddOpen(false);
    setDraft({ name: "", category: "Beauty", price: "", stock: "", image: "📦" });
    toast.push({ kind: "success", title: "Product added", body: `${row.name} is now in your catalog.` });
  };

  const saveEdit = () => {
    if (!editing) return;
    setRowsState((rs) => rs.map((r) => r.sku === editing.sku ? editing : r));
    setEditing(null);
    toast.push({ kind: "success", title: "Product updated" });
  };

  const remove = async (r: Row) => {
    setMenuFor(null);
    const ok = await ask({ title: `Delete ${r.name}?`, danger: true });
    if (!ok) return;
    setRowsState((rs) => rs.filter((x) => x.sku !== r.sku));
    toast.push({ kind: "success", title: "Product removed" });
  };

  const duplicate = (r: Row) => {
    setMenuFor(null);
    const copy: Row = { ...r, sku: r.sku + "-COPY-" + Math.floor(Math.random() * 99), name: r.name + " (copy)", status: "draft", sold30: 0, aiSold: 0 };
    setRowsState((rs) => [copy, ...rs]);
    toast.push({ kind: "success", title: "Duplicated", body: copy.name });
  };

  const handleImport = (file: File) => {
    toast.push({ kind: "info", title: "Importing…", body: file.name });
    setTimeout(() => {
      const extra: Row[] = [
        { sku: "AT-9001", name: "Imported — Olive oil 500ml", category: "Grocery", price: 780, currency: "DZD", stock: 40, status: "active", sold30: 0, aiSold: 0, image: "🫒" },
        { sku: "AT-9002", name: "Imported — Amber perfume",  category: "Beauty",  price: 5400, currency: "DZD", stock: 12, status: "active", sold30: 0, aiSold: 0, image: "💎" },
      ];
      setRowsState((rs) => [...extra, ...rs]);
      toast.push({ kind: "success", title: "Import complete", body: `${extra.length} products added from ${file.name}.` });
    }, 900);
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("prod.eyebrow")}
        title={t("prod.title")}
        description={t("prod.desc")}
        actions={
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
            <GhostButton onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {t("common.import")}
            </GhostButton>
            <PrimaryButton onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> {t("prod.new")}
            </PrimaryButton>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { l: t("prod.title"), v: totals.products, sub: t("prod.in_catalog") },
          { l: t("common.active"),   v: totals.active,   sub: t("prod.live_on_store") },
          { l: t("prod.total_stock"), v: totals.stock, sub: t("prod.units") },
          { l: t("prod.sold_ai"), v: totals.ai, sub: t("prod.auto_fulfilled") },
        ].map((s) => (
          <div key={s.l} className="glass-panel animate-fade-up rounded-xl px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            <div className="mt-0.5 font-display text-lg font-bold leading-tight">{s.v.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">{s.sub}</div>
          </div>
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
                <button onClick={() => setViewing(r)} title={t("common.view")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>
                <button onClick={() => setEditing(r)} title={t("common.edit")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><Edit3 className="h-3.5 w-3.5" /></button>
                <div className="relative">
                  <button onClick={() => setMenuFor(menuFor === r.sku ? null : r.sku)} title={t("common.more")}  className="rounded p-1.5 hover:bg-white/10 hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                  {menuFor === r.sku && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                      <div className="glass-panel absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-lg text-left text-xs">
                        <button onClick={() => duplicate(r)} className="block w-full px-3 py-2 hover:bg-white/10">Duplicate</button>
                        <button onClick={() => { setMenuFor(null); toast.push({ kind: "info", title: "Share link copied" }); }} className="block w-full px-3 py-2 hover:bg-white/10">Copy share link</button>
                        <button onClick={() => remove(r)} className="block w-full px-3 py-2 text-left text-rose-300 hover:bg-rose-500/10">Delete</button>
                      </div>
                    </>
                  )}
                </div>
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

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add product"
        description="Add a product to your catalog. AI employees will use it in conversations."
        footer={<>
          <GhostButton onClick={() => setAddOpen(false)}>Cancel</GhostButton>
          <PrimaryButton onClick={create}><Plus className="h-4 w-4" /> Add product</PrimaryButton>
        </>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="Argan hair oil 60ml" />
          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Category</div>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
              {["Beauty", "Grocery", "Home", "Fashion", "Accessories", "Other"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <TextField label="Price (DZD)" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} placeholder="1490" type="number" />
          <TextField label="Stock" value={draft.stock} onChange={(v) => setDraft({ ...draft, stock: v })} placeholder="100" type="number" />
          <label className="block md:col-span-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Icon</div>
            <div className="flex flex-wrap gap-1.5">
              {["📦","💧","🌾","🍲","🧣","🍵","🌴","☕","🌹","👗","👛","🫒","💎"].map((e) => (
                <button key={e} type="button" onClick={() => setDraft({ ...draft, image: e })}
                  className={"flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition " +
                    (draft.image === e ? "border-primary/60 bg-primary/10 scale-110" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                  {e}
                </button>
              ))}
            </div>
          </label>
        </div>
      </Modal>

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={viewing.name} description={`SKU ${viewing.sku} · ${viewing.category}`}
          footer={<><GhostButton onClick={() => { setViewing(null); setEditing(viewing); }}><Edit3 className="h-3.5 w-3.5" /> Edit</GhostButton><PrimaryButton onClick={() => setViewing(null)}>Close</PrimaryButton></>}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex h-32 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-6xl">{viewing.image}</div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Price</div><div className="mt-1 font-display text-lg font-bold">{fmt(viewing.price, viewing.currency)}</div></div>
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Stock</div><div className="mt-1 font-display text-lg font-bold">{viewing.stock}</div></div>
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Sold 30d</div><div className="mt-1 font-display text-lg font-bold">{viewing.sold30}</div></div>
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Sold by AI</div><div className="mt-1 font-display text-lg font-bold text-primary">{viewing.aiSold}</div></div>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Edit ${editing.name}`}
          footer={<><GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton><PrimaryButton onClick={saveEdit}>Save</PrimaryButton></>}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField label="Category" value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} />
            <TextField label="Price" value={String(editing.price)} onChange={(v) => setEditing({ ...editing, price: parseInt(v || "0", 10) })} type="number" />
            <TextField label="Stock" value={String(editing.stock)} onChange={(v) => setEditing({ ...editing, stock: parseInt(v || "0", 10) })} type="number" />
            <label className="block md:col-span-2">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Status</div>
              <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Row["status"] })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="out">Out of stock</option>
              </select>
            </label>
          </div>
        </Modal>
      )}

      {confirmNode}
    </div>
  );
}