import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WorkspaceInfo = {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string;
  currency: string;
  country: string | null;
};

export const getMyWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkspaceInfo> => {
    const { supabase, userId } = context;
    const { data: ws, error: wsErr } = await supabase.rpc("ensure_default_workspace", { _user_id: userId });
    if (wsErr) throw new Error(wsErr.message);
    const { data, error } = await supabase
      .from("workspaces")
      .select("id,name,plan,trial_ends_at,currency,country")
      .eq("id", ws as string)
      .single();
    if (error) throw new Error(error.message);
    return data as WorkspaceInfo;
  });

// Only 'trial' can be self-activated. Paid tiers (starter/growth/scale)
// require a verified billing event and must be set server-side by the
// billing webhook handler — not accepted from the client.
const SELF_SERVE_PLANS = new Set(["trial"]);

export const activatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: string }) => {
    if (!input?.plan || !SELF_SERVE_PLANS.has(input.plan)) {
      throw new Error("Paid plans require checkout. Please complete payment to upgrade.");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<WorkspaceInfo> => {
    const { supabase, userId } = context;
    const { data: ws, error: wsErr } = await supabase.rpc("ensure_default_workspace", { _user_id: userId });
    if (wsErr) throw new Error(wsErr.message);
    const { data: row, error } = await supabase
      .from("workspaces")
      .update({ plan: data.plan })
      .eq("id", ws as string)
      .select("id,name,plan,trial_ends_at,currency,country")
      .single();
    if (error) throw new Error(error.message);
    return row as WorkspaceInfo;
  });
