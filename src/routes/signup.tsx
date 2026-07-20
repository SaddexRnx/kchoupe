import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/marketing/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create your workspace — Atlas AI" }] }),
  component: () => <AuthPage mode="signup" />,
});