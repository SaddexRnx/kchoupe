import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Telegram webhook per integration.
// Register with Telegram: POST https://api.telegram.org/bot<TOKEN>/setWebhook
//   { url: "<host>/api/public/webhooks/telegram/<integrationId>",
//     secret_token: "<webhookSecret>" }
export const Route = createFileRoute("/api/public/webhooks/telegram/$integrationId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const raw = await request.text();
        let update: any;
        try { update = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integ } = await supabaseAdmin.from("integrations")
          .select("id,workspace_id,credentials,integration_key")
          .eq("id", params.integrationId).maybeSingle();
        if (!integ || integ.integration_key !== "Telegram Bot") {
          // Always 200 so Telegram doesn't disable the webhook.
          return json({ ok: true });
        }

        const creds: any = integ.credentials || {};
        const secret: string | undefined = creds.webhookSecret;
        if (secret) {
          const hdr = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
          const a = Buffer.from(hdr), b = Buffer.from(secret);
          if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false }, 401);
        }

        const message = update.message ?? update.edited_message ?? update.channel_post;
        const chatId = message?.chat?.id;
        const text: string = (message?.text ?? message?.caption ?? "").toString();
        if (!chatId || !text.trim()) return json({ ok: true, ignored: true });

        const from = message.from || {};
        const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || `chat ${chatId}`;
        const handle = from.username ? `@${from.username}` : null;

        try {
          const { handleInbound } = await import("@/lib/social-reply.server");
          await handleInbound({
            integrationId: integ.id,
            channel: "telegram",
            externalId: String(from.id ?? chatId),
            displayName, handle,
            body: text,
            platformThreadId: String(chatId),
            botToken: creds.botToken ?? null,
          });
        } catch (e: any) {
          console.error("telegram webhook handle error:", e?.message || e);
        }
        return json({ ok: true });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
