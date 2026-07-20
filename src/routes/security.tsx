import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";
import { Lock, ShieldCheck, KeyRound, Database, Users, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Atlas AI" },
      { name: "description", content: "How Atlas AI protects your workspace, your data and your customers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

const controls = [
  { i: Lock, t: "Encryption in transit", d: "All traffic to Atlas AI uses HTTPS/TLS." },
  { i: Database, t: "Row-level access", d: "Every table enforces workspace-scoped row-level security so data can't cross tenants." },
  { i: KeyRound, t: "Secret handling", d: "Integration credentials are stored server-side and masked in the UI — never returned in plaintext to the browser." },
  { i: Users, t: "Auth & sessions", d: "Email/password and Google sign-in with managed sessions. Password reset requires a verified email link." },
  { i: ShieldCheck, t: "Least-privilege server functions", d: "All privileged actions go through authenticated server functions, never a direct client-to-database write." },
  { i: AlertTriangle, t: "Report a vulnerability", d: "Found something? Email security@atlas.ai — we respond within one business day." },
];

function SecurityPage() {
  return (
    <MarketingPage
      eyebrow="Security"
      title="Built to keep your store safe."
      intro="This page is maintained by Atlas AI to describe the security controls we have shipped today. It is not an independent certification."
    >
      <div className="not-prose grid gap-3 sm:grid-cols-2">
        {controls.map(({ i: Icon, t, d }) => (
          <div key={t} className="glass-panel rounded-2xl p-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">{t}</div>
            <div className="mt-1 text-xs text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>

      <h2>Shared responsibility</h2>
      <p>
        Atlas AI runs the platform and enforces the controls above. As a workspace owner, you control who
        you invite, which integrations you connect, and which AI providers process your prompts. Keep team
        members and connected accounts up to date from Settings.
      </p>

      <h2>Report a vulnerability</h2>
      <p>
        We welcome responsible disclosure. Please email <a href="mailto:security@atlas.ai">security@atlas.ai</a>{" "}
        with steps to reproduce. Do not run automated scans against production accounts.
      </p>
    </MarketingPage>
  );
}
