import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiEmployeeRow = {
  id: string;
  name: string;
  role: string;
  model: string;
  system_prompt: string | null;
  avatar_emoji: string;
  status: "active" | "training" | "paused";
  created_at: string;
  convos: number;
};

export const listAiEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiEmployeeRow[]> => {
    const { supabase, userId } = context;
    const { data: ws, error: wsErr } = await supabase.rpc("ensure_default_workspace", { _user_id: userId });
    if (wsErr) throw new Error(wsErr.message);
    const [emps, convos] = await Promise.all([
      supabase
        .from("ai_employees")
        .select("id,name,role,model,system_prompt,avatar_emoji,status,created_at")
        .eq("workspace_id", ws as string)
        .order("created_at", { ascending: false }),
      supabase
        .from("inbox_conversations")
        .select("ai_employee_id")
        .eq("workspace_id", ws as string),
    ]);
    if (emps.error) throw new Error(emps.error.message);
    const counts = new Map<string, number>();
    for (const c of (convos.data ?? []) as Array<{ ai_employee_id: string | null }>) {
      if (c.ai_employee_id) counts.set(c.ai_employee_id, (counts.get(c.ai_employee_id) ?? 0) + 1);
    }
    return ((emps.data ?? []) as any[]).map((e) => ({ ...e, convos: counts.get(e.id) ?? 0 })) as AiEmployeeRow[];
  });

export const createAiEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; role: string; model: string; system_prompt?: string; avatar_emoji?: string }) => {
    if (!input?.name?.trim() || !input?.role?.trim() || !input?.model?.trim()) {
      throw new Error("Name, role and model are required");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<AiEmployeeRow> => {
    const { supabase, userId } = context;
    const { data: ws, error: wsErr } = await supabase.rpc("ensure_default_workspace", { _user_id: userId });
    if (wsErr) throw new Error(wsErr.message);
    const { data: row, error } = await supabase
      .from("ai_employees")
      .insert({
        workspace_id: ws as string,
        created_by: userId,
        name: data.name.trim(),
        role: data.role.trim(),
        model: data.model,
        system_prompt: data.system_prompt ?? null,
        avatar_emoji: data.avatar_emoji ?? "🤖",
        status: "active",
      })
      .select("id,name,role,model,system_prompt,avatar_emoji,status,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...(row as any), convos: 0 } as AiEmployeeRow;
  });

export const updateAiEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name?: string; role?: string; model?: string; system_prompt?: string | null; avatar_emoji?: string; status?: "active" | "training" | "paused" }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<AiEmployeeRow> => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase
      .from("ai_employees")
      .update(patch)
      .eq("id", id)
      .select("id,name,role,model,system_prompt,avatar_emoji,status,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row as AiEmployeeRow;
  });

export const deleteAiEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("ai_employees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });