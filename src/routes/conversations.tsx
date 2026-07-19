import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Conversations } from "@/components/pages/conversations";

export const Route = createFileRoute("/conversations")({
  component: () => (
    <AppShell active="conversations">
      <Conversations />
    </AppShell>
  ),
});