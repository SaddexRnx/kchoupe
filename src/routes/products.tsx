import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Products } from "@/components/pages/products";

export const Route = createFileRoute("/products")({
  component: () => (
    <AppShell active="products">
      <Products />
    </AppShell>
  ),
});