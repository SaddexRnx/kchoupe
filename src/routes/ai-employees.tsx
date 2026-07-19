import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AiEmployees } from "@/components/pages/ai-employees";

export const Route = createFileRoute("/ai-employees")({
  component: () => (
    <AppShell active="ai-employees">
      <AiEmployees />
    </AppShell>
  ),
});