import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingPage } from "@/components/marketing/page-shell";
import { useToast } from "@/components/pages/_shared";
import { Mail, MessageCircle, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Atlas AI" },
      { name: "description", content: "Talk to the Atlas AI team about your store, integrations or a demo." },
      { property: "og:title", content: "Contact Atlas AI" },
      { property: "og:description", content: "Reach the team — sales, support, partnerships." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.push({ kind: "warn", title: "Fill in every field" });
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(`Atlas AI — message from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:hello@atlas.ai?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      toast.push({ kind: "success", title: "Opening your email app" });
    }, 400);
  };

  return (
    <MarketingPage
      eyebrow="Get in touch"
      title="Let's talk."
      intro="Sales, support, partnerships — send a note and we'll reply within one business day."
    >
      <div className="not-prose grid gap-3 sm:grid-cols-3">
        {[
          { i: Mail, t: "Email", d: "hello@atlas.ai", href: "mailto:hello@atlas.ai" },
          { i: MessageCircle, t: "WhatsApp", d: "+213 555 000 000", href: "https://wa.me/213555000000" },
          { i: MapPin, t: "Office", d: "Algiers, Algeria" },
        ].map(({ i: Icon, t, d, href }) => (
          <a key={t} href={href ?? "#"} className="glass-panel group flex items-start gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-primary/30">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </div>
          </a>
        ))}
      </div>

      <form onSubmit={submit} className="not-prose mt-8 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@store.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10" />
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="How can we help?"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10" />
        <button type="submit" disabled={sending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 disabled:opacity-60">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </MarketingPage>
  );
}
