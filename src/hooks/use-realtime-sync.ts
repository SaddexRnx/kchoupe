import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Map postgres table -> react-query keys (root prefixes) to invalidate on any change.
const TABLE_KEYS: Record<string, string[][]> = {
  inbox_conversations: [["inbox_conversations"], ["conv_stats"], ["dashboard_stats"]],
  inbox_messages: [["inbox_messages"], ["conv_stats"], ["dashboard_stats"]],
  orders: [["orders"], ["dashboard_stats"], ["admin"]],
  ai_employees: [["ai_employees"], ["dashboard_stats"]],
  products: [["products"], ["dashboard_stats"]],
  customers: [["conv_stats"], ["dashboard_stats"]],
  workspace_learnings: [["conv_learnings"], ["conv_stats"]],
  integrations: [["integrations"]],
  knowledge_sources: [["knowledge_sources"], ["dashboard_stats"]],
  notifications: [["notifications"]],
  workspaces: [["my_workspace"], ["admin"]],
  custom_models: [["custom_models"]],
};

/**
 * Subscribes to Postgres changes on all app tables and invalidates the
 * matching react-query caches so UIs update live without manual refresh.
 * Mount once inside the authenticated app shell.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("app-realtime");
    for (const table of Object.keys(TABLE_KEYS)) {
      (channel as any).on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const key of TABLE_KEYS[table]) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
