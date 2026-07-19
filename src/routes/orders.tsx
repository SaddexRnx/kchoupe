import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Orders } from "@/components/pages/orders";

export const Route = createFileRoute("/orders")({
  component: () => (
    <AppShell active="orders">
      <Orders />
    </AppShell>
  ),
});