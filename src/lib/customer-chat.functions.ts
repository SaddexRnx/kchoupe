import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// Strict prompt: AI acts only as a store assistant, answers only from provided catalog.
const SYSTEM_GUARDRAIL = `You are Atlas, a customer-support assistant for an online store.
STRICT RULES:
1. You ONLY answer questions about the store's products, prices, stock, orders, shipping, returns, and general customer inquiries.
2. If asked anything unrelated (coding help, math, world facts, opinions, jokes, politics, personal advice, off-topic small talk), politely decline in ONE sentence and steer them back to shopping.
3. NEVER invent products, prices, or availability. Use ONLY the "PRODUCT CATALOG" section below. If a product is not listed, say it is not available and suggest the closest listed alternatives.
4. Speak in the customer's language (auto-detect). Be short, warm and helpful.
5. When suggesting products, cite the exact name, price and stock from the catalog.`;

function buildCatalog(products: any[]): string {
  if (!products.length) return "PRODUCT CATALOG: (empty — the store has no products listed yet)";
  const lines = products.slice(0, 200).map((p) => {
    const stock = p.status === "out" || p.stock === 0 ? "OUT OF STOCK" : `${p.stock} in stock`;
    const desc = p.description ? ` — ${String(p.description).slice(0, 160)}` : "";
    return `• [${p.sku}] ${p.name} · ${p.category} · ${p.price} ${p.currency} · ${stock}${desc}`;
  });
  return `PRODUCT CATALOG (${products.length} items):\n${lines.join("\n")}`;
}

export const askCustomerAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
    customModelId?: string;
    fallbackModel?: string;
  }) => {
    if (!input?.message?.trim()) throw new Error("Message required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ws } = await supabase.rpc("ensure_default_workspace");
    const wsId = ws as string;

    // Load catalog (workspace-scoped via RLS)
    const { data: products } = await supabase
      .from("products")
      .select("sku,name,category,price,currency,stock,status,description")
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false })
      .limit(300);

    const catalog = buildCatalog(products || []);
    const system = `${SYSTEM_GUARDRAIL}\n\n${catalog}`;

    // Route: custom model if selected, else Lovable AI Gateway
    let model: any;
    if (data.customModelId) {
      const { data: cm, error } = await supabase
        .from("custom_models").select("base_url,model_id,api_key")
        .eq("id", data.customModelId).eq("workspace_id", wsId).single();
      if (error) throw new Error("Custom model not found");
      const provider = createOpenAICompatible({
        name: "custom",
        baseURL: cm.base_url.replace(/\/+$/, ""),
        headers: { Authorization: `Bearer ${cm.api_key}` },
      });
      model = provider(cm.model_id);
    } else {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
      const gw = createLovableAiGatewayProvider(apiKey);
      model = gw(data.fallbackModel || "google/gemini-2.5-flash");
    }

    const messages: any[] = [{ role: "system", content: system }];
    for (const m of (data.history || []).slice(-16)) messages.push({ role: m.role, content: m.content });
    messages.push({ role: "user", content: data.message });

    try {
      const res = await generateText({ model, messages });
      return { reply: res.text, catalog_size: products?.length ?? 0 };
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("429")) throw new Error("Rate limit reached — try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in your workspace billing.");
      throw new Error(msg);
    }
  });
