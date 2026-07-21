import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { Playground } from "@/components/pages/playground";

export const Route = createFileRoute("/playground")({
  beforeLoad: () => setNoIndexHeader(),
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