import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Generic inbound webhook — used by custom integrations that push messages
// with an HMAC signature (integrations.credentials.webhookSecret).
// Body: { integration_id, external_user, body, channel?, external_id? }
export const Route = createFileRoute("/api/public/webhooks/inbound")({
  server: {
    handlers: {
      GET: async () =>
        json({
          ok: true,
          endpoint: "kc-inbound-webhook",
          method: "POST",
          description:
            "Send inbound customer messages here. Include a HMAC-SHA256 hex digest of the raw body signed with your integration's webhookSecret in the x-kc-signature header.",
          body_schema: {
            integration_id: "uuid — from your integration in the Integrations page",
            external_user: "string — display name of the sender",
            body: "string — message content",
            channel: "web|whatsapp|instagram|messenger|telegram (optional, default 'web')",
            external_id: "string — stable per-user id (optional)",
          },
        }),
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: any;
        try { payload = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
        const { integration_id, external_user, body, channel, external_id } = payload ?? {};
        if (!integration_id || !external_user || !body) return json({ error: "missing_fields" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integ } = await supabaseAdmin
          .from("integrations")
          .select("id, workspace_id, integration_key, credentials")
          .eq("id", integration_id).maybeSingle();
        if (!integ) return json({ error: "integration_not_found" }, 404);

        const secret = (integ.credentials as any)?.webhookSecret;
        if (!secret) return json({ error: "no_webhook_secret_configured" }, 401);
        const sig = request.headers.get("x-kc-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "bad_signature" }, 401);

        try {
          const { handleInbound } = await import("@/lib/social-reply.server");
          const ch = (channel || "web") as any;
          const result = await handleInbound({
            integrationId: integ.id,
            channel: ch,
            externalId: String(external_id || external_user),
            displayName: String(external_user),
            body: String(body),
            platformThreadId: String(external_id || external_user),
          });
          return json({ ok: true, conversation_id: result.conversationId, reply: result.reply });
        } catch (e: any) {
          return json({ error: e?.message || "internal_error" }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
