import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/page-shell";
import { Bot, Globe, Heart, Zap } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Atlas AI" },
      { name: "description", content: "Atlas AI is building the AI workforce for North African commerce — trilingual, local-first, revenue-focused." },
      { property: "og:title", content: "About Atlas AI" },
      { property: "og:description", content: "Built in Algiers, made for Algeria, Tunisia and Morocco." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <MarketingPage
      eyebrow="Our story"
      title="AI employees, made in Algiers."
      intro="Atlas AI helps North African shops sell around the clock in Arabic, French and English — without hiring a bigger team."
    >
      <p>
        We started Atlas because the tools built in Silicon Valley rarely speak our language,
        our currencies or our channels. Shops in Algiers, Tunis and Casablanca sell on
        WhatsApp and Instagram at 11pm — not in an English SaaS dashboard during business hours.
      </p>
      <h2>What we believe</h2>
      <ul>
        <li className="flex items-start gap-2"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> AI employees should feel like teammates, not chatbots.</li>
        <li className="flex items-start gap-2"><Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Arabic (RTL), French and Darija are first-class — not an afterthought.</li>
        <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Setup in minutes beats a six-week integration every time.</li>
        <li className="flex items-start gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Local rails (CIB, BaridiMob, Flouci, CMI, COD) matter more than global logos.</li>
      </ul>
      <h2>Where we are</h2>
      <p>Team distributed between Algiers, Tunis and Paris. Talk to us anytime at <a href="mailto:hello@atlas.ai">hello@atlas.ai</a>.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110">
          Start free
        </Link>
        <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:bg-white/10">
          Contact us
        </Link>
      </div>
    </MarketingPage>
  );
}
