import { Nav, Footer } from "./landing";

export function MarketingPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="animate-float absolute -right-32 top-40 h-[380px] w-[380px] rounded-full bg-accent/15 blur-3xl" style={{ animationDelay: "1.2s" }} />
      </div>
      <Nav />
      <section className="relative mx-auto max-w-3xl px-6 pt-16 pb-10 md:pt-24">
        {eyebrow && (
          <div className="animate-fade-up mb-3 text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="animate-fade-up font-display text-4xl font-black tracking-tight md:text-6xl">
          {title}
        </h1>
        {intro && (
          <p className="animate-fade-up mt-5 max-w-2xl text-base text-muted-foreground md:text-lg" style={{ animationDelay: "80ms" }}>
            {intro}
          </p>
        )}
      </section>
      <section className="relative mx-auto max-w-3xl px-6 pb-24">
        <div className="animate-fade-up glass-panel rounded-3xl p-6 md:p-10" style={{ animationDelay: "120ms" }}>
          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h2:mt-8 prose-h2:text-xl prose-h2:font-bold prose-p:text-sm prose-p:text-muted-foreground prose-li:text-sm prose-li:text-muted-foreground prose-a:text-primary">
            {children}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
