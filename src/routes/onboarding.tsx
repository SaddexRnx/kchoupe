import { createFileRoute } from "@tanstack/react-router";
import { Onboarding } from "@/components/marketing/onboarding";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to Atlas AI" }] }),
  component: Onboarding,
});