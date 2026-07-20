import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Inbound message webhook.
// Body: { integration_id, external_user, body, channel? }
// Header: x-atlas-signature = hex(hmac-sha256(webhookSecret, rawBody))
export const Route = createFileRoute("/api/public/webhooks/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: any;
        try { payload = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
        const { integration_id, external_user, body, channel } = payload ?? {};
        if (!integration_id || !external_user || !body) return json({ error: "missing_fields" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: integ, error: iErr } = await supabaseAdmin
          .from("integrations")
          .select("id, workspace_id, integration_key, credentials, assigned_employees")
          .eq("id", integration_id).maybeSingle();
        if (iErr || !integ) return json({ error: "integration_not_found" }, 404);

        const secret = (integ.credentials as any)?.webhookSecret;
        if (!secret) return json({ error: "no_webhook_secret_configured" }, 401);
        const sig = request.headers.get("x-atlas-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "bad_signature" }, 401);

        // Assign an AI employee if configured on the integration.
        const assigned = Array.isArray(integ.assigned_employees) ? integ.assigned_employees : [];
        let aiEmployeeId: string | null = null;
        let aiEmployeeName: string | null = null;
        if (assigned[0]) {
          const { data: emp } = await supabaseAdmin.from("ai_employees").select("id,name").eq("id", assigned[0]).maybeSingle();
          if (emp) { aiEmployeeId = emp.id; aiEmployeeName = emp.name; }
        }

        const ch = channel || integ.integration_key;

        // Upsert conversation by (workspace, channel, external_user)
        const { data: existing } = await supabaseAdmin
          .from("inbox_conversations")
          .select("id, unread_count")
          .eq("workspace_id", integ.workspace_id).eq("channel", ch).eq("external_user", external_user)
          .maybeSingle();

        let convoId = existing?.id as string | undefined;
        if (!convoId) {
          const { data: created, error: cErr } = await supabaseAdmin
            .from("inbox_conversations")
            .insert({
              workspace_id: integ.workspace_id,
              channel: ch,
              external_user,
              ai_employee_id: aiEmployeeId,
              ai_employee_name: aiEmployeeName,
              last_message: body,
              status: "open",
              unread_count: 1,
            })
            .select("id").single();
          if (cErr) return json({ error: cErr.message }, 500);
          convoId = created.id;
        } else {
          await supabaseAdmin.from("inbox_conversations")
            .update({ last_message: body, unread_count: (existing!.unread_count ?? 0) + 1, updated_at: new Date().toISOString() })
            .eq("id", convoId);
        }

        const { error: mErr } = await supabaseAdmin.from("inbox_messages").insert({
          conversation_id: convoId, role: "user", sender: external_user, body,
        });
        if (mErr) return json({ error: mErr.message }, 500);

        await supabaseAdmin.from("notifications").insert({
          workspace_id: integ.workspace_id,
          kind: "info",
          title: `New message on ${ch}`,
          body: `${external_user}: ${body.slice(0, 80)}`,
          link: "/conversations",
        });

        return json({ ok: true, conversation_id: convoId });
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
