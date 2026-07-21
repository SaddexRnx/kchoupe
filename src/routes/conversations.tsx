import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Conversations } from "@/components/pages/conversations";

export const Route = createFileRoute("/conversations")({
  head: () => ({
    meta: [
      { title: "Conversations — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/conversations" }],
  }),
  component: () => (
    <AppShell active="conversations">
      <Conversations />
    </AppShell>
  ),
});