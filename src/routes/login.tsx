import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/marketing/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Atlas AI" },
      { name: "description", content: "Sign in to your Atlas AI workspace to manage AI employees, products and conversations." },
      { property: "og:title", content: "Sign in — Atlas AI" },
      { property: "og:description", content: "Sign in to your Atlas AI workspace." },
      { property: "og:url", content: "https://kchoupe.lovable.app/login" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/login" }],
  }),

  component: () => <AuthPage mode="login" />,
});