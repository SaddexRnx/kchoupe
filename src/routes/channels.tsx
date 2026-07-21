import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ChannelsPage } from "@/components/pages/channels";

export const Route = createFileRoute("/channels")({
  head: () => ({
    meta: [
      { title: "Channels · Atlas AI" },
      { name: "description", content: "Connect Telegram bots, Facebook pages, and your own OpenAI-compatible AI endpoints — every save is verified with a live handshake." },
    ],
  }),
  component: () => (
    <AppShell active="channels">
      <ChannelsPage />
    </AppShell>
  ),
});
