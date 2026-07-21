import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { Products } from "@/components/pages/products";

export const Route = createFileRoute("/products")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Products — KC" },
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