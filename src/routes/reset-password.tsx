import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/pages/_shared";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Atlas AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts a `type=recovery` in the URL hash and sets a temp session.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else {
        // Wait briefly for the client to pick up the hash tokens.
        const sub = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session) setReady(true);
        });
        setTimeout(() => sub.data.subscription.unsubscribe(), 4000);
      }
    };
    check();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) {
      toast.push({ kind: "error", title: "Weak password", body: "Use at least 6 characters." });
      return;
    }
    if (pw !== confirm) {
      toast.push({ kind: "error", title: "Passwords don't match" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.push({ kind: "success", title: "Password updated", body: "You can now sign in with your new password." });
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.push({ kind: "error", title: "Couldn't update password", body: err?.message ?? "Try requesting a new link." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="animate-float absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-accent/25 blur-3xl" style={{ animationDelay: "1.4s" }} />
      </div>

      <div className="glass-panel animate-scale-in relative z-10 w-full max-w-md rounded-3xl p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-black">Atlas AI</span>
        </Link>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Secure recovery
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold">Set a new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Choose a strong password you haven't used before."
              : "Verifying your recovery link…"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <PwField label="New password" value={pw} onChange={setPw} show={show} setShow={setShow} />
          <PwField label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} />
          <button type="submit" disabled={loading || !ready}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
            {loading ? "Updating…" : (<>Update password <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, show, setShow }: { label: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="At least 6 characters"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary/50 focus:bg-white/10"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-white/10">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
