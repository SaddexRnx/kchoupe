import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AppShell } from "@/components/app-shell";
import { SettingsPage } from "@/components/pages/settings";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Settings — KC" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/settings" }],
  }),
  component: () => (
    <AppShell active="settings">
      <SettingsPage />
    </AppShell>
  ),
});