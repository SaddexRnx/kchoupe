// Advanced settings surface: 2FA, Referrals, Storefront, Backups, GDPR, Templates, Audit log.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Panel, useToast } from "./_shared";
import {
  start2FASetup, verify2FA, disable2FA, get2FAStatus,
  requestDataExport, requestAccountDelete,
  createBackup, listBackups, restoreBackup, deleteBackup,
  getReferralStats, updateStorefront, updateCurrency,
  listAuditLog, listTemplates, installTemplate,
} from "@/lib/features.functions";
import { getMyWorkspace } from "@/lib/workspace.functions";

export function AdvancedSection() {
  const toast = useToast();
  const [tab, setTab] = useState<"security" | "storefront" | "referral" | "backups" | "templates" | "audit" | "privacy">("security");

  const tabs = [
    { k: "security", l: "🔐 2FA" },
    { k: "storefront", l: "🛍️ Storefront" },
    { k: "referral", l: "🎁 Referrals" },
    { k: "backups", l: "💾 Backups" },
    { k: "templates", l: "📚 Templates" },
    { k: "audit", l: "📜 Audit log" },
    { k: "privacy", l: "🛡️ GDPR" },
  ] as const;

  return (
    <Panel className="animate-scale-in">
      <div className="mb-4">
        <div className="font-display text-lg font-semibold">Advanced</div>
        <div className="text-sm text-muted-foreground">Power features for owners & admins.</div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={"rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (tab === t.k ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5")}>
            {t.l}
          </button>
        ))}
      </div>
      {tab === "security" && <TwoFactor toast={toast} />}
      {tab === "storefront" && <Storefront toast={toast} />}
      {tab === "referral" && <Referral toast={toast} />}
      {tab === "backups" && <Backups toast={toast} />}
      {tab === "templates" && <Templates toast={toast} />}
      {tab === "audit" && <AuditLog />}
      {tab === "privacy" && <Privacy toast={toast} />}
    </Panel>
  );
}

/* ============ 2FA ============ */
function TwoFactor({ toast }: { toast: ReturnType<typeof useToast> }) {
  const start = useServerFn(start2FASetup);
  const verify = useServerFn(verify2FA);
  const disable = useServerFn(disable2FA);
  const status = useServerFn(get2FAStatus);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => { status().then(r => setEnabled(r.enabled)); }, []);

  if (enabled === null) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (enabled) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          ✅ 2FA is <b>active</b> on your account.
        </div>
        <button onClick={async () => {
          try { await disable(); setEnabled(false); toast.push({ kind: "success", title: "2FA disabled" }); }
          catch (e: any) { toast.push({ kind: "error", title: e.message }); }
        }} className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">Disable 2FA</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add an extra step at sign-in using an authenticator app (Google Authenticator, 1Password, Authy).</p>
      {!setup ? (
        <button onClick={async () => {
          try { const r = await start(); setSetup({ qr: r.qr, secret: r.secret }); }
          catch (e: any) { toast.push({ kind: "error", title: e.message }); }
        }} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">Start setup</button>
      ) : codes ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">✅ 2FA enabled. Save these backup codes:</div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {codes.map(c => <div key={c} className="rounded bg-white/5 px-2 py-1.5">{c}</div>)}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <img src={setup.qr} alt="2FA QR" className="rounded-xl bg-white p-3 w-48" />
          <div className="text-xs text-muted-foreground">Or paste this secret: <code className="rounded bg-white/5 px-1.5 py-0.5">{setup.secret}</code></div>
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value.trim())} placeholder="123456"
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm w-40" />
            <button onClick={async () => {
              try { const r = await verify({ data: { code } }); setCodes(r.backupCodes); setEnabled(true); toast.push({ kind: "success", title: "2FA enabled" }); }
              catch (e: any) { toast.push({ kind: "error", title: e.message }); }
            }} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">Verify</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ STOREFRONT ============ */
function Storefront({ toast }: { toast: ReturnType<typeof useToast> }) {
  const getWs = useServerFn(getMyWorkspace);
  const update = useServerFn(updateStorefront);
  const updCur = useServerFn(updateCurrency);
  const [wsId, setWsId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [tagline, setTagline] = useState("");
  const [currency, setCurrency] = useState("DZD");

  useEffect(() => {
    getWs().then((w: any) => {
      setWsId(w.id); setCurrency(w.currency);
      // Fetch slug via storefront update no-op:
    });
  }, []);

  const publicUrl = slug ? `${typeof window !== "undefined" ? window.location.origin : ""}/store/${slug}` : "";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Turn your catalog into a public store page you can share.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        Enable public storefront
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs text-muted-foreground">Slug (URL)
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-store"
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">Currency (ISO)
          <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3}
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">Tagline
          <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Beauty essentials from Algiers"
            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground" />
        </label>
      </div>
      {publicUrl && enabled && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          🔗 Public URL: <a href={publicUrl} target="_blank" className="underline">{publicUrl}</a>
        </div>
      )}
      <button onClick={async () => {
        if (!wsId) return;
        try {
          await update({ data: { workspaceId: wsId, enabled, slug: slug || undefined, tagline } });
          await updCur({ data: { workspaceId: wsId, currency } });
          toast.push({ kind: "success", title: "Storefront saved" });
        } catch (e: any) { toast.push({ kind: "error", title: e.message }); }
      }} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">Save</button>
    </div>
  );
}

/* ============ REFERRAL ============ */
function Referral({ toast }: { toast: ReturnType<typeof useToast> }) {
  const stats = useServerFn(getReferralStats);
  const [data, setData] = useState<any>(null);
  useEffect(() => { stats().then(setData); }, []);
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${data.code ?? ""}` : "";
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Share your code — each friend who signs up gets a Free trial, and you get <b>+10 days</b> added to your trial.</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Your referral link</div>
        <div className="mt-1 flex gap-2">
          <input readOnly value={link} className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono" />
          <button onClick={() => { navigator.clipboard.writeText(link); toast.push({ kind: "success", title: "Copied" }); }}
            className="rounded-lg bg-white text-black px-3 py-2 text-sm font-medium">Copy</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Referrals" v={data.referrals.length} />
        <Stat label="Days earned" v={`+${data.totalDaysEarned}`} />
      </div>
    </div>
  );
}

/* ============ BACKUPS ============ */
function Backups({ toast }: { toast: ReturnType<typeof useToast> }) {
  const getWs = useServerFn(getMyWorkspace);
  const list = useServerFn(listBackups);
  const create = useServerFn(createBackup);
  const restore = useServerFn(restoreBackup);
  const del = useServerFn(deleteBackup);
  const [wsId, setWsId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = async (id: string) => setItems(await list({ data: { workspaceId: id } }));
  useEffect(() => { getWs().then((w: any) => { setWsId(w.id); refresh(w.id); }); }, []);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Snapshot products, employees, knowledge and integrations. Restore any snapshot to roll back.</p>
      <button disabled={!wsId || busy} onClick={async () => {
        if (!wsId) return; setBusy(true);
        try { await create({ data: { workspaceId: wsId } }); await refresh(wsId); toast.push({ kind: "success", title: "Backup created" }); }
        catch (e: any) { toast.push({ kind: "error", title: e.message }); }
        finally { setBusy(false); }
      }} className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium disabled:opacity-50">
        {busy ? "Working…" : "+ Create backup"}
      </button>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-xs text-muted-foreground">No backups yet.</div>}
        {items.map((b: any) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <div className="text-sm font-medium">{b.label}</div>
              <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · {(b.size_bytes / 1024).toFixed(1)} KB</div>
            </div>
            <div className="flex gap-2">
              <button onClick={async () => {
                if (!wsId) return;
                try { await restore({ data: { backupId: b.id, workspaceId: wsId } }); toast.push({ kind: "success", title: "Restored" }); }
                catch (e: any) { toast.push({ kind: "error", title: e.message }); }
              }} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">Restore</button>
              <button onClick={async () => {
                await del({ data: { backupId: b.id } }); if (wsId) refresh(wsId);
              }} className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ TEMPLATES ============ */
function Templates({ toast }: { toast: ReturnType<typeof useToast> }) {
  const list = useServerFn(listTemplates);
  const install = useServerFn(installTemplate);
  const getWs = useServerFn(getMyWorkspace);
  const [items, setItems] = useState<any[]>([]);
  const [wsId, setWsId] = useState<string | null>(null);
  useEffect(() => {
    list().then(setItems);
    getWs().then((w: any) => setWsId(w.id));
  }, []);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Install a pre-built AI employee optimized for a category.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(t => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{t.avatar_emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{t.title} {t.featured && <span className="ml-1 text-[10px] rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5">Featured</span>}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{t.category}</div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{t.description}</div>
              </div>
            </div>
            <button disabled={!wsId} onClick={async () => {
              if (!wsId) return;
              try { await install({ data: { templateSlug: t.slug, workspaceId: wsId } }); toast.push({ kind: "success", title: `Installed ${t.title}` }); }
              catch (e: any) { toast.push({ kind: "error", title: e.message }); }
            }} className="mt-3 w-full rounded-lg bg-white text-black px-3 py-2 text-xs font-medium">Install</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ AUDIT ============ */
function AuditLog() {
  const list = useServerFn(listAuditLog);
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { list({ data: {} }).then(setItems); }, []);
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {items.length === 0 && <div className="text-xs text-muted-foreground">No audit events yet.</div>}
      {items.map(e => (
        <div key={e.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
          <div className="flex justify-between">
            <span className="font-mono">{e.action}</span>
            <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          {e.actor_email && <div className="text-muted-foreground mt-1">by {e.actor_email}</div>}
          {e.target_id && <div className="text-muted-foreground">→ {e.target_type}:{e.target_id}</div>}
        </div>
      ))}
    </div>
  );
}

/* ============ GDPR ============ */
function Privacy({ toast }: { toast: ReturnType<typeof useToast> }) {
  const exportFn = useServerFn(requestDataExport);
  const deleteFn = useServerFn(requestAccountDelete);
  const [confirm, setConfirm] = useState("");
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm font-semibold">Download your data</div>
        <p className="text-xs text-muted-foreground mt-1">Get a JSON export of your account, workspaces, orders and conversations.</p>
        <button onClick={async () => {
          try {
            const payload = await exportFn();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `kc-export-${Date.now()}.json`; a.click();
            URL.revokeObjectURL(url);
            toast.push({ kind: "success", title: "Export ready" });
          } catch (e: any) { toast.push({ kind: "error", title: e.message }); }
        }} className="mt-3 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">Download JSON</button>
      </div>
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
        <div className="text-sm font-semibold text-rose-300">Delete my account</div>
        <p className="text-xs text-muted-foreground mt-1">Permanently removes your login and marks your profile as deleted. Type <b>DELETE</b> to confirm.</p>
        <div className="mt-3 flex gap-2">
          <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <button disabled={confirm !== "DELETE"} onClick={async () => {
            try { await deleteFn({ data: { confirm } }); toast.push({ kind: "success", title: "Account deletion queued" }); window.location.href = "/"; }
            catch (e: any) { toast.push({ kind: "error", title: e.message }); }
          }} className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{v}</div>
    </div>
  );
}
