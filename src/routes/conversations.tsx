import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { Conversations } from "@/components/pages/conversations";

export const Route = createFileRoute("/conversations")({
  beforeLoad: () => setNoIndexHeader(),
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