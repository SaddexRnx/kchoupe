import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/marketing/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas AI — Your AI Workforce for Commerce" },
      { name: "description", content: "Build, train, and deploy AI employees that sell, support, and grow your store 24/7. Made for North Africa first." },
      { property: "og:title", content: "Atlas AI — Your AI Workforce for Commerce" },
      { property: "og:description", content: "AI employees that sell, support, and grow your store 24/7." },
    ],
  }),
  component: Landing,
});