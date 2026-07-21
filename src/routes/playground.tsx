import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Playground } from "@/components/pages/playground";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Playground — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/playground" }],
  }),
  component: () => (
    <AppShell active="playground">
      <Playground />
    </AppShell>
  ),
});