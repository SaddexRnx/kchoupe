import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AiEmployees } from "@/components/pages/ai-employees";

export const Route = createFileRoute("/ai-employees")({
  head: () => ({
    meta: [
      { title: "AI Employees — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/ai-employees" }],
  }),
  component: () => (
    <AppShell active="ai-employees">
      <AiEmployees />
    </AppShell>
  ),
});