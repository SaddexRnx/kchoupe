// Server-only. Never import at module scope from a route/component file
// — always `await import("@/lib/social-reply.server")` inside a handler.

import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type InboundChannel = "telegram" | "instagram" | "facebook_page" | "whatsapp" | "web";

export type InboundMessage = {
  integrationId?: string;      // preferred lookup
  workspaceId?: string;        // fallback if resolved by webhook
  channel: InboundChannel;
  externalId: string;          // stable id per platform (chat_id, PSID, wa id, thread id…)
  displayName?: string | null; // "John Doe" / "@johndoe"
  handle?: string | null;      // username / phone
  body: string;
  platformThreadId?: string | null; // where to reply on the platform (chat_id, thread id, PSID)
  botToken?: string | null;         // when already known (webhook route already loaded creds)
};

// ── Guardrail (mirrors customer-chat.functions but adds customer memory) ─────
const SYSTEM_GUARDRAIL = `You are the customer-support assistant for ONE specific online store, replying inside a chat app (Telegram / Instagram / Messenger / WhatsApp).

ABSOLUTE SCOPE — you may ONLY discuss:
  • Products listed in the PRODUCT CATALOG below (name, price, stock, description, category).
  • Order status, shipping, delivery times, returns, refunds, payment for THIS store.

HARD REFUSAL — for any other topic reply EXACTLY (translated to the customer's language):
  "I can only help with our store's products and orders. Would you like me to suggest something from our catalog?"

CATALOG RULES:
  1. Recommend ONLY items in the PRODUCT CATALOG. Never invent SKUs, names, prices or stock.
  2. When you name a product, ALWAYS include its SKU in square brackets like [SKU123] on the same line — the app renders a product card with photo + Order button underneath your reply.
  3. Availability: "in stock" → available; "availability: check website" → available to order; "OUT OF STOCK" → out.

ORDER FLOW (CRITICAL — no loops):
  Step 1 — Intent to buy: in ONE short message confirm the product [SKU] + price and ask for "Full name, phone, delivery address" in a single reply.
  Step 2 — Once the customer has provided name AND phone AND address for a known SKU, CONFIRM the order and emit this tag on its own line at the END of your reply (the app parses it, creates the real order, and strips it before sending):
       [[ORDER sku="SKU123" qty=1 name="Full Name" phone="+123..." address="Street, City"]]
     • Emit the tag EXACTLY ONCE per order.
     • If a previous assistant message already emitted [[ORDER ...]] for the same item, the order is ALREADY placed — do not re-ask for details, just answer follow-ups.
     • If a field is missing, ask ONLY for the missing field.
  Step 3 — After the tag, keep the visible reply to a short confirmation like: "✅ Got it, {name} — order placed. We'll contact you shortly on {phone}."

STYLE: short, warm, direct. Reply in the customer's language. Never redirect to external websites unless the item isn't listed.`;

function buildCatalog(products: any[]): string {
  if (!products.length) return "PRODUCT CATALOG: (empty)";
  return "PRODUCT CATALOG:\n" + products.slice(0, 150).map((p) => {
    let av: string;
    if (p.status === "draft" || p.stock == null) av = "availability: check website";
    else if (p.status === "out" || p.stock === 0) av = "OUT OF STOCK";
    else av = `${p.stock} in stock`;
    const desc = p.description ? ` — ${String(p.description).slice(0, 140)}` : "";
    return `• [${p.sku}] ${p.name} · ${p.category ?? ""} · ${p.price} ${p.currency} · ${av}${desc}`;
  }).join("\n");
}

function buildCustomerMemory(customer: any | null): string {
  if (!customer) return "";
  const parts: string[] = [];
  const name = customer.display_name || customer.name || "";
  if (name) parts.push(`Name: ${name}`);
  if (customer.phone) parts.push(`Phone: ${customer.phone}`);
  if (customer.email) parts.push(`Email: ${customer.email}`);
  if (customer.metadata?.address) parts.push(`Delivery address: ${customer.metadata.address}`);
  if (typeof customer.message_count === "number" && customer.message_count > 0) {
    parts.push(`Prior messages: ${customer.message_count} (returning customer)`);
  }
  if (customer.notes) parts.push(`Notes: ${customer.notes.slice(0, 600)}`);
  return parts.length ? `\n\nCUSTOMER MEMORY (use to personalize; don't ask for info you already have):\n${parts.join("\n")}` : "";
}

// ── Platform senders ────────────────────────────────────────────────────────
async function sendTelegram(botToken: string, chatId: string, text: string) {
  const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: undefined }),
  });
  if (!r.ok) {
    const j = await r.text().catch(() => "");
    throw new Error(`telegram sendMessage failed [${r.status}]: ${j}`);
  }
}

async function sendMessenger(pageToken: string, psid: string, text: string) {
  const r = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(pageToken)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message: { text } }),
  });
  if (!r.ok) throw new Error(`messenger send failed [${r.status}]: ${await r.text().catch(() => "")}`);
}

async function sendInstagram(pageToken: string, igScopedId: string, text: string) {
  // IG DMs use the same /me/messages endpoint on the Page token, addressed by IGSID.
  const r = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(pageToken)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient: { id: igScopedId }, messaging_type: "RESPONSE", message: { text } }),
  });
  if (!r.ok) throw new Error(`instagram send failed [${r.status}]: ${await r.text().catch(() => "")}`);
}

async function sendWhatsApp(phoneNumberId: string, accessToken: string, to: string, text: string) {
  const r = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!r.ok) throw new Error(`whatsapp send failed [${r.status}]: ${await r.text().catch(() => "")}`);
}

// ── Main entry ──────────────────────────────────────────────────────────────
export async function handleInbound(msg: InboundMessage): Promise<{ reply: string; conversationId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Resolve integration + workspace
  let integ: any = null;
  if (msg.integrationId) {
    const { data } = await supabaseAdmin.from("integrations")
      .select("id,workspace_id,integration_key,credentials,assigned_employees").eq("id", msg.integrationId).maybeSingle();
    integ = data;
  }
  if (!integ && msg.workspaceId) {
    // fallback by channel key
    const key = msg.channel === "telegram" ? "Telegram Bot"
      : msg.channel === "instagram" ? "Instagram Business"
      : msg.channel === "facebook_page" ? "Facebook Page"
      : msg.channel === "whatsapp" ? "WhatsApp Business" : null;
    if (key) {
      const { data } = await supabaseAdmin.from("integrations")
        .select("id,workspace_id,integration_key,credentials,assigned_employees")
        .eq("workspace_id", msg.workspaceId).eq("integration_key", key).maybeSingle();
      integ = data;
    }
  }
  if (!integ) throw new Error("integration not found for inbound message");

  const wsId: string = integ.workspace_id;
  const creds: any = integ.credentials || {};

  // 2) Upsert customer (recognition + memory)
  const { data: existingCust } = await supabaseAdmin.from("customers")
    .select("*").eq("workspace_id", wsId).eq("channel", msg.channel).eq("external_id", msg.externalId).maybeSingle();

  let customer = existingCust;
  if (!customer) {
    const { data: created, error } = await supabaseAdmin.from("customers").insert({
      workspace_id: wsId,
      channel: msg.channel,
      external_id: msg.externalId,
      display_name: msg.displayName ?? null,
      name: msg.displayName ?? msg.handle ?? null,
      phone: msg.channel === "whatsapp" ? msg.externalId : null,
      message_count: 1,
      last_seen_at: new Date().toISOString(),
      metadata: { handle: msg.handle ?? null },
    }).select("*").single();
    if (error) throw new Error("customer insert: " + error.message);
    customer = created;
  } else {
    await supabaseAdmin.from("customers")
      .update({
        message_count: (customer.message_count ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
        display_name: customer.display_name || msg.displayName || null,
      })
      .eq("id", customer.id);
  }

  // 3) Resolve AI employee
  const assigned = Array.isArray(integ.assigned_employees) ? integ.assigned_employees : [];
  let aiEmployeeId: string | null = null;
  let aiEmployeeName: string | null = null;
  let empModel = "google/gemini-2.5-flash";
  let empPrompt: string | null = null;
  if (assigned[0]) {
    const { data: emp } = await supabaseAdmin.from("ai_employees")
      .select("id,name,model,system_prompt").eq("id", assigned[0]).maybeSingle();
    if (emp) { aiEmployeeId = emp.id; aiEmployeeName = emp.name; empModel = emp.model || empModel; empPrompt = emp.system_prompt; }
  }

  // 4) Upsert conversation
  const externalUserLabel = msg.displayName || msg.handle || msg.externalId;
  const { data: existingConvo } = await supabaseAdmin.from("inbox_conversations")
    .select("id,unread_count")
    .eq("workspace_id", wsId).eq("channel", msg.channel).eq("external_user", externalUserLabel)
    .maybeSingle();
  let convoId = existingConvo?.id as string | undefined;
  if (!convoId) {
    const { data: created, error } = await supabaseAdmin.from("inbox_conversations").insert({
      workspace_id: wsId,
      channel: msg.channel,
      external_user: externalUserLabel,
      ai_employee_id: aiEmployeeId,
      ai_employee_name: aiEmployeeName,
      customer_id: customer.id,
      platform_thread_id: msg.platformThreadId ?? msg.externalId,
      last_message: msg.body,
      status: "open",
      unread_count: 1,
    }).select("id").single();
    if (error) throw new Error("convo insert: " + error.message);
    convoId = created.id;
  } else {
    await supabaseAdmin.from("inbox_conversations")
      .update({
        last_message: msg.body,
        unread_count: (existingConvo!.unread_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
        customer_id: customer.id,
        platform_thread_id: msg.platformThreadId ?? msg.externalId,
      })
      .eq("id", convoId);
  }

  // 5) Save inbound message
  await supabaseAdmin.from("inbox_messages").insert({
    workspace_id: wsId, conversation_id: convoId, role: "user", sender: externalUserLabel, body: msg.body,
  });

  // 6) Build AI context: catalog + history + memory
  const [prodRes, histRes] = await Promise.all([
    supabaseAdmin.from("products")
      .select("sku,name,category,price,currency,stock,status,description")
      .eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("inbox_messages")
      .select("role,body")
      .eq("conversation_id", convoId).order("created_at", { ascending: true }).limit(20),
  ]);

  const system = SYSTEM_GUARDRAIL
    + (empPrompt ? `\n\nEMPLOYEE INSTRUCTIONS:\n${empPrompt}` : "")
    + "\n\n" + buildCatalog(prodRes.data ?? [])
    + buildCustomerMemory(customer);

  const messages: any[] = ((histRes.data ?? []) as any[])
    .slice(-12)
    .map((m) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.body }));
  if (!messages.length || messages[messages.length - 1].content !== msg.body) {
    messages.push({ role: "user", content: msg.body });
  }

  // 7) Model
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
  const gw = createLovableAiGatewayProvider(apiKey);
  const model = gw(empModel);

  let reply = "";
  try {
    const res = await generateText({ model, system, messages });
    reply = res.text?.trim() || "";
  } catch (e: any) {
    const em = String(e?.message || e);
    reply = em.includes("429") ? "One moment — I'm getting a lot of messages. Please try again shortly."
          : em.includes("402") ? "Our assistant is temporarily unavailable. A human will follow up."
          : "Sorry, I ran into a problem. A team member will follow up shortly.";
  }
  if (!reply) reply = "Thanks for your message! We'll get right back to you.";

  // 8) Save agent reply
  await supabaseAdmin.from("inbox_messages").insert({
    workspace_id: wsId, conversation_id: convoId, role: "agent", sender: aiEmployeeName ?? "Atlas AI", body: reply,
  });
  await supabaseAdmin.from("inbox_conversations")
    .update({ last_message: reply, unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", convoId);

  // 9) Dispatch reply back to the originating platform
  try {
    const threadId = msg.platformThreadId ?? msg.externalId;
    if (msg.channel === "telegram") {
      const token = msg.botToken ?? creds.botToken;
      if (token) await sendTelegram(token, threadId, reply);
    } else if (msg.channel === "facebook_page") {
      if (creds.pageAccessToken) await sendMessenger(creds.pageAccessToken, threadId, reply);
    } else if (msg.channel === "instagram") {
      if (creds.pageAccessToken) await sendInstagram(creds.pageAccessToken, threadId, reply);
    } else if (msg.channel === "whatsapp") {
      if (creds.phoneNumberId && creds.accessToken) await sendWhatsApp(creds.phoneNumberId, creds.accessToken, threadId, reply);
    }
  } catch (e: any) {
    // Don't fail webhook — the message + reply are already stored in the inbox.
    await supabaseAdmin.from("notifications").insert({
      workspace_id: wsId, kind: "warning",
      title: `Auto-reply couldn't be delivered on ${msg.channel}`,
      body: String(e?.message || e).slice(0, 200),
      link: "/conversations",
    });
  }

  // 10) Notify humans
  await supabaseAdmin.from("notifications").insert({
    workspace_id: wsId, kind: "info",
    title: `New ${msg.channel} message from ${externalUserLabel}`,
    body: msg.body.slice(0, 120),
    link: "/conversations",
  });

  return { reply, conversationId: convoId! };
}
