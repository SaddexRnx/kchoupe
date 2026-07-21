import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { Orders } from "@/components/pages/orders";

export const Route = createFileRoute("/orders")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Orders — KC" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/orders" }],
  }),
  component: () => (
    <AppShell active="orders">
      <Orders />
    </AppShell>
  ),
});