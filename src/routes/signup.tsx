import { createFileRoute } from "@tanstack/react-router";
import { setNoIndexHeader } from "@/lib/noindex";
import { AuthPage } from "@/components/marketing/auth";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => setNoIndexHeader(),
  head: () => ({
    meta: [
      { title: "Create your workspace — KC" },
      { name: "description", content: "Start a 14-day free trial and launch your first AI employee in minutes." },
      { property: "og:title", content: "Create your workspace — KC" },
      { property: "og:description", content: "Start a 14-day free trial and launch your first AI employee in minutes." },
      { property: "og:url", content: "https://kchoupe.lovable.app/signup" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://kchoupe.lovable.app/signup" }],
  }),

  component: () => <AuthPage mode="signup" />,
});