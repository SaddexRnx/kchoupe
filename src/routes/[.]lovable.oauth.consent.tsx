import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ShieldCheck } from "lucide-react";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Authorize access — KC" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } as any });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Could not load this authorization request</h1>
      <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as any;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "the requesting app";
  const redirectUri = details?.client?.redirect_uri ?? details?.client?.redirect_uris?.[0];
  const scopes: string[] = Array.isArray(details?.scopes) ? details.scopes : (details?.scope?.split(" ") ?? []);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message ?? "Something went wrong."); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6">
      <div className="rounded-2xl border bg-card/60 p-8 shadow-xl backdrop-blur">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">KC</span>
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Connect {clientName} to your account</h1>
        <p className="text-sm text-muted-foreground">
          {clientName} will be able to call KC's tools while you are signed in — reading products,
          orders and conversations, and creating orders in your workspace.
        </p>
        {redirectUri && (
          <p className="mt-3 break-all text-xs text-muted-foreground">Redirects to: <span className="font-mono">{redirectUri}</span></p>
        )}
        {scopes.length > 0 && (
          <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
            {scopes.map((s) => (
              <li key={s} className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> {s}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          This does not bypass KC's permissions or backend policies.
        </p>
        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        <div className="mt-6 flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
