import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Playground } from "@/components/pages/playground";

export const Route = createFileRoute("/playground")({
  component: () => (
    <AppShell active="playground">
      <Playground />
    </AppShell>
  ),
});