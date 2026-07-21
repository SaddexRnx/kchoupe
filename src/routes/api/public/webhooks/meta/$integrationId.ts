import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Meta webhook for Facebook Page + Instagram (Business), per integration.
// GET  → hub.challenge verification (uses creds.webhookVerifyToken)
// POST → messaging events; validated with X-Hub-Signature-256 (creds.appSecret)
export const Route = createFileRoute("/api/public/webhooks/meta/$integrationId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integ } = await supabaseAdmin.from("integrations")
          .select("credentials").eq("id", params.integrationId).maybeSingle();
        const expected = (integ?.credentials as any)?.webhookVerifyToken;
        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
        }
        return new Response("forbidden", { status: 403 });
      },

      POST: async ({ request, params }) => {
        const raw = await request.text();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integ } = await supabaseAdmin.from("integrations")
          .select("id,workspace_id,credentials,integration_key").eq("id", params.integrationId).maybeSingle();
        if (!integ) return json({ ok: true });

        const creds: any = integ.credentials || {};
        // Signature check (optional if appSecret not configured — but recommended).
        if (creds.appSecret) {
          const sig = request.headers.get("x-hub-signature-256") ?? "";
          const expected = "sha256=" + createHmac("sha256", creds.appSecret).update(raw).digest("hex");
          const a = Buffer.from(sig), b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false }, 401);
        }

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

        const isInstagram = payload.object === "instagram" || integ.integration_key === "Instagram Business";
        const channel = isInstagram ? "instagram" : "facebook_page";

        try {
          const { handleInbound } = await import("@/lib/social-reply.server");
          for (const entry of payload.entry || []) {
            const events = entry.messaging || [];
            for (const ev of events) {
              const senderId = ev.sender?.id;
              const text: string = (ev.message?.text ?? "").toString();
              if (!senderId || !text.trim()) continue;
              // Ignore echoes of our own outgoing messages.
              if (ev.message?.is_echo) continue;

              await handleInbound({
                integrationId: integ.id,
                channel,
                externalId: String(senderId),
                displayName: null,
                handle: null,
                body: text,
                platformThreadId: String(senderId),
              });
            }
          }
        } catch (e: any) {
          console.error("meta webhook error:", e?.message || e);
        }
        return json({ ok: true });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
