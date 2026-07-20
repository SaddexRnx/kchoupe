import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type PlaygroundMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export const sendPlaygroundMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    conversationId?: string;
    message: string;
    model: string;
    systemPrompt?: string;
    aiEmployeeId?: string;
  }) => {
    if (!input?.message?.trim()) throw new Error("Message is required");
    if (!input?.model?.trim()) throw new Error("Model is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Get or create conversation
    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("playground_conversations")
        .insert({
          user_id: userId,
          title: data.message.slice(0, 60),
          model: data.model,
          system_prompt: data.systemPrompt ?? null,
          ai_employee_id: data.aiEmployeeId ?? null,
        })
        .select("id")
        .single();
      if (convErr) throw new Error(convErr.message);
      conversationId = conv.id;
    }

    // Insert user message
    const { error: userMsgErr } = await supabase
      .from("playground_messages")
      .insert({ conversation_id: conversationId, role: "user", content: data.message });
    if (userMsgErr) throw new Error(userMsgErr.message);

    // Load full history
    const { data: history, error: histErr } = await supabase
      .from("playground_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (histErr) throw new Error(histErr.message);

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    if (data.systemPrompt?.trim()) messages.push({ role: "system", content: data.systemPrompt.trim() });
    for (const m of history ?? []) messages.push({ role: m.role as "user" | "assistant" | "system", content: m.content });

    // Call the model
    const gateway = createLovableAiGatewayProvider(apiKey);
    let assistantText = "";
    try {
      const result = await generateText({
        model: gateway(data.model),
        messages,
      });
      assistantText = result.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("429")) throw new Error("Rate limit reached — please wait a moment and try again.");
      if (message.includes("402")) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
      throw new Error(message);
    }

    // Persist assistant message
    const { data: saved, error: saveErr } = await supabase
      .from("playground_messages")
      .insert({ conversation_id: conversationId, role: "assistant", content: assistantText })
      .select("id,role,content,created_at")
      .single();
    if (saveErr) throw new Error(saveErr.message);

    return {
      conversationId,
      assistant: saved as PlaygroundMessage,
    };
  });

export const listPlaygroundMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => {
    if (!input?.conversationId) throw new Error("conversationId required");
    return input;
  })
  .handler(async ({ data, context }): Promise<PlaygroundMessage[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("playground_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PlaygroundMessage[];
  });

export const resetPlaygroundConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => {
    if (!input?.conversationId) throw new Error("conversationId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("playground_conversations").delete().eq("id", data.conversationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });