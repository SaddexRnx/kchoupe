import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Knowledge } from "@/components/pages/knowledge";

export const Route = createFileRoute("/knowledge")({
  component: () => (
    <AppShell active="knowledge">
      <Knowledge />
    </AppShell>
  ),
});