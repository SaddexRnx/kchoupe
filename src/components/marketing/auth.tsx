import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, ShieldCheck, Zap, Bot } from "lucide-react";
import { useToast } from "@/components/pages/_shared";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pw || (isSignup && !name)) {
      toast.push({ kind: "warn", title: "Almost there", body: "Fill in every field to continue." });
      return;
    }
    if (pw.length < 6) {
      toast.push({ kind: "error", title: "Weak password", body: "Use at least 6 characters." });
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email, password: pw,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.push({ kind: "success", title: "Workspace created", body: "Let's set things up." });
        navigate({ to: "/onboarding" });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        const u = data.user;
        const dn = ((u?.user_metadata as any)?.full_name as string) || ((u?.user_metadata as any)?.name as string) || u?.email?.split("@")[0] || "";
        toast.push({ kind: "success", title: `Welcome back${dn ? ", " + dn : ""}` });
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.push({ kind: "error", title: "Sign-in failed", body: err?.message ?? "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.push({ kind: "error", title: "Google sign-in failed", body: (result.error as any)?.message ?? "Please try again." });
      return;
    }
    if (result.redirected) return;
    navigate({ to: isSignup ? "/onboarding" : "/dashboard" });
  };

  return (
    <div className="relative grid min-h-screen overflow-hidden md:grid-cols-2">
      {/* Aurora bg */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-24 top-0 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="animate-float absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent/25 blur-3xl" style={{ animationDelay: "1.4s" }} />
      </div>

      {/* Left panel — brand story */}
      <aside className="relative hidden flex-col justify-between p-10 md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-black">Atlas AI</span>
        </Link>

        <div className="animate-fade-up relative">
          <h1 className="font-display text-4xl font-black leading-tight tracking-tight">
            {isSignup ? (
              <>Build a workforce<br /><span className="aurora-gradient-text animate-gradient">that never sleeps.</span></>
            ) : (
              <>Welcome back.<br /><span className="aurora-gradient-text animate-gradient">Your AI is on shift.</span></>
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            {isSignup
              ? "Create your workspace and hire your first AI employee in under 5 minutes. Free for 14 days."
              : "Sign in to check today's orders, live chats, and how much your AI closed while you were gone."}
          </p>

          <div className="mt-8 grid gap-3">
            {[
              { i: Bot, t: "Trilingual AI employees", d: "Arabic, French & English." },
              { i: Zap, t: "Live in 5 minutes", d: "No engineering team required." },
              { i: ShieldCheck, t: "Made for MENA", d: "CIB, BaridiMob, Flouci ready." },
            ].map(({ i: Icon, t, d }, i) => (
              <div key={t} className="animate-fade-up flex items-start gap-3" style={{ animationDelay: `${i * 100 + 100}ms` }}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">© 2026 Atlas AI — Made in Algiers.</div>
      </aside>

      {/* Right panel — form */}
      <main className="relative flex items-center justify-center p-6 md:p-10">
        <div className="glass-panel animate-scale-in w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-primary/10">
          <Link to="/" className="mb-6 flex items-center gap-2 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-base font-black">Atlas AI</span>
          </Link>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">{isSignup ? "Create your workspace" : "Sign in"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignup ? "Free for 14 days. No credit card." : "Enter your credentials to continue."}
            </p>
          </div>

          {/* OAuth */}
          <div className="grid gap-2">
            <button onClick={google}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-black">G</span>
              Continue with Google
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-white/10" />
            OR
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {isSignup && (
              <Field icon={User} label="Full name" value={name} onChange={setName} placeholder="Yasmine Boudiaf" />
            )}
            <Field icon={Mail} label="Email" value={email} onChange={setEmail} placeholder="you@store.com" type="email" />
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Password</div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-white/10">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignup ? (
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" defaultChecked className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[color:var(--color-primary)]" />
                <span>I agree to the <a className="text-primary hover:underline" href="#">Terms</a> and <a className="text-primary hover:underline" href="#">Privacy</a>.</span>
              </label>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[color:var(--color-primary)]" />
                  Remember me
                </label>
                <button type="button" onClick={async () => {
                  if (!email) { toast.push({ kind: "warn", title: "Enter your email first" }); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                  if (error) toast.push({ kind: "error", title: "Reset failed", body: error.message });
                  else toast.push({ kind: "success", title: "Reset link sent", body: "Check your inbox." });
                }}
                  className="text-primary hover:underline">Forgot password?</button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
              {loading ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" /> Working…</span>
              ) : (
                <>{isSignup ? "Create workspace" : "Sign in"} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {isSignup ? (
              <>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>
            ) : (
              <>New to Atlas? <Link to="/signup" className="text-primary hover:underline">Create a workspace</Link></>
            )}
          </div>

          {isSignup && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> 14-day trial</span>
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> No card</span>
              <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-400" /> Cancel anytime</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text" }: { icon: any; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10"
        />
      </div>
    </div>
  );
}