import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppShell active="dashboard">
      <Dashboard />
    </AppShell>
  ),
});