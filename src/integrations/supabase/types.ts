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
      ai_employee_templates: {
        Row: {
          avatar_emoji: string | null
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          install_count: number
          slug: string
          suggested_model: string | null
          system_prompt: string
          title: string
          tone: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          category: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          install_count?: number
          slug: string
          suggested_model?: string | null
          system_prompt: string
          title: string
          tone?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          install_count?: number
          slug?: string
          suggested_model?: string | null
          system_prompt?: string
          title?: string
          tone?: string | null
        }
        Relationships: []
      }
      ai_employees: {
        Row: {
          avatar_emoji: string
          created_at: string
          created_by: string
          escalate_to_human: boolean
          greeting: string | null
          id: string
          language: string
          max_tokens: number
          model: string
          name: string
          role: string
          status: string
          system_prompt: string | null
          temperature: number
          top_p: number
          updated_at: string
          use_knowledge: boolean
          use_products: boolean
          workspace_id: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          created_by: string
          escalate_to_human?: boolean
          greeting?: string | null
          id?: string
          language?: string
          max_tokens?: number
          model?: string
          name: string
          role: string
          status?: string
          system_prompt?: string | null
          temperature?: number
          top_p?: number
          updated_at?: string
          use_knowledge?: boolean
          use_products?: boolean
          workspace_id: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          created_by?: string
          escalate_to_human?: boolean
          greeting?: string | null
          id?: string
          language?: string
          max_tokens?: number
          model?: string
          name?: string
          role?: string
          status?: string
          system_prompt?: string | null
          temperature?: number
          top_p?: number
          updated_at?: string
          use_knowledge?: boolean
          use_products?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_employees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
          channel: string | null
          created_at: string
          display_name: string | null
          email: string | null
          external_id: string | null
          id: string
          last_seen_at: string | null
          message_count: number
          metadata: Json
          name: string | null
          notes: string | null
          phone: string | null
          workspace_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          message_count?: number
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone?: string | null
          workspace_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_seen_at?: string | null
          message_count?: number
          metadata?: Json
          name?: string | null
          notes?: string | null
          phone?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          kind: string
          payload: Json | null
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json | null
          status?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdpr_requests_workspace_id_fkey"
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
          customer_id: string | null
          escalated_at: string | null
          escalated_reason: string | null
          external_user: string
          human_taken_by: string | null
          human_taken_over: boolean
          id: string
          last_message: string | null
          needs_human: boolean
          platform_thread_id: string | null
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
          customer_id?: string | null
          escalated_at?: string | null
          escalated_reason?: string | null
          external_user: string
          human_taken_by?: string | null
          human_taken_over?: boolean
          id?: string
          last_message?: string | null
          needs_human?: boolean
          platform_thread_id?: string | null
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
          customer_id?: string | null
          escalated_at?: string | null
          escalated_reason?: string | null
          external_user?: string
          human_taken_by?: string | null
          human_taken_over?: boolean
          id?: string
          last_message?: string | null
          needs_human?: boolean
          platform_thread_id?: string | null
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
            foreignKeyName: "inbox_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
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
            referencedRelation: "public_storefronts"
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "public_storefronts"
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
          channel: string
          confirmed_by_ai: boolean
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          id: string
          notes: string | null
          order_no: string
          product_summary: string
          seen: boolean
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_employee_id?: string | null
          amount?: number
          channel?: string
          confirmed_by_ai?: boolean
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name: string
          id?: string
          notes?: string | null
          order_no: string
          product_summary: string
          seen?: boolean
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_employee_id?: string | null
          amount?: number
          channel?: string
          confirmed_by_ai?: boolean
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          notes?: string | null
          order_no?: string
          product_summary?: string
          seen?: boolean
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
            referencedRelation: "public_storefronts"
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
          ban_reason: string | null
          banned_at: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          last_seen_at: string | null
          locale: string | null
          referral_code: string | null
          referred_by: string | null
          totp_backup_codes: string[] | null
          totp_enabled: boolean
          totp_secret: string | null
          totp_verified_until: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_seen_at?: string | null
          locale?: string | null
          referral_code?: string | null
          referred_by?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_verified_until?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string | null
          referral_code?: string | null
          referred_by?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean
          totp_secret?: string | null
          totp_verified_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code_used: string
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_applied: boolean
          reward_applied_at: string | null
          reward_days: number
        }
        Insert: {
          code_used: string
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_applied?: boolean
          reward_applied_at?: string | null
          reward_days?: number
        }
        Update: {
          code_used?: string
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_applied?: boolean
          reward_applied_at?: string | null
          reward_days?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          ip: string | null
          kind: string
          severity: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: string | null
          kind: string
          severity?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: string | null
          kind?: string
          severity?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string
          ticket_id: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role: string
          ticket_id: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          opened_by: string
          priority: string
          status: string
          subject: string
          unread_for_admin: boolean
          unread_for_user: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          opened_by: string
          priority?: string
          status?: string
          subject: string
          unread_for_admin?: boolean
          unread_for_user?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          opened_by?: string
          priority?: string
          status?: string
          subject?: string
          unread_for_admin?: boolean
          unread_for_user?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_backups: {
        Row: {
          contents: Json
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          size_bytes: number | null
          workspace_id: string
        }
        Insert: {
          contents: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          size_bytes?: number | null
          workspace_id: string
        }
        Update: {
          contents?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          size_bytes?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_backups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_backups_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_learnings: {
        Row: {
          channel: string | null
          conversation_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          lesson: string
          outcome: string
          score: number
          workspace_id: string
        }
        Insert: {
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lesson: string
          outcome?: string
          score?: number
          workspace_id: string
        }
        Update: {
          channel?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          lesson?: string
          outcome?: string
          score?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_learnings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_learnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_learnings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_learnings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
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
          logo_url: string | null
          name: string
          owner_id: string
          plan: string
          slug: string | null
          storefront_enabled: boolean
          storefront_tagline: string | null
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: string
          slug?: string | null
          storefront_enabled?: boolean
          storefront_tagline?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: string
          slug?: string | null
          storefront_enabled?: boolean
          storefront_tagline?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_storefront_products: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_emoji: string | null
          name: string | null
          price: number | null
          sku: string | null
          status: string | null
          stock: number | null
          workspace_id: string | null
          workspace_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "public_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      public_storefronts: {
        Row: {
          country: string | null
          currency: string | null
          id: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
          storefront_tagline: string | null
        }
        Insert: {
          country?: string | null
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          storefront_tagline?: string | null
        }
        Update: {
          country?: string | null
          currency?: string | null
          id?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
          storefront_tagline?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_support_tickets: {
        Args: never
        Returns: {
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          opened_by: string
          opener_email: string
          opener_name: string
          priority: string
          status: string
          subject: string
          unread_for_admin: boolean
          workspace_id: string
          workspace_name: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          ban_reason: string
          banned_at: string
          conversation_count: number
          countries: string
          created_at: string
          currencies: string
          display_name: string
          email: string
          employee_count: number
          id: string
          integration_count: number
          is_admin: boolean
          last_activity_at: string
          last_sign_in_at: string
          message_count: number
          order_count: number
          plans: string
          product_count: number
          revenue: number
          ticket_count: number
          trial_ends_at: string
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
      admin_security_stats: { Args: never; Returns: Json }
      admin_set_ban: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_timeseries: { Args: never; Returns: Json }
      admin_user_details: { Args: { _user_id: string }; Returns: Json }
      channel_summary:
        | { Args: { _workspace_id: string }; Returns: Json }
        | { Args: { _since?: string; _workspace_id: string }; Returns: Json }
      conversation_stats: { Args: { _workspace_id: string }; Returns: Json }
      ensure_default_workspace: { Args: { _user_id?: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: { _detail?: Json; _kind: string; _severity?: string }
        Returns: undefined
      }
      mark_2fa_verified: { Args: { _minutes?: number }; Returns: string }
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
      rate_limit_hit: {
        Args: { _bucket: string; _limit: number; _window_seconds: number }
        Returns: Json
      }
      slugify: { Args: { _input: string }; Returns: string }
      touch_presence: { Args: never; Returns: undefined }
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
