import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Activity, AlertTriangle,
  Clock, Users as UsersIcon, RefreshCw, Lock,
} from "lucide-react";
import {
  getSecurityStats, challenge2FA, get2FASession,
} from "@/lib/security.functions";
import { useToast } from "@/components/pages/_shared";

function Tile({ icon: Icon, label, value, tone = "default", hint }: {
  icon: any; label: string; value: string | number; tone?: "default" | "good" | "warn" | "bad"; hint?: string;
}) {
  const toneClass =
    tone === "good" ? "text-emerald-500" :
    tone === "warn" ? "text-amber-500" :
    tone === "bad"  ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-border">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    info: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    warn: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    critical: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  return map[sev?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}

export function SecurityDashboard() {
  const toast = useToast();
  const qc = useQueryClient();
  const fetchStats = useServerFn(getSecurityStats);
  const fetch2fa = useServerFn(get2FASession);
  const verify = useServerFn(challenge2FA);

  const stats = useQuery({
    queryKey: ["admin", "security-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30_000,
  });
  const session = useQuery({
    queryKey: ["admin", "2fa-session"],
    queryFn: () => fetch2fa(),
    refetchInterval: 60_000,
  });

  const [code, setCode] = useState("");
  const verifyMut = useMutation({
    mutationFn: (c: string) => verify({ data: { code: c } }),
    onSuccess: (r: any) => {
      toast.push({ kind: "success", title: "2FA verified", body: `Session valid until ${new Date(r.verifiedUntil).toLocaleTimeString()}` });
      setCode("");
      qc.invalidateQueries({ queryKey: ["admin", "2fa-session"] });
    },
    onError: (e: any) => toast.push({ kind: "error", title: "Verification failed", body: e?.message }),
  });

  const s = stats.data ?? {};
  const events: any[] = s.recent ?? [];
  const audit: any[] = s.audit_recent ?? [];
  const byKind: Record<string, number> = s.by_kind_7d ?? {};
  const adoptionPct = useMemo(() => {
    if (!s.total_users) return 0;
    return Math.round(((s["2fa_enabled_total"] ?? 0) / s.total_users) * 100);
  }, [s]);
  const adminsUnprotected = s.admins_without_2fa ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            2FA posture, rate-limit blocks, and the full audit trail.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          onClick={() => { stats.refetch(); session.refetch(); }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* 2FA session status banner */}
      {session.data && (
        <div className={`rounded-2xl border p-4 ${
          session.data.verified
            ? "border-emerald-500/30 bg-emerald-500/[0.06]"
            : "border-amber-500/30 bg-amber-500/[0.06]"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {session.data.verified
                ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
                : <ShieldAlert className="h-5 w-5 text-amber-500" />}
              <div>
                <div className="text-sm font-medium">
                  {session.data.verified ? "2FA session active" : "2FA verification required"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.data.verified
                    ? `Verified until ${new Date(session.data.verifiedUntil ?? Date.now()).toLocaleString()}`
                    : session.data.enabled
                      ? "Destructive admin actions are blocked until you verify."
                      : "Enable 2FA in Settings → Advanced to unlock privileged actions."}
                </div>
              </div>
            </div>
            {session.data.enabled && !session.data.verified && (
              <div className="flex items-center gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  placeholder="000000"
                  className="w-28 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-center font-mono tracking-widest text-sm outline-none focus:border-primary"
                />
                <button
                  disabled={code.length !== 6 || verifyMut.isPending}
                  onClick={() => verifyMut.mutate(code)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                >
                  {verifyMut.isPending ? "Verifying…" : "Verify"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile icon={UsersIcon} label="Users" value={s.total_users ?? 0} />
        <Tile icon={KeyRound} label="2FA adoption" value={`${adoptionPct}%`} tone={adoptionPct > 50 ? "good" : "warn"} hint={`${s["2fa_enabled_total"] ?? 0} enrolled`} />
        <Tile icon={Lock} label="Admins w/o 2FA" value={adminsUnprotected} tone={adminsUnprotected > 0 ? "bad" : "good"} hint={`${s["2fa_enabled_admins"] ?? 0} protected`} />
        <Tile icon={Activity} label="Events 24h" value={s.events_24h ?? 0} hint={`${s.events_7d ?? 0} last 7d`} />
        <Tile icon={AlertTriangle} label="Rate blocks 24h" value={s.blocks_24h ?? 0} tone={(s.blocks_24h ?? 0) > 0 ? "warn" : "default"} />
        <Tile icon={ShieldAlert} label="Critical 7d" value={s.critical_7d ?? 0} tone={(s.critical_7d ?? 0) > 0 ? "bad" : "good"} />
      </div>

      {/* Event kinds 7d */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="mb-3 text-sm font-semibold">Event types (last 7 days)</div>
        {Object.keys(byKind).length === 0 ? (
          <div className="text-xs text-muted-foreground">No security events recorded yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(byKind).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recent security events */}
      <div className="rounded-2xl border border-border/60 bg-card/40">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="text-sm font-semibold">Recent security events</div>
          <span className="text-[11px] text-muted-foreground">Last 50</span>
        </div>
        <div className="max-h-96 overflow-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No events yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card/80 text-left text-muted-foreground backdrop-blur">
                <tr>
                  <th className="p-3">When</th><th className="p-3">Kind</th>
                  <th className="p-3">Sev</th><th className="p-3">User</th><th className="p-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-3 tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(e.created_at).toLocaleString()}</span>
                    </td>
                    <td className="p-3 font-mono">{e.kind}</td>
                    <td className="p-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${severityBadge(e.severity)}`}>{e.severity}</span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.user_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-3">
                      <code className="rounded bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {JSON.stringify(e.detail).slice(0, 80)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Audit log */}
      <div className="rounded-2xl border border-border/60 bg-card/40">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="text-sm font-semibold">Audit log</div>
          <span className="text-[11px] text-muted-foreground">Workspace-scoped actions</span>
        </div>
        <div className="max-h-96 overflow-auto">
          {audit.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No audit entries yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card/80 text-left text-muted-foreground backdrop-blur">
                <tr>
                  <th className="p-3">When</th><th className="p-3">Action</th>
                  <th className="p-3">Actor</th><th className="p-3">Target</th><th className="p-3">Meta</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border/40 hover:bg-muted/20">
                    <td className="p-3 tabular-nums text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-3 font-mono">{a.action}</td>
                    <td className="p-3 font-mono text-[10px]">{a.actor_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-3 font-mono text-[10px]">{a.target_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-3">
                      <code className="rounded bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {JSON.stringify(a.metadata ?? a.detail ?? {}).slice(0, 80)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
