import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Orders } from "@/components/pages/orders";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Atlas AI" },
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