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
      access_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          use_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          use_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          use_count?: number
        }
        Relationships: []
      }
      adl_logs: {
        Row: {
          activities: Json
          caregiver_id: string | null
          client_id: string
          company_id: string | null
          created_at: string
          id: string
          logged_at: string
          notes: string | null
          visit_id: string | null
        }
        Insert: {
          activities?: Json
          caregiver_id?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          visit_id?: string | null
        }
        Update: {
          activities?: Json
          caregiver_id?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adl_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      aggregator_connections: {
        Row: {
          agency_id: string | null
          api_base_url: string | null
          api_key_secret_ref: string | null
          company_id: string
          config: Json
          created_at: string
          environment: string
          id: string
          last_error: string | null
          last_handshake_at: string | null
          provider_id: string | null
          sftp_host: string | null
          sftp_key_secret_ref: string | null
          sftp_user: string | null
          state: string
          status: string
          updated_at: string
          vendor: string
        }
        Insert: {
          agency_id?: string | null
          api_base_url?: string | null
          api_key_secret_ref?: string | null
          company_id: string
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          last_error?: string | null
          last_handshake_at?: string | null
          provider_id?: string | null
          sftp_host?: string | null
          sftp_key_secret_ref?: string | null
          sftp_user?: string | null
          state: string
          status?: string
          updated_at?: string
          vendor: string
        }
        Update: {
          agency_id?: string | null
          api_base_url?: string | null
          api_key_secret_ref?: string | null
          company_id?: string
          config?: Json
          created_at?: string
          environment?: string
          id?: string
          last_error?: string | null
          last_handshake_at?: string | null
          provider_id?: string | null
          sftp_host?: string | null
          sftp_key_secret_ref?: string | null
          sftp_user?: string | null
          state?: string
          status?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      aggregator_inbound_events: {
        Row: {
          company_id: string
          connection_id: string
          created_at: string
          event_type: string
          id: string
          matched_at: string | null
          matched_authorization_id: string | null
          matched_visit_id: string | null
          notes: string | null
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          connection_id: string
          created_at?: string
          event_type: string
          id?: string
          matched_at?: string | null
          matched_authorization_id?: string | null
          matched_visit_id?: string | null
          notes?: string | null
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          connection_id?: string
          created_at?: string
          event_type?: string
          id?: string
          matched_at?: string | null
          matched_authorization_id?: string | null
          matched_visit_id?: string | null
          notes?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aggregator_inbound_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "aggregator_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      aggregator_outbound_events: {
        Row: {
          ack_at: string | null
          attempts: number
          company_id: string
          connection_id: string
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          sent_at: string | null
          source_id: string
          source_table: string
          status: string
          updated_at: string
          vendor_ack_id: string | null
          vendor_response: Json | null
        }
        Insert: {
          ack_at?: string | null
          attempts?: number
          company_id: string
          connection_id: string
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          sent_at?: string | null
          source_id: string
          source_table: string
          status?: string
          updated_at?: string
          vendor_ack_id?: string | null
          vendor_response?: Json | null
        }
        Update: {
          ack_at?: string | null
          attempts?: number
          company_id?: string
          connection_id?: string
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          sent_at?: string | null
          source_id?: string
          source_table?: string
          status?: string
          updated_at?: string
          vendor_ack_id?: string | null
          vendor_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregator_outbound_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "aggregator_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          client_id: string
          company_id: string | null
          created_at: string
          id: string
          next_due: string | null
          performed_at: string
          performed_by: string | null
          recommendations: string | null
          responses: Json
          risk_level: string | null
          score: number | null
        }
        Insert: {
          assessment_type: string
          client_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          next_due?: string | null
          performed_at?: string
          performed_by?: string | null
          recommendations?: string | null
          responses?: Json
          risk_level?: string | null
          score?: number | null
        }
        Update: {
          assessment_type?: string
          client_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          next_due?: string | null
          performed_at?: string
          performed_by?: string | null
          recommendations?: string | null
          responses?: Json
          risk_level?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      authorization_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          authorization_id: string
          company_id: string | null
          created_at: string
          id: string
          threshold_value: number | null
          units_approved: number | null
          units_used: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          authorization_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          threshold_value?: number | null
          units_approved?: number | null
          units_used?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          authorization_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          threshold_value?: number | null
          units_approved?: number | null
          units_used?: number | null
        }
        Relationships: []
      }
      authorizations: {
        Row: {
          auth_number: string
          clia_number: string | null
          client_id: string
          company_id: string | null
          created_at: string
          end_date: string
          hourly_rate: number | null
          id: string
          notes: string | null
          payer_id: string
          referral_number: string | null
          service_code: string | null
          start_date: string
          status: string
          unit_minutes: number
          units_approved: number
          updated_at: string
        }
        Insert: {
          auth_number: string
          clia_number?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          end_date: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          payer_id: string
          referral_number?: string | null
          service_code?: string | null
          start_date: string
          status?: string
          unit_minutes?: number
          units_approved?: number
          updated_at?: string
        }
        Update: {
          auth_number?: string
          clia_number?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          end_date?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          payer_id?: string
          referral_number?: string | null
          service_code?: string | null
          start_date?: string
          status?: string
          unit_minutes?: number
          units_approved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorizations_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_run_items: {
        Row: {
          billing_run_id: string
          blockers: Json
          caregiver_id: string | null
          charge: number | null
          claim_id: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          hours: number | null
          id: string
          invoice_id: string | null
          override_at: string | null
          override_by: string | null
          override_notes: string | null
          override_reason:
            | Database["public"]["Enums"]["prebill_override_reason"]
            | null
          reason: string | null
          resolution: string | null
          resolved: boolean
          status: string
          timesheet_id: string | null
          units: number | null
        }
        Insert: {
          billing_run_id: string
          blockers?: Json
          caregiver_id?: string | null
          charge?: number | null
          claim_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          hours?: number | null
          id?: string
          invoice_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          override_reason?:
            | Database["public"]["Enums"]["prebill_override_reason"]
            | null
          reason?: string | null
          resolution?: string | null
          resolved?: boolean
          status?: string
          timesheet_id?: string | null
          units?: number | null
        }
        Update: {
          billing_run_id?: string
          blockers?: Json
          caregiver_id?: string | null
          charge?: number | null
          claim_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          hours?: number | null
          id?: string
          invoice_id?: string | null
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          override_reason?:
            | Database["public"]["Enums"]["prebill_override_reason"]
            | null
          reason?: string | null
          resolution?: string | null
          resolved?: boolean
          status?: string
          timesheet_id?: string | null
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_run_items_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_run_items_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_runs: {
        Row: {
          blocked_count: number
          blockers: Json
          company_id: string | null
          completed_at: string | null
          created_at: string
          exports: Json
          generated_count: number
          id: string
          notes: string | null
          options: Json
          period_end: string
          period_start: string
          ran_by: string | null
          started_at: string | null
          status: string
          total_charge: number
          total_timesheets: number
          total_units: number
          updated_at: string
        }
        Insert: {
          blocked_count?: number
          blockers?: Json
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          exports?: Json
          generated_count?: number
          id?: string
          notes?: string | null
          options?: Json
          period_end: string
          period_start: string
          ran_by?: string | null
          started_at?: string | null
          status?: string
          total_charge?: number
          total_timesheets?: number
          total_units?: number
          updated_at?: string
        }
        Update: {
          blocked_count?: number
          blockers?: Json
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          exports?: Json
          generated_count?: number
          id?: string
          notes?: string | null
          options?: Json
          period_end?: string
          period_start?: string
          ran_by?: string | null
          started_at?: string | null
          status?: string
          total_charge?: number
          total_timesheets?: number
          total_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      breach_notifications: {
        Row: {
          affected_individuals_count: number
          cause: string | null
          company_id: string
          containment_actions: string | null
          created_at: string
          description: string
          discovered_at: string
          hhs_reported_at: string | null
          id: string
          media_reported_at: string | null
          notification_sent_at: string | null
          occurred_at: string | null
          phi_types: string[] | null
          reported_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_individuals_count?: number
          cause?: string | null
          company_id: string
          containment_actions?: string | null
          created_at?: string
          description: string
          discovered_at: string
          hhs_reported_at?: string | null
          id?: string
          media_reported_at?: string | null
          notification_sent_at?: string | null
          occurred_at?: string | null
          phi_types?: string[] | null
          reported_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affected_individuals_count?: number
          cause?: string | null
          company_id?: string
          containment_actions?: string | null
          created_at?: string
          description?: string
          discovered_at?: string
          hhs_reported_at?: string | null
          id?: string
          media_reported_at?: string | null
          notification_sent_at?: string | null
          occurred_at?: string | null
          phi_types?: string[] | null
          reported_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_plan_categories: {
        Row: {
          care_plan_id: string
          category_code: string | null
          category_name: string
          company_id: string | null
          created_at: string
          id: string
          sort_order: number | null
          weekly_hours_approved: number
          weekly_minutes_approved: number
        }
        Insert: {
          care_plan_id: string
          category_code?: string | null
          category_name: string
          company_id?: string | null
          created_at?: string
          id?: string
          sort_order?: number | null
          weekly_hours_approved?: number
          weekly_minutes_approved?: number
        }
        Update: {
          care_plan_id?: string
          category_code?: string | null
          category_name?: string
          company_id?: string | null
          created_at?: string
          id?: string
          sort_order?: number | null
          weekly_hours_approved?: number
          weekly_minutes_approved?: number
        }
        Relationships: [
          {
            foreignKeyName: "care_plan_categories_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plan_categories_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "unsigned_care_plans_30d"
            referencedColumns: ["care_plan_id"]
          },
          {
            foreignKeyName: "care_plan_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plan_tasks: {
        Row: {
          care_plan_id: string
          category_id: string | null
          company_id: string | null
          created_at: string
          frequency_per_week: number
          id: string
          minutes_per_task: number
          minutes_per_week: number
          notes: string | null
          sort_order: number | null
          task_code: string | null
          task_name: string
        }
        Insert: {
          care_plan_id: string
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          frequency_per_week?: number
          id?: string
          minutes_per_task?: number
          minutes_per_week?: number
          notes?: string | null
          sort_order?: number | null
          task_code?: string | null
          task_name: string
        }
        Update: {
          care_plan_id?: string
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          frequency_per_week?: number
          id?: string
          minutes_per_task?: number
          minutes_per_week?: number
          notes?: string | null
          sort_order?: number | null
          task_code?: string | null
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plan_tasks_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plan_tasks_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "unsigned_care_plans_30d"
            referencedColumns: ["care_plan_id"]
          },
          {
            foreignKeyName: "care_plan_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "care_plan_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plan_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plan_versions: {
        Row: {
          care_plan_id: string
          change_summary: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          next_review_date: string | null
          physician_name: string | null
          physician_signature_data: string | null
          physician_signed_at: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          care_plan_id: string
          change_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          next_review_date?: string | null
          physician_name?: string | null
          physician_signature_data?: string | null
          physician_signed_at?: string | null
          snapshot: Json
          version_number: number
        }
        Update: {
          care_plan_id?: string
          change_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          next_review_date?: string | null
          physician_name?: string | null
          physician_signature_data?: string | null
          physician_signed_at?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "care_plan_versions_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plan_versions_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "unsigned_care_plans_30d"
            referencedColumns: ["care_plan_id"]
          },
          {
            foreignKeyName: "care_plan_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          active: boolean
          authorization_number: string | null
          case_manager_agency: string | null
          case_manager_name: string | null
          case_manager_phone: string | null
          client_id: string
          company_id: string | null
          created_at: string
          current_version_id: string | null
          diagnosis: string | null
          effective_end: string | null
          effective_start: string | null
          frequency: string | null
          goals: string | null
          id: string
          medicaid_id: string | null
          next_review_date: string | null
          parsed_at: string | null
          parser_confidence: number | null
          parser_raw: Json | null
          physician: string | null
          program_label: string | null
          program_type: string | null
          review_date: string | null
          source_document_id: string | null
          start_date: string | null
          tasks: string[] | null
          total_weekly_hours: number | null
          total_weekly_minutes: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          authorization_number?: string | null
          case_manager_agency?: string | null
          case_manager_name?: string | null
          case_manager_phone?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          current_version_id?: string | null
          diagnosis?: string | null
          effective_end?: string | null
          effective_start?: string | null
          frequency?: string | null
          goals?: string | null
          id?: string
          medicaid_id?: string | null
          next_review_date?: string | null
          parsed_at?: string | null
          parser_confidence?: number | null
          parser_raw?: Json | null
          physician?: string | null
          program_label?: string | null
          program_type?: string | null
          review_date?: string | null
          source_document_id?: string | null
          start_date?: string | null
          tasks?: string[] | null
          total_weekly_hours?: number | null
          total_weekly_minutes?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          authorization_number?: string | null
          case_manager_agency?: string | null
          case_manager_name?: string | null
          case_manager_phone?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          current_version_id?: string | null
          diagnosis?: string | null
          effective_end?: string | null
          effective_start?: string | null
          frequency?: string | null
          goals?: string | null
          id?: string
          medicaid_id?: string | null
          next_review_date?: string | null
          parsed_at?: string | null
          parser_confidence?: number | null
          parser_raw?: Json | null
          physician?: string | null
          program_label?: string | null
          program_type?: string | null
          review_date?: string | null
          source_document_id?: string | null
          start_date?: string | null
          tasks?: string[] | null
          total_weekly_hours?: number | null
          total_weekly_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_availability: {
        Row: {
          active: boolean
          caregiver_id: string
          company_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          max_hours_per_week: number | null
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          caregiver_id: string
          company_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          max_hours_per_week?: number | null
          notes?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          caregiver_id?: string
          company_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          max_hours_per_week?: number | null
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_availability_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_availability_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      caregivers: {
        Row: {
          certifications: string[] | null
          company_id: string | null
          created_at: string
          email: string | null
          external_ref: string | null
          hourly_wage: number
          id: string
          license_number: string | null
          license_state: string | null
          name: string
          npi: string | null
          phone: string | null
          skills: string[] | null
          status: string
          taxonomy_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certifications?: string[] | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_ref?: string | null
          hourly_wage?: number
          id?: string
          license_number?: string | null
          license_state?: string | null
          name: string
          npi?: string | null
          phone?: string | null
          skills?: string[] | null
          status?: string
          taxonomy_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certifications?: string[] | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_ref?: string | null
          hourly_wage?: number
          id?: string
          license_number?: string | null
          license_state?: string | null
          name?: string
          npi?: string | null
          phone?: string | null
          skills?: string[] | null
          status?: string
          taxonomy_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caregivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_acknowledgments: {
        Row: {
          ack_type: string
          company_id: string | null
          created_at: string
          errors: Json | null
          file_name: string | null
          id: string
          parsed: Json | null
          raw_payload: string | null
          received_at: string
          status: string
          storage_path: string | null
          submission_id: string | null
        }
        Insert: {
          ack_type: string
          company_id?: string | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          parsed?: Json | null
          raw_payload?: string | null
          received_at?: string
          status: string
          storage_path?: string | null
          submission_id?: string | null
        }
        Update: {
          ack_type?: string
          company_id?: string | null
          created_at?: string
          errors?: Json | null
          file_name?: string | null
          id?: string
          parsed?: Json | null
          raw_payload?: string | null
          received_at?: string
          status?: string
          storage_path?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_acknowledgments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_acknowledgments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "claim_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_denials: {
        Row: {
          appeal_notes: string | null
          appeal_resolved_date: string | null
          appeal_status: string
          appeal_submitted_date: string | null
          assigned_to: string | null
          claim_id: string
          company_id: string | null
          created_at: string
          denial_code: string | null
          denial_date: string
          denial_reason: string
          id: string
          updated_at: string
        }
        Insert: {
          appeal_notes?: string | null
          appeal_resolved_date?: string | null
          appeal_status?: string
          appeal_submitted_date?: string | null
          assigned_to?: string | null
          claim_id: string
          company_id?: string | null
          created_at?: string
          denial_code?: string | null
          denial_date?: string
          denial_reason: string
          id?: string
          updated_at?: string
        }
        Update: {
          appeal_notes?: string | null
          appeal_resolved_date?: string | null
          appeal_status?: string
          appeal_submitted_date?: string | null
          assigned_to?: string | null
          claim_id?: string
          company_id?: string | null
          created_at?: string
          denial_code?: string | null
          denial_date?: string
          denial_reason?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_denials_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_diagnoses: {
        Row: {
          claim_id: string
          company_id: string | null
          created_at: string
          icd10_code: string
          id: string
          poa_indicator: string | null
          rank: number
        }
        Insert: {
          claim_id: string
          company_id?: string | null
          created_at?: string
          icd10_code: string
          id?: string
          poa_indicator?: string | null
          rank: number
        }
        Update: {
          claim_id?: string
          company_id?: string | null
          created_at?: string
          icd10_code?: string
          id?: string
          poa_indicator?: string | null
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "claim_diagnoses_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_diagnoses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_lines: {
        Row: {
          adjustment: number
          charge: number
          claim_id: string
          company_id: string | null
          created_at: string
          diagnosis_pointers: string | null
          id: string
          line_note: string | null
          modifier: string | null
          modifier_2: string | null
          modifier_3: string | null
          modifier_4: string | null
          paid: number
          pos_code: string | null
          rendering_caregiver_id: string | null
          service_code: string
          service_date: string
          status: string
          unit_rate: number
          unit_type: string | null
          units: number
          visit_id: string | null
        }
        Insert: {
          adjustment?: number
          charge?: number
          claim_id: string
          company_id?: string | null
          created_at?: string
          diagnosis_pointers?: string | null
          id?: string
          line_note?: string | null
          modifier?: string | null
          modifier_2?: string | null
          modifier_3?: string | null
          modifier_4?: string | null
          paid?: number
          pos_code?: string | null
          rendering_caregiver_id?: string | null
          service_code: string
          service_date: string
          status?: string
          unit_rate?: number
          unit_type?: string | null
          units?: number
          visit_id?: string | null
        }
        Update: {
          adjustment?: number
          charge?: number
          claim_id?: string
          company_id?: string | null
          created_at?: string
          diagnosis_pointers?: string | null
          id?: string
          line_note?: string | null
          modifier?: string | null
          modifier_2?: string | null
          modifier_3?: string | null
          modifier_4?: string | null
          paid?: number
          pos_code?: string | null
          rendering_caregiver_id?: string | null
          service_code?: string
          service_date?: string
          status?: string
          unit_rate?: number
          unit_type?: string | null
          units?: number
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_lines_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_lines_rendering_caregiver_id_fkey"
            columns: ["rendering_caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_payments: {
        Row: {
          adjustment: number
          amount: number
          claim_id: string
          company_id: string | null
          created_at: string
          id: string
          notes: string | null
          payer_id: string | null
          payment_date: string
          payment_type: string
          reference: string | null
          remittance_id: string | null
        }
        Insert: {
          adjustment?: number
          amount?: number
          claim_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payer_id?: string | null
          payment_date: string
          payment_type?: string
          reference?: string | null
          remittance_id?: string | null
        }
        Update: {
          adjustment?: number
          amount?: number
          claim_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payer_id?: string | null
          payment_date?: string
          payment_type?: string
          reference?: string | null
          remittance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_payments_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_payments_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "remittances"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_status_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          claim_id: string
          company_id: string
          effective_date: string | null
          id: string
          payer_claim_control_number: string | null
          raw_response: Json | null
          status_category: string | null
          status_code: string | null
          status_description: string | null
          submission_id: string | null
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          claim_id: string
          company_id: string
          effective_date?: string | null
          id?: string
          payer_claim_control_number?: string | null
          raw_response?: Json | null
          status_category?: string | null
          status_code?: string | null
          status_description?: string | null
          submission_id?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          claim_id?: string
          company_id?: string
          effective_date?: string | null
          id?: string
          payer_claim_control_number?: string | null
          raw_response?: Json | null
          status_category?: string | null
          status_code?: string | null
          status_description?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_status_checks_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_status_checks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "claim_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_submission_claims: {
        Row: {
          claim_id: string
          company_id: string | null
          submission_id: string
        }
        Insert: {
          claim_id: string
          company_id?: string | null
          submission_id: string
        }
        Update: {
          claim_id?: string
          company_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_submission_claims_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_submission_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_submission_claims_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "claim_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_submissions: {
        Row: {
          ack_277ca_status: string | null
          ack_999_status: string | null
          claim_count: number
          company_id: string | null
          created_at: string
          era_835_status: string | null
          expected_ack: Json | null
          file_name: string
          generated_at: string
          generated_by: string | null
          gs_control_number: string
          id: string
          isa_control_number: string
          notes: string | null
          parent_submission_id: string | null
          parity_checked_at: string | null
          parity_diff: Json | null
          parity_status: string | null
          payer_id: string | null
          regeneration_count: number
          st_control_number: string
          status: string
          storage_path: string | null
          test_mode: boolean
          total_charge: number
          updated_at: string
          validation_report: Json | null
        }
        Insert: {
          ack_277ca_status?: string | null
          ack_999_status?: string | null
          claim_count?: number
          company_id?: string | null
          created_at?: string
          era_835_status?: string | null
          expected_ack?: Json | null
          file_name: string
          generated_at?: string
          generated_by?: string | null
          gs_control_number: string
          id?: string
          isa_control_number: string
          notes?: string | null
          parent_submission_id?: string | null
          parity_checked_at?: string | null
          parity_diff?: Json | null
          parity_status?: string | null
          payer_id?: string | null
          regeneration_count?: number
          st_control_number: string
          status?: string
          storage_path?: string | null
          test_mode?: boolean
          total_charge?: number
          updated_at?: string
          validation_report?: Json | null
        }
        Update: {
          ack_277ca_status?: string | null
          ack_999_status?: string | null
          claim_count?: number
          company_id?: string | null
          created_at?: string
          era_835_status?: string | null
          expected_ack?: Json | null
          file_name?: string
          generated_at?: string
          generated_by?: string | null
          gs_control_number?: string
          id?: string
          isa_control_number?: string
          notes?: string | null
          parent_submission_id?: string | null
          parity_checked_at?: string | null
          parity_diff?: Json | null
          parity_status?: string | null
          payer_id?: string | null
          regeneration_count?: number
          st_control_number?: string
          status?: string
          storage_path?: string | null
          test_mode?: boolean
          total_charge?: number
          updated_at?: string
          validation_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "claim_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_submissions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          assignment_indicator: string | null
          authorization_id: string | null
          benefits_assignment_indicator: string | null
          billing_run_id: string | null
          claim_number: string
          client_id: string
          company_id: string | null
          control_number: string | null
          created_at: string
          edi837_payload: Json | null
          frequency_code: string | null
          id: string
          invoice_id: string | null
          last_reminder_at: string | null
          notes: string | null
          patient_responsibility: number
          payer_claim_number: string | null
          payer_id: string
          pos_code: string | null
          prior_payer_adjustments: Json | null
          prior_payer_paid: number | null
          provider_signature_indicator: string | null
          release_of_info_code: string | null
          rendering_caregiver_id: string | null
          service_end: string
          service_start: string
          status: string
          submission_date: string | null
          surprise_billing_nte: string | null
          timesheet_id: string | null
          total_adjusted: number
          total_charge: number
          total_paid: number
          total_units: number
          updated_at: string
        }
        Insert: {
          assignment_indicator?: string | null
          authorization_id?: string | null
          benefits_assignment_indicator?: string | null
          billing_run_id?: string | null
          claim_number: string
          client_id: string
          company_id?: string | null
          control_number?: string | null
          created_at?: string
          edi837_payload?: Json | null
          frequency_code?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          patient_responsibility?: number
          payer_claim_number?: string | null
          payer_id: string
          pos_code?: string | null
          prior_payer_adjustments?: Json | null
          prior_payer_paid?: number | null
          provider_signature_indicator?: string | null
          release_of_info_code?: string | null
          rendering_caregiver_id?: string | null
          service_end: string
          service_start: string
          status?: string
          submission_date?: string | null
          surprise_billing_nte?: string | null
          timesheet_id?: string | null
          total_adjusted?: number
          total_charge?: number
          total_paid?: number
          total_units?: number
          updated_at?: string
        }
        Update: {
          assignment_indicator?: string | null
          authorization_id?: string | null
          benefits_assignment_indicator?: string | null
          billing_run_id?: string | null
          claim_number?: string
          client_id?: string
          company_id?: string | null
          control_number?: string | null
          created_at?: string
          edi837_payload?: Json | null
          frequency_code?: string | null
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          patient_responsibility?: number
          payer_claim_number?: string | null
          payer_id?: string
          pos_code?: string | null
          prior_payer_adjustments?: Json | null
          prior_payer_paid?: number | null
          provider_signature_indicator?: string | null
          release_of_info_code?: string | null
          rendering_caregiver_id?: string | null
          service_end?: string
          service_start?: string
          status?: string
          submission_date?: string | null
          surprise_billing_nte?: string | null
          timesheet_id?: string | null
          total_adjusted?: number
          total_charge?: number
          total_paid?: number
          total_units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_rendering_caregiver_id_fkey"
            columns: ["rendering_caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          company_id: string | null
          created_at: string
          id: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          company_id?: string | null
          created_at?: string
          id?: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string | null
          created_at?: string
          id?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          care_level: string
          care_plan: string[] | null
          city: string | null
          company_id: string | null
          created_at: string
          dob: string | null
          emergency_contact: string | null
          external_ref: string | null
          first_name: string | null
          gender: string | null
          geofence_meters: number
          hourly_rate: number
          id: string
          intake_source: string
          last_name: string | null
          lat: number | null
          lng: number | null
          member_id: string | null
          middle_name: string | null
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string
          subscriber_dob: string | null
          subscriber_first_name: string | null
          subscriber_gender: string | null
          subscriber_last_name: string | null
          subscriber_member_id: string | null
          subscriber_relationship: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          care_level?: string
          care_plan?: string[] | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact?: string | null
          external_ref?: string | null
          first_name?: string | null
          gender?: string | null
          geofence_meters?: number
          hourly_rate?: number
          id?: string
          intake_source?: string
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          member_id?: string | null
          middle_name?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          subscriber_dob?: string | null
          subscriber_first_name?: string | null
          subscriber_gender?: string | null
          subscriber_last_name?: string | null
          subscriber_member_id?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          care_level?: string
          care_plan?: string[] | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          dob?: string | null
          emergency_contact?: string | null
          external_ref?: string | null
          first_name?: string | null
          gender?: string | null
          geofence_meters?: number
          hourly_rate?: number
          id?: string
          intake_source?: string
          last_name?: string | null
          lat?: number | null
          lng?: number | null
          member_id?: string | null
          middle_name?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          subscriber_dob?: string | null
          subscriber_first_name?: string | null
          subscriber_gender?: string | null
          subscriber_last_name?: string | null
          subscriber_member_id?: string | null
          subscriber_relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          edi_submitter_id: string | null
          edi_test_mode: boolean
          email: string | null
          id: string
          legal_name: string
          logo_url: string | null
          npi: string | null
          pay_to_address_line1: string | null
          pay_to_address_line2: string | null
          pay_to_city: string | null
          pay_to_postal_code: string | null
          pay_to_state: string | null
          phone: string | null
          postal_code: string | null
          settings: Json
          state: string | null
          tax_id: string | null
          tax_id_type: string | null
          taxonomy_code: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          edi_submitter_id?: string | null
          edi_test_mode?: boolean
          email?: string | null
          id?: string
          legal_name: string
          logo_url?: string | null
          npi?: string | null
          pay_to_address_line1?: string | null
          pay_to_address_line2?: string | null
          pay_to_city?: string | null
          pay_to_postal_code?: string | null
          pay_to_state?: string | null
          phone?: string | null
          postal_code?: string | null
          settings?: Json
          state?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          taxonomy_code?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          edi_submitter_id?: string | null
          edi_test_mode?: boolean
          email?: string | null
          id?: string
          legal_name?: string
          logo_url?: string | null
          npi?: string | null
          pay_to_address_line1?: string | null
          pay_to_address_line2?: string | null
          pay_to_city?: string | null
          pay_to_postal_code?: string | null
          pay_to_state?: string | null
          phone?: string | null
          postal_code?: string | null
          settings?: Json
          state?: string | null
          tax_id?: string | null
          tax_id_type?: string | null
          taxonomy_code?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_required_credentials: {
        Row: {
          company_id: string
          created_at: string
          cred_type: string
          id: string
          required: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          cred_type: string
          id?: string
          required?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          cred_type?: string
          id?: string
          required?: boolean
        }
        Relationships: []
      }
      company_security_policy: {
        Row: {
          company_id: string
          require_mfa_roles: Database["public"]["Enums"]["app_role"][]
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          company_id: string
          require_mfa_roles?: Database["public"]["Enums"]["app_role"][]
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          require_mfa_roles?: Database["public"]["Enums"]["app_role"][]
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          pending_price_id: string | null
          price_id: string | null
          status: string
          tier_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          pending_price_id?: string | null
          price_id?: string | null
          status?: string
          tier_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          pending_price_id?: string | null
          price_id?: string | null
          status?: string
          tier_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          company_role: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          company_role?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          company_role?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          caregiver_id: string
          company_id: string | null
          created_at: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          issuer: string | null
          number: string | null
          type: string
          updated_at: string
        }
        Insert: {
          caregiver_id: string
          company_id?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          number?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          caregiver_id?: string
          company_id?: string | null
          created_at?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          issuer?: string | null
          number?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      data_purge_log: {
        Row: {
          company_id: string
          entity: string
          executed_at: string
          executed_by: string | null
          id: string
          newest_purged_at: string | null
          oldest_purged_at: string | null
          policy_years: number | null
          records_purged: number
        }
        Insert: {
          company_id: string
          entity: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          newest_purged_at?: string | null
          oldest_purged_at?: string | null
          policy_years?: number | null
          records_purged?: number
        }
        Update: {
          company_id?: string
          entity?: string
          executed_at?: string
          executed_by?: string | null
          id?: string
          newest_purged_at?: string | null
          oldest_purged_at?: string | null
          policy_years?: number | null
          records_purged?: number
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          entity: string
          id: string
          legal_basis: string | null
          retention_years: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          entity: string
          id?: string
          legal_basis?: string | null
          retention_years?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          entity?: string
          id?: string
          legal_basis?: string | null
          retention_years?: number
          updated_at?: string
        }
        Relationships: []
      }
      desktop_licenses: {
        Row: {
          app_version: string | null
          company_id: string
          created_at: string
          id: string
          last_seen: string
          machine_id: string
          machine_name: string | null
          os: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          company_id: string
          created_at?: string
          id?: string
          last_seen?: string
          machine_id: string
          machine_name?: string | null
          os?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          company_id?: string
          created_at?: string
          id?: string
          last_seen?: string
          machine_id?: string
          machine_name?: string | null
          os?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      disciplinary_actions: {
        Row: {
          acknowledged_at: string | null
          acknowledgment_notes: string | null
          action_type: string
          company_id: string | null
          created_at: string
          details: string | null
          id: string
          issued_at: string
          issued_by: string | null
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledgment_notes?: string | null
          action_type?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledgment_notes?: string | null
          action_type?: string
          company_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          care_plan_id: string | null
          caregiver_id: string | null
          client_id: string | null
          company_id: string | null
          created_at: string
          credential_id: string | null
          doc_type: string
          file_name: string
          id: string
          intake_id: string | null
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          care_plan_id?: string | null
          caregiver_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          credential_id?: string | null
          doc_type?: string
          file_name: string
          id?: string
          intake_id?: string | null
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          care_plan_id?: string | null
          caregiver_id?: string | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          credential_id?: string | null
          doc_type?: string
          file_name?: string
          id?: string
          intake_id?: string | null
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dunning_log: {
        Row: {
          age_days: number | null
          amount_due: number | null
          channel: string
          claim_id: string | null
          company_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          recipient_email: string | null
          recipient_phone: string | null
          status: string
        }
        Insert: {
          age_days?: number | null
          amount_due?: number | null
          channel?: string
          claim_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
        }
        Update: {
          age_days?: number | null
          amount_due?: number | null
          channel?: string
          claim_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
        }
        Relationships: []
      }
      eligibility_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          client_id: string
          company_id: string
          copay_amount: number | null
          coverage_end: string | null
          coverage_start: string | null
          deductible_remaining: number | null
          error_message: string | null
          group_number: string | null
          id: string
          is_active: boolean | null
          member_id: string | null
          oop_remaining: number | null
          payer_id: string | null
          plan_name: string | null
          provider: string | null
          raw_271: Json | null
          service_date: string
          service_type: string | null
          status: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          client_id: string
          company_id: string
          copay_amount?: number | null
          coverage_end?: string | null
          coverage_start?: string | null
          deductible_remaining?: number | null
          error_message?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          member_id?: string | null
          oop_remaining?: number | null
          payer_id?: string | null
          plan_name?: string | null
          provider?: string | null
          raw_271?: Json | null
          service_date?: string
          service_type?: string | null
          status?: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          client_id?: string
          company_id?: string
          copay_amount?: number | null
          coverage_end?: string | null
          coverage_start?: string | null
          deductible_remaining?: number | null
          error_message?: string | null
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          member_id?: string | null
          oop_remaining?: number | null
          payer_id?: string | null
          plan_name?: string | null
          provider?: string | null
          raw_271?: Json | null
          service_date?: string
          service_type?: string | null
          status?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employment_records: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: string
          hire_date: string | null
          id: string
          job_title: string | null
          notes: string | null
          status: string
          supervisor_id: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          notes?: string | null
          status?: string
          supervisor_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          notes?: string | null
          status?: string
          supervisor_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evv_alerts: {
        Row: {
          alert_type: string
          company_id: string | null
          created_at: string
          entity_id: string
          id: string
          metadata: Json | null
          period_key: string
          recipient_email: string
        }
        Insert: {
          alert_type: string
          company_id?: string | null
          created_at?: string
          entity_id: string
          id?: string
          metadata?: Json | null
          period_key: string
          recipient_email: string
        }
        Update: {
          alert_type?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          metadata?: Json | null
          period_key?: string
          recipient_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "evv_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusion_checks: {
        Row: {
          caregiver_id: string | null
          checked_at: string
          company_id: string
          details: Json
          id: string
          matched_record_id: string | null
          source: string
          status: string
        }
        Insert: {
          caregiver_id?: string | null
          checked_at?: string
          company_id: string
          details?: Json
          id?: string
          matched_record_id?: string | null
          source: string
          status: string
        }
        Update: {
          caregiver_id?: string | null
          checked_at?: string
          company_id?: string
          details?: Json
          id?: string
          matched_record_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exclusion_checks_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exclusion_checks_matched_record_id_fkey"
            columns: ["matched_record_id"]
            isOneToOne: false
            referencedRelation: "exclusion_list_cache"
            referencedColumns: ["id"]
          },
        ]
      }
      exclusion_list_cache: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          excl_date: string | null
          excl_type: string | null
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          npi: string | null
          raw: Json | null
          refreshed_at: string
          reinstate_date: string | null
          source: string
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          excl_date?: string | null
          excl_type?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          npi?: string | null
          raw?: Json | null
          refreshed_at?: string
          reinstate_date?: string | null
          source: string
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          excl_date?: string | null
          excl_type?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          npi?: string | null
          raw?: Json | null
          refreshed_at?: string
          reinstate_date?: string | null
          source?: string
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      hr_document_audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          document_id: string | null
          document_title: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          document_title?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          document_title?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "hr_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_document_signatures: {
        Row: {
          company_id: string | null
          created_at: string
          decline_reason: string | null
          document_id: string | null
          document_title: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          requested_at: string
          requested_by: string | null
          signature_image_path: string | null
          signature_typed_name: string | null
          signed_at: string | null
          signed_pdf_path: string | null
          signer_email: string | null
          signer_id: string
          signer_name: string | null
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          decline_reason?: string | null
          document_id?: string | null
          document_title?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          requested_at?: string
          requested_by?: string | null
          signature_image_path?: string | null
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          signer_email?: string | null
          signer_id: string
          signer_name?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          decline_reason?: string | null
          document_id?: string | null
          document_title?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          requested_at?: string
          requested_by?: string | null
          signature_image_path?: string | null
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          signer_email?: string | null
          signer_id?: string
          signer_name?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "hr_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_document_templates: {
        Row: {
          active: boolean
          audience: string
          category: string
          company_id: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          jurisdiction: string | null
          mandatory: boolean
          reference_url: string | null
          required_for_roles: Database["public"]["Enums"]["app_role"][]
          retention_years: number | null
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          jurisdiction?: string | null
          mandatory?: boolean
          reference_url?: string | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][]
          retention_years?: number | null
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          jurisdiction?: string | null
          mandatory?: boolean
          reference_url?: string | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][]
          retention_years?: number | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          attachments: Json | null
          caregiver_id: string | null
          client_id: string | null
          closed_at: string | null
          company_id: string | null
          created_at: string
          follow_up_actions: string | null
          id: string
          immediate_actions: string | null
          incident_type: string
          location: string | null
          manager_id: string | null
          manager_notes: string | null
          manager_signed_at: string | null
          narrative: string
          occurred_at: string
          regulatory_notified_at: string | null
          regulatory_notify: boolean
          reported_by: string | null
          root_cause: string | null
          severity: string
          status: string
          updated_at: string
          visit_id: string | null
          witnesses: Json | null
        }
        Insert: {
          attachments?: Json | null
          caregiver_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          follow_up_actions?: string | null
          id?: string
          immediate_actions?: string | null
          incident_type: string
          location?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          manager_signed_at?: string | null
          narrative: string
          occurred_at?: string
          regulatory_notified_at?: string | null
          regulatory_notify?: boolean
          reported_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          witnesses?: Json | null
        }
        Update: {
          attachments?: Json | null
          caregiver_id?: string | null
          client_id?: string | null
          closed_at?: string | null
          company_id?: string | null
          created_at?: string
          follow_up_actions?: string | null
          id?: string
          immediate_actions?: string | null
          incident_type?: string
          location?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          manager_signed_at?: string | null
          narrative?: string
          occurred_at?: string
          regulatory_notified_at?: string | null
          regulatory_notify?: boolean
          reported_by?: string | null
          root_cause?: string | null
          severity?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
          witnesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      intakes: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          data: Json
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intakes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intakes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          balance: number | null
          billing_run_id: string | null
          claim_id: string | null
          client_id: string
          company_id: string | null
          created_at: string
          due_date: string
          hours: number
          id: string
          last_reminder_at: string | null
          paid_amount: number | null
          paid_date: string | null
          payer_id: string | null
          period_end: string | null
          period_start: string | null
          rate: number | null
          sent_at: string | null
          service_code: string | null
          status: string
          timesheet_id: string | null
          units: number | null
          updated_at: string
          visit_ids: string[] | null
        }
        Insert: {
          amount?: number
          balance?: number | null
          billing_run_id?: string | null
          claim_id?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          due_date: string
          hours?: number
          id?: string
          last_reminder_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payer_id?: string | null
          period_end?: string | null
          period_start?: string | null
          rate?: number | null
          sent_at?: string | null
          service_code?: string | null
          status?: string
          timesheet_id?: string | null
          units?: number | null
          updated_at?: string
          visit_ids?: string[] | null
        }
        Update: {
          amount?: number
          balance?: number | null
          billing_run_id?: string | null
          claim_id?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          due_date?: string
          hours?: number
          id?: string
          last_reminder_at?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payer_id?: string | null
          period_end?: string | null
          period_start?: string | null
          rate?: number | null
          sent_at?: string | null
          service_code?: string | null
          status?: string
          timesheet_id?: string | null
          units?: number | null
          updated_at?: string
          visit_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_run_id_fkey"
            columns: ["billing_run_id"]
            isOneToOne: false
            referencedRelation: "billing_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_feedback: {
        Row: {
          comment: string | null
          created_at: string
          helpful: boolean | null
          id: string
          section_id: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          helpful?: boolean | null
          id?: string
          section_id: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          helpful?: boolean | null
          id?: string
          section_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_feedback_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sections: {
        Row: {
          body: string
          company_id: string | null
          created_at: string
          id: string
          module_key: string | null
          published: boolean
          role_tags: string[]
          section_type: string
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          module_key?: string | null
          published?: boolean
          role_tags?: string[]
          section_type?: string
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          module_key?: string | null
          published?: boolean
          role_tags?: string[]
          section_type?: string
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      manual_versions: {
        Row: {
          body: string
          change_summary: string | null
          created_at: string
          edited_by: string | null
          id: string
          section_id: string
          title: string
          version: number
        }
        Insert: {
          body: string
          change_summary?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          section_id: string
          title: string
          version: number
        }
        Update: {
          body?: string
          change_summary?: string | null
          created_at?: string
          edited_by?: string | null
          id?: string
          section_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_versions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_administrations: {
        Row: {
          administered_at: string | null
          caregiver_id: string | null
          client_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          dose_given: string | null
          id: string
          medication_id: string
          notes: string | null
          photo_url: string | null
          refusal_reason: string | null
          scheduled_time: string | null
          status: string
          visit_id: string | null
          witness_user_id: string | null
        }
        Insert: {
          administered_at?: string | null
          caregiver_id?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dose_given?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          photo_url?: string | null
          refusal_reason?: string | null
          scheduled_time?: string | null
          status?: string
          visit_id?: string | null
          witness_user_id?: string | null
        }
        Update: {
          administered_at?: string | null
          caregiver_id?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          dose_given?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          photo_url?: string | null
          refusal_reason?: string | null
          scheduled_time?: string | null
          status?: string
          visit_id?: string | null
          witness_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_administrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_administrations_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          allergy_warnings: string[] | null
          client_id: string
          company_id: string | null
          controlled_class: string | null
          created_at: string
          dose: string
          dose_max: number | null
          dose_min: number | null
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_prn: boolean
          name: string
          pharmacy: string | null
          prescriber: string | null
          prn_reason: string | null
          route: string
          rx_number: string | null
          scheduled_times: string[] | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          allergy_warnings?: string[] | null
          client_id: string
          company_id?: string | null
          controlled_class?: string | null
          created_at?: string
          dose: string
          dose_max?: number | null
          dose_min?: number | null
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_prn?: boolean
          name: string
          pharmacy?: string | null
          prescriber?: string | null
          prn_reason?: string | null
          route?: string
          rx_number?: string | null
          scheduled_times?: string[] | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          allergy_warnings?: string[] | null
          client_id?: string
          company_id?: string | null
          controlled_class?: string | null
          created_at?: string
          dose?: string
          dose_max?: number | null
          dose_min?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_prn?: boolean
          name?: string
          pharmacy?: string | null
          prescriber?: string | null
          prn_reason?: string | null
          route?: string
          rx_number?: string | null
          scheduled_times?: string[] | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          company_id: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          company_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          company_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_run_items: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          error: string | null
          external_ref: string | null
          id: string
          run_id: string
          sheet: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          error?: string | null
          external_ref?: string | null
          id?: string
          run_id: string
          sheet: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          error?: string | null
          external_ref?: string | null
          id?: string
          run_id?: string
          sheet?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_run_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "migration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_runs: {
        Row: {
          company_id: string
          finished_at: string | null
          id: string
          mode: string
          notes: string | null
          started_at: string
          started_by: string | null
          status: string
          totals: Json
        }
        Insert: {
          company_id: string
          finished_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          totals?: Json
        }
        Update: {
          company_id?: string
          finished_at?: string | null
          id?: string
          mode?: string
          notes?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "migration_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          company_id: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          items: Json
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      open_shifts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          certifications_required: string[] | null
          claimed_at: string | null
          claimed_by: string | null
          client_id: string
          company_id: string | null
          created_at: string
          date: string
          end_time: string
          hourly_rate: number | null
          id: string
          notes: string | null
          posted_by: string | null
          skills_required: string[] | null
          start_time: string
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          certifications_required?: string[] | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          date: string
          end_time: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          posted_by?: string | null
          skills_required?: string[] | null
          start_time: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          certifications_required?: string[] | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          posted_by?: string | null
          skills_required?: string[] | null
          start_time?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payer_rate_sheets: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          description: string | null
          effective_end: string | null
          effective_start: string
          hourly_rate: number
          id: string
          modifier: string | null
          payer_id: string
          service_code: string
          unit_minutes: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          description?: string | null
          effective_end?: string | null
          effective_start: string
          hourly_rate?: number
          id?: string
          modifier?: string | null
          payer_id: string
          service_code: string
          unit_minutes?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          description?: string | null
          effective_end?: string | null
          effective_start?: string
          hourly_rate?: number
          id?: string
          modifier?: string | null
          payer_id?: string
          service_code?: string
          unit_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      payers: {
        Row: {
          aggregator_vendor: string | null
          claim_filing_indicator: string | null
          companion_guide_profile: string | null
          company_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          payer_id_electronic: string | null
          payer_id_external: string | null
          payer_type: string
          requires_aggregator: boolean
          submission_address_line1: string | null
          submission_address_line2: string | null
          submission_city: string | null
          submission_postal_code: string | null
          submission_state: string | null
          updated_at: string
        }
        Insert: {
          aggregator_vendor?: string | null
          claim_filing_indicator?: string | null
          companion_guide_profile?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          payer_id_electronic?: string | null
          payer_id_external?: string | null
          payer_type?: string
          requires_aggregator?: boolean
          submission_address_line1?: string | null
          submission_address_line2?: string | null
          submission_city?: string | null
          submission_postal_code?: string | null
          submission_state?: string | null
          updated_at?: string
        }
        Update: {
          aggregator_vendor?: string | null
          claim_filing_indicator?: string | null
          companion_guide_profile?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          payer_id_electronic?: string | null
          payer_id_external?: string | null
          payer_type?: string
          requires_aggregator?: boolean
          submission_address_line1?: string | null
          submission_address_line2?: string | null
          submission_city?: string | null
          submission_postal_code?: string | null
          submission_state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          company_id: string | null
          created_at: string
          employee_comments: string | null
          employee_signed_at: string | null
          goals: string | null
          id: string
          improvements: string | null
          overall_rating: number | null
          period_end: string
          period_start: string
          reviewer_id: string | null
          reviewer_signed_at: string | null
          status: string
          strengths: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          employee_comments?: string | null
          employee_signed_at?: string | null
          goals?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          period_end: string
          period_start: string
          reviewer_id?: string | null
          reviewer_signed_at?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          employee_comments?: string | null
          employee_signed_at?: string | null
          goals?: string | null
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          period_end?: string
          period_start?: string
          reviewer_id?: string | null
          reviewer_signed_at?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_access_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json
          reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      phi_acknowledgements: {
        Row: {
          acknowledged_at: string
          context: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          acknowledged_at?: string
          context?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          acknowledged_at?: string
          context?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      prebill_override_alerts: {
        Row: {
          acted_by: string | null
          amount: number | null
          company_id: string | null
          created_at: string
          details: Json
          id: string
          notified_count: number
          reason: Database["public"]["Enums"]["prebill_override_reason"] | null
          trigger: string
        }
        Insert: {
          acted_by?: string | null
          amount?: number | null
          company_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          notified_count?: number
          reason?: Database["public"]["Enums"]["prebill_override_reason"] | null
          trigger: string
        }
        Update: {
          acted_by?: string | null
          amount?: number | null
          company_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          notified_count?: number
          reason?: Database["public"]["Enums"]["prebill_override_reason"] | null
          trigger?: string
        }
        Relationships: []
      }
      prebill_override_limits: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          id: string
          max_daily_count: number | null
          max_single_amount: number | null
          max_weekly_amount: number | null
          reason: Database["public"]["Enums"]["prebill_override_reason"]
          requires_second_approver: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          max_daily_count?: number | null
          max_single_amount?: number | null
          max_weekly_amount?: number | null
          reason: Database["public"]["Enums"]["prebill_override_reason"]
          requires_second_approver?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          max_daily_count?: number | null
          max_single_amount?: number | null
          max_weekly_amount?: number | null
          reason?: Database["public"]["Enums"]["prebill_override_reason"]
          requires_second_approver?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      prebill_override_log: {
        Row: {
          acted_by: string
          action: string
          billing_run_item_id: string
          blockers_snapshot: Json | null
          company_id: string | null
          created_at: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["prebill_override_reason"] | null
          timesheet_id: string | null
        }
        Insert: {
          acted_by: string
          action: string
          billing_run_item_id: string
          blockers_snapshot?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["prebill_override_reason"] | null
          timesheet_id?: string | null
        }
        Update: {
          acted_by?: string
          action?: string
          billing_run_item_id?: string
          blockers_snapshot?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["prebill_override_reason"] | null
          timesheet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prebill_override_log_billing_run_item_id_fkey"
            columns: ["billing_run_item_id"]
            isOneToOne: false
            referencedRelation: "billing_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          caregiver_id: string | null
          created_at: string
          default_company_id: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          caregiver_id?: string | null
          created_at?: string
          default_company_id?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          caregiver_id?: string | null
          created_at?: string
          default_company_id?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_company_id_fkey"
            columns: ["default_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_balances: {
        Row: {
          accrued_hours: number
          company_id: string | null
          created_at: string
          id: string
          updated_at: string
          used_hours: number
          user_id: string
          year: number
        }
        Insert: {
          accrued_hours?: number
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          used_hours?: number
          user_id: string
          year: number
        }
        Update: {
          accrued_hours?: number
          company_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          used_hours?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pto_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_requests: {
        Row: {
          company_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          end_date: string
          hours: number
          id: string
          reason: string | null
          request_type: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date: string
          hours?: number
          id?: string
          reason?: string | null
          request_type?: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date?: string
          hours?: number
          id?: string
          reason?: string | null
          request_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          last_seen: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          last_seen?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          last_seen?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_counters: {
        Row: {
          bucket_key: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          id?: string
          request_count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          company_id: string | null
          created_at: string
          entity_id: string
          id: string
          metadata: Json | null
          period_key: string
          recipient_email: string
          reminder_type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          entity_id: string
          id?: string
          metadata?: Json | null
          period_key: string
          recipient_email: string
          reminder_type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          metadata?: Json | null
          period_key?: string
          recipient_email?: string
          reminder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      remittances: {
        Row: {
          check_or_eft_number: string | null
          company_id: string | null
          created_at: string
          edi835_payload: Json | null
          id: string
          payer_id: string
          payment_date: string
          payment_method: string
          posted_at: string | null
          posted_by: string | null
          remit_number: string
          total_paid: number
        }
        Insert: {
          check_or_eft_number?: string | null
          company_id?: string | null
          created_at?: string
          edi835_payload?: Json | null
          id?: string
          payer_id: string
          payment_date: string
          payment_method?: string
          posted_at?: string | null
          posted_by?: string | null
          remit_number: string
          total_paid?: number
        }
        Update: {
          check_or_eft_number?: string | null
          company_id?: string | null
          created_at?: string
          edi835_payload?: Json | null
          id?: string
          payer_id?: string
          payment_date?: string
          payment_method?: string
          posted_at?: string | null
          posted_by?: string | null
          remit_number?: string
          total_paid?: number
        }
        Relationships: []
      }
      sandata_batches: {
        Row: {
          company_id: string
          filename: string | null
          id: string
          label: string | null
          notes: string | null
          payer: string | null
          period_end: string
          period_start: string
          program_type: string | null
          row_count: number
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          filename?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          payer?: string | null
          period_end: string
          period_start: string
          program_type?: string | null
          row_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          filename?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          payer?: string | null
          period_end?: string
          period_start?: string
          program_type?: string | null
          row_count?: number
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      sandata_visit_rows: {
        Row: {
          batch_id: string
          caregiver_id: string | null
          caregiver_name: string | null
          client_external_id: string | null
          client_id: string | null
          client_name: string | null
          company_id: string
          created_at: string
          end_time: string | null
          id: string
          medicaid_id: string | null
          payer: string | null
          program_type: string | null
          raw: Json | null
          service_code: string | null
          start_time: string | null
          visit_date: string
        }
        Insert: {
          batch_id: string
          caregiver_id?: string | null
          caregiver_name?: string | null
          client_external_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          medicaid_id?: string | null
          payer?: string | null
          program_type?: string | null
          raw?: Json | null
          service_code?: string | null
          start_time?: string | null
          visit_date: string
        }
        Update: {
          batch_id?: string
          caregiver_id?: string | null
          caregiver_name?: string | null
          client_external_id?: string | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          medicaid_id?: string | null
          payer?: string | null
          program_type?: string | null
          raw?: Json | null
          service_code?: string | null
          start_time?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sandata_visit_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "sandata_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sandata_visit_rows_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sandata_visit_rows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          feature_flags: Json
          id: number
          maintenance_message: string | null
          maintenance_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_flags?: Json
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_flags?: Json
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_price_map: {
        Row: {
          billing_cycle: string
          client_band: string
          created_at: string
          price_id: string
          tier_slug: string
        }
        Insert: {
          billing_cycle: string
          client_band: string
          created_at?: string
          price_id: string
          tier_slug: string
        }
        Update: {
          billing_cycle?: string
          client_band?: string
          created_at?: string
          price_id?: string
          tier_slug?: string
        }
        Relationships: []
      }
      subscription_tier_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: Json | null
          old_value: Json | null
          tier_id: string
          tier_name: string
          tier_slug: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          tier_id: string
          tier_name: string
          tier_slug: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          tier_id?: string
          tier_name?: string
          tier_slug?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          active: boolean
          client_band_threshold: number
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          included_modules: string[]
          max_caregivers: number | null
          max_clients: number | null
          max_users: number | null
          monthly_price: number
          monthly_price_large: number | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
          yearly_price: number
          yearly_price_large: number | null
        }
        Insert: {
          active?: boolean
          client_band_threshold?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          included_modules?: string[]
          max_caregivers?: number | null
          max_clients?: number | null
          max_users?: number | null
          monthly_price?: number
          monthly_price_large?: number | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
          yearly_price_large?: number | null
        }
        Update: {
          active?: boolean
          client_band_threshold?: number
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          included_modules?: string[]
          max_caregivers?: number | null
          max_clients?: number | null
          max_users?: number | null
          monthly_price?: number
          monthly_price_large?: number | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          yearly_price?: number
          yearly_price_large?: number | null
        }
        Relationships: []
      }
      supervisory_visits: {
        Row: {
          caregiver_id: string | null
          client_id: string
          client_satisfaction: number | null
          company_id: string
          competency_rating: number | null
          completed_date: string | null
          corrective_action_required: boolean | null
          created_at: string
          findings: string | null
          id: string
          scheduled_date: string
          status: string
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          caregiver_id?: string | null
          client_id: string
          client_satisfaction?: number | null
          company_id: string
          competency_rating?: number | null
          completed_date?: string | null
          corrective_action_required?: boolean | null
          created_at?: string
          findings?: string | null
          id?: string
          scheduled_date: string
          status?: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          caregiver_id?: string | null
          client_id?: string
          client_satisfaction?: number | null
          company_id?: string
          competency_rating?: number | null
          completed_date?: string | null
          corrective_action_required?: boolean | null
          created_at?: string
          findings?: string | null
          id?: string
          scheduled_date?: string
          status?: string
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisory_visits_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisory_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          redaction_meta: Json
          ticket_id: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          redaction_meta?: Json
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          redaction_meta?: Json
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string
          category: string
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          phi_ack_id: string | null
          priority: string
          redaction_meta: Json
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          phi_ack_id?: string | null
          priority?: string
          redaction_meta?: Json
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          phi_ack_id?: string | null
          priority?: string
          redaction_meta?: Json
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_phi_ack_id_fkey"
            columns: ["phi_ack_id"]
            isOneToOne: false
            referencedRelation: "phi_acknowledgements"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telephony_clock_events: {
        Row: {
          ani: string | null
          call_sid: string | null
          caller_phone: string | null
          caregiver_id: string | null
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          location_code: string | null
          raw_payload: Json | null
          visit_id: string | null
        }
        Insert: {
          ani?: string | null
          call_sid?: string | null
          caller_phone?: string | null
          caregiver_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          location_code?: string | null
          raw_payload?: Json | null
          visit_id?: string | null
        }
        Update: {
          ani?: string | null
          call_sid?: string | null
          caller_phone?: string | null
          caregiver_id?: string | null
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          location_code?: string | null
          raw_payload?: Json | null
          visit_id?: string | null
        }
        Relationships: []
      }
      telephony_phone_registry: {
        Row: {
          active: boolean
          caregiver_id: string
          company_id: string
          created_at: string
          id: string
          phone_e164: string
          pin_hash: string | null
        }
        Insert: {
          active?: boolean
          caregiver_id: string
          company_id: string
          created_at?: string
          id?: string
          phone_e164: string
          pin_hash?: string | null
        }
        Update: {
          active?: boolean
          caregiver_id?: string
          company_id?: string
          created_at?: string
          id?: string
          phone_e164?: string
          pin_hash?: string | null
        }
        Relationships: []
      }
      timesheet_evv_recon: {
        Row: {
          company_id: string | null
          created_at: string
          end_delta_min: number | null
          hours_delta: number | null
          id: string
          notes: string | null
          override_at: string | null
          override_by: string | null
          override_notes: string | null
          override_reason:
            | Database["public"]["Enums"]["evv_override_reason"]
            | null
          resolved: boolean
          sandata_end: string | null
          sandata_hours: number | null
          sandata_start: string | null
          start_delta_min: number | null
          status: string
          system_end: string | null
          system_hours: number | null
          system_start: string | null
          timesheet_id: string
          visit_date: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          end_delta_min?: number | null
          hours_delta?: number | null
          id?: string
          notes?: string | null
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          override_reason?:
            | Database["public"]["Enums"]["evv_override_reason"]
            | null
          resolved?: boolean
          sandata_end?: string | null
          sandata_hours?: number | null
          sandata_start?: string | null
          start_delta_min?: number | null
          status: string
          system_end?: string | null
          system_hours?: number | null
          system_start?: string | null
          timesheet_id: string
          visit_date: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          end_delta_min?: number | null
          hours_delta?: number | null
          id?: string
          notes?: string | null
          override_at?: string | null
          override_by?: string | null
          override_notes?: string | null
          override_reason?:
            | Database["public"]["Enums"]["evv_override_reason"]
            | null
          resolved?: boolean
          sandata_end?: string | null
          sandata_hours?: number | null
          sandata_start?: string | null
          start_delta_min?: number | null
          status?: string
          system_end?: string | null
          system_hours?: number | null
          system_start?: string | null
          timesheet_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_evv_recon_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_evv_recon_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_reminders_log: {
        Row: {
          channel: string
          company_id: string | null
          error: string | null
          id: string
          recipient: string
          role: string
          sent_at: string
          status: string
          timesheet_id: string
        }
        Insert: {
          channel: string
          company_id?: string | null
          error?: string | null
          id?: string
          recipient: string
          role: string
          sent_at?: string
          status?: string
          timesheet_id: string
        }
        Update: {
          channel?: string
          company_id?: string | null
          error?: string | null
          id?: string
          recipient?: string
          role?: string
          sent_at?: string
          status?: string
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_reminders_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_reminders_log_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_signatures: {
        Row: {
          id: string
          ip_address: string | null
          role: string
          signature_png: string
          signed_at: string
          signer_name: string
          signer_user_id: string | null
          timesheet_id: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: string | null
          role: string
          signature_png: string
          signed_at?: string
          signer_name: string
          signer_user_id?: string | null
          timesheet_id: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: string | null
          role?: string
          signature_png?: string
          signed_at?: string
          signer_name?: string
          signer_user_id?: string | null
          timesheet_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_signatures_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_signers: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: string
          signer_email: string | null
          signer_name: string
          signer_phone: string | null
          signer_user_id: string | null
          timesheet_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: string
          signer_email?: string | null
          signer_name: string
          signer_phone?: string | null
          signer_user_id?: string | null
          timesheet_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: string
          signer_email?: string | null
          signer_name?: string
          signer_phone?: string | null
          signer_user_id?: string | null
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_signers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_signers_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_hours: number
          care_plan_id: string | null
          caregiver_id: string
          client_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          evv_batch_ids: string[] | null
          evv_hours: number
          evv_mismatch_count: number
          evv_recon_summary: Json | null
          evv_reconciled_at: string | null
          evv_unresolved_count: number
          html_snapshot: string | null
          id: string
          locked_at: string | null
          period_end: string
          period_start: string
          reminder_last_sent_at: string | null
          scheduled_hours: number
          status: string
          storage_path: string | null
          totals: Json | null
          updated_at: string
          variance_hours: number
        }
        Insert: {
          approved_hours?: number
          care_plan_id?: string | null
          caregiver_id: string
          client_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          evv_batch_ids?: string[] | null
          evv_hours?: number
          evv_mismatch_count?: number
          evv_recon_summary?: Json | null
          evv_reconciled_at?: string | null
          evv_unresolved_count?: number
          html_snapshot?: string | null
          id?: string
          locked_at?: string | null
          period_end: string
          period_start: string
          reminder_last_sent_at?: string | null
          scheduled_hours?: number
          status?: string
          storage_path?: string | null
          totals?: Json | null
          updated_at?: string
          variance_hours?: number
        }
        Update: {
          approved_hours?: number
          care_plan_id?: string | null
          caregiver_id?: string
          client_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          evv_batch_ids?: string[] | null
          evv_hours?: number
          evv_mismatch_count?: number
          evv_recon_summary?: Json | null
          evv_reconciled_at?: string | null
          evv_unresolved_count?: number
          html_snapshot?: string | null
          id?: string
          locked_at?: string | null
          period_end?: string
          period_start?: string
          reminder_last_sent_at?: string | null
          scheduled_hours?: number
          status?: string
          storage_path?: string | null
          totals?: Json | null
          updated_at?: string
          variance_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "unsigned_care_plans_30d"
            referencedColumns: ["care_plan_id"]
          },
          {
            foreignKeyName: "timesheets_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string | null
          course_id: string
          due_date: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          course_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          course_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_completions: {
        Row: {
          certificate_url: string | null
          company_id: string | null
          completed_at: string
          course_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          company_id?: string | null
          completed_at?: string
          course_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          company_id?: string | null
          completed_at?: string
          course_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          active: boolean
          category: string
          company_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          external_url: string | null
          id: string
          provider: string | null
          renewal_months: number | null
          required_for_roles: Database["public"]["Enums"]["app_role"][]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          id?: string
          provider?: string | null
          renewal_months?: number | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          external_url?: string | null
          id?: string
          provider?: string | null
          renewal_months?: number | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_settings: {
        Row: {
          last_activity_at: string
          mfa_enrolled: boolean
          mfa_enrolled_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          last_activity_at?: string
          mfa_enrolled?: boolean
          mfa_enrolled_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          last_activity_at?: string
          mfa_enrolled?: boolean
          mfa_enrolled_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_notes: {
        Row: {
          assessment: string | null
          author_id: string | null
          company_id: string | null
          created_at: string
          id: string
          incident: boolean
          incident_details: string | null
          objective: string | null
          plan: string | null
          subjective: string | null
          updated_at: string
          visit_id: string
          vitals: Json | null
        }
        Insert: {
          assessment?: string | null
          author_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          incident?: boolean
          incident_details?: string | null
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          updated_at?: string
          visit_id: string
          vitals?: Json | null
        }
        Update: {
          assessment?: string | null
          author_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          incident?: boolean
          incident_details?: string | null
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          updated_at?: string
          visit_id?: string
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_series: {
        Row: {
          authorization_id: string | null
          caregiver_id: string
          client_id: string
          company_id: string | null
          created_at: string
          days_of_week: number[]
          end_date: string
          end_time: string
          frequency: string
          id: string
          notes: string | null
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          authorization_id?: string | null
          caregiver_id: string
          client_id: string
          company_id?: string | null
          created_at?: string
          days_of_week?: number[]
          end_date: string
          end_time: string
          frequency?: string
          id?: string
          notes?: string | null
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          authorization_id?: string | null
          caregiver_id?: string
          client_id?: string
          company_id?: string | null
          created_at?: string
          days_of_week?: number[]
          end_date?: string
          end_time?: string
          frequency?: string
          id?: string
          notes?: string | null
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_series_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_series_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_series_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_series_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          aggregator_last_event_at: string | null
          aggregator_status: string | null
          aggregator_vendor_visit_id: string | null
          authorization_id: string | null
          caregiver_id: string
          certifications_required: string[] | null
          client_id: string
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          company_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          payer_id: string | null
          series_id: string | null
          skills_required: string[] | null
          start_time: string
          status: string
          tasks_completed: string[] | null
          units: number | null
          updated_at: string
          verification_issues: string[] | null
          verification_status: string | null
          verified_end_time: string | null
          verified_start_time: string | null
        }
        Insert: {
          aggregator_last_event_at?: string | null
          aggregator_status?: string | null
          aggregator_vendor_visit_id?: string | null
          authorization_id?: string | null
          caregiver_id: string
          certifications_required?: string[] | null
          client_id: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          company_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          payer_id?: string | null
          series_id?: string | null
          skills_required?: string[] | null
          start_time: string
          status?: string
          tasks_completed?: string[] | null
          units?: number | null
          updated_at?: string
          verification_issues?: string[] | null
          verification_status?: string | null
          verified_end_time?: string | null
          verified_start_time?: string | null
        }
        Update: {
          aggregator_last_event_at?: string | null
          aggregator_status?: string | null
          aggregator_vendor_visit_id?: string | null
          authorization_id?: string | null
          caregiver_id?: string
          certifications_required?: string[] | null
          client_id?: string
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          company_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          payer_id?: string | null
          series_id?: string | null
          skills_required?: string[] | null
          start_time?: string
          status?: string
          tasks_completed?: string[] | null
          units?: number | null
          updated_at?: string
          verification_issues?: string[] | null
          verification_status?: string | null
          verified_end_time?: string | null
          verified_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "visit_series"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          blood_glucose: number | null
          caregiver_id: string | null
          client_id: string
          company_id: string | null
          created_at: string
          diastolic: number | null
          heart_rate: number | null
          id: string
          measured_at: string
          notes: string | null
          pain_scale: number | null
          respiratory_rate: number | null
          spo2: number | null
          systolic: number | null
          temperature: number | null
          visit_id: string | null
          weight_lbs: number | null
        }
        Insert: {
          blood_glucose?: number | null
          caregiver_id?: string | null
          client_id: string
          company_id?: string | null
          created_at?: string
          diastolic?: number | null
          heart_rate?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          pain_scale?: number | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          visit_id?: string | null
          weight_lbs?: number | null
        }
        Update: {
          blood_glucose?: number | null
          caregiver_id?: string | null
          client_id?: string
          company_id?: string | null
          created_at?: string
          diastolic?: number | null
          heart_rate?: number | null
          id?: string
          measured_at?: string
          notes?: string | null
          pain_scale?: number | null
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          visit_id?: string | null
          weight_lbs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      unsigned_care_plans_30d: {
        Row: {
          care_plan_id: string | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          days_since_created: number | null
          physician_signed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _tmp_exec_ddl: { Args: { sql: string }; Returns: undefined }
      auth_burndown_check: { Args: never; Returns: number }
      authorization_units_used: { Args: { _auth_id: string }; Returns: number }
      can_caregiver_clock_in: { Args: { _caregiver_id: string }; Returns: Json }
      caregiver_matches: {
        Args: { _caregiver: string; _certs: string[]; _skills: string[] }
        Returns: boolean
      }
      caregiver_today_visits: {
        Args: never
        Returns: {
          care_plan: string[]
          client_address: string
          client_geofence_meters: number
          client_id: string
          client_lat: number
          client_lng: number
          client_name: string
          client_phone: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          tasks_completed: string[]
          verification_status: string
          verified_end_time: string
          verified_start_time: string
        }[]
      }
      caregiver_week_hours: {
        Args: { _caregiver: string; _week_start: string }
        Returns: number
      }
      claim_aging_buckets: {
        Args: { _company: string }
        Returns: {
          bucket: string
          claim_count: number
          total_outstanding: number
        }[]
      }
      company_active_client_count: {
        Args: { _company: string }
        Returns: number
      }
      company_billed_price: { Args: { _company: string }; Returns: number }
      company_is_read_only: { Args: { _company: string }; Returns: boolean }
      current_company_id: { Args: never; Returns: string }
      current_user_has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      effective_tier_for_company: {
        Args: { _company: string }
        Returns: {
          active: boolean
          client_band_threshold: number
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          included_modules: string[]
          max_caregivers: number | null
          max_clients: number | null
          max_users: number | null
          monthly_price: number
          monthly_price_large: number | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
          yearly_price: number
          yearly_price_large: number | null
        }
        SetofOptions: {
          from: "*"
          to: "subscription_tiers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enqueue_aggregator_visit_event: {
        Args: { _event_type: string; _visit_id: string }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      execute_data_purge: { Args: { _entity: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_caregiver_for_visit: { Args: { _visit_id: string }; Returns: boolean }
      is_company_admin: { Args: { _company: string }; Returns: boolean }
      is_family_in_company: { Args: { _company_id: string }; Returns: boolean }
      is_family_of_caregiver: {
        Args: { _caregiver_id: string }
        Returns: boolean
      }
      is_family_of_client: { Args: { _client_id: string }; Returns: boolean }
      is_family_of_visit: { Args: { _visit_id: string }; Returns: boolean }
      is_member_of_company: { Args: { _company: string }; Returns: boolean }
      is_visit_caregiver: { Args: { _caregiver_id: string }; Returns: boolean }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          phone: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      log_phi_access: {
        Args: {
          _action: string
          _entity: string
          _entity_id?: string
          _metadata?: Json
          _reason?: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      rate_limit_check: {
        Args: { _key: string; _max_requests: number; _window_seconds: number }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_timesheet_unresolved: { Args: { _ts: string }; Returns: number }
      redeem_access_code: { Args: { _code: string }; Returns: Json }
      redeem_admin_invite: {
        Args: { _token: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      user_can_message: { Args: { _recipient: string }; Returns: boolean }
      user_company_ids: { Args: { _user: string }; Returns: string[] }
      user_must_have_mfa: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "scheduler"
        | "caregiver"
        | "billing"
        | "family"
        | "superadmin"
        | "manager"
        | "operations_manager"
        | "supervisor"
      evv_override_reason:
        | "caregiver_forgot_clockout"
        | "caregiver_forgot_clockin"
        | "phone_or_app_issue"
        | "sandata_outage"
        | "manual_visit_approved"
        | "documentation_correction"
        | "tolerance_acceptable"
        | "other"
      prebill_override_reason:
        | "authorization_pending"
        | "rate_documented_offline"
        | "credential_renewal_in_progress"
        | "evv_corrected_manually"
        | "payer_exception_approved"
        | "one_time_admin_approval"
        | "other"
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
      app_role: [
        "admin",
        "scheduler",
        "caregiver",
        "billing",
        "family",
        "superadmin",
        "manager",
        "operations_manager",
        "supervisor",
      ],
      evv_override_reason: [
        "caregiver_forgot_clockout",
        "caregiver_forgot_clockin",
        "phone_or_app_issue",
        "sandata_outage",
        "manual_visit_approved",
        "documentation_correction",
        "tolerance_acceptable",
        "other",
      ],
      prebill_override_reason: [
        "authorization_pending",
        "rate_documented_offline",
        "credential_renewal_in_progress",
        "evv_corrected_manually",
        "payer_exception_approved",
        "one_time_admin_approval",
        "other",
      ],
    },
  },
} as const
