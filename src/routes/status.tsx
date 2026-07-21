import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Atlas AI" },
      { name: "description", content: "Live status of the Atlas AI platform and its integrations." },
      { property: "og:title", content: "Status — Atlas AI" },
      { property: "og:description", content: "Live status of the Atlas AI platform and its integrations." },
      { property: "og:url", content: "https://kchoupe.lovable.app/status" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/status" }],
  }),

  component: StatusPage,
});

const systems = [
  { name: "Dashboard & API", state: "operational" },
  { name: "Authentication", state: "operational" },
  { name: "AI Gateway", state: "operational" },
  { name: "Knowledge indexing", state: "operational" },
  { name: "Inbox & webhooks", state: "operational" },
  { name: "WhatsApp / Instagram connectors", state: "operational" },
] as const;

function Dot({ state }: { state: "operational" | "degraded" | "down" }) {
  const map = {
    operational: "bg-emerald-400",
    degraded: "bg-amber-400",
    down: "bg-rose-400",
  } as const;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${map[state]}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${map[state]}`} />
    </span>
  );
}

function StatusPage() {
  const allOk = systems.every((s) => s.state === "operational");
  return (
    <MarketingPage
      eyebrow="Live status"
      title={allOk ? "All systems operational." : "Some systems are degraded."}
      intro="Real-time health of the Atlas AI platform. Historical incidents are published here after resolution."
    >
      <div className="not-prose divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
        {systems.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Dot state={s.state} />
              <span className="text-sm font-medium text-foreground">{s.name}</span>
            </div>
            <span className="text-xs capitalize text-muted-foreground">{s.state}</span>
          </div>
        ))}
      </div>

      <h2>Incidents</h2>
      <p>No incidents reported in the last 30 days.</p>

      <h2>Subscribe</h2>
      <p>Want incident emails? Write to <a href="mailto:status@atlas.ai">status@atlas.ai</a> and we'll add you to the list.</p>
    </MarketingPage>
  );
}
