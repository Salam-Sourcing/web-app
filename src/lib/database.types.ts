export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      account_deletion_audit: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          created_at: string;
          last_attempt_at: string | null;
          last_error: string | null;
          request_id: string;
          requested_at: string;
          scheduled_for: string;
          started_at: string | null;
          status: string;
          subject_user_hash: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          request_id: string;
          requested_at: string;
          scheduled_for: string;
          started_at?: string | null;
          status?: string;
          subject_user_hash: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          created_at?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          request_id?: string;
          requested_at?: string;
          scheduled_for?: string;
          started_at?: string | null;
          status?: string;
          subject_user_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          attempt_count: number;
          cancelled_at: string | null;
          completed_at: string | null;
          last_error: string | null;
          processing_started_at: string | null;
          request_id: string;
          requested_at: string;
          scheduled_for: string;
          status: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          cancelled_at?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          processing_started_at?: string | null;
          request_id?: string;
          requested_at?: string;
          scheduled_for: string;
          status?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          cancelled_at?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          processing_started_at?: string | null;
          request_id?: string;
          requested_at?: string;
          scheduled_for?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_audit_logs: {
        Row: {
          action_type: string;
          admin_user_id: string | null;
          created_at: string;
          entity_id: number | null;
          entity_type: string;
          id: number;
          ip_hash: string | null;
          new_values: Json | null;
          old_values: Json | null;
        };
        Insert: {
          action_type: string;
          admin_user_id?: string | null;
          created_at?: string;
          entity_id?: number | null;
          entity_type: string;
          id?: never;
          ip_hash?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Update: {
          action_type?: string;
          admin_user_id?: string | null;
          created_at?: string;
          entity_id?: number | null;
          entity_type?: string;
          id?: never;
          ip_hash?: string | null;
          new_values?: Json | null;
          old_values?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: number;
          name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: never;
          name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: never;
          name?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          address: string | null;
          average_rating: number;
          business_registration_number: string | null;
          city: string | null;
          company_type: string | null;
          contact_number: string | null;
          country: string;
          created_at: string;
          description: string | null;
          display_name: string;
          email: string | null;
          id: number;
          identity_revision: number;
          legal_name: string;
          owner_user_id: string | null;
          postal_code: string | null;
          province_state: string | null;
          status: string;
          tax_number: string | null;
          total_listings: number;
          total_reviews: number;
          updated_at: string;
          verification_status: string;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          average_rating?: number;
          business_registration_number?: string | null;
          city?: string | null;
          company_type?: string | null;
          contact_number?: string | null;
          country: string;
          created_at?: string;
          description?: string | null;
          display_name: string;
          email?: string | null;
          id?: never;
          identity_revision?: number;
          legal_name: string;
          owner_user_id?: string | null;
          postal_code?: string | null;
          province_state?: string | null;
          status?: string;
          tax_number?: string | null;
          total_listings?: number;
          total_reviews?: number;
          updated_at?: string;
          verification_status?: string;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          average_rating?: number;
          business_registration_number?: string | null;
          city?: string | null;
          company_type?: string | null;
          contact_number?: string | null;
          country?: string;
          created_at?: string;
          description?: string | null;
          display_name?: string;
          email?: string | null;
          id?: never;
          identity_revision?: number;
          legal_name?: string;
          owner_user_id?: string | null;
          postal_code?: string | null;
          province_state?: string | null;
          status?: string;
          tax_number?: string | null;
          total_listings?: number;
          total_reviews?: number;
          updated_at?: string;
          verification_status?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_blocks: {
        Row: {
          blocked_company_id: number;
          blocker_company_id: number;
          created_at: string;
          created_by_user_id: string;
          id: number;
        };
        Insert: {
          blocked_company_id: number;
          blocker_company_id: number;
          created_at?: string;
          created_by_user_id: string;
          id?: never;
        };
        Update: {
          blocked_company_id?: number;
          blocker_company_id?: number;
          created_at?: string;
          created_by_user_id?: string;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "company_blocks_blocked_company_id_fkey";
            columns: ["blocked_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_blocks_blocker_company_id_fkey";
            columns: ["blocker_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_blocks_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: number;
          created_at: string;
          id: number;
          invited_at: string | null;
          joined_at: string | null;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          company_id: number;
          created_at?: string;
          id?: never;
          invited_at?: string | null;
          joined_at?: string | null;
          role?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          company_id?: number;
          created_at?: string;
          id?: never;
          invited_at?: string | null;
          joined_at?: string | null;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_permission_overrides: {
        Row: {
          company_id: number;
          permissions: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id: number;
          permissions: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: number;
          permissions?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_permission_overrides_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_team_invitations: {
        Row: {
          accepted_at: string | null;
          company_id: number;
          created_at: string;
          created_by: string;
          delivered_at: string | null;
          delivery_attempt: string | null;
          delivery_requested_at: string | null;
          delivery_status: string;
          email: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          role: string;
        };
        Insert: {
          accepted_at?: string | null;
          company_id: number;
          created_at?: string;
          created_by: string;
          delivered_at?: string | null;
          delivery_attempt?: string | null;
          delivery_requested_at?: string | null;
          delivery_status?: string;
          email: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          role: string;
        };
        Update: {
          accepted_at?: string | null;
          company_id?: number;
          created_at?: string;
          created_by?: string;
          delivered_at?: string | null;
          delivery_attempt?: string | null;
          delivery_requested_at?: string | null;
          delivery_status?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_team_invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_verifications: {
        Row: {
          company_id: number;
          created_at: string;
          expires_at: string | null;
          id: number;
          provider_reference_id: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by_admin_id: string | null;
          status: string;
          submitted_at: string | null;
          submitted_by_user_id: string | null;
          submitted_identity: Json | null;
          submitted_identity_revision: number | null;
          verification_provider: string | null;
        };
        Insert: {
          company_id: number;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          provider_reference_id?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by_user_id?: string | null;
          submitted_identity?: Json | null;
          submitted_identity_revision?: number | null;
          verification_provider?: string | null;
        };
        Update: {
          company_id?: number;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          provider_reference_id?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by_user_id?: string | null;
          submitted_identity?: Json | null;
          submitted_identity_revision?: number | null;
          verification_provider?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_verifications_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_verifications_reviewed_by_admin_id_fkey";
            columns: ["reviewed_by_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_verifications_submitted_by_user_id_fkey";
            columns: ["submitted_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          assigned_admin_id: string | null;
          complaint_type: string;
          created_at: string;
          description: string;
          filed_by_company_id: number | null;
          filed_by_user_id: string | null;
          id: number;
          resolution_notes: string | null;
          resolved_at: string | null;
          status: string;
          target_company_id: number | null;
          target_enquiry_id: number | null;
          target_listing_id: number | null;
          target_message_id: number | null;
          target_quote_id: number | null;
          target_snapshot: Json;
        };
        Insert: {
          assigned_admin_id?: string | null;
          complaint_type: string;
          created_at?: string;
          description: string;
          filed_by_company_id?: number | null;
          filed_by_user_id?: string | null;
          id?: never;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          status?: string;
          target_company_id?: number | null;
          target_enquiry_id?: number | null;
          target_listing_id?: number | null;
          target_message_id?: number | null;
          target_quote_id?: number | null;
          target_snapshot?: Json;
        };
        Update: {
          assigned_admin_id?: string | null;
          complaint_type?: string;
          created_at?: string;
          description?: string;
          filed_by_company_id?: number | null;
          filed_by_user_id?: string | null;
          id?: never;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          status?: string;
          target_company_id?: number | null;
          target_enquiry_id?: number | null;
          target_listing_id?: number | null;
          target_message_id?: number | null;
          target_quote_id?: number | null;
          target_snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_admin_id_fkey";
            columns: ["assigned_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_filed_by_company_id_fkey";
            columns: ["filed_by_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_filed_by_user_id_fkey";
            columns: ["filed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_target_company_id_fkey";
            columns: ["target_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_target_enquiry_id_fkey";
            columns: ["target_enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_target_listing_id_fkey";
            columns: ["target_listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_target_message_id_fkey";
            columns: ["target_message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "complaints_target_quote_id_fkey";
            columns: ["target_quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_participants: {
        Row: {
          company_id: number | null;
          conversation_id: number;
          id: number;
          joined_at: string;
          last_read_at: string | null;
          user_id: string;
        };
        Insert: {
          company_id?: number | null;
          conversation_id: number;
          id?: never;
          joined_at?: string;
          last_read_at?: string | null;
          user_id: string;
        };
        Update: {
          company_id?: number | null;
          conversation_id?: number;
          id?: never;
          joined_at?: string;
          last_read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          buyer_company_id: number | null;
          created_at: string;
          enquiry_id: number;
          id: number;
          last_message_at: string | null;
          status: string;
          supplier_company_id: number | null;
        };
        Insert: {
          buyer_company_id?: number | null;
          created_at?: string;
          enquiry_id: number;
          id?: never;
          last_message_at?: string | null;
          status?: string;
          supplier_company_id?: number | null;
        };
        Update: {
          buyer_company_id?: number | null;
          created_at?: string;
          enquiry_id?: number;
          id?: never;
          last_message_at?: string | null;
          status?: string;
          supplier_company_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_company_id_fkey";
            columns: ["buyer_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_supplier_company_id_fkey";
            columns: ["supplier_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_documents: {
        Row: {
          created_at: string;
          deal_id: number;
          file_mime_type: string;
          file_name: string;
          file_size_bytes: number;
          id: number;
          storage_path: string;
          uploaded_by_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          deal_id: number;
          file_mime_type: string;
          file_name: string;
          file_size_bytes: number;
          id?: never;
          storage_path: string;
          uploaded_by_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          deal_id?: number;
          file_mime_type?: string;
          file_name?: string;
          file_size_bytes?: number;
          id?: never;
          storage_path?: string;
          uploaded_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_progress: {
        Row: {
          deal_id: number;
          expected_delivery: string | null;
          stage: string;
          tracking_reference: string | null;
          updated_at: string;
        };
        Insert: {
          deal_id: number;
          expected_delivery?: string | null;
          stage?: string;
          tracking_reference?: string | null;
          updated_at?: string;
        };
        Update: {
          deal_id?: number;
          expected_delivery?: string | null;
          stage?: string;
          tracking_reference?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_progress_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: true;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deal_progress_events: {
        Row: {
          company_id: number;
          created_at: string;
          deal_id: number;
          id: number;
          note: string;
          stage: string;
        };
        Insert: {
          company_id: number;
          created_at?: string;
          deal_id: number;
          id?: never;
          note?: string;
          stage: string;
        };
        Update: {
          company_id?: number;
          created_at?: string;
          deal_id?: number;
          id?: never;
          note?: string;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deal_progress_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deal_progress_events_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          agreed_at: string | null;
          buyer_company_id: number;
          buyer_completed_at: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          deal_value_estimate: number | null;
          enquiry_id: number;
          id: number;
          product_name: string;
          quote_id: number | null;
          status: string;
          supplier_company_id: number;
          supplier_completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          agreed_at?: string | null;
          buyer_company_id: number;
          buyer_completed_at?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          deal_value_estimate?: number | null;
          enquiry_id: number;
          id?: never;
          product_name: string;
          quote_id?: number | null;
          status?: string;
          supplier_company_id: number;
          supplier_completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          agreed_at?: string | null;
          buyer_company_id?: number;
          buyer_completed_at?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          deal_value_estimate?: number | null;
          enquiry_id?: number;
          id?: never;
          product_name?: string;
          quote_id?: number | null;
          status?: string;
          supplier_company_id?: number;
          supplier_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deals_buyer_company_id_fkey";
            columns: ["buyer_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: true;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: true;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_supplier_company_id_fkey";
            columns: ["supplier_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      device_push_tokens: {
        Row: {
          created_at: string;
          id: string;
          last_used_at: string;
          platform: string;
          session_id: string | null;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_used_at?: string;
          platform: string;
          session_id?: string | null;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_used_at?: string;
          platform?: string;
          session_id?: string | null;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "device_push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enquiries: {
        Row: {
          budget_max: number | null;
          budget_min: number | null;
          buyer_company_id: number;
          closed_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          currency: string;
          delivery_city: string | null;
          delivery_country: string | null;
          delivery_postal_code: string | null;
          delivery_province_state: string | null;
          enquiry_type: string;
          id: number;
          listing_id: number | null;
          message: string | null;
          needed_by: string | null;
          publication_status: string;
          published_at: string | null;
          quantity: number | null;
          quote_deadline: string | null;
          rejection_reason: string | null;
          specifications: Json;
          status: string;
          sub_category_id: number | null;
          supplier_company_id: number | null;
          title: string;
          unit_of_measure: string | null;
          updated_at: string;
          urgency: string;
          visibility: string;
        };
        Insert: {
          budget_max?: number | null;
          budget_min?: number | null;
          buyer_company_id: number;
          closed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          delivery_city?: string | null;
          delivery_country?: string | null;
          delivery_postal_code?: string | null;
          delivery_province_state?: string | null;
          enquiry_type?: string;
          id?: never;
          listing_id?: number | null;
          message?: string | null;
          needed_by?: string | null;
          publication_status?: string;
          published_at?: string | null;
          quantity?: number | null;
          quote_deadline?: string | null;
          rejection_reason?: string | null;
          specifications?: Json;
          status?: string;
          sub_category_id?: number | null;
          supplier_company_id?: number | null;
          title: string;
          unit_of_measure?: string | null;
          updated_at?: string;
          urgency?: string;
          visibility?: string;
        };
        Update: {
          budget_max?: number | null;
          budget_min?: number | null;
          buyer_company_id?: number;
          closed_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          delivery_city?: string | null;
          delivery_country?: string | null;
          delivery_postal_code?: string | null;
          delivery_province_state?: string | null;
          enquiry_type?: string;
          id?: never;
          listing_id?: number | null;
          message?: string | null;
          needed_by?: string | null;
          publication_status?: string;
          published_at?: string | null;
          quantity?: number | null;
          quote_deadline?: string | null;
          rejection_reason?: string | null;
          specifications?: Json;
          status?: string;
          sub_category_id?: number | null;
          supplier_company_id?: number | null;
          title?: string;
          unit_of_measure?: string | null;
          updated_at?: string;
          urgency?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enquiries_buyer_company_id_fkey";
            columns: ["buyer_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiries_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiries_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiries_sub_category_id_fkey";
            columns: ["sub_category_id"];
            isOneToOne: false;
            referencedRelation: "sub_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiries_supplier_company_id_fkey";
            columns: ["supplier_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      enquiry_attachments: {
        Row: {
          created_at: string;
          enquiry_id: number;
          file_mime_type: string;
          file_name: string;
          file_size_bytes: number;
          id: number;
          storage_path: string;
          uploaded_by_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          enquiry_id: number;
          file_mime_type: string;
          file_name: string;
          file_size_bytes: number;
          id?: never;
          storage_path: string;
          uploaded_by_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          enquiry_id?: number;
          file_mime_type?: string;
          file_name?: string;
          file_size_bytes?: number;
          id?: never;
          storage_path?: string;
          uploaded_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enquiry_attachments_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_attachments_uploaded_by_user_id_fkey";
            columns: ["uploaded_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enquiry_reviews: {
        Row: {
          created_at: string;
          enquiry_id: number;
          id: number;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by_admin_id: string | null;
          status: string;
          submitted_at: string;
          submitted_by_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          enquiry_id: number;
          id?: never;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string;
          submitted_by_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          enquiry_id?: number;
          id?: never;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string;
          submitted_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enquiry_reviews_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_reviews_reviewed_by_admin_id_fkey";
            columns: ["reviewed_by_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_reviews_submitted_by_user_id_fkey";
            columns: ["submitted_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      enquiry_status_history: {
        Row: {
          changed_by_user_id: string | null;
          created_at: string;
          enquiry_id: number;
          id: number;
          new_status: string;
          previous_status: string | null;
          reason: string | null;
        };
        Insert: {
          changed_by_user_id?: string | null;
          created_at?: string;
          enquiry_id: number;
          id?: never;
          new_status: string;
          previous_status?: string | null;
          reason?: string | null;
        };
        Update: {
          changed_by_user_id?: string | null;
          created_at?: string;
          enquiry_id?: number;
          id?: never;
          new_status?: string;
          previous_status?: string | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enquiry_status_history_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_status_history_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
        ];
      };
      enquiry_supplier_invitations: {
        Row: {
          enquiry_id: number;
          id: number;
          invited_at: string;
          invited_by_user_id: string | null;
          responded_at: string | null;
          status: string;
          supplier_company_id: number;
          viewed_at: string | null;
        };
        Insert: {
          enquiry_id: number;
          id?: never;
          invited_at?: string;
          invited_by_user_id?: string | null;
          responded_at?: string | null;
          status?: string;
          supplier_company_id: number;
          viewed_at?: string | null;
        };
        Update: {
          enquiry_id?: number;
          id?: never;
          invited_at?: string;
          invited_by_user_id?: string | null;
          responded_at?: string | null;
          status?: string;
          supplier_company_id?: number;
          viewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enquiry_supplier_invitations_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_supplier_invitations_invited_by_user_id_fkey";
            columns: ["invited_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enquiry_supplier_invitations_supplier_company_id_fkey";
            columns: ["supplier_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          company_id: number;
          currency: string;
          due_at: string | null;
          external_invoice_id: string | null;
          id: number;
          invoice_number: string;
          issued_at: string | null;
          paid_at: string | null;
          status: string;
          subscription_id: number;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
        };
        Insert: {
          company_id: number;
          currency?: string;
          due_at?: string | null;
          external_invoice_id?: string | null;
          id?: never;
          invoice_number: string;
          issued_at?: string | null;
          paid_at?: string | null;
          status?: string;
          subscription_id: number;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
        };
        Update: {
          company_id?: number;
          currency?: string;
          due_at?: string | null;
          external_invoice_id?: string | null;
          id?: never;
          invoice_number?: string;
          issued_at?: string | null;
          paid_at?: string | null;
          status?: string;
          subscription_id?: number;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          display_order: number;
          id: number;
          image_url: string;
          is_primary: boolean;
          listing_id: number;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          display_order?: number;
          id?: never;
          image_url: string;
          is_primary?: boolean;
          listing_id: number;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          display_order?: number;
          id?: never;
          image_url?: string;
          is_primary?: boolean;
          listing_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_verifications: {
        Row: {
          content_revision: number;
          created_at: string;
          expires_at: string | null;
          id: number;
          listing_id: number;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by_admin_id: string | null;
          status: string;
          submitted_at: string | null;
        };
        Insert: {
          content_revision?: number;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          listing_id: number;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string | null;
        };
        Update: {
          content_revision?: number;
          created_at?: string;
          expires_at?: string | null;
          id?: never;
          listing_id?: number;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by_admin_id?: string | null;
          status?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listing_verifications_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_verifications_reviewed_by_admin_id_fkey";
            columns: ["reviewed_by_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_views: {
        Row: {
          id: number;
          ip_hash: string | null;
          listing_id: number;
          user_agent: string | null;
          viewed_at: string;
          viewer_company_id: number | null;
          viewer_user_id: string | null;
        };
        Insert: {
          id?: never;
          ip_hash?: string | null;
          listing_id: number;
          user_agent?: string | null;
          viewed_at?: string;
          viewer_company_id?: number | null;
          viewer_user_id?: string | null;
        };
        Update: {
          id?: never;
          ip_hash?: string | null;
          listing_id?: number;
          user_agent?: string | null;
          viewed_at?: string;
          viewer_company_id?: number | null;
          viewer_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_views_viewer_company_id_fkey";
            columns: ["viewer_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_views_viewer_user_id_fkey";
            columns: ["viewer_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          average_rating: number;
          company_id: number;
          content_revision: number;
          created_at: string;
          created_by_user_id: string | null;
          currency: string;
          description: string | null;
          estimated_lead_time_days: number | null;
          id: number;
          listing_type: string;
          minimum_order_quantity: number | null;
          name: string;
          origin_country: string | null;
          price_per_unit: number | null;
          published_at: string | null;
          specifications: Json;
          status: string;
          sub_category_id: number | null;
          total_enquiries: number;
          total_reviews: number;
          total_views: number;
          unit_of_measure: string | null;
          updated_at: string;
        };
        Insert: {
          average_rating?: number;
          company_id: number;
          content_revision?: number;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          description?: string | null;
          estimated_lead_time_days?: number | null;
          id?: never;
          listing_type: string;
          minimum_order_quantity?: number | null;
          name: string;
          origin_country?: string | null;
          price_per_unit?: number | null;
          published_at?: string | null;
          specifications?: Json;
          status?: string;
          sub_category_id?: number | null;
          total_enquiries?: number;
          total_reviews?: number;
          total_views?: number;
          unit_of_measure?: string | null;
          updated_at?: string;
        };
        Update: {
          average_rating?: number;
          company_id?: number;
          content_revision?: number;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          description?: string | null;
          estimated_lead_time_days?: number | null;
          id?: never;
          listing_type?: string;
          minimum_order_quantity?: number | null;
          name?: string;
          origin_country?: string | null;
          price_per_unit?: number | null;
          published_at?: string | null;
          specifications?: Json;
          status?: string;
          sub_category_id?: number | null;
          total_enquiries?: number;
          total_reviews?: number;
          total_views?: number;
          unit_of_measure?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_sub_category_id_fkey";
            columns: ["sub_category_id"];
            isOneToOne: false;
            referencedRelation: "sub_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_notification_preferences: {
        Row: {
          deals: boolean;
          enquiries: boolean;
          listing_reviews: boolean;
          messages: boolean;
          quotes: boolean;
          search_alerts: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          deals?: boolean;
          enquiries?: boolean;
          listing_reviews?: boolean;
          messages?: boolean;
          quotes?: boolean;
          search_alerts?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          deals?: boolean;
          enquiries?: boolean;
          listing_reviews?: boolean;
          messages?: boolean;
          quotes?: boolean;
          search_alerts?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      marketplace_saved_searches: {
        Row: {
          alerts: boolean;
          created_at: string;
          filters: Json;
          frequency: string;
          id: number;
          kind: string;
          last_checked_at: string;
          last_notified_at: string | null;
          name: string;
          user_id: string;
        };
        Insert: {
          alerts?: boolean;
          created_at?: string;
          filters?: Json;
          frequency?: string;
          id?: never;
          kind: string;
          last_checked_at?: string;
          last_notified_at?: string | null;
          name: string;
          user_id: string;
        };
        Update: {
          alerts?: boolean;
          created_at?: string;
          filters?: Json;
          frequency?: string;
          id?: never;
          kind?: string;
          last_checked_at?: string;
          last_notified_at?: string | null;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          file_mime_type: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          file_url: string;
          id: number;
          message_id: number;
          uploaded_at: string;
        };
        Insert: {
          file_mime_type?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url: string;
          id?: never;
          message_id: number;
          uploaded_at?: string;
        };
        Update: {
          file_mime_type?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string;
          id?: never;
          message_id?: number;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          client_message_id: string | null;
          content: string | null;
          conversation_id: number;
          deleted_at: string | null;
          edited_at: string | null;
          id: number;
          is_deleted: boolean;
          message_type: string;
          sender_company_id: number | null;
          sender_user_id: string | null;
          sent_at: string;
        };
        Insert: {
          client_message_id?: string | null;
          content?: string | null;
          conversation_id: number;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          is_deleted?: boolean;
          message_type?: string;
          sender_company_id?: number | null;
          sender_user_id?: string | null;
          sent_at?: string;
        };
        Update: {
          client_message_id?: string | null;
          content?: string | null;
          conversation_id?: number;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: never;
          is_deleted?: boolean;
          message_type?: string;
          sender_company_id?: number | null;
          sender_user_id?: string | null;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_company_id_fkey";
            columns: ["sender_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey";
            columns: ["sender_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json;
          deduplication_key: string | null;
          entity_id: number | null;
          entity_type: string | null;
          id: number;
          is_read: boolean;
          link_url: string | null;
          notification_type: string;
          read_at: string | null;
          recipient_company_id: number | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          deduplication_key?: string | null;
          entity_id?: number | null;
          entity_type?: string | null;
          id?: never;
          is_read?: boolean;
          link_url?: string | null;
          notification_type: string;
          read_at?: string | null;
          recipient_company_id?: number | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          deduplication_key?: string | null;
          entity_id?: number | null;
          entity_type?: string | null;
          id?: never;
          is_read?: boolean;
          link_url?: string | null;
          notification_type?: string;
          read_at?: string | null;
          recipient_company_id?: number | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          company_id: number;
          created_at: string;
          currency: string;
          external_payment_id: string | null;
          id: number;
          invoice_id: number;
          paid_at: string | null;
          payment_method: string | null;
          payment_provider: string | null;
          status: string;
        };
        Insert: {
          amount: number;
          company_id: number;
          created_at?: string;
          currency?: string;
          external_payment_id?: string | null;
          id?: never;
          invoice_id: number;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          company_id?: number;
          created_at?: string;
          currency?: string;
          external_payment_id?: string | null;
          id?: never;
          invoice_id?: number;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          contact_number: string | null;
          country: string | null;
          created_at: string;
          email: string;
          email_verified_at: string | null;
          first_name: string;
          id: string;
          last_login_at: string | null;
          last_name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          contact_number?: string | null;
          country?: string | null;
          created_at?: string;
          email: string;
          email_verified_at?: string | null;
          first_name: string;
          id: string;
          last_login_at?: string | null;
          last_name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          contact_number?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string;
          email_verified_at?: string | null;
          first_name?: string;
          id?: string;
          last_login_at?: string | null;
          last_name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_status_history: {
        Row: {
          changed_by_user_id: string | null;
          created_at: string;
          id: number;
          new_status: string;
          previous_status: string | null;
          quote_id: number;
          reason: string | null;
        };
        Insert: {
          changed_by_user_id?: string | null;
          created_at?: string;
          id?: never;
          new_status: string;
          previous_status?: string | null;
          quote_id: number;
          reason?: string | null;
        };
        Update: {
          changed_by_user_id?: string | null;
          created_at?: string;
          id?: never;
          new_status?: string;
          previous_status?: string | null;
          quote_id?: number;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_status_history_changed_by_user_id_fkey";
            columns: ["changed_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_status_history_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by_user_id: string | null;
          currency: string;
          enquiry_id: number;
          id: number;
          lead_time_days: number | null;
          notes: string | null;
          payment_terms: string | null;
          price_per_unit: number | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          responded_at: string | null;
          sent_at: string | null;
          shipping_cost: number | null;
          shipping_terms: string | null;
          status: string;
          submitted_at: string | null;
          subtotal: number | null;
          supplier_company_id: number;
          tax_amount: number | null;
          total_price: number | null;
          updated_at: string;
          valid_until: string | null;
          version: number;
          withdrawn_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          enquiry_id: number;
          id?: never;
          lead_time_days?: number | null;
          notes?: string | null;
          payment_terms?: string | null;
          price_per_unit?: number | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          responded_at?: string | null;
          sent_at?: string | null;
          shipping_cost?: number | null;
          shipping_terms?: string | null;
          status?: string;
          submitted_at?: string | null;
          subtotal?: number | null;
          supplier_company_id: number;
          tax_amount?: number | null;
          total_price?: number | null;
          updated_at?: string;
          valid_until?: string | null;
          version?: number;
          withdrawn_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by_user_id?: string | null;
          currency?: string;
          enquiry_id?: number;
          id?: never;
          lead_time_days?: number | null;
          notes?: string | null;
          payment_terms?: string | null;
          price_per_unit?: number | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          responded_at?: string | null;
          sent_at?: string | null;
          shipping_cost?: number | null;
          shipping_terms?: string | null;
          status?: string;
          submitted_at?: string | null;
          subtotal?: number | null;
          supplier_company_id?: number;
          tax_amount?: number | null;
          total_price?: number | null;
          updated_at?: string;
          valid_until?: string | null;
          version?: number;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_supplier_company_id_fkey";
            columns: ["supplier_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          created_at: string;
          created_by_user_id: string | null;
          deal_id: number | null;
          id: number;
          is_verified_transaction: boolean;
          listing_id: number | null;
          product_name: string;
          rating: number;
          responded_at: string | null;
          response_text: string | null;
          review_text: string | null;
          reviewed_company_id: number;
          reviewer_company_id: number;
          reviewer_role: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id?: string | null;
          deal_id?: number | null;
          id?: never;
          is_verified_transaction?: boolean;
          listing_id?: number | null;
          product_name: string;
          rating: number;
          responded_at?: string | null;
          response_text?: string | null;
          review_text?: string | null;
          reviewed_company_id: number;
          reviewer_company_id: number;
          reviewer_role?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string | null;
          deal_id?: number | null;
          id?: never;
          is_verified_transaction?: boolean;
          listing_id?: number | null;
          product_name?: string;
          rating?: number;
          responded_at?: string | null;
          response_text?: string | null;
          review_text?: string | null;
          reviewed_company_id?: number;
          reviewer_company_id?: number;
          reviewer_role?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewed_company_id_fkey";
            columns: ["reviewed_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_company_id_fkey";
            columns: ["reviewer_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_companies: {
        Row: {
          company_id: number;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          company_id: number;
          created_at?: string;
          id?: never;
          user_id: string;
        };
        Update: {
          company_id?: number;
          created_at?: string;
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_companies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_companies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_enquiries: {
        Row: {
          created_at: string;
          enquiry_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enquiry_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enquiry_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_enquiries_enquiry_id_fkey";
            columns: ["enquiry_id"];
            isOneToOne: false;
            referencedRelation: "enquiries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_enquiries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_listings: {
        Row: {
          created_at: string;
          id: number;
          listing_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          listing_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          listing_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sub_categories: {
        Row: {
          active: boolean;
          category_id: number;
          created_at: string;
          description: string | null;
          id: number;
          name: string;
        };
        Insert: {
          active?: boolean;
          category_id: number;
          created_at?: string;
          description?: string | null;
          id?: never;
          name: string;
        };
        Update: {
          active?: boolean;
          category_id?: number;
          created_at?: string;
          description?: string | null;
          id?: never;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_change_requests: {
        Row: {
          company_id: number;
          created_at: string;
          id: number;
          notes: string | null;
          request_type: string;
          requested_by_user_id: string | null;
          requested_plan_id: number | null;
          resolved_at: string | null;
          resolved_by_admin_id: string | null;
          status: string;
        };
        Insert: {
          company_id: number;
          created_at?: string;
          id?: never;
          notes?: string | null;
          request_type: string;
          requested_by_user_id?: string | null;
          requested_plan_id?: number | null;
          resolved_at?: string | null;
          resolved_by_admin_id?: string | null;
          status?: string;
        };
        Update: {
          company_id?: number;
          created_at?: string;
          id?: never;
          notes?: string | null;
          request_type?: string;
          requested_by_user_id?: string | null;
          requested_plan_id?: number | null;
          resolved_at?: string | null;
          resolved_by_admin_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_change_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_change_requests_requested_by_user_id_fkey";
            columns: ["requested_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_change_requests_requested_plan_id_fkey";
            columns: ["requested_plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_change_requests_resolved_by_admin_id_fkey";
            columns: ["resolved_by_admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          active: boolean;
          billing_interval: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: number;
          max_enquiries_per_month: number | null;
          max_listings: number | null;
          max_users: number | null;
          name: string;
          price: number;
          priority_support_included: boolean;
          updated_at: string;
          verified_badge_included: boolean;
        };
        Insert: {
          active?: boolean;
          billing_interval: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: never;
          max_enquiries_per_month?: number | null;
          max_listings?: number | null;
          max_users?: number | null;
          name: string;
          price: number;
          priority_support_included?: boolean;
          updated_at?: string;
          verified_badge_included?: boolean;
        };
        Update: {
          active?: boolean;
          billing_interval?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: never;
          max_enquiries_per_month?: number | null;
          max_listings?: number | null;
          max_users?: number | null;
          name?: string;
          price?: number;
          priority_support_included?: boolean;
          updated_at?: string;
          verified_badge_included?: boolean;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_provider: string;
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          company_id: number;
          created_at: string;
          end_date: string | null;
          external_customer_id: string | null;
          external_subscription_id: string | null;
          id: number;
          plan_id: number;
          renewal_date: string | null;
          start_date: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          billing_provider?: string;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          company_id: number;
          created_at?: string;
          end_date?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: never;
          plan_id: number;
          renewal_date?: string | null;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          billing_provider?: string;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          company_id?: number;
          created_at?: string;
          end_date?: string | null;
          external_customer_id?: string | null;
          external_subscription_id?: string | null;
          id?: never;
          plan_id?: number;
          renewal_date?: string | null;
          start_date?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_documents: {
        Row: {
          company_verification_id: number;
          document_type: string;
          file_mime_type: string | null;
          file_name: string | null;
          file_size_bytes: number | null;
          file_url: string;
          id: number;
          status: string;
          uploaded_at: string;
        };
        Insert: {
          company_verification_id: number;
          document_type: string;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url: string;
          id?: never;
          status?: string;
          uploaded_at?: string;
        };
        Update: {
          company_verification_id?: number;
          document_type?: string;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string;
          id?: never;
          status?: string;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_documents_company_verification_id_fkey";
            columns: ["company_verification_id"];
            isOneToOne: false;
            referencedRelation: "company_verifications";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_marketplace_categories: {
        Args: { p_company_id?: number; p_saved?: boolean };
        Returns: { name: string }[];
      };
      get_marketplace_preview: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      accept_company_invitation: {
        Args: { p_invitation_id: string };
        Returns: number;
      };
      accept_quote: { Args: { p_quote_id: number }; Returns: number };
      admin_create_invoice: {
        Args: {
          p_due_at?: string;
          p_external_invoice_id?: string;
          p_subscription_id: number;
          p_subtotal: number;
          p_tax_amount?: number;
        };
        Returns: number;
      };
      admin_record_invoice_payment: {
        Args: {
          p_external_payment_id?: string;
          p_invoice_id: number;
          p_payment_method?: string;
          p_succeeded: boolean;
        };
        Returns: number;
      };
      admin_resolve_subscription_request: {
        Args: { p_approve: boolean; p_notes?: string; p_request_id: number };
        Returns: undefined;
      };
      admin_set_company_status: {
        Args: { p_company_id: number; p_reason: string; p_status: string };
        Returns: undefined;
      };
      admin_set_profile_status: {
        Args: { p_reason: string; p_status: string; p_user_id: string };
        Returns: undefined;
      };
      advance_deal_progress: {
        Args: {
          p_company_id: number;
          p_deal_id: number;
          p_expected_delivery?: string;
          p_note?: string;
          p_stage: string;
          p_tracking_reference?: string;
        };
        Returns: undefined;
      };
      block_company: { Args: { p_company_id: number }; Returns: undefined };
      cancel_account_deletion: { Args: never; Returns: undefined };
      claim_due_account_deletions: {
        Args: { p_limit?: number };
        Returns: {
          request_id: string;
          user_id: string;
        }[];
      };
      claim_upload_cleanup: {
        Args: { p_bucket: string; p_path: string };
        Returns: string;
      };
      close_enquiry: {
        Args: { p_cancel?: boolean; p_enquiry_id: number };
        Returns: undefined;
      };
      complete_account_deletion: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      confirm_deal_completion: {
        Args: { p_company_id: number; p_deal_id: number };
        Returns: undefined;
      };
      create_company_verification: {
        Args: { p_company_id: number };
        Returns: number;
      };
      create_enquiry: { Args: { p_enquiry: Json }; Returns: number };
      customer_support: {
        Args: {
          p_action: string;
          p_data?: Json;
          p_id?: string;
          p_version?: number;
        };
        Returns: Json;
      };
      ensure_current_profile: {
        Args: { p_first_name: string; p_last_name: string };
        Returns: undefined;
      };
      fail_account_deletion: {
        Args: { p_error: string; p_request_id: string };
        Returns: undefined;
      };
      file_complaint: {
        Args: {
          p_complaint_type: string;
          p_description: string;
          p_target_company_id?: number;
          p_target_listing_id?: number;
          p_target_message_id?: number;
        };
        Returns: number;
      };
      finish_company_invitation_email: {
        Args: { p_attempt: string; p_invitation_id: string; p_sent: boolean };
        Returns: undefined;
      };
      register_web_push_token: {
        Args: { p_token: string; p_origin: string; p_previous_token?: string };
        Returns: undefined;
      };
      get_web_push_delivery: {
        Args: { p_notification_id: number };
        Returns: {
          token: string;
          user_id: string;
          session_id: string;
          conversation_id: number;
          is_test: boolean;
          web_origin: string;
        }[];
      };
      get_buyer_dashboard: { Args: { p_company_id: number }; Returns: Json };
      get_company_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      get_company_permissions: {
        Args: { p_company_id: number };
        Returns: string[];
      };
      get_company_reviews: {
        Args: { p_company_id: number; p_limit?: number; p_offset?: number };
        Returns: {
          can_respond: boolean;
          created_at: string;
          id: number;
          is_verified_transaction: boolean;
          product_name: string;
          rating: number;
          responded_at: string;
          response_text: string;
          review_text: string;
          reviewer_name: string;
          reviewer_role: string;
        }[];
      };
      get_company_summaries: {
        Args: { p_company_ids?: number[] };
        Returns: {
          city: string;
          country: string;
          display_name: string;
          id: number;
          province_state: string;
          verification_status: string;
        }[];
      };
      get_company_team: { Args: { p_company_id: number }; Returns: Json };
      get_deal_progress: {
        Args: { p_company_id: number; p_deal_id: number };
        Returns: Json;
      };
      get_deal_review_state: {
        Args: { p_company_id: number; p_deal_id: number };
        Returns: Json;
      };
      get_member_permissions: {
        Args: { p_company_id: number; p_user_id: string };
        Returns: Json;
      };
      get_my_companies: {
        Args: never;
        Returns: {
          city: string;
          country: string;
          display_name: string;
          id: number;
          province_state: string;
          role: string;
          verification_status: string;
        }[];
      };
      get_public_company_profile: {
        Args: { p_company_id: number };
        Returns: {
          average_rating: number;
          city: string;
          company_type: string;
          country: string;
          description: string;
          display_name: string;
          id: number;
          province_state: string;
          total_listings: number;
          total_reviews: number;
          verification_status: string;
          website: string;
        }[];
      };
      get_push_delivery: {
        Args: { p_notification_id: number };
        Returns: {
          conversation_id: number;
          is_test: boolean;
          session_id: string;
          token: string;
          user_id: string;
        }[];
      };
      get_saved_search_matches: {
        Args: { p_search_id: number };
        Returns: Json;
      };
      get_supplier_insights: {
        Args: { p_company_id: number; p_days?: number };
        Returns: Json;
      };
      invite_company_member: {
        Args: { p_company_id: number; p_email: string; p_role?: string };
        Returns: string;
      };
      invite_supplier_to_enquiry: {
        Args: { p_enquiry_id: number; p_supplier_company_id: number };
        Returns: undefined;
      };
      list_blocked_companies: {
        Args: never;
        Returns: {
          blocked_at: string;
          company_id: number;
          display_name: string;
        }[];
      };
      mark_conversation_read: {
        Args: { p_conversation_id: number };
        Returns: undefined;
      };
      moderate_company_review: {
        Args: { p_reason: string; p_review_id: number; p_status: string };
        Returns: undefined;
      };
      panel_capabilities: { Args: never; Returns: Json };
      panel_case_files: {
        Args: { p_case: string; p_file?: string; p_reason?: string };
        Returns: Json;
      };
      panel_claim_email: {
        Args: { p_limit?: number };
        Returns: unknown[];
        SetofOptions: {
          from: "*";
          to: "panel_email_queue";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      panel_claim_files: {
        Args: { p_limit?: number };
        Returns: unknown[];
        SetofOptions: {
          from: "*";
          to: "panel_snapshot_files";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      panel_command: {
        Args: {
          p_action: string;
          p_data?: Json;
          p_id?: string;
          p_version?: number;
        };
        Returns: Json;
      };
      panel_customer_export: {
        Args: { p_page?: number; p_user?: string };
        Returns: Json;
      };
      panel_decide: {
        Args: { p_expected: Json; p_params: Json; p_rpc: string };
        Returns: Json;
      };
      panel_deletion_hold: {
        Args: { p_reason: string; p_request: string; p_until: string };
        Returns: undefined;
      };
      panel_file_source_matches: {
        Args: { p_id: string; p_lease: string };
        Returns: boolean;
      };
      panel_finish_email: {
        Args: { p_id: string; p_lease: string; p_success: boolean };
        Returns: undefined;
      };
      panel_finish_file: {
        Args: { p_id: string; p_lease: string; p_success: boolean };
        Returns: boolean;
      };
      panel_monitor: { Args: never; Returns: Json };
      panel_query: {
        Args: { p_id?: string; p_page?: number; p_view: string };
        Returns: Json;
      };
      panel_recovery_propose: {
        Args: { p_case: string; p_member: string; p_reason: string };
        Returns: string;
      };
      panel_reported_message: {
        Args: { p_case: string; p_reason: string };
        Returns: Json;
      };
      panel_return_for_information: {
        Args: { p_reason: string; p_request: string; p_version: number };
        Returns: undefined;
      };
      panel_source_evidence: {
        Args: { p_bucket: string; p_path: string; p_reason: string };
        Returns: Json;
      };
      panel_transfer_ownership: {
        Args: { p_reason: string; p_request: string; p_version: number };
        Returns: undefined;
      };
      prepare_account_deletion: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      process_saved_search_alerts: { Args: never; Returns: number };
      record_marketplace_listing_view: {
        Args: { p_listing_id: number };
        Returns: undefined;
      };
      register_push_token: {
        Args: { p_platform: string; p_token: string };
        Returns: undefined;
      };
      reject_quote: {
        Args: { p_quote_id: number; p_reason?: string };
        Returns: undefined;
      };
      report_company_review: {
        Args: { p_description: string; p_reason: string; p_review_id: number };
        Returns: number;
      };
      request_account_deletion: { Args: never; Returns: string };
      request_company_invitation_email: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      request_subscription_change: {
        Args: {
          p_company_id: number;
          p_notes?: string;
          p_plan_id?: number;
          p_request_type: string;
        };
        Returns: number;
      };
      respond_company_review: {
        Args: { p_response_text: string; p_review_id: number };
        Returns: undefined;
      };
      review_company_verification: {
        Args: {
          p_approve: boolean;
          p_reason?: string;
          p_verification_id: number;
        };
        Returns: undefined;
      };
      review_complaint: {
        Args: {
          p_complaint_id: number;
          p_resolution_notes?: string;
          p_status: string;
        };
        Returns: undefined;
      };
      review_enquiry: {
        Args: {
          p_approve: boolean;
          p_enquiry_id: number;
          p_rejection_reason?: string;
        };
        Returns: undefined;
      };
      review_listing: {
        Args: { p_approve: boolean; p_listing_id: number; p_reason?: string };
        Returns: undefined;
      };
      revoke_company_invitation: {
        Args: { p_invitation_id: string };
        Returns: undefined;
      };
      save_marketplace_search: {
        Args: {
          p_alerts?: boolean;
          p_filters: Json;
          p_frequency?: string;
          p_id?: number;
          p_kind: string;
          p_name: string;
        };
        Returns: number;
      };
      search_marketplace: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number };
        Returns: {
          category: string;
          company_id: number;
          currency: string;
          estimated_lead_time_days: number;
          id: number;
          image_url: string;
          is_verified: boolean;
          location: string;
          minimum_order_quantity: number;
          name: string;
          price_per_unit: number;
          unit_of_measure: string;
          vendor_name: string;
        }[];
      };
      send_test_push_notification: { Args: never; Returns: number };
      set_listing_status: {
        Args: { p_action: string; p_listing_id: number };
        Returns: undefined;
      };
      set_member_permissions: {
        Args: {
          p_company_id: number;
          p_permissions?: string[];
          p_user_id: string;
        };
        Returns: undefined;
      };
      submit_company_review: {
        Args: {
          p_company_id: number;
          p_deal_id: number;
          p_rating: number;
          p_review_text: string;
        };
        Returns: number;
      };
      submit_company_verification: {
        Args: { p_verification_id: number };
        Returns: undefined;
      };
      submit_enquiry_for_review: {
        Args: { p_enquiry_id: number };
        Returns: undefined;
      };
      submit_listing_for_review: {
        Args: { p_listing_id: number };
        Returns: undefined;
      };
      submit_quote: { Args: { p_quote: Json }; Returns: number };
      unblock_company: { Args: { p_company_id: number }; Returns: undefined };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      update_company_member: {
        Args: {
          p_company_id: number;
          p_remove?: boolean;
          p_role?: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      update_company_profile: {
        Args: { p_company_id: number; p_profile: Json };
        Returns: undefined;
      };
      update_enquiry_draft: {
        Args: { p_changes: Json; p_enquiry_id: number };
        Returns: undefined;
      };
      update_listing: {
        Args: { p_changes: Json; p_listing_id: number };
        Returns: undefined;
      };
      withdraw_quote: { Args: { p_quote_id: number }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
