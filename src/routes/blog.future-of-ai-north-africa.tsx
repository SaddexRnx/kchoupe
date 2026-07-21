import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";
import { MessageCircle, ShoppingBag, CreditCard, Languages } from "lucide-react";

const URL = "https://kchoupe.lovable.app/blog/future-of-ai-north-africa";
const TITLE = "The Future of AI in North African E-commerce: Conversational Commerce in the Maghreb";
const DESCRIPTION =
  "How conversational AI on WhatsApp and Instagram is reshaping e-commerce in Algeria, Tunisia and Morocco — with CIB, BaridiMob and trilingual (Arabic, French, Darija) support.";

export const Route = createFileRoute("/blog/future-of-ai-north-africa")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Atlas AI" },
          publisher: { "@type": "Organization", name: "Atlas AI" },
          mainEntityOfPage: URL,
          inLanguage: "en",
          about: [
            "conversational ai ecommerce",
            "ai in e-commerce",
            "North Africa e-commerce",
            "WhatsApp commerce",
          ],
        }),
      },
    ],
  }),
  component: BlogPost,
});

function BlogPost() {
  return (
    <MarketingPage
      eyebrow="Guide · 8 min read"
      title="The future of AI in North African e-commerce"
      intro="Conversational commerce on WhatsApp and Instagram is quietly rewriting how Algeria, Tunisia and Morocco buy online. Here is the honest field report for Maghreb merchants — what changed, what works, and what to build next."
    >
      <p>
        In Algiers, Tunis and Casablanca, the storefront is a chat window. The customer scrolls
        Instagram, taps a product, sends <em>"c'est combien ?"</em> in Darija — and expects a real
        answer within minutes. That single behaviour, more than any Shopify template, is what
        drives online sales in North Africa. It is also why <strong>conversational AI in
        e-commerce</strong> stopped being a Silicon Valley demo and became a survival tool for
        Maghreb shops.
      </p>

      <h2>Why the Maghreb skipped the classic web store</h2>
      <p>
        Europe and North America grew e-commerce on top of desktop web stores and bolted chat on
        later. The Maghreb did the opposite. Buyers were already on WhatsApp and Instagram before
        they trusted any storefront. Regional operators put 60–80% of online orders inside a DM,
        not on a product page. Cash on delivery still wins, and shipping is negotiated per wilaya,
        not automated. The winning merchants in 2026 are the ones whose AI can answer in Arabic,
        French and Darija without breaking character — at 2am, on a public holiday, in a group DM.
      </p>


      <h2>What conversational commerce actually looks like in 2026</h2>
      <ul>
        <li className="flex items-start gap-2">
          <MessageCircle className="mt-1 h-4 w-4 shrink-0 text-primary" />
          A customer messages your Instagram page in Darija asking if a product is available in
          size L. The AI replies in the same dialect, confirms stock, and shares a product card.
        </li>
        <li className="flex items-start gap-2">
          <ShoppingBag className="mt-1 h-4 w-4 shrink-0 text-primary" />
          The buyer taps <em>Order</em> inside WhatsApp. Name, wilaya, phone and payment method are
          collected in the same thread — no redirect, no abandoned cart.
        </li>
        <li className="flex items-start gap-2">
          <CreditCard className="mt-1 h-4 w-4 shrink-0 text-primary" />
          Payment is CIB, BaridiMob, Flouci, CMI — or cash on delivery. The AI knows which options
          are enabled for that wilaya and quotes shipping automatically.
        </li>
        <li className="flex items-start gap-2">
          <Languages className="mt-1 h-4 w-4 shrink-0 text-primary" />
          The next day, the same customer writes in French. The AI keeps context and continues the
          conversation as if nothing changed.
        </li>
      </ul>

      <h2>Trilingual support is not optional</h2>
      <p>
        The Maghreb is trilingual by default. A single conversation regularly switches between
        Arabic, French and Darija — sometimes inside one sentence. Generic English-first chatbots
        collapse under this. A useful AI teammate has to:
      </p>
      <ul>
        <li>Understand code-switched Darija, not only Modern Standard Arabic.</li>
        <li>Render Arabic right-to-left correctly in product cards and order confirmations.</li>
        <li>Localise numbers, currencies (DZD, TND, MAD) and wilaya / gouvernorat names.</li>
        <li>Stay on-brand and on-catalogue — never invent a product or a price.</li>
      </ul>

      <h2>Local payments: CIB, BaridiMob and the cash-on-delivery reality</h2>
      <p>
        Stripe and PayPal barely exist here. What works is what people already use: <strong>CIB</strong>
        and <strong>BaridiMob</strong> in Algeria, <strong>Flouci</strong> and bank transfers in
        Tunisia, <strong>CMI</strong> in Morocco — and, for the majority of orders, cash on
        delivery. Any AI that closes orders in the region must speak that reality. That means
        detecting the wilaya, confirming the address twice, and telling the courier what to
        collect. It also means the AI should never push a payment method that is not available in
        the customer's country.
      </p>

      <h2>Guardrails matter more than model size</h2>
      <p>
        The failure mode of AI in e-commerce is not "the answer was slow" — it is "the AI promised
        a product we do not sell". For Maghreb merchants running thin margins, hallucinated stock
        and invented discounts destroy trust in one screenshot. The teams winning with
        conversational AI treat the catalogue as the single source of truth, block off-topic
        questions, and hand off to a human the moment the customer asks for something outside the
        shop.
      </p>

      <h2>What to build (or buy) next</h2>
      <ol>
        <li>Connect your catalogue — Shopify, WooCommerce, or a scraped storefront — so the AI can only quote real products.</li>
        <li>Plug WhatsApp Business, Instagram and Facebook Messenger into the same inbox.</li>
        <li>Enable trilingual replies with a strict scope: products, orders and shipping only.</li>
        <li>Wire local payments (CIB, BaridiMob, CMI, Flouci) and cash on delivery per wilaya.</li>
        <li>Let a human step in on escalations, refunds, and anything the AI is not confident about.</li>
      </ol>

      <h2>The next 24 months</h2>
      <p>
        Expect two shifts. First, AI employees — not chatbots — will handle the majority of first
        contacts across Algerian, Tunisian and Moroccan shops. Second, the merchants who capture
        that wave will be the ones who treat AI as a colleague on the sales floor: trained on the
        catalogue, restricted to what they know, and fluent in the way their customers actually
        talk.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110"
        >
          Try Atlas free for 14 days
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10"
        >
          Talk to the team
        </Link>
      </div>
    </MarketingPage>
  );
}
