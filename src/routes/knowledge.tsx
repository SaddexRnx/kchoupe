import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { Knowledge } from "@/components/pages/knowledge";

export const Route = createFileRoute("/knowledge")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Knowledge — KC" },
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