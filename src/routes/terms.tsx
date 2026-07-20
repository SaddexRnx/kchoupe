import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Atlas AI" },
      { name: "description", content: "The terms that govern your use of Atlas AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="This page is maintained by Atlas AI. It summarizes how you may use the product. It is not a substitute for a signed agreement — reach out to hello@atlas.ai for enterprise contracts."
    >
      <p className="text-xs text-muted-foreground">Last updated: 20 July 2026</p>

      <h2>1. Your account</h2>
      <p>You are responsible for keeping your credentials safe and for activity in your workspace. One person or team per workspace; you can invite additional members from Settings.</p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>No unlawful, deceptive or abusive content.</li>
        <li>No sending unsolicited bulk messages ("spam") through connected channels.</li>
        <li>Respect the terms of any third-party channel you connect (WhatsApp, Instagram, Shopify, etc.).</li>
      </ul>

      <h2>3. Your content</h2>
      <p>You keep ownership of everything you upload — product catalogs, knowledge sources, customer conversations. You grant Atlas AI a limited license to process this content to operate the service on your behalf.</p>

      <h2>4. AI outputs</h2>
      <p>AI-generated replies are suggestions. You are responsible for reviewing them before they reach a customer where regulation requires it. Atlas AI is not liable for AI content you choose to publish.</p>

      <h2>5. Billing</h2>
      <p>Paid plans renew monthly unless cancelled from Settings → Billing. Trials are free and require no payment method.</p>

      <h2>6. Termination</h2>
      <p>You can cancel any time. We can suspend accounts that violate these terms, with reasonable notice where possible.</p>

      <h2>7. Changes</h2>
      <p>We may update these terms. Material changes will be announced by email or in-app before they take effect.</p>

      <h2>8. Contact</h2>
      <p>Questions? <a href="mailto:hello@atlas.ai">hello@atlas.ai</a>.</p>
    </MarketingPage>
  );
}
