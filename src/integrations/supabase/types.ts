export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_employees: {
        Row: {
          avatar_emoji: string
          created_at: string
          created_by: string
          id: string
          model: string
          name: string
          role: string
          status: string
          system_prompt: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          created_by: string
          id?: string
          model?: string
          name: string
          role: string
          status?: string
          system_prompt?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          created_by?: string
          id?: string
          model?: string
          name?: string
          role?: string
          status?: string
          system_prompt?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_models: {
        Row: {
          api_key: string
          base_url: string
          created_at: string
          created_by: string
          id: string
          label: string
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          model_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          api_key: string
          base_url: string
          created_at?: string
          created_by: string
          id?: string
          label: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          model_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string
          created_by?: string
          id?: string
          label?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          model_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          ai_employee_id: string | null
          ai_employee_name: string | null
          channel: string
          created_at: string
          external_user: string
          id: string
          last_message: string | null
          status: string
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_employee_id?: string | null
          ai_employee_name?: string | null
          channel?: string
          created_at?: string
          external_user: string
          id?: string
          last_message?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_employee_id?: string | null
          ai_employee_name?: string | null
          channel?: string
          created_at?: string
          external_user?: string
          id?: string
          last_message?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversations_ai_employee_id_fkey"
            columns: ["ai_employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          sender: string | null
          workspace_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          sender?: string | null
          workspace_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          sender?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          assigned_employees: string[]
          category_id: string
          created_at: string
          credentials: Json
          id: string
          integration_key: string
          last_test_at: string | null
          last_test_latency_ms: number | null
          last_test_message: string | null
          last_test_status: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_employees?: string[]
          category_id: string
          created_at?: string
          credentials?: Json
          id?: string
          integration_key: string
          last_test_at?: string | null
          last_test_latency_ms?: number | null
          last_test_message?: string | null
          last_test_status?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_employees?: string[]
          category_id?: string
          created_at?: string
          credentials?: Json
          id?: string
          integration_key?: string
          last_test_at?: string | null
          last_test_latency_ms?: number | null
          last_test_message?: string | null
          last_test_status?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string
          id: string
          source_id: string
          token_count: number | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding: string
          id?: string
          source_id: string
          token_count?: number | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          source_id?: string
          token_count?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_sources: {
        Row: {
          created_at: string
          created_by: string
          doc_count: number
          error: string | null
          id: string
          name: string
          source_type: string
          status: string
          storage_path: string | null
          updated_at: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          doc_count?: number
          error?: string | null
          id?: string
          name: string
          source_type: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          doc_count?: number
          error?: string | null
          id?: string
          name?: string
          source_type?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ai_employee_id: string | null
          amount: number
          confirmed_by_ai: boolean
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          id: string
          notes: string | null
          order_no: string
          product_summary: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_employee_id?: string | null
          amount?: number
          confirmed_by_ai?: boolean
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          order_no: string
          product_summary: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_employee_id?: string | null
          amount?: number
          confirmed_by_ai?: boolean
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          order_no?: string
          product_summary?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_ai_employee_id_fkey"
            columns: ["ai_employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      playground_conversations: {
        Row: {
          ai_employee_id: string | null
          created_at: string
          id: string
          model: string
          system_prompt: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_employee_id?: string | null
          created_at?: string
          id?: string
          model?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_employee_id?: string | null
          created_at?: string
          id?: string
          model?: string
          system_prompt?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playground_conversations_ai_employee_id_fkey"
            columns: ["ai_employee_id"]
            isOneToOne: false
            referencedRelation: "ai_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      playground_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "playground_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "playground_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_sold: number
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_emoji: string
          name: string
          price: number
          sku: string
          sold_30: number
          status: string
          stock: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_sold?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_emoji?: string
          name: string
          price?: number
          sku: string
          sold_30?: number
          status?: string
          stock?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_sold?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_emoji?: string
          name?: string
          price?: number
          sku?: string
          sold_30?: number
          status?: string
          stock?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          country: string | null
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          plan: string
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_admin: boolean
          last_sign_in_at: string
          workspace_count: number
        }[]
      }
      admin_list_workspaces: {
        Args: never
        Returns: {
          country: string
          created_at: string
          currency: string
          employee_count: number
          id: string
          member_count: number
          name: string
          order_count: number
          plan: string
          revenue: number
          trial_ends_at: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_timeseries: { Args: never; Returns: Json }
      ensure_default_workspace: { Args: { _user_id?: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          _workspace_id: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "owner", "member"],
    },
  },
} as const
