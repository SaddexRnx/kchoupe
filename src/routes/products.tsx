import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Products } from "@/components/pages/products";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products — Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/products" }],
  }),
  component: () => (
    <AppShell active="products">
      <Products />
    </AppShell>
  ),
});