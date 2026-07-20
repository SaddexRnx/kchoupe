import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";
import { AdminPanel } from "@/components/admin-panel";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Atlas AI" }, { name: "robots", content: "noindex" }] }),
  component: AdminGate,
});

function AdminGate() {
  const navigate = useNavigate();
  const fn = useServerFn(amIAdmin);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return { isAdmin: false, signedIn: false };
      const r = await fn();
      return { ...r, signedIn: true };
    },
    retry: false,
  });

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data?.signedIn) { navigate({ to: "/login", replace: true }); return; }
    if (!data.isAdmin) { navigate({ to: "/dashboard", replace: true }); return; }
  }, [isLoading, isError, data, navigate]);

  if (isLoading || !data?.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40">
            <Shield className="h-5 w-5 text-primary-foreground animate-pulse" />
          </div>
          Verifying admin access…
        </div>
      </div>
    );
  }
  return <AdminPanel />;
}
