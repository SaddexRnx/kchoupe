import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Atlas AI" },
      { name: "description", content: "How Atlas AI collects, uses and protects your data." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Privacy"
      intro="This page is maintained by Atlas AI to answer common questions about how we handle your data. It reflects the controls we have shipped today, not a legal certification."
    >
      <p className="text-xs text-muted-foreground">Last updated: 20 July 2026</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — name, email, workspace settings you provide.</li>
        <li><strong>Content you upload</strong> — products, orders, knowledge sources, conversations you sync.</li>
        <li><strong>Usage data</strong> — basic telemetry (pages visited, errors) to keep the product working.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To operate the service you signed up for: authenticate you, run your AI employees, deliver messages, and improve the product. We do not sell your data.</p>

      <h2>Subprocessors</h2>
      <p>We rely on a small number of trusted providers to run Atlas AI, including cloud hosting, database, and the AI model providers you choose (e.g. OpenAI, Anthropic, Mistral, Groq). You control which model provider handles your prompts from Settings.</p>

      <h2>Data location & retention</h2>
      <p>Content is stored in managed databases with row-level access controls. You can delete a workspace at any time from Settings — deletion removes your data from active systems.</p>

      <h2>Your rights</h2>
      <p>You can access, export or delete your workspace data from Settings, or by contacting <a href="mailto:privacy@atlas.ai">privacy@atlas.ai</a>.</p>

      <h2>Cookies</h2>
      <p>We use strictly-necessary cookies for authentication. We do not use third-party advertising cookies.</p>

      <h2>Contact</h2>
      <p>Questions about privacy? <a href="mailto:privacy@atlas.ai">privacy@atlas.ai</a>.</p>
    </MarketingPage>
  );
}
