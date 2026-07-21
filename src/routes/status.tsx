import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — KC" },
      { name: "description", content: "Live status of the KC platform and its integrations." },
      { property: "og:title", content: "Status — KC" },
      { property: "og:description", content: "Live status of the KC platform and its integrations." },
      { property: "og:url", content: "https://kchoupe.lovable.app/status" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/status" }],
  }),
  component: StatusPage,
});

type State = "operational" | "degraded" | "down" | "checking";

type Check = {
  name: string;
  url: string;
  method?: "GET" | "HEAD";
  // 2xx or a specific status counts as up
  expect?: (res: Response) => boolean;
};

const CHECKS: Check[] = [
  { name: "Marketing site", url: "/" },
  { name: "Auth (login page)", url: "/login" },
  { name: "Dashboard shell", url: "/dashboard" },
  { name: "Sitemap", url: "/sitemap.xml" },
  { name: "Robots", url: "/robots.txt" },
  { name: "MCP list-tools", url: "/.mcp/list-tools" },
  {
    name: "Inbound webhook",
    url: "/api/public/webhooks/inbound",
    method: "GET",
    expect: (r) => r.status === 200,
  },
];

function Dot({ state }: { state: State }) {
  const map: Record<State, string> = {
    operational: "bg-emerald-400",
    degraded: "bg-amber-400",
    down: "bg-rose-400",
    checking: "bg-slate-400",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${map[state]}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${map[state]}`} />
    </span>
  );
}

async function ping(check: Check): Promise<{ state: State; ms: number }> {
  const start = performance.now();
  try {
    const res = await fetch(check.url, { method: check.method ?? "GET", cache: "no-store" });
    const ms = Math.round(performance.now() - start);
    const ok = check.expect ? check.expect(res) : res.ok;
    if (ok) return { state: "operational", ms };
    if (res.status >= 500) return { state: "down", ms };
    return { state: "degraded", ms };
  } catch {
    return { state: "down", ms: Math.round(performance.now() - start) };
  }
}

function StatusPage() {
  const [rows, setRows] = useState(() =>
    CHECKS.map((c) => ({ name: c.name, state: "checking" as State, ms: 0 })),
  );
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const results = await Promise.all(CHECKS.map(ping));
      if (cancelled) return;
      setRows(CHECKS.map((c, i) => ({ name: c.name, ...results[i] })));
      setLastCheck(new Date());
    }
    run();
    const id = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const anyDown = rows.some((r) => r.state === "down");
  const anyDegraded = rows.some((r) => r.state === "degraded");
  const anyChecking = rows.some((r) => r.state === "checking");

  const headline = anyDown
    ? "One or more systems are down."
    : anyDegraded
      ? "Some systems are degraded."
      : anyChecking
        ? "Running live checks…"
        : "All systems operational.";

  return (
    <MarketingPage
      eyebrow="Live status"
      title={headline}
      intro="Real-time health of the KC platform. This page runs actual HTTP checks against each surface every 30 seconds from your browser."
    >
      <div className="not-prose divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
        {rows.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Dot state={s.state} />
              <span className="text-sm font-medium text-foreground">{s.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">{s.ms}ms</span>
              <span className="text-xs capitalize text-muted-foreground">{s.state}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Last check: {lastCheck ? lastCheck.toLocaleTimeString() : "…"} · Auto-refresh every 30s
      </p>

      <h2>Incidents</h2>
      <p>No incidents reported in the last 30 days.</p>

      <h2>Subscribe</h2>
      <p>
        Want incident emails? Write to <a href="mailto:status@kc.app">status@kc.app</a> and we'll add
        you to the list.
      </p>
    </MarketingPage>
  );
}
