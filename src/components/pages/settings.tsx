import { User, Key, CreditCard, Bell, Shield, Puzzle } from "lucide-react";
import { PageHeader, Panel, Chip } from "./_shared";

const sections = [
  { icon: User, title: "Profile", desc: "Name, avatar, timezone", tone: "violet" as const },
  { icon: Key, title: "API Keys", desc: "Manage integration credentials", tone: "emerald" as const },
  { icon: CreditCard, title: "Billing", desc: "Plan, invoices, payment method", tone: "amber" as const },
  { icon: Bell, title: "Notifications", desc: "Email, Slack, in-app", tone: "violet" as const },
  { icon: Shield, title: "Security", desc: "2FA, sessions, audit log", tone: "emerald" as const },
  { icon: Puzzle, title: "Integrations", desc: "Zendesk, HubSpot, Stripe…", tone: "violet" as const },
];

export function SettingsPage() {
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Settings" description="Manage your workspace, team access, and every connected system." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Panel>
          <div className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Sections</div>
          <div className="space-y-1">
            {sections.map((s) => (
              <button key={s.title} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5">
                <s.icon className="h-4 w-4 text-primary" />
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <Panel key={s.title} className="group transition hover:border-primary/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display font-semibold">{s.title}</div>
                    <Chip tone={s.tone}>configured</Chip>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}