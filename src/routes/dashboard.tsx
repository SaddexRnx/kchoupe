import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/dashboard" }],
  }),
  component: () => (
    <AppShell active="dashboard">
      <Dashboard />
    </AppShell>
  ),
});