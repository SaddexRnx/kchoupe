import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Store, MessageCircle, Instagram, Facebook,
  Globe, Bot, Rocket, Languages, DollarSign,
} from "lucide-react";
import { useToast } from "@/components/pages/_shared";

const STEPS = ["Workspace", "Region", "Channels", "Your first AI", "Launch"];

export function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);

  const [workspace, setWorkspace] = useState("");
  const [role, setRole] = useState("owner");
  const [country, setCountry] = useState("DZ");
  const [lang, setLang] = useState<"ar" | "fr" | "en">("fr");
  const [channels, setChannels] = useState<string[]>(["whatsapp"]);
  const [agentName, setAgentName] = useState("Nova");
  const [agentRole, setAgentRole] = useState("sales");
  const [launching, setLaunching] = useState(false);

  const toggleChannel = (c: string) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const canNext =
    (step === 0 && workspace.trim().length > 1) ||
    step === 1 ||
    (step === 2 && channels.length > 0) ||
    (step === 3 && agentName.trim().length > 1) ||
    step === 4;

  const next = () => {
    if (!canNext) {
      toast.push({ kind: "warn", title: "One more thing", body: "Complete this step before continuing." });
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const launch = () => {
    setLaunching(true);
    setTimeout(() => {
      toast.push({ kind: "success", title: "You're live!", body: `${agentName} is on shift.` });
      navigate({ to: "/dashboard" });
    }, 1500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora bg */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-24 top-0 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="animate-float absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent/25 blur-3xl" style={{ animationDelay: "1.4s" }} />
      </div>

      {/* Top bar */}
      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-black">Atlas AI</span>
        </Link>
        <button onClick={() => navigate({ to: "/dashboard" })} className="text-xs text-muted-foreground hover:text-foreground">
          Skip setup →
        </button>
      </header>

      {/* Stepper */}
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={"grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition " +
                (i < step
                  ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                  : i === step
                  ? "border-2 border-primary bg-primary/10 text-primary animate-glow"
                  : "border border-white/10 bg-white/5 text-muted-foreground")}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={"h-px flex-1 rounded transition " + (i < step ? "bg-gradient-to-r from-primary to-accent" : "bg-white/10")} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {STEPS.map((s, i) => (
            <div key={s} className={i === step ? "font-semibold text-foreground" : ""}>{s}</div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="relative mx-auto mt-8 max-w-3xl px-6 pb-16">
        <div key={step} className="glass-panel animate-scale-in rounded-3xl p-8 shadow-2xl shadow-primary/10 md:p-10">
          {step === 0 && (
            <Step title="Name your workspace" subtitle="This is what your team and AI will see.">
              <label className="block">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Workspace name</div>
                <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="Kasbah Beauty"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition focus:border-primary/50 focus:bg-white/10" />
              </label>
              <div className="mt-6">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Your role</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "owner", l: "Store owner" },
                    { id: "manager", l: "Manager" },
                    { id: "marketer", l: "Marketer" },
                  ].map((r) => (
                    <Tile key={r.id} active={role === r.id} onClick={() => setRole(r.id)}>{r.l}</Tile>
                  ))}
                </div>
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step title="Where do you sell?" subtitle="We localize the app, currency, and payment methods.">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "DZ", flag: "🇩🇿", n: "Algeria", cur: "DZD" },
                  { id: "TN", flag: "🇹🇳", n: "Tunisia", cur: "TND" },
                  { id: "MA", flag: "🇲🇦", n: "Morocco", cur: "MAD" },
                ].map((c) => (
                  <Tile key={c.id} active={country === c.id} onClick={() => setCountry(c.id)}>
                    <div className="text-2xl">{c.flag}</div>
                    <div className="mt-1 font-display font-bold">{c.n}</div>
                    <div className="text-[11px] text-muted-foreground">{c.cur}</div>
                  </Tile>
                ))}
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Languages className="h-3.5 w-3.5" /> Interface language
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "fr", l: "Français" },
                    { id: "ar", l: "العربية" },
                    { id: "en", l: "English" },
                  ].map((l) => (
                    <Tile key={l.id} active={lang === l.id} onClick={() => setLang(l.id as any)}>{l.l}</Tile>
                  ))}
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" /> Payments we'll enable
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(country === "DZ" ? ["CIB", "BaridiMob", "Cash on delivery"] :
                    country === "TN" ? ["Flouci", "D17", "Cash on delivery"] :
                    ["CMI", "PayZone", "Cash on delivery"]).map((p) => (
                    <span key={p} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary">{p}</span>
                  ))}
                </div>
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="Where do customers reach you?" subtitle="Pick every channel your AI should staff. Change anytime.">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  { id: "whatsapp", i: MessageCircle, l: "WhatsApp" },
                  { id: "instagram", i: Instagram, l: "Instagram DM" },
                  { id: "facebook", i: Facebook, l: "Messenger" },
                  { id: "website", i: Globe, l: "Website chat" },
                  { id: "shopify", i: Store, l: "Shopify" },
                  { id: "tiktok", i: Sparkles, l: "TikTok" },
                ].map((c) => {
                  const on = channels.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleChannel(c.id)}
                      className={"relative flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition " +
                        (on ? "border-primary/40 bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                      <div className={"grid h-9 w-9 place-items-center rounded-lg " + (on ? "bg-gradient-to-br from-primary to-accent text-primary-foreground" : "bg-white/5 text-primary")}>
                        <c.i className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{c.l}</span>
                      {on && <Check className="ml-auto h-4 w-4 text-emerald-300" />}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Hire your first AI employee" subtitle="Give them a name and a role. You can train them later.">
              <label className="block">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Employee name</div>
                <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Nova"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none transition focus:border-primary/50 focus:bg-white/10" />
              </label>
              <div className="mt-6">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Role</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sales", l: "Sales", d: "Upsells, closes" },
                    { id: "support", l: "Support", d: "Answers, refunds" },
                    { id: "onboarding", l: "Onboarding", d: "Guides new buyers" },
                  ].map((r) => (
                    <Tile key={r.id} active={agentRole === r.id} onClick={() => setAgentRole(r.id)}>
                      <div className="font-display font-bold">{r.l}</div>
                      <div className="text-[11px] text-muted-foreground">{r.d}</div>
                    </Tile>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-primary/15 to-accent/10 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground">
                  {agentName.charAt(0).toUpperCase() || "N"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold">{agentName || "Nova"}</div>
                  <div className="text-xs text-muted-foreground capitalize">{agentRole} · trained on your catalog · {lang.toUpperCase()}</div>
                </div>
                <Bot className="h-5 w-5 text-primary" />
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step title="Everything's ready." subtitle="Review and launch your workspace.">
              <div className="grid gap-2 text-sm">
                {[
                  { k: "Workspace", v: workspace || "Unnamed workspace" },
                  { k: "Region", v: country + " · " + lang.toUpperCase() },
                  { k: "Channels", v: channels.join(", ") || "none" },
                  { k: "First AI", v: `${agentName} · ${agentRole}` },
                ].map((r) => (
                  <div key={r.k} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{r.k}</span>
                    <span className="font-medium">{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl shadow-primary/40 animate-glow">
                  <Rocket className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="mt-4 font-display text-xl font-black">Ready for takeoff</div>
                <p className="mt-1 text-sm text-muted-foreground">Your dashboard is waiting on the other side.</p>
              </div>
            </Step>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={next}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98]">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={launch} disabled={launching}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
                {launching ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> Launching…</>
                ) : (
                  <>Launch workspace <Rocket className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-black tracking-tight md:text-3xl">
        <span className="aurora-gradient-text animate-gradient">{title}</span>
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Tile({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={"rounded-xl border p-4 text-center text-sm transition " +
        (active
          ? "border-primary/50 bg-primary/10 shadow-md shadow-primary/20"
          : "border-white/10 bg-white/5 hover:bg-white/10")}>
      {children}
    </button>
  );
}