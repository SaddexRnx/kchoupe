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
  suppressProductCards?: boolean;   // when true, don't re-send product cards (e.g. after an Order button tap)
};

// ── Guardrail (mirrors customer-chat.functions but adds customer memory) ─────
const SYSTEM_GUARDRAIL = `You are the customer-support assistant for ONE specific online store, replying inside a chat app (Telegram / Instagram / Messenger / WhatsApp).

ABSOLUTE SCOPE — you may ONLY discuss:
  • Products listed in the PRODUCT CATALOG below.
  • Order status, shipping, delivery, returns, refunds, payment for THIS store.

HARD REFUSAL — for any other topic reply EXACTLY (translated to customer's language):
  "I can only help with our store's products and orders. Would you like me to suggest something from our catalog?"

TONE: warm, human, concise. 1–3 short sentences max. Use the customer's name once when known. Never repeat yourself. Never dump long bullet lists unless explicitly asked. Max 1 emoji per message.

GREETINGS & SHORT MESSAGES — read RECENT ORDERS memory first, then:
  • Just "hi/hello/salam/bonjour/hey" AND no active order → ONE warm welcome using their name + ONE open question ("What are you looking for today?"). Do NOT list products. Do NOT re-ask for anything from earlier.
  • Has ACTIVE ORDER in RECENT ORDERS → greet + reference status ("Your order #ORD-XXXX is being prepared — anything else I can help with?"). Do NOT restart order flow.
  • Returning customer, no active order → warm comeback: "Welcome back, {name}! 👋 Good to see you again."

CATALOG RULES:
  1. Recommend ONLY items in the PRODUCT CATALOG. Never invent SKUs, names, prices, stock.
  2. When you name a specific product, include [SKU] on the same line — app renders a rich card with photo + Order button.
  3. Mention at most 2 products per reply.
  4. Availability: "in stock" → available; "check website" → available to order; "OUT OF STOCK" → out.

ORDER FLOW (no loops, no re-asking):
  Step 1 — Intent to buy: confirm the product [SKU] + price in ONE short line, then ask for missing fields only (name / phone / address). Use CUSTOMER MEMORY — if phone/address are already known, use them.
  Step 2 — Once name AND phone AND address are known for a SKU, emit this tag on its own line at the END of your reply. The app parses it, creates the real order, then strips both the tag and any confirmation text you write and appends its own "Order #XXXX confirmed" line — so DO NOT also write "Got it, order placed" yourself:
       [[ORDER sku="SKU123" qty=1 name="Full Name" phone="+123..." address="Street, City"]]
     • Emit EXACTLY ONCE.
     • If RECENT ORDERS shows the same SKU ordered in the last 24h, DO NOT recreate — confirm the existing order and ask if they want anything else.
  Step 3 — After a confirmed order, "hi" later = greet + reference the order. Do NOT restart order flow.

STYLE: short, warm, direct. Reply in the customer's language.`;

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

function buildCustomerMemory(customer: any | null, recentOrders: any[]): string {
  const parts: string[] = [];
  if (customer) {
    const name = customer.display_name || customer.name || "";
    if (name) parts.push(`Name: ${name}`);
    if (customer.phone) parts.push(`Phone: ${customer.phone}`);
    if (customer.email) parts.push(`Email: ${customer.email}`);
    if (customer.metadata?.address) parts.push(`Delivery address: ${customer.metadata.address}`);
    if (typeof customer.message_count === "number" && customer.message_count > 3) {
      parts.push(`Returning customer (${customer.message_count} prior messages)`);
    }
    if (customer.notes) parts.push(`Notes: ${String(customer.notes).slice(0, 400)}`);
  }
  let block = parts.length ? `\n\nCUSTOMER MEMORY (already known — do NOT re-ask):\n${parts.join("\n")}` : "";
  if (recentOrders.length) {
    block += `\n\nRECENT ORDERS for this customer (do NOT recreate — reference by number):\n` +
      recentOrders.map((o) => `• #${o.order_no} — ${o.product_summary} — ${o.amount} ${o.currency} — status: ${o.status} — placed ${new Date(o.created_at).toLocaleString()}`).join("\n");
  }
  return block;
}

const GREETING_RE = /^\s*(hi+|hey+|hello+|yo|salam|salaam|assalam|bonjour|salut|hola|ola|ciao|good\s*(morning|afternoon|evening)|howdy|sup|مرحبا|السلام|اهلا|أهلا)[\s!.,?👋🙂😀]*$/i;
function isGreeting(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length > 40) return false;
  return GREETING_RE.test(t);
}

// ── Platform senders ────────────────────────────────────────────────────────
async function sendTelegram(botToken: string, chatId: string, text: string, extra: Record<string, unknown> = {}) {
  const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  });
  if (!r.ok) {
    const j = await r.text().catch(() => "");
    throw new Error(`telegram sendMessage failed [${r.status}]: ${j}`);
  }
}

async function sendTelegramPhoto(botToken: string, chatId: string, photoUrl: string, caption: string, extra: Record<string, unknown> = {}) {
  const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendPhoto`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, ...extra }),
  });
  if (!r.ok) {
    // Fallback: photo url might be blocked — send text card instead.
    await sendTelegram(botToken, chatId, caption, extra);
  }
}

function extractImageUrl(desc: string | null | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/Image:\s*(https?:\/\/\S+)/i);
  return m ? m[1] : null;
}

function findMentionedProducts(reply: string, products: any[], limit = 3): any[] {
  const lower = reply.toLowerCase();
  const out: any[] = [];
  const seen = new Set<string>();
  // First pass: explicit [SKU] tokens
  for (const p of products) {
    const sku = String(p.sku || "");
    if (sku && lower.includes(`[${sku.toLowerCase()}]`)) {
      if (!seen.has(p.id)) { out.push(p); seen.add(p.id); }
    }
  }
  // Second pass: name match
  for (const p of products) {
    if (out.length >= limit) break;
    if (seen.has(p.id)) continue;
    const name = String(p.name || "").toLowerCase();
    if (name.length >= 5 && lower.includes(name)) { out.push(p); seen.add(p.id); }
  }
  return out.slice(0, limit);
}

const ORDER_TAG_RE = /\[\[ORDER\s+([^\]]+?)\]\]/i;
function parseOrderTag(text: string): null | { sku: string; qty: number; name: string; phone: string; address: string } {
  const m = text.match(ORDER_TAG_RE);
  if (!m) return null;
  const body = m[1];
  const pick = (k: string) => {
    const r = new RegExp(`${k}\\s*=\\s*"([^"]*)"`, "i").exec(body) || new RegExp(`${k}\\s*=\\s*([^\\s]+)`, "i").exec(body);
    return r ? r[1] : "";
  };
  const sku = pick("sku"); const name = pick("name"); const phone = pick("phone"); const address = pick("address");
  const qty = parseInt(pick("qty") || "1", 10) || 1;
  if (!sku || !name || !phone || !address) return null;
  return { sku, qty, name, phone, address };
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

  // 6) Build AI context: catalog + history + memory + prior learnings + recent orders
  const [prodRes, histRes, learnRes, recentOrdersRes] = await Promise.all([
    supabaseAdmin.from("products")
      .select("sku,name,category,price,currency,stock,status,description")
      .eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("inbox_messages")
      .select("role,body")
      .eq("conversation_id", convoId).order("created_at", { ascending: true }).limit(20),
    supabaseAdmin.from("workspace_learnings")
      .select("lesson").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(8),
    supabaseAdmin.from("orders")
      .select("order_no,product_summary,amount,currency,status,created_at,notes")
      .eq("workspace_id", wsId)
      .ilike("notes", `%Customer: ${externalUserLabel}%`)
      .order("created_at", { ascending: false }).limit(5),
  ]);

  const recentOrders = (recentOrdersRes.data ?? []) as any[];

  const learningsBlock = (learnRes.data ?? []).length
    ? "\n\nLEARNED PLAYBOOK (from past confirmed orders — reuse these tactics when relevant):\n" +
      (learnRes.data as any[]).map((l, i) => `${i + 1}. ${l.lesson}`).join("\n")
    : "";

  const system = SYSTEM_GUARDRAIL
    + (empPrompt ? `\n\nEMPLOYEE INSTRUCTIONS:\n${empPrompt}` : "")
    + "\n\n" + buildCatalog(prodRes.data ?? [])
    + buildCustomerMemory(customer, recentOrders)
    + learningsBlock;



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

  // 8a) Parse [[ORDER ...]] tag — create the real order, then strip it from reply
  const orderTag = parseOrderTag(reply);
  let createdOrder: { id: string; order_no: string } | null = null;
  if (orderTag) {
    const prod = (prodRes.data ?? []).find((p: any) => String(p.sku).toLowerCase() === orderTag.sku.toLowerCase());
    if (prod) {
      const amount = Number(prod.price) * orderTag.qty;
      const { data: ord } = await supabaseAdmin.from("orders").insert({
        workspace_id: wsId,
        order_no: "ORD-" + Math.floor(1000 + Math.random() * 9000),
        customer_name: orderTag.name,
        customer_email: null,
        product_summary: `${prod.name} × ${orderTag.qty}`,
        amount,
        currency: prod.currency || "DZD",
        status: "pending",
        confirmed_by_ai: true,
        ai_employee_id: aiEmployeeId,
        channel: msg.channel,
        notes: `Channel: ${msg.channel}\nPhone: ${orderTag.phone}\nAddress: ${orderTag.address}\nCustomer: ${externalUserLabel}`,
      }).select("id,order_no").single();
      if (ord) createdOrder = ord as any;
      // update customer memory (phone + address)
      await supabaseAdmin.from("customers").update({
        phone: customer.phone || orderTag.phone,
        name: customer.name || orderTag.name,
        metadata: { ...((customer.metadata && typeof customer.metadata === "object" && !Array.isArray(customer.metadata)) ? customer.metadata as Record<string, unknown> : {}), address: orderTag.address },
      }).eq("id", customer.id);
    }
    reply = reply.replace(ORDER_TAG_RE, "").trim();
    if (createdOrder) {
      // Strip any AI-written confirmation lines to avoid duplicate "Got it, order placed" text.
      const dupPatterns = [
        /(?:got it|great|perfect|awesome|thanks|thank you|merci|super|parfait|شكرا|رائع)[^.!\n]*[,!.]?\s*[^.\n]*(?:order (?:placed|confirmed)|placed your order|confirmed your order|commande (?:passée|confirmée))[^.\n]*\.?/gi,
        /(?:we[’']?ll|we will|nous vous|سنتواصل)[^.\n]*(?:contact|call|reach|appellerons|نتصل)[^.\n]*\.?/gi,
      ];
      let shortReply = reply;
      for (const re of dupPatterns) shortReply = shortReply.replace(re, "").trim();
      shortReply = shortReply.replace(/\s{2,}/g, " ").trim();
      reply = `✅ Order confirmed, ${orderTag.name}! Your order **#${createdOrder.order_no}** is placed.\nWe'll contact you shortly on ${orderTag.phone} to arrange delivery to ${orderTag.address}.` + (shortReply ? `\n\n${shortReply}` : "");
    }
  }

  // 8b) Learning loop — when an order was just confirmed, distill a short lesson
  //     from the last few turns and store it so future chats reuse the pattern.
  if (createdOrder) {
    try {
      const turns = ((histRes.data ?? []) as any[]).slice(-10)
        .map((m) => `${m.role === "agent" ? "AGENT" : "CUSTOMER"}: ${m.body}`).join("\n");
      const distill = await generateText({
        model,
        system: "You extract ONE short reusable sales lesson (max 220 chars) from a customer chat that ended in a confirmed order. Focus on: what objection/hesitation appeared, what phrasing or product suggestion unlocked the sale, and any decisive info. Reply with the lesson only — no preface, no quotes.",
        messages: [{ role: "user", content: `Channel: ${msg.channel}\nProduct: ${orderTag?.sku}\n\nTranscript:\n${turns}\n\nAGENT: ${reply}` }],
      });
      const lesson = (distill.text || "").trim().slice(0, 240);
      if (lesson.length > 20) {
        await supabaseAdmin.from("workspace_learnings").insert({
          workspace_id: wsId,
          channel: msg.channel,
          customer_id: customer.id,
          conversation_id: convoId,
          lesson,
          outcome: "order_confirmed",
          score: 1,
        });
      }
    } catch { /* learning is best-effort */ }
  }


  // Strip [SKU] tokens from the visible reply (they're for our parser)
  const visibleReply = reply.replace(/\[[A-Z0-9\-_]{3,}\]/g, "").replace(/\s{2,}/g, " ").trim();

  // 8) Save agent reply
  await supabaseAdmin.from("inbox_messages").insert({
    workspace_id: wsId, conversation_id: convoId, role: "agent", sender: aiEmployeeName ?? "Atlas AI", body: visibleReply,
  });
  await supabaseAdmin.from("inbox_conversations")
    .update({ last_message: visibleReply, unread_count: 0, updated_at: new Date().toISOString() })
    .eq("id", convoId);

  // 9) Dispatch reply back to the originating platform
  const mentioned = (!createdOrder && !msg.suppressProductCards) ? findMentionedProducts(reply, prodRes.data ?? []) : [];
  try {
    const threadId = msg.platformThreadId ?? msg.externalId;
    if (msg.channel === "telegram") {
      const token = msg.botToken ?? creds.botToken;
      if (token) {
        await sendTelegram(token, threadId, visibleReply);
        // Send a product card (photo + Order button) for each mentioned product
        for (const p of mentioned) {
          const img = extractImageUrl(p.description);
          const price = `${p.price} ${p.currency}`;
          const caption = `🛍️ ${p.name}\n💰 ${price}${p.category ? `\n📂 ${p.category}` : ""}`;
          const kb = { inline_keyboard: [[{ text: `🛒 Order — ${price}`, callback_data: `order:${p.sku}` }]] };
          if (img) await sendTelegramPhoto(token, threadId, img, caption, { reply_markup: kb });
          else await sendTelegram(token, threadId, caption, { reply_markup: kb });
        }
      }
    } else if (msg.channel === "facebook_page") {
      if (creds.pageAccessToken) await sendMessenger(creds.pageAccessToken, threadId, visibleReply);
    } else if (msg.channel === "instagram") {
      if (creds.pageAccessToken) await sendInstagram(creds.pageAccessToken, threadId, visibleReply);
    } else if (msg.channel === "whatsapp") {
      if (creds.phoneNumberId && creds.accessToken) await sendWhatsApp(creds.phoneNumberId, creds.accessToken, threadId, visibleReply);
    }
  } catch (e: any) {
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
