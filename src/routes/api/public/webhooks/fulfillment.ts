// Order fulfillment webhook — external couriers/3PL post status updates here.
// URL: /api/public/webhooks/fulfillment
// Auth: HMAC-SHA256 signature over raw body in x-fulfillment-signature.
// Secret: workspace integration credentials -> config.fulfillment_secret
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type Payload = {
  workspace_id: string;
  order_no?: string;
  order_id?: string;
  status: "in_transit" | "delivered" | "returned" | "failed" | "confirmed" | "cancelled";
  tracking_url?: string;
  courier?: string;
  note?: string;
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/public/webhooks/fulfillment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let body: Payload;
        try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
        if (!body.workspace_id || !body.status) return json({ ok: false, error: "missing_fields" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: integ } = await supabaseAdmin.from("integrations")
          .select("credentials").eq("workspace_id", body.workspace_id)
          .eq("integration_key", "Fulfillment Webhook").maybeSingle();
        const secret = (integ?.credentials as any)?.secret;
        if (!secret) return json({ ok: false, error: "no_webhook_configured" }, 401);

        const sig = request.headers.get("x-fulfillment-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig); const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false, error: "bad_signature" }, 401);

        const query = supabaseAdmin.from("orders").update({
          status: body.status,
          notes: body.note ? body.note : undefined,
          metadata: { tracking_url: body.tracking_url, courier: body.courier },
        }).eq("workspace_id", body.workspace_id);
        if (body.order_id) query.eq("id", body.order_id);
        else if (body.order_no) query.eq("order_no", body.order_no);
        else return json({ ok: false, error: "missing_order" }, 400);
        const { error } = await query;
        if (error) return json({ ok: false, error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
