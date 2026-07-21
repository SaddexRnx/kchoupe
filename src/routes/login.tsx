import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AuthPage } from "@/components/marketing/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Sign in — KC" },
      { name: "description", content: "Sign in to your KC workspace to manage AI employees, products and conversations." },
      { property: "og:title", content: "Sign in — KC" },
      { property: "og:description", content: "Sign in to your KC workspace." },
      { property: "og:url", content: "https://kchoupe.lovable.app/login" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/login" }],
  }),

  component: () => <AuthPage mode="login" />,
});