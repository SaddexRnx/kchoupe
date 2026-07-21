import { createFileRoute, Link } from "@tanstack/react-router";
import { Map, ExternalLink, Home, Sparkles, BookOpen, ShieldCheck, ChevronRight } from "lucide-react";

type Item = { to: string; label: string; desc?: string; icon?: any };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Marketing",
    items: [
      { to: "/", label: "Home", desc: "The Atlas AI landing page.", icon: Home },
      { to: "/about", label: "About", desc: "Our mission and team." },
      { to: "/contact", label: "Contact", desc: "Talk to us." },
      { to: "/blog/future-of-ai-north-africa", label: "Blog · Future of AI in North Africa", icon: BookOpen },
      { to: "/status", label: "Status", desc: "Live uptime & health checks." },
      { to: "/security", label: "Security", desc: "How we protect your data.", icon: ShieldCheck },
    ],
  },
  {
    title: "Get started",
    items: [
      { to: "/login", label: "Sign in" },
      { to: "/signup", label: "Create account", icon: Sparkles },
      { to: "/reset-password", label: "Reset password" },
    ],
  },
  {
    title: "Legal",
    items: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
    ],
  },
];


export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap — Atlas AI" },
      { name: "description", content: "Every public page on Atlas AI: marketing, sign-in and legal." },
      { property: "og:title", content: "Atlas AI · Sitemap" },
      { property: "og:description", content: "Every public page on Atlas AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/sitemap" }],
  }),
  component: SitemapPage,
});

function SitemapPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Sitemap</h1>
            <p className="text-sm text-muted-foreground">Every public page on Atlas AI, in one place.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10">
              XML sitemap <ExternalLink className="h-3 w-3" />
            </a>
            <a href="/robots.txt" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 hover:bg-white/10">
              robots.txt <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {groups.map((g, gi) => (
            <section
              key={g.title}
              style={{ animationDelay: `${gi * 60}ms` }}
              className="animate-fade-up rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{g.title}</h2>
              </div>
              <ul className="divide-y divide-white/5">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to as any}
                        className="group flex items-start gap-3 rounded-lg px-2 py-2.5 text-sm transition hover:bg-white/5"
                      >
                        {Icon ? (
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{it.label}</div>
                          {it.desc && <div className="mt-0.5 text-xs text-muted-foreground">{it.desc}</div>}
                        </div>
                        <span className="mt-0.5 font-mono text-[10px] text-muted-foreground group-hover:text-foreground">{it.to}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-muted-foreground">
          Can't find what you're looking for? <Link to="/contact" className="text-primary hover:underline">Get in touch</Link> — we'll point you in the right direction.
        </div>
      </div>
    </main>
  );
}
