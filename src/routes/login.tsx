import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/marketing/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Atlas AI" }] }),
  component: () => <AuthPage mode="login" />,
});