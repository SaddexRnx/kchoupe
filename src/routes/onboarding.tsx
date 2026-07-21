import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/components/marketing/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Atlas AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/onboarding" }],
  }),
  component: Onboarding,
});