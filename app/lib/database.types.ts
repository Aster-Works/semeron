export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_membership_id: string | null
          church_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_membership_id?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_membership_id?: string | null
          church_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          allow_prayer_ai: boolean
          content_languages: string[]
          created_at: string
          default_locale: string
          id: string
          invite_code: string
          invite_code_expires_at: string | null
          invite_code_rotated_at: string | null
          morning_notification_time: string | null
          name: Json
          pastor_assist_enabled: boolean
          plan: string
          retention_policy: Json
          role_labels: Json
          slug: string
          soft_gate_mode: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allow_prayer_ai?: boolean
          content_languages?: string[]
          created_at?: string
          default_locale?: string
          id?: string
          invite_code: string
          invite_code_expires_at?: string | null
          invite_code_rotated_at?: string | null
          morning_notification_time?: string | null
          name?: Json
          pastor_assist_enabled?: boolean
          plan?: string
          retention_policy?: Json
          role_labels?: Json
          slug: string
          soft_gate_mode?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allow_prayer_ai?: boolean
          content_languages?: string[]
          created_at?: string
          default_locale?: string
          id?: string
          invite_code?: string
          invite_code_expires_at?: string | null
          invite_code_rotated_at?: string | null
          morning_notification_time?: string | null
          name?: Json
          pastor_assist_enabled?: boolean
          plan?: string
          retention_policy?: Json
          role_labels?: Json
          slug?: string
          soft_gate_mode?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      completion_logs: {
        Row: {
          church_id: string
          completed_prayed_at: string | null
          completed_read_at: string | null
          content_item_id: string
          created_at: string
          id: string
          membership_id: string
        }
        Insert: {
          church_id: string
          completed_prayed_at?: string | null
          completed_read_at?: string | null
          content_item_id: string
          created_at?: string
          id?: string
          membership_id: string
        }
        Update: {
          church_id?: string
          completed_prayed_at?: string | null
          completed_read_at?: string | null
          content_item_id?: string
          created_at?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completion_logs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_logs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_logs_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completion_logs_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          accepted_at: string
          church_id: string | null
          consent_type: string
          id: string
          membership_id: string | null
          metadata: Json
          version: string
        }
        Insert: {
          accepted_at?: string
          church_id?: string | null
          consent_type: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          version: string
        }
        Update: {
          accepted_at?: string
          church_id?: string | null
          consent_type?: string
          id?: string
          membership_id?: string | null
          metadata?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          anonymous: boolean
          author_membership_id: string | null
          body: Json
          church_id: string
          copyright_notice: string | null
          created_at: string
          devotion_date: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          includes_third_party: boolean
          metadata: Json
          prayer_guide: Json | null
          prayer_outcome: string | null
          published_at: string | null
          reflection_question: Json | null
          requested_visibility: string | null
          scheduled_at: string | null
          scripture_quote: Json | null
          scripture_reference: string | null
          scripture_translation: string | null
          sensitive_flags: string[]
          status: string
          title: Json
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          anonymous?: boolean
          author_membership_id?: string | null
          body?: Json
          church_id: string
          copyright_notice?: string | null
          created_at?: string
          devotion_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          includes_third_party?: boolean
          metadata?: Json
          prayer_guide?: Json | null
          prayer_outcome?: string | null
          published_at?: string | null
          reflection_question?: Json | null
          requested_visibility?: string | null
          scheduled_at?: string | null
          scripture_quote?: Json | null
          scripture_reference?: string | null
          scripture_translation?: string | null
          sensitive_flags?: string[]
          status: string
          title?: Json
          type: string
          updated_at?: string
          visibility: string
        }
        Update: {
          anonymous?: boolean
          author_membership_id?: string | null
          body?: Json
          church_id?: string
          copyright_notice?: string | null
          created_at?: string
          devotion_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          includes_third_party?: boolean
          metadata?: Json
          prayer_guide?: Json | null
          prayer_outcome?: string | null
          published_at?: string | null
          reflection_question?: Json | null
          requested_visibility?: string | null
          scheduled_at?: string | null
          scripture_quote?: Json | null
          scripture_reference?: string | null
          scripture_translation?: string | null
          sensitive_flags?: string[]
          status?: string
          title?: Json
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_author_membership_id_fkey"
            columns: ["author_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          joined_at: string
          membership_id: string
          role: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          membership_id: string
          role?: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          membership_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          church_id: string
          created_at: string
          description: Json | null
          id: string
          leader_membership_id: string | null
          name: Json
          status: string
        }
        Insert: {
          church_id: string
          created_at?: string
          description?: Json | null
          id?: string
          leader_membership_id?: string | null
          name?: Json
          status?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          description?: Json | null
          id?: string
          leader_membership_id?: string | null
          name?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_leader_membership_id_fkey"
            columns: ["leader_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_roles: {
        Row: {
          membership_id: string
          role: string
        }
        Insert: {
          membership_id: string
          role: string
        }
        Update: {
          membership_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_roles_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          church_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          joined_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          church_id: string
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          joined_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          joined_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reviews: {
        Row: {
          church_id: string
          content_item_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          reviewer_membership_id: string | null
        }
        Insert: {
          church_id: string
          content_item_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          reviewer_membership_id?: string | null
        }
        Update: {
          church_id?: string
          content_item_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          reviewer_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reviews_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reviews_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reviews_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reviews_reviewer_membership_id_fkey"
            columns: ["reviewer_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          body: Json | null
          category: string
          channel: string
          church_id: string
          created_at: string
          data: Json
          failure_reason: string | null
          id: string
          muted_by_recipient: boolean
          processing_started_at: string | null
          read: boolean
          recipient_membership_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: Json
          type: string
        }
        Insert: {
          archived_at?: string | null
          body?: Json | null
          category?: string
          channel: string
          church_id: string
          created_at?: string
          data?: Json
          failure_reason?: string | null
          id?: string
          muted_by_recipient?: boolean
          processing_started_at?: string | null
          read?: boolean
          recipient_membership_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: Json
          type: string
        }
        Update: {
          archived_at?: string | null
          body?: Json | null
          category?: string
          channel?: string
          church_id?: string
          created_at?: string
          data?: Json
          failure_reason?: string | null
          id?: string
          muted_by_recipient?: boolean
          processing_started_at?: string | null
          read?: boolean
          recipient_membership_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_membership_id_fkey"
            columns: ["recipient_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          preferred_locale: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          preferred_locale?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          preferred_locale?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          church_id: string
          created_at: string
          endpoint: string
          id: string
          membership_id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          church_id: string
          created_at?: string
          endpoint: string
          id?: string
          membership_id: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          church_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          membership_id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          church_id: string
          content_item_id: string
          created_at: string
          id: string
          membership_id: string
          type: string
        }
        Insert: {
          church_id: string
          content_item_id: string
          created_at?: string
          id?: string
          membership_id: string
          type: string
        }
        Update: {
          church_id?: string
          content_item_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      content_feed: {
        Row: {
          anonymous: boolean | null
          author_membership_id: string | null
          body: Json | null
          church_id: string | null
          copyright_notice: string | null
          created_at: string | null
          devotion_date: string | null
          expires_at: string | null
          group_id: string | null
          id: string | null
          includes_third_party: boolean | null
          metadata: Json | null
          prayer_guide: Json | null
          prayer_outcome: string | null
          published_at: string | null
          reflection_question: Json | null
          requested_visibility: string | null
          scheduled_at: string | null
          scripture_quote: Json | null
          scripture_reference: string | null
          scripture_translation: string | null
          sensitive_flags: string[] | null
          status: string | null
          title: Json | null
          type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          anonymous?: boolean | null
          author_membership_id?: never
          body?: Json | null
          church_id?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          devotion_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string | null
          includes_third_party?: boolean | null
          metadata?: Json | null
          prayer_guide?: Json | null
          prayer_outcome?: string | null
          published_at?: string | null
          reflection_question?: Json | null
          requested_visibility?: string | null
          scheduled_at?: string | null
          scripture_quote?: Json | null
          scripture_reference?: string | null
          scripture_translation?: string | null
          sensitive_flags?: string[] | null
          status?: string | null
          title?: Json | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          anonymous?: boolean | null
          author_membership_id?: never
          body?: Json | null
          church_id?: string | null
          copyright_notice?: string | null
          created_at?: string | null
          devotion_date?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string | null
          includes_third_party?: boolean | null
          metadata?: Json | null
          prayer_guide?: Json | null
          prayer_outcome?: string | null
          published_at?: string | null
          reflection_question?: Json | null
          requested_visibility?: string | null
          scheduled_at?: string | null
          scripture_quote?: Json | null
          scripture_reference?: string | null
          scripture_translation?: string | null
          sensitive_flags?: string[] | null
          status?: string | null
          title?: Json | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      church_notification_ops: {
        Args: { p_only_failed?: boolean; target_church: string }
        Returns: {
          body: Json
          category: string
          channel: string
          church_id: string
          created_at: string
          failure_reason: string
          id: string
          read: boolean
          scheduled_at: string
          sent_at: string
          status: string
          title: Json
          type: string
        }[]
      }
      create_church: {
        Args: {
          p_content_languages?: string[]
          p_default_locale?: string
          p_display_name: string
          p_invite_code?: string
          p_name: Json
          p_slug: string
          p_timezone?: string
        }
        Returns: {
          allow_prayer_ai: boolean
          content_languages: string[]
          created_at: string
          default_locale: string
          id: string
          invite_code: string
          invite_code_expires_at: string | null
          invite_code_rotated_at: string | null
          morning_notification_time: string | null
          name: Json
          pastor_assist_enabled: boolean
          plan: string
          retention_policy: Json
          role_labels: Json
          slug: string
          soft_gate_mode: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "churches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      devotion_completion_counts: {
        Args: { target_content: string }
        Returns: {
          prayed_count: number
          read_count: number
        }[]
      }
      join_church: {
        Args: { p_display_name: string; p_invite_code: string }
        Returns: {
          allow_prayer_ai: boolean
          content_languages: string[]
          created_at: string
          default_locale: string
          id: string
          invite_code: string
          invite_code_expires_at: string | null
          invite_code_rotated_at: string | null
          morning_notification_time: string | null
          name: Json
          pastor_assist_enabled: boolean
          plan: string
          retention_policy: Json
          role_labels: Json
          slug: string
          soft_gate_mode: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "churches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_church: {
        Args: { p_church_id: string }
        Returns: {
          church_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          joined_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_prayer_answered: {
        Args: {
          p_content: string
          p_outcome: string
          p_note?: Json
        }
        Returns: undefined
      }
      moderate_prayer: {
        Args: {
          p_content: string
          p_decision: string
          p_note?: string
          p_public_body?: Json
          p_public_title?: Json
          p_visibility?: string
        }
        Returns: undefined
      }
      owns_content: { Args: { content_id: string }; Returns: boolean }
      remove_member_from_church: {
        Args: { p_church_id: string; p_membership_id: string }
        Returns: {
          church_id: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          joined_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      run_retention_cleanup: { Args: { target_church?: string }; Returns: Json }
      update_my_display_name: {
        Args: { p_church: string; p_display_name: string }
        Returns: undefined
      }
      weekly_summary: {
        Args: { target_church: string }
        Returns: {
          devotions_published: number
          new_members: number
          prayed_count: number
          prayers_approved: number
          prayers_pending: number
          prayers_submitted: number
          read_count: number
          reflection_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
