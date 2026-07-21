import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { AiEmployees } from "@/components/pages/ai-employees";

export const Route = createFileRoute("/ai-employees")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "AI Employees — KC" },
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