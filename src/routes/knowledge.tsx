import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Knowledge } from "@/components/pages/knowledge";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/knowledge" }],
  }),
  component: () => (
    <AppShell active="knowledge">
      <Knowledge />
    </AppShell>
  ),
});