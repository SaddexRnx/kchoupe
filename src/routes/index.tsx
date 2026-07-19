import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell active="dashboard">
      <Dashboard />
    </AppShell>
  );
}
