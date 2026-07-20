import { Link } from "@tanstack/react-router";
import {
  ArrowRight, Bot, Sparkles, ShoppingBag, MessageSquare, Zap, Globe, Shield, Check,
  Instagram, Facebook, MessageCircle, Store, Package, BarChart3, PlayCircle,
} from "lucide-react";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-primary/25 blur-3xl" />
        <div className="animate-float absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" style={{ animationDelay: "1.2s" }} />
        <div className="animate-float absolute left-1/2 top-[900px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" style={{ animationDelay: "0.6s" }} />
      </div>

      <Nav />

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs backdrop-blur">
          <span className="pulse-emerald inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-muted-foreground">Now live for Algeria · Tunisia · Morocco</span>
        </div>
        <h1 className="animate-fade-up mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl" style={{ animationDelay: "80ms" }}>
          Your AI workforce that
          <br />
          <span className="aurora-gradient-text animate-gradient">sells while you sleep.</span>
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg" style={{ animationDelay: "160ms" }}>
          Atlas AI trains employees that answer, upsell and close orders across WhatsApp, Instagram
          and your store — in Arabic, French and English. Setup in minutes, revenue by tonight.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <Link to="/signup" className="animate-glow inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]">
            Start free — no card needed <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={() => scrollToId("how-it-works")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/10">
            <PlayCircle className="h-4 w-4" /> See how it works
          </button>
        </div>
        <div className="animate-fade-up mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground" style={{ animationDelay: "320ms" }}>
          <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> 14-day free trial</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> CIB · BaridiMob · Flouci</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> RTL Arabic native</span>
        </div>

        <HeroPreview />
      </section>

      {/* FEATURES BENTO */}
      <section id="features" className="relative mx-auto max-w-6xl px-6 py-20 scroll-mt-20">
        <SectionHeader eyebrow="Built to sell" title="Everything your store needs, in one command center." />
        <div className="mt-10 grid gap-3 md:grid-cols-6 md:grid-rows-2">
          <BentoCard className="md:col-span-4 md:row-span-2" icon={Bot} title="AI employees with roles"
            body="Nova sells, Atlas supports, Sage onboards. Assign skills, pick a model, plug in your knowledge — they're on shift in 5 minutes." accent>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { n: "Nova", r: "Sales", g: "from-primary to-accent" },
                { n: "Atlas", r: "Support", g: "from-accent to-primary" },
                { n: "Sage", r: "Onboarding", g: "from-primary to-accent" },
              ].map((a) => (
                <div key={a.n} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className={"grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br " + a.g + " text-sm font-bold text-primary-foreground"}>{a.n[0]}</div>
                  <div className="mt-2 text-sm font-semibold">{a.n}</div>
                  <div className="text-[11px] text-muted-foreground">{a.r}</div>
                </div>
              ))}
            </div>
          </BentoCard>
          <BentoCard className="md:col-span-2" icon={MessageSquare} title="Omnichannel inbox"
            body="WhatsApp, Instagram DM, Messenger, TikTok, live chat — one thread per customer." />
          <BentoCard className="md:col-span-2" icon={ShoppingBag} title="Order-closing built-in"
            body="Your AI proposes, confirms and books orders — DZD, TND, MAD, cash-on-delivery included." />
          <BentoCard className="md:col-span-3" icon={Globe} title="Trilingual out of the box"
            body="Native Arabic (RTL), French and English. Switch mid-conversation without losing tone." />
          <BentoCard className="md:col-span-3" icon={Zap} title="Bring your own model"
            body="OpenAI, Claude, Mistral, Groq — or any OpenAI-compatible endpoint you host yourself." />
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="relative mx-auto max-w-6xl px-6 py-20 scroll-mt-20">
        <SectionHeader eyebrow="Plug into everything" title="Your stack, already connected." />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            { i: Store, l: "Shopify" }, { i: Store, l: "WooCommerce" }, { i: Package, l: "YouCan" },
            { i: MessageCircle, l: "WhatsApp" }, { i: Instagram, l: "Instagram" }, { i: Facebook, l: "Facebook" },
            { i: Globe, l: "Your website" }, { i: BarChart3, l: "GA4" }, { i: Bot, l: "OpenAI" },
            { i: Bot, l: "Claude" }, { i: Bot, l: "Mistral" }, { i: Sparkles, l: "+150 more" },
          ].map(({ i: Icon, l }, idx) => (
            <div key={l} className="glass-panel animate-fade-up group flex items-center gap-2 rounded-xl px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-primary/30"
              style={{ animationDelay: `${idx * 30}ms` }}>
              <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary/20 to-accent/10">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="truncate text-xs font-medium">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative mx-auto max-w-6xl px-6 py-20 scroll-mt-20">
        <SectionHeader eyebrow="Live in 5 minutes" title="Three steps to your first AI sale." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Create your workspace", d: "Sign up, pick your language and currency. We localize the whole app for Algeria, Tunisia or Morocco." },
            { n: "02", t: "Hire your first AI", d: "Pick a role (Sales / Support / Onboarding), a model, and drop in your website or catalog. Training takes ~90 seconds." },
            { n: "03", t: "Plug in a channel", d: "Connect WhatsApp Business or Instagram DM. Your AI answers the next message that lands." },
          ].map((s, i) => (
            <div key={s.n} className="glass-panel animate-fade-up card-sheen relative overflow-hidden rounded-2xl p-6" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="aurora-gradient-text animate-gradient font-display text-5xl font-black">{s.n}</div>
              <div className="mt-3 font-display text-lg font-bold">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <SectionHeader eyebrow="Real stores, real revenue" title="Shopkeepers who never sleep, thanks to Atlas." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { q: "Nova closed 41 orders overnight. I woke up to a full delivery route.", n: "Yasmine B.", r: "Kasbah Beauty · Algiers" },
            { q: "Arabic replies feel like our team wrote them. Customers can't tell.", n: "Karim H.", r: "Medina Coffee · Casablanca" },
            { q: "Cut our reply time from 4 hours to 12 seconds. Sales up 3.2×.", n: "Sofia M.", r: "Tanger Textiles · Tunis" },
          ].map((t, i) => (
            <div key={t.n} className="glass-panel animate-fade-up rounded-2xl p-6" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex gap-0.5 text-amber-300">
                {Array.from({ length: 5 }).map((_, k) => <Star key={k} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="mt-3 font-display text-base leading-relaxed">"{t.q}"</p>
              <div className="mt-4 text-sm font-semibold">{t.n}</div>
              <div className="text-xs text-muted-foreground">{t.r}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <SectionHeader eyebrow="Pricing" title="Local prices for local shops." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "Starter", p: "0", sub: "14-day trial", f: ["1 AI employee", "500 messages/mo", "1 channel", "Email support"], cta: "Start free" },
            { n: "Growth", p: "4,900", sub: "DZD / month", f: ["5 AI employees", "10k messages/mo", "All channels", "Custom models", "CIB / BaridiMob"], cta: "Get Growth", featured: true },
            { n: "Scale", p: "14,900", sub: "DZD / month", f: ["Unlimited employees", "100k messages/mo", "Priority support", "Dedicated onboarding"], cta: "Talk to sales" },
          ].map((t) => (
            <div key={t.n}
              className={"glass-panel animate-fade-up relative rounded-2xl p-6 " +
                (t.featured ? "border-primary/40 shadow-lg shadow-primary/20" : "")}>
              {t.featured && (
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">Most popular</div>
              )}
              <div className="font-display text-lg font-bold">{t.n}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-black">{t.p}</span>
                <span className="text-xs text-muted-foreground">{t.sub}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.f.map((x) => (
                  <li key={x} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {x}</li>
                ))}
              </ul>
              <Link to="/signup" className={"mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition " +
                  (t.featured
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110"
                    : "border border-white/10 bg-white/5 hover:bg-white/10")}>{t.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-5xl px-6 py-24">
        <div className="glass-panel card-sheen animate-fade-up relative overflow-hidden rounded-3xl p-10 text-center md:p-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
            <div className="animate-float absolute -left-10 top-0 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />
            <div className="animate-float absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-accent/30 blur-3xl" style={{ animationDelay: "1.2s" }} />
          </div>
          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="mt-6 font-display text-3xl font-black tracking-tight md:text-5xl">
              Hire your first <span className="aurora-gradient-text animate-gradient">AI employee</span> tonight.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              14 days free. Cancel with one click. Set up in 5 minutes and let your store handle itself.
            </p>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]">
              Create my workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link to="/" className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-black tracking-tight">Atlas AI</span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
        <a href="#features" className="transition hover:text-foreground">Features</a>
        <a href="#pricing" className="transition hover:text-foreground">Pricing</a>
        <Link to="/dashboard" className="transition hover:text-foreground">Product tour</Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground">Sign in</Link>
        <Link to="/signup" className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:brightness-110">Get started</Link>
      </div>
    </header>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="animate-fade-up text-center">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</div>
      <h2 className="mx-auto max-w-3xl font-display text-3xl font-black tracking-tight md:text-5xl">
        {title}
      </h2>
    </div>
  );
}

function BentoCard({ icon: Icon, title, body, className = "", accent, children }: { icon: any; title: string; body: string; className?: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className={"glass-panel card-sheen animate-fade-up group relative overflow-hidden rounded-2xl p-6 transition hover:-translate-y-0.5 hover:border-primary/30 " + className}>
      <div className={"inline-flex h-10 w-10 items-center justify-center rounded-xl " + (accent ? "bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30" : "bg-white/5 border border-white/10")}>
        <Icon className={"h-5 w-5 " + (accent ? "text-primary-foreground" : "text-primary")} />
      </div>
      <div className="mt-4 font-display text-lg font-bold">{title}</div>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="animate-fade-up relative mx-auto mt-16 max-w-5xl" style={{ animationDelay: "400ms" }}>
      <div className="glass-panel card-sheen relative overflow-hidden rounded-3xl p-4 shadow-2xl shadow-primary/20 md:p-6">
        <div className="flex items-center gap-1.5 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[11px] text-muted-foreground">atlas.ai/dashboard</span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { l: "Revenue today", v: "142,300 DZD", s: "+18%" },
            { l: "Orders by AI", v: "37", s: "+9 vs yest." },
            { l: "Live chats", v: "12", s: "3 escalated" },
            { l: "CSAT", v: "4.9", s: "★ 240 rated" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div>
              <div className="mt-1 font-display text-xl font-bold">{k.v}</div>
              <div className="text-[10px] text-emerald-300">{k.s}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-xs text-muted-foreground">Live conversations</div>
            {[
              { n: "Amel", m: "Do you have the argan oil in 100ml?", t: "just now", tag: "Nova" },
              { n: "Rachid", m: "شكرا، خذيت الطلبية", t: "1m", tag: "Atlas" },
              { n: "Léa", m: "Livraison sur Oran?", t: "2m", tag: "Nova" },
            ].map((c) => (
              <div key={c.n} className="flex items-center gap-3 border-t border-white/5 py-2 first:border-0">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/30 text-xs font-bold">{c.n[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.n}</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{c.tag}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.m}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{c.t}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-primary/15 to-accent/10 p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nova's shift</div>
            <div className="mt-1 font-display text-lg font-bold">Closing 3 orders</div>
            <div className="pulse-emerald mt-3 inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            <div className="mt-2 text-xs text-muted-foreground">Auto-responding on WhatsApp, Instagram DM & site chat.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-black/20 backdrop-blur">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-black">Atlas AI</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">The AI workforce for North African commerce.</p>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Shield className="h-3 w-3" /> SOC 2 · GDPR-aligned
          </div>
        </div>
        {[
          { h: "Product", l: ["Features", "Integrations", "Pricing", "Changelog"] },
          { h: "Company", l: ["About", "Careers", "Contact", "Blog"] },
          { h: "Resources", l: ["Docs", "API", "Community", "Status"] },
        ].map((col) => (
          <div key={col.h}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{col.h}</div>
            <ul className="space-y-2 text-sm">
              {col.l.map((x) => <li key={x}><a href="#" className="text-muted-foreground transition hover:text-foreground">{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5 px-6 py-5 text-center text-[11px] text-muted-foreground">© 2026 Atlas AI. Made in Algiers.</div>
    </footer>
  );
}