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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          assignee: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          service: string
          severity: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          service: string
          severity: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          service?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      approval_config_approvers: {
        Row: {
          approval_config_id: string
          approver_role_id: string | null
          approver_type: string
          approver_user_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_required: boolean | null
          order_priority: number | null
          updated_at: string | null
        }
        Insert: {
          approval_config_id: string
          approver_role_id?: string | null
          approver_type: string
          approver_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          order_priority?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_config_id?: string
          approver_role_id?: string | null
          approver_type?: string
          approver_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean | null
          order_priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_config_approvers_approval_config_id_fkey"
            columns: ["approval_config_id"]
            isOneToOne: false
            referencedRelation: "approval_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_approvers_approval_config_id_fkey"
            columns: ["approval_config_id"]
            isOneToOne: false
            referencedRelation: "approval_configs_with_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_approvers_approver_role_id_fkey"
            columns: ["approver_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_approvers_approver_user_id_fkey"
            columns: ["approver_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_approvers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_config_history: {
        Row: {
          approval_config_id: string
          change_reason: string | null
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          approval_config_id: string
          change_reason?: string | null
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          approval_config_id?: string
          change_reason?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_config_history_approval_config_id_fkey"
            columns: ["approval_config_id"]
            isOneToOne: false
            referencedRelation: "approval_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_history_approval_config_id_fkey"
            columns: ["approval_config_id"]
            isOneToOne: false
            referencedRelation: "approval_configs_with_approvers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_config_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_configs: {
        Row: {
          active: boolean | null
          approval_mode: string | null
          auto_approval_conditions: Json | null
          auto_approve_threshold: number | null
          config_description: string | null
          config_name: string | null
          consensus_type: string
          created_at: string | null
          created_by: string | null
          eligible_roles: string[]
          escalation_config: Json | null
          id: string
          last_modified_by: string | null
          notification_config: Json | null
          permission_id: string
          required_approvals: number
          requires_all_approvers: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          approval_mode?: string | null
          auto_approval_conditions?: Json | null
          auto_approve_threshold?: number | null
          config_description?: string | null
          config_name?: string | null
          consensus_type?: string
          created_at?: string | null
          created_by?: string | null
          eligible_roles: string[]
          escalation_config?: Json | null
          id?: string
          last_modified_by?: string | null
          notification_config?: Json | null
          permission_id: string
          required_approvals?: number
          requires_all_approvers?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          approval_mode?: string | null
          auto_approval_conditions?: Json | null
          auto_approve_threshold?: number | null
          config_description?: string | null
          config_name?: string | null
          consensus_type?: string
          created_at?: string | null
          created_by?: string | null
          eligible_roles?: string[]
          escalation_config?: Json | null
          id?: string
          last_modified_by?: string | null
          notification_config?: Json | null
          permission_id?: string
          required_approvals?: number
          requires_all_approvers?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_configs_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          action: string
          approved_by: string[]
          approvers: string[]
          created_at: string | null
          id: string
          metadata: Json | null
          rejected_by: string[]
          requested_by: string
          required_approvals: number
          resource: string
          resource_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          action: string
          approved_by?: string[]
          approvers: string[]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          rejected_by?: string[]
          requested_by: string
          required_approvals?: number
          resource: string
          resource_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          approved_by?: string[]
          approvers?: string[]
          created_at?: string | null
          id?: string
          metadata?: Json | null
          rejected_by?: string[]
          requested_by?: string
          required_approvals?: number
          resource?: string
          resource_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      asset_backed_products: {
        Row: {
          accrual_type: string | null
          asset_number: string | null
          asset_type: string | null
          collection_period_days: number | null
          created_at: string | null
          current_balance: number | null
          debtor_credit_quality: string | null
          delinquency_status: number | null
          demand_resolution_date: string | null
          diversification_metrics: string | null
          id: string
          interest_rate: number | null
          lien_position: string | null
          maturity_date: string | null
          modification_indicator: boolean | null
          original_amount: number | null
          origination_date: string | null
          payment_frequency: string | null
          prepayment_penalty: number | null
          project_id: string
          recovery_rate_percentage: number | null
          repurchase_amount: number | null
          repurchaser: string | null
          status: string | null
          target_raise: number | null
          updated_at: string | null
        }
        Insert: {
          accrual_type?: string | null
          asset_number?: string | null
          asset_type?: string | null
          collection_period_days?: number | null
          created_at?: string | null
          current_balance?: number | null
          debtor_credit_quality?: string | null
          delinquency_status?: number | null
          demand_resolution_date?: string | null
          diversification_metrics?: string | null
          id?: string
          interest_rate?: number | null
          lien_position?: string | null
          maturity_date?: string | null
          modification_indicator?: boolean | null
          original_amount?: number | null
          origination_date?: string | null
          payment_frequency?: string | null
          prepayment_penalty?: number | null
          project_id: string
          recovery_rate_percentage?: number | null
          repurchase_amount?: number | null
          repurchaser?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Update: {
          accrual_type?: string | null
          asset_number?: string | null
          asset_type?: string | null
          collection_period_days?: number | null
          created_at?: string | null
          current_balance?: number | null
          debtor_credit_quality?: string | null
          delinquency_status?: number | null
          demand_resolution_date?: string | null
          diversification_metrics?: string | null
          id?: string
          interest_rate?: number | null
          lien_position?: string | null
          maturity_date?: string | null
          modification_indicator?: boolean | null
          original_amount?: number | null
          origination_date?: string | null
          payment_frequency?: string | null
          prepayment_penalty?: number | null
          project_id?: string
          recovery_rate_percentage?: number | null
          repurchase_amount?: number | null
          repurchaser?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_asset_backed_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_holdings: {
        Row: {
          asset_id: string
          credit_rating: string | null
          holding_type: string
          id: string
          maturity_date: string | null
          quantity: number
          source: string
          updated_at: string | null
          value: number
        }
        Insert: {
          asset_id: string
          credit_rating?: string | null
          holding_type: string
          id?: string
          maturity_date?: string | null
          quantity: number
          source?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          asset_id?: string
          credit_rating?: string | null
          holding_type?: string
          id?: string
          maturity_date?: string | null
          quantity?: number
          source?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      asset_nav_data: {
        Row: {
          asset_id: string
          asset_name: string
          calculated_nav: number | null
          calculation_method: string | null
          change_amount: number | null
          change_percent: number | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          market_conditions: string | null
          nav: number
          notes: string | null
          outstanding_shares: number
          previous_nav: number | null
          project_id: string
          source: string
          total_assets: number
          total_liabilities: number
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          asset_id: string
          asset_name: string
          calculated_nav?: number | null
          calculation_method?: string | null
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          market_conditions?: string | null
          nav: number
          notes?: string | null
          outstanding_shares: number
          previous_nav?: number | null
          project_id: string
          source?: string
          total_assets: number
          total_liabilities?: number
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          asset_id?: string
          asset_name?: string
          calculated_nav?: number | null
          calculation_method?: string | null
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          market_conditions?: string | null
          nav?: number
          notes?: string | null
          outstanding_shares?: number
          previous_nav?: number | null
          project_id?: string
          source?: string
          total_assets?: number
          total_liabilities?: number
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_nav_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_type: string | null
          api_version: string | null
          batch_operation_id: string | null
          category: string | null
          changes: Json | null
          correlation_id: string | null
          details: string | null
          duration: number | null
          entity_id: string | null
          entity_type: string | null
          id: string
          importance: number | null
          ip_address: string | null
          is_automated: boolean | null
          metadata: Json | null
          new_data: Json | null
          occurred_at: string | null
          old_data: Json | null
          parent_id: string | null
          project_id: string | null
          request_id: string | null
          session_id: string | null
          severity: string | null
          signature: string | null
          source: string | null
          status: string | null
          system_process_id: string | null
          timestamp: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          username: string | null
          verified: boolean | null
        }
        Insert: {
          action: string
          action_type?: string | null
          api_version?: string | null
          batch_operation_id?: string | null
          category?: string | null
          changes?: Json | null
          correlation_id?: string | null
          details?: string | null
          duration?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance?: number | null
          ip_address?: string | null
          is_automated?: boolean | null
          metadata?: Json | null
          new_data?: Json | null
          occurred_at?: string | null
          old_data?: Json | null
          parent_id?: string | null
          project_id?: string | null
          request_id?: string | null
          session_id?: string | null
          severity?: string | null
          signature?: string | null
          source?: string | null
          status?: string | null
          system_process_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          action?: string
          action_type?: string | null
          api_version?: string | null
          batch_operation_id?: string | null
          category?: string | null
          changes?: Json | null
          correlation_id?: string | null
          details?: string | null
          duration?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          importance?: number | null
          ip_address?: string | null
          is_automated?: boolean | null
          metadata?: Json | null
          new_data?: Json | null
          occurred_at?: string | null
          old_data?: Json | null
          parent_id?: string | null
          project_id?: string | null
          request_id?: string | null
          session_id?: string | null
          severity?: string | null
          signature?: string | null
          source?: string | null
          status?: string | null
          system_process_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      batch_operations: {
        Row: {
          call_data: string
          created_at: string | null
          gas_used: number | null
          id: string
          operation_index: number
          return_data: string | null
          success: boolean | null
          target_address: string
          user_operation_id: string
          value: string
        }
        Insert: {
          call_data: string
          created_at?: string | null
          gas_used?: number | null
          id?: string
          operation_index: number
          return_data?: string | null
          success?: boolean | null
          target_address: string
          user_operation_id: string
          value: string
        }
        Update: {
          call_data?: string
          created_at?: string | null
          gas_used?: number | null
          id?: string
          operation_index?: number
          return_data?: string | null
          success?: boolean | null
          target_address?: string
          user_operation_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_operations_user_operation_id_fkey"
            columns: ["user_operation_id"]
            isOneToOne: false
            referencedRelation: "user_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      bond_products: {
        Row: {
          accrued_interest: number | null
          bond_identifier: string | null
          bond_isin_cusip: string | null
          bond_type: string | null
          call_date: string | null
          call_price: number | null
          call_put_dates: string[] | null
          callable_features: boolean | null
          callable_flag: boolean | null
          coupon_frequency: string | null
          coupon_payment_history: Json | null
          coupon_rate: number | null
          created_at: string | null
          credit_rating: string | null
          currency: string | null
          duration: number | null
          face_value: number | null
          id: string
          issue_date: string | null
          issuer_name: string | null
          maturity_date: string | null
          project_id: string
          redemption_call_date: string | null
          security_collateral: string | null
          status: string | null
          target_raise: number | null
          updated_at: string | null
          yield_to_maturity: number | null
        }
        Insert: {
          accrued_interest?: number | null
          bond_identifier?: string | null
          bond_isin_cusip?: string | null
          bond_type?: string | null
          call_date?: string | null
          call_price?: number | null
          call_put_dates?: string[] | null
          callable_features?: boolean | null
          callable_flag?: boolean | null
          coupon_frequency?: string | null
          coupon_payment_history?: Json | null
          coupon_rate?: number | null
          created_at?: string | null
          credit_rating?: string | null
          currency?: string | null
          duration?: number | null
          face_value?: number | null
          id?: string
          issue_date?: string | null
          issuer_name?: string | null
          maturity_date?: string | null
          project_id: string
          redemption_call_date?: string | null
          security_collateral?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
          yield_to_maturity?: number | null
        }
        Update: {
          accrued_interest?: number | null
          bond_identifier?: string | null
          bond_isin_cusip?: string | null
          bond_type?: string | null
          call_date?: string | null
          call_price?: number | null
          call_put_dates?: string[] | null
          callable_features?: boolean | null
          callable_flag?: boolean | null
          coupon_frequency?: string | null
          coupon_payment_history?: Json | null
          coupon_rate?: number | null
          created_at?: string | null
          credit_rating?: string | null
          currency?: string | null
          duration?: number | null
          face_value?: number | null
          id?: string
          issue_date?: string | null
          issuer_name?: string | null
          maturity_date?: string | null
          project_id?: string
          redemption_call_date?: string | null
          security_collateral?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
          yield_to_maturity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bond_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          failed_count: number | null
          id: string
          metadata: Json | null
          operation_type: string | null
          processed_count: number | null
          progress: number | null
          status: string | null
          tags: string[] | null
          target_ids: string[] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          operation_type?: string | null
          processed_count?: number | null
          progress?: number | null
          status?: string | null
          tags?: string[] | null
          target_ids?: string[] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          operation_type?: string | null
          processed_count?: number | null
          progress?: number | null
          status?: string | null
          tags?: string[] | null
          target_ids?: string[] | null
        }
        Relationships: []
      }
      cap_tables: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cap_tables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      carbon_offsets: {
        Row: {
          amount: number
          created_at: string | null
          expiration_date: string | null
          offset_id: string
          price_per_ton: number
          project_id: string
          status: string
          total_value: number
          type: string
          updated_at: string | null
          verification_date: string | null
          verification_standard: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          expiration_date?: string | null
          offset_id?: string
          price_per_ton: number
          project_id: string
          status: string
          total_value: number
          type: string
          updated_at?: string | null
          verification_date?: string | null
          verification_standard?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          expiration_date?: string | null
          offset_id?: string
          price_per_ton?: number
          project_id?: string
          status?: string
          total_value?: number
          type?: string
          updated_at?: string | null
          verification_date?: string | null
          verification_standard?: string | null
        }
        Relationships: []
      }
      climate_cash_flow_projections: {
        Row: {
          created_at: string | null
          entity_id: string | null
          projected_amount: number
          projection_date: string
          projection_id: string
          source_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          projected_amount: number
          projection_date: string
          projection_id?: string
          source_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          projected_amount?: number
          projection_date?: string
          projection_id?: string
          source_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      climate_incentives: {
        Row: {
          amount: number
          asset_id: string | null
          created_at: string | null
          expected_receipt_date: string | null
          incentive_id: string
          project_id: string | null
          receivable_id: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          asset_id?: string | null
          created_at?: string | null
          expected_receipt_date?: string | null
          incentive_id?: string
          project_id?: string | null
          receivable_id?: string | null
          status: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string | null
          created_at?: string | null
          expected_receipt_date?: string | null
          incentive_id?: string
          project_id?: string | null
          receivable_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_incentives_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "climate_incentives_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
          {
            foreignKeyName: "fk_climate_incentives_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_investor_pools: {
        Row: {
          created_at: string | null
          investment_amount: number
          investor_id: string
          pool_id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          investment_amount: number
          investor_id: string
          pool_id: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          investment_amount?: number
          investor_id?: string
          pool_id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_investor_pools_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "climate_investor_pools_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
        ]
      }
      climate_payers: {
        Row: {
          created_at: string | null
          credit_rating: string | null
          financial_health_score: number | null
          name: string
          payer_id: string
          payment_history: Json | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_rating?: string | null
          financial_health_score?: number | null
          name: string
          payer_id?: string
          payment_history?: Json | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_rating?: string | null
          financial_health_score?: number | null
          name?: string
          payer_id?: string
          payment_history?: Json | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      climate_policies: {
        Row: {
          created_at: string | null
          description: string | null
          effective_date: string
          impact_level: string | null
          name: string
          policy_id: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effective_date: string
          impact_level?: string | null
          name: string
          policy_id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effective_date?: string
          impact_level?: string | null
          name?: string
          policy_id?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      climate_policy_impacts: {
        Row: {
          asset_id: string | null
          created_at: string | null
          impact_description: string | null
          impact_id: string
          policy_id: string | null
          project_id: string | null
          receivable_id: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          impact_description?: string | null
          impact_id?: string
          policy_id?: string | null
          project_id?: string | null
          receivable_id?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          impact_description?: string | null
          impact_id?: string
          policy_id?: string | null
          project_id?: string | null
          receivable_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_policy_impacts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "climate_policy_impacts_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "climate_policies"
            referencedColumns: ["policy_id"]
          },
          {
            foreignKeyName: "climate_policy_impacts_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
        ]
      }
      climate_pool_energy_assets: {
        Row: {
          asset_id: string
          created_at: string
          pool_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          pool_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          pool_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_pool_energy_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "climate_pool_energy_assets_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "climate_pool_energy_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_pool_incentives: {
        Row: {
          created_at: string
          incentive_id: string
          pool_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          incentive_id: string
          pool_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          incentive_id?: string
          pool_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_pool_incentives_incentive_id_fkey"
            columns: ["incentive_id"]
            isOneToOne: false
            referencedRelation: "climate_incentives"
            referencedColumns: ["incentive_id"]
          },
          {
            foreignKeyName: "climate_pool_incentives_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "climate_pool_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      climate_pool_receivables: {
        Row: {
          created_at: string | null
          pool_id: string
          project_id: string | null
          receivable_id: string
        }
        Insert: {
          created_at?: string | null
          pool_id: string
          project_id?: string | null
          receivable_id: string
        }
        Update: {
          created_at?: string | null
          pool_id?: string
          project_id?: string | null
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_pool_receivables_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "climate_pool_receivables_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
        ]
      }
      climate_pool_recs: {
        Row: {
          created_at: string
          pool_id: string
          project_id: string | null
          rec_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          pool_id: string
          project_id?: string | null
          rec_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          pool_id?: string
          project_id?: string | null
          rec_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_pool_recs_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "climate_pool_recs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climate_pool_recs_rec_id_fkey"
            columns: ["rec_id"]
            isOneToOne: false
            referencedRelation: "renewable_energy_credits"
            referencedColumns: ["rec_id"]
          },
        ]
      }
      climate_receivables: {
        Row: {
          amount: number
          asset_id: string | null
          created_at: string | null
          discount_rate: number | null
          due_date: string
          payer_id: string | null
          project_id: string | null
          receivable_id: string
          risk_score: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          asset_id?: string | null
          created_at?: string | null
          discount_rate?: number | null
          due_date: string
          payer_id?: string | null
          project_id?: string | null
          receivable_id?: string
          risk_score?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string | null
          created_at?: string | null
          discount_rate?: number | null
          due_date?: string
          payer_id?: string | null
          project_id?: string | null
          receivable_id?: string
          risk_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_receivables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "climate_receivables_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "climate_payers"
            referencedColumns: ["payer_id"]
          },
        ]
      }
      climate_risk_calculations: {
        Row: {
          alerts: Json
          calculated_at: string
          composite_risk_confidence: number
          composite_risk_level: string
          composite_risk_score: number
          created_at: string
          credit_risk_confidence: number
          credit_risk_factors: string[]
          credit_risk_score: number
          discount_rate_calculated: number
          discount_rate_change: number | null
          discount_rate_previous: number | null
          discount_rate_reason: string | null
          id: string
          last_credit_update: string | null
          last_policy_update: string | null
          last_weather_update: string | null
          next_review_date: string
          policy_risk_confidence: number
          policy_risk_factors: string[]
          policy_risk_score: number
          production_risk_confidence: number
          production_risk_factors: string[]
          production_risk_score: number
          project_id: string | null
          receivable_id: string
          recommendations: string[]
          updated_at: string
        }
        Insert: {
          alerts?: Json
          calculated_at?: string
          composite_risk_confidence: number
          composite_risk_level: string
          composite_risk_score: number
          created_at?: string
          credit_risk_confidence: number
          credit_risk_factors?: string[]
          credit_risk_score: number
          discount_rate_calculated: number
          discount_rate_change?: number | null
          discount_rate_previous?: number | null
          discount_rate_reason?: string | null
          id?: string
          last_credit_update?: string | null
          last_policy_update?: string | null
          last_weather_update?: string | null
          next_review_date: string
          policy_risk_confidence: number
          policy_risk_factors?: string[]
          policy_risk_score: number
          production_risk_confidence: number
          production_risk_factors?: string[]
          production_risk_score: number
          project_id?: string | null
          receivable_id: string
          recommendations?: string[]
          updated_at?: string
        }
        Update: {
          alerts?: Json
          calculated_at?: string
          composite_risk_confidence?: number
          composite_risk_level?: string
          composite_risk_score?: number
          created_at?: string
          credit_risk_confidence?: number
          credit_risk_factors?: string[]
          credit_risk_score?: number
          discount_rate_calculated?: number
          discount_rate_change?: number | null
          discount_rate_previous?: number | null
          discount_rate_reason?: string | null
          id?: string
          last_credit_update?: string | null
          last_policy_update?: string | null
          last_weather_update?: string | null
          next_review_date?: string
          policy_risk_confidence?: number
          policy_risk_factors?: string[]
          policy_risk_score?: number
          production_risk_confidence?: number
          production_risk_factors?: string[]
          production_risk_score?: number
          project_id?: string | null
          receivable_id?: string
          recommendations?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "climate_risk_calculations_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
        ]
      }
      climate_risk_factors: {
        Row: {
          created_at: string | null
          credit_risk: number | null
          factor_id: string
          policy_risk: number | null
          production_risk: number | null
          project_id: string | null
          receivable_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_risk?: number | null
          factor_id?: string
          policy_risk?: number | null
          production_risk?: number | null
          project_id?: string | null
          receivable_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_risk?: number | null
          factor_id?: string
          policy_risk?: number | null
          production_risk?: number | null
          project_id?: string | null
          receivable_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_risk_factors_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
        ]
      }
      climate_tokenization_pools: {
        Row: {
          created_at: string | null
          name: string
          pool_id: string
          project_id: string | null
          risk_profile: string | null
          total_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          name: string
          pool_id?: string
          project_id?: string | null
          risk_profile?: string | null
          total_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          name?: string
          pool_id?: string
          project_id?: string | null
          risk_profile?: string | null
          total_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      collectibles_products: {
        Row: {
          acquisition_date: string | null
          appraisal_date: string | null
          asset_id: string | null
          asset_type: string | null
          condition: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          insurance_details: number | null
          location: string | null
          owner: string | null
          project_id: string
          purchase_price: number | null
          sale_date: string | null
          sale_price: number | null
          status: string | null
          target_raise: number | null
          updated_at: string | null
        }
        Insert: {
          acquisition_date?: string | null
          appraisal_date?: string | null
          asset_id?: string | null
          asset_type?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          insurance_details?: number | null
          location?: string | null
          owner?: string | null
          project_id: string
          purchase_price?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string | null
          appraisal_date?: string | null
          asset_id?: string | null
          asset_type?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          insurance_details?: number | null
          location?: string | null
          owner?: string | null
          project_id?: string
          purchase_price?: number | null
          sale_date?: string | null
          sale_price?: number | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_collectibles_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      commodities_products: {
        Row: {
          commodity_id: string | null
          commodity_name: string | null
          commodity_type: string | null
          contract_issue_date: string | null
          contract_size: number | null
          created_at: string | null
          currency: string | null
          delivery_months: string[] | null
          exchange: string | null
          expiration_date: string | null
          grade_quality: string | null
          id: string
          liquidity_metric: number | null
          production_inventory_levels: Json | null
          project_id: string
          roll_history: Json | null
          status: string | null
          storage_delivery_costs: number | null
          target_raise: number | null
          unit_of_measure: string | null
          updated_at: string | null
        }
        Insert: {
          commodity_id?: string | null
          commodity_name?: string | null
          commodity_type?: string | null
          contract_issue_date?: string | null
          contract_size?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_months?: string[] | null
          exchange?: string | null
          expiration_date?: string | null
          grade_quality?: string | null
          id?: string
          liquidity_metric?: number | null
          production_inventory_levels?: Json | null
          project_id: string
          roll_history?: Json | null
          status?: string | null
          storage_delivery_costs?: number | null
          target_raise?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          commodity_id?: string | null
          commodity_name?: string | null
          commodity_type?: string | null
          contract_issue_date?: string | null
          contract_size?: number | null
          created_at?: string | null
          currency?: string | null
          delivery_months?: string[] | null
          exchange?: string | null
          expiration_date?: string | null
          grade_quality?: string | null
          id?: string
          liquidity_metric?: number | null
          production_inventory_levels?: Json | null
          project_id?: string
          roll_history?: Json | null
          status?: string | null
          storage_delivery_costs?: number | null
          target_raise?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_commodities_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          risk_reason: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level: string
          risk_reason: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          risk_reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "compliance_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string
          created_by: string
          findings: Json
          generated_at: string
          id: string
          issuer_id: string
          metadata: Json
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          created_at?: string
          created_by: string
          findings?: Json
          generated_at?: string
          id?: string
          issuer_id: string
          metadata?: Json
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          created_at?: string
          created_by?: string
          findings?: Json
          generated_at?: string
          id?: string
          issuer_id?: string
          metadata?: Json
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      compliance_settings: {
        Row: {
          created_at: string
          id: string
          investor_count: number
          jurisdictions: string[] | null
          kyc_status: string
          minimum_investment: number
          organization_id: string
          require_accreditation: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_count?: number
          jurisdictions?: string[] | null
          kyc_status?: string
          minimum_investment?: number
          organization_id: string
          require_accreditation?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_count?: number
          jurisdictions?: string[] | null
          kyc_status?: string
          minimum_investment?: number
          organization_id?: string
          require_accreditation?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      consensus_settings: {
        Row: {
          consensus_type: string
          created_at: string
          eligible_roles: string[]
          id: string
          required_approvals: number
          updated_at: string
        }
        Insert: {
          consensus_type: string
          created_at?: string
          eligible_roles: string[]
          id?: string
          required_approvals: number
          updated_at?: string
        }
        Update: {
          consensus_type?: string
          created_at?: string
          eligible_roles?: string[]
          id?: string
          required_approvals?: number
          updated_at?: string
        }
        Relationships: []
      }
      credential_usage_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          credential_id: string
          id: string
          ip_address: string | null
          performed_at: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          credential_id: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          credential_id?: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      deployment_rate_limits: {
        Row: {
          completed_at: string | null
          environment: string | null
          id: string
          network: string | null
          project_id: string
          started_at: string
          status: string
          token_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          environment?: string | null
          id?: string
          network?: string | null
          project_id: string
          started_at?: string
          status: string
          token_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          environment?: string | null
          id?: string
          network?: string | null
          project_id?: string
          started_at?: string
          status?: string
          token_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      dfns_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          organization_id: string | null
          status: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          status: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          organization_id?: string | null
          status?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dfns_api_requests: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string
          organization_id: string | null
          request_body: Json | null
          request_id: string | null
          response_body: Json | null
          response_time_ms: number | null
          status_code: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method: string
          organization_id?: string | null
          request_body?: Json | null
          request_id?: string | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          organization_id?: string | null
          request_body?: Json | null
          request_id?: string | null
          response_body?: Json | null
          response_time_ms?: number | null
          status_code?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dfns_applications: {
        Row: {
          app_id: string
          created_at: string | null
          description: string | null
          external_id: string | null
          id: string
          kind: string
          logo_url: string | null
          name: string
          organization_id: string | null
          origin: string | null
          privacy_policy_url: string | null
          relying_party: string | null
          status: string
          terms_of_service_url: string | null
          updated_at: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          kind: string
          logo_url?: string | null
          name: string
          organization_id?: string | null
          origin?: string | null
          privacy_policy_url?: string | null
          relying_party?: string | null
          status?: string
          terms_of_service_url?: string | null
          updated_at?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          origin?: string | null
          privacy_policy_url?: string | null
          relying_party?: string | null
          status?: string
          terms_of_service_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_authentication_challenges: {
        Row: {
          challenge_data: Json
          challenge_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_data: Json
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_data?: Json
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dfns_broadcast_transactions: {
        Row: {
          broadcast_id: string
          created_at: string | null
          date_broadcast: string | null
          date_confirmed: string | null
          date_created: string
          dfns_broadcast_id: string
          error_message: string | null
          external_id: string | null
          id: string
          kind: string
          status: string
          transaction: string
          tx_hash: string | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string | null
          date_broadcast?: string | null
          date_confirmed?: string | null
          date_created?: string
          dfns_broadcast_id: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          kind: string
          status?: string
          transaction: string
          tx_hash?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string | null
          date_broadcast?: string | null
          date_confirmed?: string | null
          date_created?: string
          dfns_broadcast_id?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          status?: string
          transaction?: string
          tx_hash?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_broadcast_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_credential_challenges: {
        Row: {
          challenge_data: Json
          challenge_id: string
          completed_at: string | null
          created_at: string
          credential_type: string
          expires_at: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_data: Json
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          credential_type: string
          expires_at: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_data?: Json
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          credential_type?: string
          expires_at?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dfns_credentials: {
        Row: {
          algorithm: string
          attestation_type: string | null
          authenticator_info: Json | null
          created_at: string | null
          credential_id: string
          dfns_credential_id: string | null
          enrolled_at: string
          id: string
          kind: string
          last_used_at: string | null
          name: string | null
          public_key: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          algorithm: string
          attestation_type?: string | null
          authenticator_info?: Json | null
          created_at?: string | null
          credential_id: string
          dfns_credential_id?: string | null
          enrolled_at?: string
          id?: string
          kind: string
          last_used_at?: string | null
          name?: string | null
          public_key: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          algorithm?: string
          attestation_type?: string | null
          authenticator_info?: Json | null
          created_at?: string | null
          credential_id?: string
          dfns_credential_id?: string | null
          enrolled_at?: string
          id?: string
          kind?: string
          last_used_at?: string | null
          name?: string | null
          public_key?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "dfns_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dfns_exchange_accounts: {
        Row: {
          account_id: string
          account_type: string
          created_at: string | null
          dfns_account_id: string | null
          exchange_integration_id: string | null
          id: string
          last_updated: string | null
          trading_enabled: boolean | null
          updated_at: string | null
          withdrawal_enabled: boolean | null
        }
        Insert: {
          account_id: string
          account_type: string
          created_at?: string | null
          dfns_account_id?: string | null
          exchange_integration_id?: string | null
          id?: string
          last_updated?: string | null
          trading_enabled?: boolean | null
          updated_at?: string | null
          withdrawal_enabled?: boolean | null
        }
        Update: {
          account_id?: string
          account_type?: string
          created_at?: string | null
          dfns_account_id?: string | null
          exchange_integration_id?: string | null
          id?: string
          last_updated?: string | null
          trading_enabled?: boolean | null
          updated_at?: string | null
          withdrawal_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_exchange_accounts_exchange_integration_id_fkey"
            columns: ["exchange_integration_id"]
            isOneToOne: false
            referencedRelation: "dfns_exchange_integrations"
            referencedColumns: ["integration_id"]
          },
        ]
      }
      dfns_exchange_balances: {
        Row: {
          account_id: string | null
          asset: string
          available: string
          created_at: string | null
          id: string
          last_updated: string | null
          locked: string
          total: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          asset: string
          available?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          locked?: string
          total?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          asset?: string
          available?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          locked?: string
          total?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_exchange_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "dfns_exchange_accounts"
            referencedColumns: ["account_id"]
          },
        ]
      }
      dfns_exchange_integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          credentials: Json
          dfns_exchange_id: string | null
          exchange_kind: string
          id: string
          integration_id: string
          last_sync_at: string | null
          name: string
          organization_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          credentials: Json
          dfns_exchange_id?: string | null
          exchange_kind: string
          id?: string
          integration_id: string
          last_sync_at?: string | null
          name: string
          organization_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          credentials?: Json
          dfns_exchange_id?: string | null
          exchange_kind?: string
          id?: string
          integration_id?: string
          last_sync_at?: string | null
          name?: string
          organization_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_fee_sponsors: {
        Row: {
          balance: string
          created_at: string | null
          dfns_sponsor_id: string | null
          external_id: string | null
          id: string
          name: string
          network: string
          organization_id: string | null
          spent_amount: string
          sponsor_address: string
          sponsor_id: string
          status: string
          transaction_count: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: string
          created_at?: string | null
          dfns_sponsor_id?: string | null
          external_id?: string | null
          id?: string
          name: string
          network: string
          organization_id?: string | null
          spent_amount?: string
          sponsor_address: string
          sponsor_id: string
          status?: string
          transaction_count?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: string
          created_at?: string | null
          dfns_sponsor_id?: string | null
          external_id?: string | null
          id?: string
          name?: string
          network?: string
          organization_id?: string | null
          spent_amount?: string
          sponsor_address?: string
          sponsor_id?: string
          status?: string
          transaction_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_fiat_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          error_details: Json | null
          id: string
          provider_data: Json | null
          status: string
          transaction_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          error_details?: Json | null
          id?: string
          provider_data?: Json | null
          status: string
          transaction_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          error_details?: Json | null
          id?: string
          provider_data?: Json | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dfns_fiat_activity_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "dfns_fiat_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dfns_fiat_provider_configs: {
        Row: {
          configuration: Json
          created_at: string | null
          id: string
          is_enabled: boolean | null
          provider: string
          supported_currencies: string[] | null
          supported_payment_methods: string[] | null
          updated_at: string | null
        }
        Insert: {
          configuration: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider: string
          supported_currencies?: string[] | null
          supported_payment_methods?: string[] | null
          updated_at?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          provider?: string
          supported_currencies?: string[] | null
          supported_payment_methods?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_fiat_quotes: {
        Row: {
          created_at: string | null
          estimated_processing_time: string | null
          exchange_rate: number
          expires_at: string
          fees: Json
          from_amount: number
          from_currency: string
          id: string
          payment_method: string
          provider: string
          to_amount: number
          to_currency: string
          type: string
        }
        Insert: {
          created_at?: string | null
          estimated_processing_time?: string | null
          exchange_rate: number
          expires_at: string
          fees: Json
          from_amount: number
          from_currency: string
          id?: string
          payment_method: string
          provider: string
          to_amount: number
          to_currency: string
          type: string
        }
        Update: {
          created_at?: string | null
          estimated_processing_time?: string | null
          exchange_rate?: number
          expires_at?: string
          fees?: Json
          from_amount?: number
          from_currency?: string
          id?: string
          payment_method?: string
          provider?: string
          to_amount?: number
          to_currency?: string
          type?: string
        }
        Relationships: []
      }
      dfns_fiat_transactions: {
        Row: {
          amount: number
          bank_account: Json | null
          created_at: string | null
          crypto_asset: string
          currency: string
          estimated_completion_time: string | null
          exchange_rate: Json | null
          expires_at: string | null
          fees: Json | null
          id: string
          metadata: Json | null
          organization_id: string | null
          payment_method: string | null
          payment_url: string | null
          project_id: string | null
          provider: string
          provider_transaction_id: string
          status: string
          tx_hash: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          wallet_address: string
          wallet_id: string | null
          withdrawal_address: string | null
        }
        Insert: {
          amount: number
          bank_account?: Json | null
          created_at?: string | null
          crypto_asset: string
          currency: string
          estimated_completion_time?: string | null
          exchange_rate?: Json | null
          expires_at?: string | null
          fees?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          payment_url?: string | null
          project_id?: string | null
          provider: string
          provider_transaction_id: string
          status: string
          tx_hash?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          wallet_address: string
          wallet_id?: string | null
          withdrawal_address?: string | null
        }
        Update: {
          amount?: number
          bank_account?: Json | null
          created_at?: string | null
          crypto_asset?: string
          currency?: string
          estimated_completion_time?: string | null
          exchange_rate?: Json | null
          expires_at?: string | null
          fees?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          payment_url?: string | null
          project_id?: string | null
          provider?: string
          provider_transaction_id?: string
          status?: string
          tx_hash?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string
          wallet_id?: string | null
          withdrawal_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_fiat_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      dfns_permission_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string | null
          id: string
          identity_id: string
          identity_kind: string
          organization_id: string | null
          permission_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string | null
          id?: string
          identity_id: string
          identity_kind: string
          organization_id?: string | null
          permission_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string | null
          id?: string
          identity_id?: string
          identity_kind?: string
          organization_id?: string | null
          permission_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_permission_assignments_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "dfns_permissions"
            referencedColumns: ["permission_id"]
          },
        ]
      }
      dfns_permissions: {
        Row: {
          category: string | null
          condition: Json | null
          created_at: string | null
          description: string | null
          dfns_permission_id: string | null
          effect: string
          id: string
          name: string
          operations: string[]
          organization_id: string | null
          permission_id: string
          resources: string[]
          status: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          condition?: Json | null
          created_at?: string | null
          description?: string | null
          dfns_permission_id?: string | null
          effect: string
          id?: string
          name: string
          operations: string[]
          organization_id?: string | null
          permission_id: string
          resources: string[]
          status?: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          condition?: Json | null
          created_at?: string | null
          description?: string | null
          dfns_permission_id?: string | null
          effect?: string
          id?: string
          name?: string
          operations?: string[]
          organization_id?: string | null
          permission_id?: string
          resources?: string[]
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_personal_access_tokens: {
        Row: {
          created_at: string | null
          dfns_token_id: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          permission_assignments: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dfns_token_id?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          permission_assignments?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dfns_token_id?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          permission_assignments?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_personal_access_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "dfns_users"
            referencedColumns: ["id"]
          },
        ]
      }
      dfns_policies: {
        Row: {
          activity_kind: string
          created_at: string | null
          description: string | null
          dfns_policy_id: string | null
          external_id: string | null
          id: string
          name: string
          organization_id: string | null
          policy_id: string
          rule: Json
          status: string
          updated_at: string | null
        }
        Insert: {
          activity_kind: string
          created_at?: string | null
          description?: string | null
          dfns_policy_id?: string | null
          external_id?: string | null
          id?: string
          name: string
          organization_id?: string | null
          policy_id: string
          rule: Json
          status?: string
          updated_at?: string | null
        }
        Update: {
          activity_kind?: string
          created_at?: string | null
          description?: string | null
          dfns_policy_id?: string | null
          external_id?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          policy_id?: string
          rule?: Json
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_policy_approvals: {
        Row: {
          activity_id: string
          approval_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          dfns_approval_id: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          policy_id: string | null
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          activity_id: string
          approval_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dfns_approval_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          policy_id?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string
          approval_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          dfns_approval_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          policy_id?: string | null
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_policy_approvals_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "dfns_policies"
            referencedColumns: ["policy_id"]
          },
        ]
      }
      dfns_service_accounts: {
        Row: {
          created_at: string | null
          dfns_service_account_id: string | null
          external_id: string | null
          id: string
          name: string
          organization_id: string | null
          permission_assignments: Json | null
          public_key: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dfns_service_account_id?: string | null
          external_id?: string | null
          id?: string
          name: string
          organization_id?: string | null
          permission_assignments?: Json | null
          public_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dfns_service_account_id?: string | null
          external_id?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          permission_assignments?: Json | null
          public_key?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_signatures: {
        Row: {
          created_at: string | null
          date_completed: string | null
          date_created: string
          dfns_signature_id: string
          error_message: string | null
          external_id: string | null
          id: string
          key_id: string | null
          kind: string
          message: string
          public_key: string
          signature: string | null
          signature_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_completed?: string | null
          date_created?: string
          dfns_signature_id: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          key_id?: string | null
          kind: string
          message: string
          public_key: string
          signature?: string | null
          signature_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_completed?: string | null
          date_created?: string
          dfns_signature_id?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          key_id?: string | null
          kind?: string
          message?: string
          public_key?: string
          signature?: string | null
          signature_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_signatures_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "dfns_signing_keys"
            referencedColumns: ["key_id"]
          },
        ]
      }
      dfns_signing_keys: {
        Row: {
          created_at: string | null
          curve: string
          date_exported: string | null
          delegated: boolean | null
          delegated_to: string | null
          dfns_key_id: string
          exported: boolean | null
          external_id: string | null
          id: string
          imported: boolean | null
          key_id: string
          network: string
          organization_id: string | null
          public_key: string
          scheme: string
          status: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curve: string
          date_exported?: string | null
          delegated?: boolean | null
          delegated_to?: string | null
          dfns_key_id: string
          exported?: boolean | null
          external_id?: string | null
          id?: string
          imported?: boolean | null
          key_id: string
          network: string
          organization_id?: string | null
          public_key: string
          scheme: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curve?: string
          date_exported?: string | null
          delegated?: boolean | null
          delegated_to?: string | null
          dfns_key_id?: string
          exported?: boolean | null
          external_id?: string | null
          id?: string
          imported?: boolean | null
          key_id?: string
          network?: string
          organization_id?: string | null
          public_key?: string
          scheme?: string
          status?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_sponsored_fees: {
        Row: {
          amount: string
          asset: string
          created_at: string | null
          error_message: string | null
          fee_sponsor_id: string | null
          id: string
          sponsored_at: string
          sponsored_fee_id: string
          status: string
          tx_hash: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: string
          asset: string
          created_at?: string | null
          error_message?: string | null
          fee_sponsor_id?: string | null
          id?: string
          sponsored_at?: string
          sponsored_fee_id: string
          status?: string
          tx_hash: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: string
          asset?: string
          created_at?: string | null
          error_message?: string | null
          fee_sponsor_id?: string | null
          id?: string
          sponsored_at?: string
          sponsored_fee_id?: string
          status?: string
          tx_hash?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_sponsored_fees_fee_sponsor_id_fkey"
            columns: ["fee_sponsor_id"]
            isOneToOne: false
            referencedRelation: "dfns_fee_sponsors"
            referencedColumns: ["sponsor_id"]
          },
          {
            foreignKeyName: "dfns_sponsored_fees_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_staking_integrations: {
        Row: {
          apr: string | null
          claimed_rewards: string
          created_at: string | null
          delegation_amount: string
          dfns_staking_id: string | null
          id: string
          last_claim_at: string | null
          last_reward_at: string | null
          network: string
          pending_rewards: string
          staking_id: string
          status: string
          total_rewards: string
          unstaking_period: string | null
          updated_at: string | null
          validator_address: string | null
          wallet_id: string | null
        }
        Insert: {
          apr?: string | null
          claimed_rewards?: string
          created_at?: string | null
          delegation_amount?: string
          dfns_staking_id?: string | null
          id?: string
          last_claim_at?: string | null
          last_reward_at?: string | null
          network: string
          pending_rewards?: string
          staking_id: string
          status: string
          total_rewards?: string
          unstaking_period?: string | null
          updated_at?: string | null
          validator_address?: string | null
          wallet_id?: string | null
        }
        Update: {
          apr?: string | null
          claimed_rewards?: string
          created_at?: string | null
          delegation_amount?: string
          dfns_staking_id?: string | null
          id?: string
          last_claim_at?: string | null
          last_reward_at?: string | null
          network?: string
          pending_rewards?: string
          staking_id?: string
          status?: string
          total_rewards?: string
          unstaking_period?: string | null
          updated_at?: string | null
          validator_address?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_staking_integrations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_sync_status: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          last_sync_at: string
          next_sync_at: string | null
          organization_id: string | null
          sync_status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          last_sync_at?: string
          next_sync_at?: string | null
          organization_id?: string | null
          sync_status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string
          next_sync_at?: string | null
          organization_id?: string | null
          sync_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dfns_transaction_history: {
        Row: {
          amount: string
          asset_name: string | null
          asset_symbol: string
          block_hash: string | null
          block_number: number | null
          contract_address: string | null
          created_at: string | null
          direction: string
          fee: string | null
          from_address: string | null
          id: string
          last_updated: string | null
          metadata: Json | null
          status: string
          timestamp: string
          to_address: string | null
          tx_hash: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: string
          asset_name?: string | null
          asset_symbol: string
          block_hash?: string | null
          block_number?: number | null
          contract_address?: string | null
          created_at?: string | null
          direction: string
          fee?: string | null
          from_address?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          status: string
          timestamp: string
          to_address?: string | null
          tx_hash: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: string
          asset_name?: string | null
          asset_symbol?: string
          block_hash?: string | null
          block_number?: number | null
          contract_address?: string | null
          created_at?: string | null
          direction?: string
          fee?: string | null
          from_address?: string | null
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          status?: string
          timestamp?: string
          to_address?: string | null
          tx_hash?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_transaction_history_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_transfers: {
        Row: {
          amount: string
          asset: string | null
          created_at: string | null
          date_broadcast: string | null
          date_confirmed: string | null
          date_created: string
          dfns_transfer_id: string
          error_message: string | null
          estimated_confirmation_time: string | null
          external_id: string | null
          fee: string | null
          gas_limit: string | null
          gas_price: string | null
          id: string
          max_fee_per_gas: string | null
          max_priority_fee_per_gas: string | null
          memo: string | null
          nonce: number | null
          status: string
          to_address: string
          transfer_id: string
          tx_hash: string | null
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: string
          asset?: string | null
          created_at?: string | null
          date_broadcast?: string | null
          date_confirmed?: string | null
          date_created?: string
          dfns_transfer_id: string
          error_message?: string | null
          estimated_confirmation_time?: string | null
          external_id?: string | null
          fee?: string | null
          gas_limit?: string | null
          gas_price?: string | null
          id?: string
          max_fee_per_gas?: string | null
          max_priority_fee_per_gas?: string | null
          memo?: string | null
          nonce?: number | null
          status?: string
          to_address: string
          transfer_id: string
          tx_hash?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: string
          asset?: string | null
          created_at?: string | null
          date_broadcast?: string | null
          date_confirmed?: string | null
          date_created?: string
          dfns_transfer_id?: string
          error_message?: string | null
          estimated_confirmation_time?: string | null
          external_id?: string | null
          fee?: string | null
          gas_limit?: string | null
          gas_price?: string | null
          id?: string
          max_fee_per_gas?: string | null
          max_priority_fee_per_gas?: string | null
          memo?: string | null
          nonce?: number | null
          status?: string
          to_address?: string
          transfer_id?: string
          tx_hash?: string | null
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_transfers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_user_action_challenges: {
        Row: {
          action_data: Json
          action_type: string
          challenge: string
          challenge_id: string
          created_at: string
          credential_id: string | null
          expires_at: string
          id: string
          signature: string | null
          signing_method: string | null
          status: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          action_data: Json
          action_type: string
          challenge: string
          challenge_id: string
          created_at?: string
          credential_id?: string | null
          expires_at: string
          id?: string
          signature?: string | null
          signing_method?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          challenge?: string
          challenge_id?: string
          created_at?: string
          credential_id?: string | null
          expires_at?: string
          id?: string
          signature?: string | null
          signing_method?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      dfns_user_sessions: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          logged_out_at: string | null
          refresh_token: string
          remember_me: boolean
          session_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          logged_out_at?: string | null
          refresh_token: string
          remember_me?: boolean
          session_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          logged_out_at?: string | null
          refresh_token?: string
          remember_me?: boolean
          session_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dfns_users: {
        Row: {
          created_at: string | null
          dfns_user_id: string | null
          email: string | null
          external_id: string | null
          id: string
          kind: string
          last_login_at: string | null
          mfa_enabled: boolean | null
          organization_id: string | null
          public_key: string | null
          recovery_setup: boolean | null
          registered_at: string
          status: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          dfns_user_id?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          kind: string
          last_login_at?: string | null
          mfa_enabled?: boolean | null
          organization_id?: string | null
          public_key?: string | null
          recovery_setup?: boolean | null
          registered_at?: string
          status?: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          dfns_user_id?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          last_login_at?: string | null
          mfa_enabled?: boolean | null
          organization_id?: string | null
          public_key?: string | null
          recovery_setup?: boolean | null
          registered_at?: string
          status?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      dfns_validators: {
        Row: {
          apr: string | null
          commission: string
          created_at: string | null
          delegated_amount: string
          id: string
          last_updated: string | null
          name: string | null
          network: string
          rank: number | null
          status: string
          updated_at: string | null
          uptime: string | null
          validator_address: string
        }
        Insert: {
          apr?: string | null
          commission?: string
          created_at?: string | null
          delegated_amount?: string
          id?: string
          last_updated?: string | null
          name?: string | null
          network: string
          rank?: number | null
          status: string
          updated_at?: string | null
          uptime?: string | null
          validator_address: string
        }
        Update: {
          apr?: string | null
          commission?: string
          created_at?: string | null
          delegated_amount?: string
          id?: string
          last_updated?: string | null
          name?: string | null
          network?: string
          rank?: number | null
          status?: string
          updated_at?: string | null
          uptime?: string | null
          validator_address?: string
        }
        Relationships: []
      }
      dfns_wallet_balances: {
        Row: {
          asset_name: string | null
          asset_symbol: string
          balance: string
          contract_address: string | null
          created_at: string | null
          decimals: number
          id: string
          last_updated: string | null
          native_asset: boolean | null
          updated_at: string | null
          value_in_usd: string | null
          verified: boolean | null
          wallet_id: string | null
        }
        Insert: {
          asset_name?: string | null
          asset_symbol: string
          balance?: string
          contract_address?: string | null
          created_at?: string | null
          decimals?: number
          id?: string
          last_updated?: string | null
          native_asset?: boolean | null
          updated_at?: string | null
          value_in_usd?: string | null
          verified?: boolean | null
          wallet_id?: string | null
        }
        Update: {
          asset_name?: string | null
          asset_symbol?: string
          balance?: string
          contract_address?: string | null
          created_at?: string | null
          decimals?: number
          id?: string
          last_updated?: string | null
          native_asset?: boolean | null
          updated_at?: string | null
          value_in_usd?: string | null
          verified?: boolean | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_wallet_balances_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_wallet_nfts: {
        Row: {
          attributes: Json | null
          collection: string | null
          contract: string
          created_at: string | null
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          last_updated: string | null
          name: string | null
          token_id: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          attributes?: Json | null
          collection?: string | null
          contract: string
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          name?: string | null
          token_id: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          attributes?: Json | null
          collection?: string | null
          contract?: string
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          last_updated?: string | null
          name?: string | null
          token_id?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_wallet_nfts_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "dfns_wallets"
            referencedColumns: ["wallet_id"]
          },
        ]
      }
      dfns_wallets: {
        Row: {
          address: string
          created_at: string | null
          custodial: boolean | null
          date_exported: string | null
          delegated: boolean | null
          delegated_to: string | null
          dfns_wallet_id: string
          exported: boolean | null
          external_id: string | null
          id: string
          imported: boolean | null
          investor_id: string | null
          name: string | null
          network: string
          organization_id: string | null
          project_id: string | null
          signing_key_id: string | null
          status: string
          tags: string[] | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          address: string
          created_at?: string | null
          custodial?: boolean | null
          date_exported?: string | null
          delegated?: boolean | null
          delegated_to?: string | null
          dfns_wallet_id: string
          exported?: boolean | null
          external_id?: string | null
          id?: string
          imported?: boolean | null
          investor_id?: string | null
          name?: string | null
          network: string
          organization_id?: string | null
          project_id?: string | null
          signing_key_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          address?: string
          created_at?: string | null
          custodial?: boolean | null
          date_exported?: string | null
          delegated?: boolean | null
          delegated_to?: string | null
          dfns_wallet_id?: string
          exported?: boolean | null
          external_id?: string | null
          id?: string
          imported?: boolean | null
          investor_id?: string | null
          name?: string | null
          network?: string
          organization_id?: string | null
          project_id?: string | null
          signing_key_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dfns_wallets_signing_key_id_fkey"
            columns: ["signing_key_id"]
            isOneToOne: false
            referencedRelation: "dfns_signing_keys"
            referencedColumns: ["key_id"]
          },
        ]
      }
      dfns_webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          delivery_id: string
          error_message: string | null
          event: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string
          updated_at: string | null
          webhook_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_id: string
          error_message?: string | null
          event: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          updated_at?: string | null
          webhook_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_id?: string
          error_message?: string | null
          event?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          updated_at?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dfns_webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "dfns_webhooks"
            referencedColumns: ["webhook_id"]
          },
        ]
      }
      dfns_webhooks: {
        Row: {
          created_at: string | null
          description: string | null
          dfns_webhook_id: string | null
          events: string[]
          external_id: string | null
          headers: Json | null
          id: string
          name: string
          organization_id: string | null
          secret: string | null
          status: string
          updated_at: string | null
          url: string
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dfns_webhook_id?: string | null
          events: string[]
          external_id?: string | null
          headers?: Json | null
          id?: string
          name: string
          organization_id?: string | null
          secret?: string | null
          status?: string
          updated_at?: string | null
          url: string
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dfns_webhook_id?: string | null
          events?: string[]
          external_id?: string | null
          headers?: Json | null
          id?: string
          name?: string
          organization_id?: string | null
          secret?: string | null
          status?: string
          updated_at?: string | null
          url?: string
          webhook_id?: string
        }
        Relationships: []
      }
      digital_tokenised_funds: {
        Row: {
          asset_name: string | null
          asset_symbol: string | null
          asset_type: string | null
          blockchain_network: string | null
          circulating_supply: number | null
          compliance_rules: string | null
          created_at: string | null
          embedded_rights: string | null
          fractionalization_enabled: boolean | null
          id: string
          issuance_date: string | null
          issuer: string | null
          management_fee: number | null
          nav: number | null
          peg_value: number | null
          performance_fee: number | null
          permission_controls: string | null
          project_id: string
          provenance_history_enabled: boolean | null
          redemption_terms: string | null
          smart_contract_address: string | null
          status: string | null
          target_raise: number | null
          total_supply: number | null
          updated_at: string | null
        }
        Insert: {
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          compliance_rules?: string | null
          created_at?: string | null
          embedded_rights?: string | null
          fractionalization_enabled?: boolean | null
          id?: string
          issuance_date?: string | null
          issuer?: string | null
          management_fee?: number | null
          nav?: number | null
          peg_value?: number | null
          performance_fee?: number | null
          permission_controls?: string | null
          project_id: string
          provenance_history_enabled?: boolean | null
          redemption_terms?: string | null
          smart_contract_address?: string | null
          status?: string | null
          target_raise?: number | null
          total_supply?: number | null
          updated_at?: string | null
        }
        Update: {
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          compliance_rules?: string | null
          created_at?: string | null
          embedded_rights?: string | null
          fractionalization_enabled?: boolean | null
          id?: string
          issuance_date?: string | null
          issuer?: string | null
          management_fee?: number | null
          nav?: number | null
          peg_value?: number | null
          performance_fee?: number | null
          permission_controls?: string | null
          project_id?: string
          provenance_history_enabled?: boolean | null
          redemption_terms?: string | null
          smart_contract_address?: string | null
          status?: string | null
          target_raise?: number | null
          total_supply?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_digital_tokenised_funds_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_tokenized_fund_products: {
        Row: {
          asset_name: string | null
          asset_symbol: string | null
          asset_type: string | null
          blockchain_network: string | null
          circulating_supply: number | null
          compliance_rules: string | null
          created_at: string | null
          custody_arrangements: string | null
          embedded_rights: string | null
          fractionalization_enabled: boolean | null
          id: string
          issuance_date: string | null
          issuer: string | null
          nav: number | null
          permission_controls: string | null
          project_id: string
          provenance_history_enabled: boolean | null
          smart_contract_address: string | null
          status: string | null
          target_raise: number | null
          token_economics: string | null
          total_supply: number | null
          updated_at: string | null
          upgrade_governance: string | null
        }
        Insert: {
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          compliance_rules?: string | null
          created_at?: string | null
          custody_arrangements?: string | null
          embedded_rights?: string | null
          fractionalization_enabled?: boolean | null
          id?: string
          issuance_date?: string | null
          issuer?: string | null
          nav?: number | null
          permission_controls?: string | null
          project_id: string
          provenance_history_enabled?: boolean | null
          smart_contract_address?: string | null
          status?: string | null
          target_raise?: number | null
          token_economics?: string | null
          total_supply?: number | null
          updated_at?: string | null
          upgrade_governance?: string | null
        }
        Update: {
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          compliance_rules?: string | null
          created_at?: string | null
          custody_arrangements?: string | null
          embedded_rights?: string | null
          fractionalization_enabled?: boolean | null
          id?: string
          issuance_date?: string | null
          issuer?: string | null
          nav?: number | null
          permission_controls?: string | null
          project_id?: string
          provenance_history_enabled?: boolean | null
          smart_contract_address?: string | null
          status?: string | null
          target_raise?: number | null
          token_economics?: string | null
          total_supply?: number | null
          updated_at?: string | null
          upgrade_governance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_tokenized_fund_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_redemptions: {
        Row: {
          amount_redeemed: number
          created_at: string
          distribution_id: string
          id: string
          organization_id: string | null
          project_id: string | null
          redemption_request_id: string
          updated_at: string | null
        }
        Insert: {
          amount_redeemed: number
          created_at?: string
          distribution_id: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          redemption_request_id: string
          updated_at?: string | null
        }
        Update: {
          amount_redeemed?: number
          created_at?: string
          distribution_id?: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          redemption_request_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_redemptions_distribution_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_redemptions_distribution_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "redemption_eligibility"
            referencedColumns: ["distribution_id"]
          },
          {
            foreignKeyName: "distribution_redemptions_redemption_fkey"
            columns: ["redemption_request_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      distributions: {
        Row: {
          blockchain: string
          created_at: string
          distribution_date: string
          distribution_tx_hash: string
          fully_redeemed: boolean
          id: string
          investor_id: string
          notes: string | null
          project_id: string | null
          redemption_locked_amount: number | null
          redemption_percentage_used: number | null
          redemption_status: string | null
          remaining_amount: number
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: string
          subscription_id: string
          to_address: string
          token_address: string | null
          token_allocation_id: string
          token_amount: number
          token_symbol: string | null
          token_type: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          blockchain: string
          created_at?: string
          distribution_date: string
          distribution_tx_hash: string
          fully_redeemed?: boolean
          id?: string
          investor_id: string
          notes?: string | null
          project_id?: string | null
          redemption_locked_amount?: number | null
          redemption_percentage_used?: number | null
          redemption_status?: string | null
          remaining_amount: number
          standard?: Database["public"]["Enums"]["token_standard_enum"] | null
          status?: string
          subscription_id: string
          to_address: string
          token_address?: string | null
          token_allocation_id: string
          token_amount: number
          token_symbol?: string | null
          token_type: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          blockchain?: string
          created_at?: string
          distribution_date?: string
          distribution_tx_hash?: string
          fully_redeemed?: boolean
          id?: string
          investor_id?: string
          notes?: string | null
          project_id?: string | null
          redemption_locked_amount?: number | null
          redemption_percentage_used?: number | null
          redemption_status?: string | null
          remaining_amount?: number
          standard?: Database["public"]["Enums"]["token_standard_enum"] | null
          status?: string
          subscription_id?: string
          to_address?: string
          token_address?: string | null
          token_allocation_id?: string
          token_amount?: number
          token_symbol?: string | null
          token_type?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_investor_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "distributions_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_subscription_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributions_wallet_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approver_id: string | null
          comments: string | null
          created_at: string | null
          document_id: string | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          approver_id?: string | null
          comments?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          created_at: string | null
          document_id: string | null
          file_path: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      document_workflows: {
        Row: {
          completed_signers: string[]
          created_at: string
          created_by: string
          deadline: string | null
          document_id: string
          id: string
          metadata: Json
          required_signers: string[]
          status: Database["public"]["Enums"]["workflow_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          completed_signers?: string[]
          created_at?: string
          created_by: string
          deadline?: string | null
          document_id: string
          id?: string
          metadata?: Json
          required_signers: string[]
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          completed_signers?: string[]
          created_at?: string
          created_by?: string
          deadline?: string | null
          document_id?: string
          id?: string
          metadata?: Json
          required_signers?: string[]
          status?: Database["public"]["Enums"]["workflow_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_workflows_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "issuer_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          expiry_date: string | null
          file_path: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          project_id: string | null
          status: string
          type: string
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
          workflow_stage_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          project_id?: string | null
          status?: string
          type: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workflow_stage_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          expiry_date?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          workflow_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_workflow_stage_id_fkey"
            columns: ["workflow_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_assets: {
        Row: {
          asset_id: string
          capacity: number
          created_at: string | null
          location: string
          name: string
          owner_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          asset_id?: string
          capacity: number
          created_at?: string | null
          location: string
          name: string
          owner_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          capacity?: number
          created_at?: string | null
          location?: string
          name?: string
          owner_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_products: {
        Row: {
          capacity: number | null
          carbon_offset_potential: number | null
          created_at: string | null
          decommission_date: string | null
          electricity_purchaser: string | null
          expected_online_date: string | null
          field_service_logs: string | null
          financial_data: Json | null
          id: string
          land_type: string | null
          owner: string | null
          performance_metrics: Json | null
          power_purchase_agreements: string | null
          project_capacity_mw: number | null
          project_id: string
          project_identifier: string | null
          project_name: string | null
          project_status: string | null
          project_type: string | null
          receivable_amount: number | null
          regulatory_approvals: string[] | null
          regulatory_compliance: string | null
          site_id: string | null
          site_location: string | null
          status: string | null
          target_raise: number | null
          timeline_data: Json | null
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          carbon_offset_potential?: number | null
          created_at?: string | null
          decommission_date?: string | null
          electricity_purchaser?: string | null
          expected_online_date?: string | null
          field_service_logs?: string | null
          financial_data?: Json | null
          id?: string
          land_type?: string | null
          owner?: string | null
          performance_metrics?: Json | null
          power_purchase_agreements?: string | null
          project_capacity_mw?: number | null
          project_id: string
          project_identifier?: string | null
          project_name?: string | null
          project_status?: string | null
          project_type?: string | null
          receivable_amount?: number | null
          regulatory_approvals?: string[] | null
          regulatory_compliance?: string | null
          site_id?: string | null
          site_location?: string | null
          status?: string | null
          target_raise?: number | null
          timeline_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          carbon_offset_potential?: number | null
          created_at?: string | null
          decommission_date?: string | null
          electricity_purchaser?: string | null
          expected_online_date?: string | null
          field_service_logs?: string | null
          financial_data?: Json | null
          id?: string
          land_type?: string | null
          owner?: string | null
          performance_metrics?: Json | null
          power_purchase_agreements?: string | null
          project_capacity_mw?: number | null
          project_id?: string
          project_identifier?: string | null
          project_name?: string | null
          project_status?: string | null
          project_type?: string | null
          receivable_amount?: number | null
          regulatory_approvals?: string[] | null
          regulatory_compliance?: string | null
          site_id?: string | null
          site_location?: string | null
          status?: string | null
          target_raise?: number | null
          timeline_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_energy_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_products: {
        Row: {
          acquisition_disposal_date: string | null
          authorized_shares: number | null
          company_name: string | null
          corporate_actions_history: Json | null
          created_at: string | null
          currency: string | null
          delisting_date: string | null
          dilution_protection: string[] | null
          dividend_payment_dates: string[] | null
          dividend_policy: string | null
          dividend_yield: number | null
          earnings_per_share: number | null
          exchange: string | null
          exit_strategy: string | null
          id: string
          ipo_date: string | null
          market_capitalization: number | null
          price_earnings_ratio: number | null
          project_id: string
          sector_industry: string | null
          shares_outstanding: number | null
          status: string | null
          target_raise: number | null
          ticker_symbol: string | null
          updated_at: string | null
          voting_rights: string | null
        }
        Insert: {
          acquisition_disposal_date?: string | null
          authorized_shares?: number | null
          company_name?: string | null
          corporate_actions_history?: Json | null
          created_at?: string | null
          currency?: string | null
          delisting_date?: string | null
          dilution_protection?: string[] | null
          dividend_payment_dates?: string[] | null
          dividend_policy?: string | null
          dividend_yield?: number | null
          earnings_per_share?: number | null
          exchange?: string | null
          exit_strategy?: string | null
          id?: string
          ipo_date?: string | null
          market_capitalization?: number | null
          price_earnings_ratio?: number | null
          project_id: string
          sector_industry?: string | null
          shares_outstanding?: number | null
          status?: string | null
          target_raise?: number | null
          ticker_symbol?: string | null
          updated_at?: string | null
          voting_rights?: string | null
        }
        Update: {
          acquisition_disposal_date?: string | null
          authorized_shares?: number | null
          company_name?: string | null
          corporate_actions_history?: Json | null
          created_at?: string | null
          currency?: string | null
          delisting_date?: string | null
          dilution_protection?: string[] | null
          dividend_payment_dates?: string[] | null
          dividend_policy?: string | null
          dividend_yield?: number | null
          earnings_per_share?: number | null
          exchange?: string | null
          exit_strategy?: string | null
          id?: string
          ipo_date?: string | null
          market_capitalization?: number | null
          price_earnings_ratio?: number | null
          project_id?: string
          sector_industry?: string | null
          shares_outstanding?: number | null
          status?: string | null
          target_raise?: number | null
          ticker_symbol?: string | null
          updated_at?: string | null
          voting_rights?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_equity_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_registry: {
        Row: {
          address: string
          audit_report_url: string | null
          audit_status: string | null
          deployed_at: string | null
          description: string | null
          function_selectors: string[]
          id: string
          is_active: boolean | null
          name: string
          source_code_hash: string
          updated_at: string | null
          version: string
        }
        Insert: {
          address: string
          audit_report_url?: string | null
          audit_status?: string | null
          deployed_at?: string | null
          description?: string | null
          function_selectors?: string[]
          id?: string
          is_active?: boolean | null
          name: string
          source_code_hash: string
          updated_at?: string | null
          version: string
        }
        Update: {
          address?: string
          audit_report_url?: string | null
          audit_status?: string | null
          deployed_at?: string | null
          description?: string | null
          function_selectors?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          source_code_hash?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      faucet_requests: {
        Row: {
          amount: string
          created_at: string | null
          id: string
          ip_address: string | null
          network: string
          status: string
          token_address: string | null
          transaction_hash: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          network: string
          status?: string
          token_address?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          network?: string
          status?: string
          token_address?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      fiat_quotes: {
        Row: {
          converted_to_transaction_id: string | null
          created_at: string
          estimated_processing_time: string | null
          exchange_rate: number
          expires_at: string
          fees: Json
          from_amount: number
          from_currency: string
          id: string
          payment_method: string
          provider: string
          session_id: string | null
          to_amount: number
          to_currency: string
          type: string
          user_id: string | null
        }
        Insert: {
          converted_to_transaction_id?: string | null
          created_at?: string
          estimated_processing_time?: string | null
          exchange_rate: number
          expires_at: string
          fees: Json
          from_amount: number
          from_currency: string
          id?: string
          payment_method: string
          provider: string
          session_id?: string | null
          to_amount: number
          to_currency: string
          type: string
          user_id?: string | null
        }
        Update: {
          converted_to_transaction_id?: string | null
          created_at?: string
          estimated_processing_time?: string | null
          exchange_rate?: number
          expires_at?: string
          fees?: Json
          from_amount?: number
          from_currency?: string
          id?: string
          payment_method?: string
          provider?: string
          session_id?: string | null
          to_amount?: number
          to_currency?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiat_quotes_converted_to_transaction_id_fkey"
            columns: ["converted_to_transaction_id"]
            isOneToOne: false
            referencedRelation: "fiat_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      fiat_transactions: {
        Row: {
          amount: number
          bank_account: Json | null
          created_at: string
          crypto_asset: string
          currency: string
          estimated_completion_time: string | null
          exchange_rate: Json | null
          expires_at: string | null
          fees: Json | null
          id: string
          metadata: Json | null
          organization_id: string | null
          payment_method: string | null
          payment_url: string | null
          project_id: string | null
          provider: string
          provider_transaction_id: string
          status: string
          tx_hash: string | null
          type: string
          updated_at: string
          user_id: string | null
          wallet_address: string
          wallet_id: string | null
          withdrawal_address: string | null
        }
        Insert: {
          amount: number
          bank_account?: Json | null
          created_at?: string
          crypto_asset: string
          currency: string
          estimated_completion_time?: string | null
          exchange_rate?: Json | null
          expires_at?: string | null
          fees?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          payment_url?: string | null
          project_id?: string | null
          provider: string
          provider_transaction_id: string
          status: string
          tx_hash?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
          wallet_address: string
          wallet_id?: string | null
          withdrawal_address?: string | null
        }
        Update: {
          amount?: number
          bank_account?: Json | null
          created_at?: string
          crypto_asset?: string
          currency?: string
          estimated_completion_time?: string | null
          exchange_rate?: Json | null
          expires_at?: string | null
          fees?: Json | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          payment_method?: string | null
          payment_url?: string | null
          project_id?: string | null
          provider?: string
          provider_transaction_id?: string
          status?: string
          tx_hash?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string
          wallet_id?: string | null
          withdrawal_address?: string | null
        }
        Relationships: []
      }
      fund_nav_data: {
        Row: {
          calculation_method: string | null
          change_amount: number | null
          change_percent: number | null
          created_at: string | null
          created_by: string | null
          date: string
          fund_id: string
          id: string
          market_conditions: string | null
          nav: number
          notes: string | null
          outstanding_shares: number
          previous_nav: number | null
          source: string
          total_assets: number
          total_liabilities: number
          updated_at: string | null
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          calculation_method?: string | null
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          date: string
          fund_id: string
          id?: string
          market_conditions?: string | null
          nav: number
          notes?: string | null
          outstanding_shares: number
          previous_nav?: number | null
          source?: string
          total_assets: number
          total_liabilities?: number
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          calculation_method?: string | null
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          fund_id?: string
          id?: string
          market_conditions?: string | null
          nav?: number
          notes?: string | null
          outstanding_shares?: number
          previous_nav?: number | null
          source?: string
          total_assets?: number
          total_liabilities?: number
          updated_at?: string | null
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      fund_products: {
        Row: {
          assets_under_management: number | null
          benchmark_index: string | null
          closure_liquidation_date: string | null
          created_at: string | null
          creation_redemption_history: Json | null
          currency: string | null
          distribution_frequency: string | null
          expense_ratio: number | null
          flow_data: Json | null
          fund_name: string | null
          fund_ticker: string | null
          fund_type: string | null
          fund_vintage_year: number | null
          geographic_focus: string[] | null
          holdings: Json | null
          id: string
          inception_date: string | null
          investment_stage: string | null
          net_asset_value: number | null
          performance_history: Json | null
          project_id: string
          sector_focus: string[] | null
          status: string | null
          target_raise: number | null
          tracking_error: number | null
          updated_at: string | null
        }
        Insert: {
          assets_under_management?: number | null
          benchmark_index?: string | null
          closure_liquidation_date?: string | null
          created_at?: string | null
          creation_redemption_history?: Json | null
          currency?: string | null
          distribution_frequency?: string | null
          expense_ratio?: number | null
          flow_data?: Json | null
          fund_name?: string | null
          fund_ticker?: string | null
          fund_type?: string | null
          fund_vintage_year?: number | null
          geographic_focus?: string[] | null
          holdings?: Json | null
          id?: string
          inception_date?: string | null
          investment_stage?: string | null
          net_asset_value?: number | null
          performance_history?: Json | null
          project_id: string
          sector_focus?: string[] | null
          status?: string | null
          target_raise?: number | null
          tracking_error?: number | null
          updated_at?: string | null
        }
        Update: {
          assets_under_management?: number | null
          benchmark_index?: string | null
          closure_liquidation_date?: string | null
          created_at?: string | null
          creation_redemption_history?: Json | null
          currency?: string | null
          distribution_frequency?: string | null
          expense_ratio?: number | null
          flow_data?: Json | null
          fund_name?: string | null
          fund_ticker?: string | null
          fund_type?: string | null
          fund_vintage_year?: number | null
          geographic_focus?: string[] | null
          holdings?: Json | null
          id?: string
          inception_date?: string | null
          investment_stage?: string | null
          net_asset_value?: number | null
          performance_history?: Json | null
          project_id?: string
          sector_focus?: string[] | null
          status?: string | null
          target_raise?: number | null
          tracking_error?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fund_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      geographic_jurisdictions: {
        Row: {
          aml_risk_rating: string | null
          country_code: string
          country_code_3: string
          country_name: string
          created_at: string | null
          fatf_compliance_status: string | null
          id: string
          is_eu_sanctioned: boolean | null
          is_ofac_sanctioned: boolean | null
          is_un_sanctioned: boolean | null
          kyc_requirements_level: string | null
          offshore_financial_center: boolean | null
          region: string
          regulatory_regime: string | null
          sanctions_risk_level: string | null
          tax_treaty_status: string | null
          updated_at: string | null
        }
        Insert: {
          aml_risk_rating?: string | null
          country_code: string
          country_code_3: string
          country_name: string
          created_at?: string | null
          fatf_compliance_status?: string | null
          id?: string
          is_eu_sanctioned?: boolean | null
          is_ofac_sanctioned?: boolean | null
          is_un_sanctioned?: boolean | null
          kyc_requirements_level?: string | null
          offshore_financial_center?: boolean | null
          region: string
          regulatory_regime?: string | null
          sanctions_risk_level?: string | null
          tax_treaty_status?: string | null
          updated_at?: string | null
        }
        Update: {
          aml_risk_rating?: string | null
          country_code?: string
          country_code_3?: string
          country_name?: string
          created_at?: string | null
          fatf_compliance_status?: string | null
          id?: string
          is_eu_sanctioned?: boolean | null
          is_ofac_sanctioned?: boolean | null
          is_un_sanctioned?: boolean | null
          kyc_requirements_level?: string | null
          offshore_financial_center?: boolean | null
          region?: string
          regulatory_regime?: string | null
          sanctions_risk_level?: string | null
          tax_treaty_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guardian_api_tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          endpoint: string
          error_message: string | null
          execution_time_ms: number | null
          guardian_operation_id: string | null
          guardian_wallet_address: string | null
          guardian_wallet_id: string | null
          http_method: string
          id: string
          notes: string | null
          request_headers: Json | null
          request_payload: Json | null
          response_headers: Json | null
          response_payload: Json | null
          response_status: number | null
          success: boolean
          test_name: string
          test_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          endpoint: string
          error_message?: string | null
          execution_time_ms?: number | null
          guardian_operation_id?: string | null
          guardian_wallet_address?: string | null
          guardian_wallet_id?: string | null
          http_method: string
          id?: string
          notes?: string | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          success?: boolean
          test_name: string
          test_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          endpoint?: string
          error_message?: string | null
          execution_time_ms?: number | null
          guardian_operation_id?: string | null
          guardian_wallet_address?: string | null
          guardian_wallet_id?: string | null
          http_method?: string
          id?: string
          notes?: string | null
          request_headers?: Json | null
          request_payload?: Json | null
          response_headers?: Json | null
          response_payload?: Json | null
          response_status?: number | null
          success?: boolean
          test_name?: string
          test_type?: string
        }
        Relationships: []
      }
      guardian_operations: {
        Row: {
          check_count: number | null
          completed_at: string | null
          created_at: string | null
          guardian_wallet_id: string | null
          id: string
          last_checked_at: string | null
          notes: string | null
          operation_error: Json | null
          operation_id: string
          operation_result: Json | null
          operation_status: string | null
          operation_type: string
          related_test_id: string | null
        }
        Insert: {
          check_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          guardian_wallet_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          operation_error?: Json | null
          operation_id: string
          operation_result?: Json | null
          operation_status?: string | null
          operation_type: string
          related_test_id?: string | null
        }
        Update: {
          check_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          guardian_wallet_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          operation_error?: Json | null
          operation_id?: string
          operation_result?: Json | null
          operation_status?: string | null
          operation_type?: string
          related_test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_operations_related_test_id_fkey"
            columns: ["related_test_id"]
            isOneToOne: false
            referencedRelation: "guardian_api_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_wallets: {
        Row: {
          created_by: string | null
          creation_request_id: string | null
          guardian_internal_id: string | null
          guardian_operation_id: string | null
          guardian_wallet_id: string
          id: string
          operation_check_request_id: string | null
          operation_completed_at: string | null
          requested_at: string | null
          test_notes: string | null
          updated_at: string | null
          wallet_addresses: Json | null
          wallet_details_request_id: string | null
          wallet_metadata: Json | null
          wallet_name: string | null
          wallet_retrieved_at: string | null
          wallet_status: string | null
        }
        Insert: {
          created_by?: string | null
          creation_request_id?: string | null
          guardian_internal_id?: string | null
          guardian_operation_id?: string | null
          guardian_wallet_id: string
          id?: string
          operation_check_request_id?: string | null
          operation_completed_at?: string | null
          requested_at?: string | null
          test_notes?: string | null
          updated_at?: string | null
          wallet_addresses?: Json | null
          wallet_details_request_id?: string | null
          wallet_metadata?: Json | null
          wallet_name?: string | null
          wallet_retrieved_at?: string | null
          wallet_status?: string | null
        }
        Update: {
          created_by?: string | null
          creation_request_id?: string | null
          guardian_internal_id?: string | null
          guardian_operation_id?: string | null
          guardian_wallet_id?: string
          id?: string
          operation_check_request_id?: string | null
          operation_completed_at?: string | null
          requested_at?: string | null
          test_notes?: string | null
          updated_at?: string | null
          wallet_addresses?: Json | null
          wallet_details_request_id?: string | null
          wallet_metadata?: Json | null
          wallet_name?: string | null
          wallet_retrieved_at?: string | null
          wallet_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_wallets_creation_request_id_fkey"
            columns: ["creation_request_id"]
            isOneToOne: false
            referencedRelation: "guardian_api_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_wallets_operation_check_request_id_fkey"
            columns: ["operation_check_request_id"]
            isOneToOne: false
            referencedRelation: "guardian_api_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_wallets_wallet_details_request_id_fkey"
            columns: ["wallet_details_request_id"]
            isOneToOne: false
            referencedRelation: "guardian_api_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          last_check: string | null
          response_time: number | null
          service: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_check?: string | null
          response_time?: number | null
          service: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          last_check?: string | null
          response_time?: number | null
          service?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      individual_documents: {
        Row: {
          created_at: string | null
          document_hash: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["individual_document_type"]
          document_url: string | null
          entity_id: string
          entity_type: string
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_hash?: string | null
          document_name: string
          document_type: Database["public"]["Enums"]["individual_document_type"]
          document_url?: string | null
          entity_id: string
          entity_type: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_hash?: string | null
          document_name?: string
          document_type?: Database["public"]["Enums"]["individual_document_type"]
          document_url?: string | null
          entity_id?: string
          entity_type?: string
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      infrastructure_products: {
        Row: {
          age: number | null
          asset_id: string | null
          asset_type: string | null
          condition_score: number | null
          cost_of_replacement: number | null
          created_at: string | null
          design_date: string | null
          id: string
          inspection_date: string | null
          maintenance_backlog: number | null
          mean_time_between_failure: number | null
          performance_metrics: Json | null
          procurement_date: string | null
          project_id: string
          rehabilitation_date: string | null
          replacement_date: string | null
          safety_incidents: number | null
          status: string | null
          target_raise: number | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          asset_id?: string | null
          asset_type?: string | null
          condition_score?: number | null
          cost_of_replacement?: number | null
          created_at?: string | null
          design_date?: string | null
          id?: string
          inspection_date?: string | null
          maintenance_backlog?: number | null
          mean_time_between_failure?: number | null
          performance_metrics?: Json | null
          procurement_date?: string | null
          project_id: string
          rehabilitation_date?: string | null
          replacement_date?: string | null
          safety_incidents?: number | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          asset_id?: string | null
          asset_type?: string | null
          condition_score?: number | null
          cost_of_replacement?: number | null
          created_at?: string | null
          design_date?: string | null
          id?: string
          inspection_date?: string | null
          maintenance_backlog?: number | null
          mean_time_between_failure?: number | null
          performance_metrics?: Json | null
          procurement_date?: string | null
          project_id?: string
          rehabilitation_date?: string | null
          replacement_date?: string | null
          safety_incidents?: number | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_infrastructure_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_approvals: {
        Row: {
          approval_date: string | null
          approval_type: string
          created_at: string | null
          id: string
          investor_id: string
          metadata: Json | null
          rejection_reason: string | null
          required_documents: Json | null
          review_notes: string | null
          reviewer_id: string | null
          status: string
          submission_date: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          approval_type: string
          created_at?: string | null
          id?: string
          investor_id: string
          metadata?: Json | null
          rejection_reason?: string | null
          required_documents?: Json | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          approval_type?: string
          created_at?: string | null
          id?: string
          investor_id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          required_documents?: Json | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: string
          submission_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_approvals_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_documents: {
        Row: {
          created_at: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at: string | null
          file_url: string
          id: string
          investor_id: string
          is_public: boolean
          last_reviewed_at: string | null
          metadata: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          updated_by: string
          uploaded_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url: string
          id?: string
          investor_id: string
          is_public?: boolean
          last_reviewed_at?: string | null
          metadata?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          updated_by: string
          uploaded_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url?: string
          id?: string
          investor_id?: string
          is_public?: boolean
          last_reviewed_at?: string | null
          metadata?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          updated_by?: string
          uploaded_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_investor_documents_investor_id"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_group_members: {
        Row: {
          created_at: string
          group_id: string
          investor_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          investor_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          investor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_group_members_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "investor_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_group_members_investor_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investor_groups: {
        Row: {
          created_at: string | null
          description: string | null
          group: string | null
          id: string
          member_count: number
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group?: string | null
          id?: string
          member_count?: number
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group?: string | null
          id?: string
          member_count?: number
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_groups_investors: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          investor_id: string
          organization_id: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          investor_id: string
          organization_id?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          investor_id?: string
          organization_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_groups_investors_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "investor_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_groups_investors_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      investors: {
        Row: {
          accreditation_expiry_date: string | null
          accreditation_status: string | null
          accreditation_type: string | null
          company: string | null
          compliance_checked_at: string | null
          compliance_checked_by: string | null
          compliance_checked_email: string | null
          created_at: string | null
          email: string
          investment_preferences: Json | null
          investor_id: string
          investor_status: string | null
          kyc_expiry_date: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_compliance_check: string | null
          lastUpdated: string | null
          name: string
          notes: string | null
          onboarding_completed: boolean | null
          organization_id: string | null
          profile_data: Json | null
          profile_id: string | null
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          project_id: string | null
          risk_assessment: Json | null
          tax_id_number: string | null
          tax_residency: string | null
          type: string
          updated_at: string | null
          user_id: string | null
          verification_details: Json | null
          wallet_address: string | null
        }
        Insert: {
          accreditation_expiry_date?: string | null
          accreditation_status?: string | null
          accreditation_type?: string | null
          company?: string | null
          compliance_checked_at?: string | null
          compliance_checked_by?: string | null
          compliance_checked_email?: string | null
          created_at?: string | null
          email: string
          investment_preferences?: Json | null
          investor_id?: string
          investor_status?: string | null
          kyc_expiry_date?: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_compliance_check?: string | null
          lastUpdated?: string | null
          name: string
          notes?: string | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          profile_data?: Json | null
          profile_id?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          project_id?: string | null
          risk_assessment?: Json | null
          tax_id_number?: string | null
          tax_residency?: string | null
          type: string
          updated_at?: string | null
          user_id?: string | null
          verification_details?: Json | null
          wallet_address?: string | null
        }
        Update: {
          accreditation_expiry_date?: string | null
          accreditation_status?: string | null
          accreditation_type?: string | null
          company?: string | null
          compliance_checked_at?: string | null
          compliance_checked_by?: string | null
          compliance_checked_email?: string | null
          created_at?: string | null
          email?: string
          investment_preferences?: Json | null
          investor_id?: string
          investor_status?: string | null
          kyc_expiry_date?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_compliance_check?: string | null
          lastUpdated?: string | null
          name?: string
          notes?: string | null
          onboarding_completed?: boolean | null
          organization_id?: string | null
          profile_data?: Json | null
          profile_id?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          project_id?: string | null
          risk_assessment?: Json | null
          tax_id_number?: string | null
          tax_residency?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
          verification_details?: Json | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_investors_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice: {
        Row: {
          adjustments: number | null
          billed_amount: number | null
          diagnosis_codes: string | null
          due_date: string | null
          factoring_discount_rate: number | null
          factoring_terms: string | null
          invoice_date: string | null
          invoice_id: number
          invoice_number: string | null
          net_amount_due: number | null
          patient_dob: string | null
          patient_name: string | null
          payer_id: number | null
          policy_number: string | null
          pool_id: number | null
          procedure_codes: string | null
          provider_id: number | null
          service_dates: string | null
          upload_timestamp: string | null
        }
        Insert: {
          adjustments?: number | null
          billed_amount?: number | null
          diagnosis_codes?: string | null
          due_date?: string | null
          factoring_discount_rate?: number | null
          factoring_terms?: string | null
          invoice_date?: string | null
          invoice_id?: never
          invoice_number?: string | null
          net_amount_due?: number | null
          patient_dob?: string | null
          patient_name?: string | null
          payer_id?: number | null
          policy_number?: string | null
          pool_id?: number | null
          procedure_codes?: string | null
          provider_id?: number | null
          service_dates?: string | null
          upload_timestamp?: string | null
        }
        Update: {
          adjustments?: number | null
          billed_amount?: number | null
          diagnosis_codes?: string | null
          due_date?: string | null
          factoring_discount_rate?: number | null
          factoring_terms?: string | null
          invoice_date?: string | null
          invoice_id?: never
          invoice_number?: string | null
          net_amount_due?: number | null
          patient_dob?: string | null
          patient_name?: string | null
          payer_id?: number | null
          policy_number?: string | null
          pool_id?: number | null
          procedure_codes?: string | null
          provider_id?: number | null
          service_dates?: string | null
          upload_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payer"
            referencedColumns: ["payer_id"]
          },
          {
            foreignKeyName: "invoice_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pool"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "invoice_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider"
            referencedColumns: ["provider_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issued_date: string | null
          paid: boolean | null
          subscription_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_date?: string | null
          paid?: boolean | null
          subscription_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_date?: string | null
          paid?: boolean | null
          subscription_id?: string | null
        }
        Relationships: []
      }
      issuer_access_roles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          issuer_id: string
          role: Database["public"]["Enums"]["issuer_role"]
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          issuer_id: string
          role: Database["public"]["Enums"]["issuer_role"]
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          issuer_id?: string
          role?: Database["public"]["Enums"]["issuer_role"]
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: []
      }
      issuer_detail_documents: {
        Row: {
          document_name: string
          document_type: string
          document_url: string
          id: string
          is_public: boolean
          metadata: Json | null
          project_id: string
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          document_name: string
          document_type: string
          document_url: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          project_id: string
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuer_detail_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_documents: {
        Row: {
          created_at: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at: string | null
          file_url: string
          id: string
          is_public: boolean
          issuer_id: string
          last_reviewed_at: string | null
          metadata: Json
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          updated_by: string
          uploaded_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url: string
          id?: string
          is_public?: boolean
          issuer_id: string
          last_reviewed_at?: string | null
          metadata?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          updated_by: string
          uploaded_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          expires_at?: string | null
          file_url?: string
          id?: string
          is_public?: boolean
          issuer_id?: string
          last_reviewed_at?: string | null
          metadata?: Json
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          updated_by?: string
          uploaded_at?: string
          version?: number
        }
        Relationships: []
      }
      kyc_screening_logs: {
        Row: {
          created_at: string | null
          id: string
          investor_id: string
          method: string
          new_status: string | null
          notes: string | null
          performed_by: string | null
          previous_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          investor_id: string
          method: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          investor_id?: string
          method?: string
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_screening_logs_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      mfa_policies: {
        Row: {
          applies_to: string[]
          created_at: string | null
          exceptions: string[]
          id: string
          name: string
          required: boolean
        }
        Insert: {
          applies_to: string[]
          created_at?: string | null
          exceptions: string[]
          id?: string
          name: string
          required: boolean
        }
        Update: {
          applies_to?: string[]
          created_at?: string | null
          exceptions?: string[]
          id?: string
          name?: string
          required?: boolean
        }
        Relationships: []
      }
      monitoring_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          recorded_at: string | null
          service: string
          tags: Json | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          recorded_at?: string | null
          service: string
          tags?: Json | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          recorded_at?: string | null
          service?: string
          tags?: Json | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      moonpay_asset_cache: {
        Row: {
          asset_data: Json
          cached_at: string | null
          contract_address: string
          expires_at: string | null
          id: string
          token_id: string
        }
        Insert: {
          asset_data: Json
          cached_at?: string | null
          contract_address: string
          expires_at?: string | null
          id?: string
          token_id: string
        }
        Update: {
          asset_data?: Json
          cached_at?: string | null
          contract_address?: string
          expires_at?: string | null
          id?: string
          token_id?: string
        }
        Relationships: []
      }
      moonpay_compliance_alerts: {
        Row: {
          alert_id: string | null
          alert_type: string
          assigned_to: string | null
          auto_generated: boolean | null
          created_at: string | null
          customer_id: string | null
          description: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          escalated_at: string | null
          escalated_to: string | null
          external_reference: string | null
          id: string
          metadata: Json | null
          recommended_actions: string[] | null
          related_alerts: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          risk_score: number | null
          screening_results: Json | null
          severity: string
          source: string | null
          status: string
          title: string
          transaction_id: string | null
          triggered_at: string | null
          updated_at: string | null
        }
        Insert: {
          alert_id?: string | null
          alert_type: string
          assigned_to?: string | null
          auto_generated?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          description: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          recommended_actions?: string[] | null
          related_alerts?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          risk_score?: number | null
          screening_results?: Json | null
          severity?: string
          source?: string | null
          status?: string
          title: string
          transaction_id?: string | null
          triggered_at?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_id?: string | null
          alert_type?: string
          assigned_to?: string | null
          auto_generated?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          description?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          escalated_at?: string | null
          escalated_to?: string | null
          external_reference?: string | null
          id?: string
          metadata?: Json | null
          recommended_actions?: string[] | null
          related_alerts?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          risk_score?: number | null
          screening_results?: Json | null
          severity?: string
          source?: string | null
          status?: string
          title?: string
          transaction_id?: string | null
          triggered_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moonpay_customers: {
        Row: {
          address: Json | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          external_customer_id: string | null
          first_name: string | null
          id: string
          identity_verification_status: string | null
          kyc_level: string | null
          last_name: string | null
          moonpay_customer_id: string | null
          preferred_payment_methods: string[] | null
          transaction_limits: Json | null
          updated_at: string | null
          verification_documents: Json | null
        }
        Insert: {
          address?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          external_customer_id?: string | null
          first_name?: string | null
          id?: string
          identity_verification_status?: string | null
          kyc_level?: string | null
          last_name?: string | null
          moonpay_customer_id?: string | null
          preferred_payment_methods?: string[] | null
          transaction_limits?: Json | null
          updated_at?: string | null
          verification_documents?: Json | null
        }
        Update: {
          address?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          external_customer_id?: string | null
          first_name?: string | null
          id?: string
          identity_verification_status?: string | null
          kyc_level?: string | null
          last_name?: string | null
          moonpay_customer_id?: string | null
          preferred_payment_methods?: string[] | null
          transaction_limits?: Json | null
          updated_at?: string | null
          verification_documents?: Json | null
        }
        Relationships: []
      }
      moonpay_passes: {
        Row: {
          attributes: Json | null
          contract_address: string
          created_at: string | null
          description: string | null
          external_pass_id: string | null
          id: string
          image: string | null
          metadata_url: string | null
          name: string
          owner_address: string | null
          project_id: string
          status: string
          token_id: string
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          contract_address: string
          created_at?: string | null
          description?: string | null
          external_pass_id?: string | null
          id?: string
          image?: string | null
          metadata_url?: string | null
          name: string
          owner_address?: string | null
          project_id: string
          status: string
          token_id: string
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          contract_address?: string
          created_at?: string | null
          description?: string | null
          external_pass_id?: string | null
          id?: string
          image?: string | null
          metadata_url?: string | null
          name?: string
          owner_address?: string | null
          project_id?: string
          status?: string
          token_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      moonpay_policies: {
        Row: {
          created_at: string | null
          external_policy_id: string | null
          id: string
          is_active: boolean | null
          name: string
          rules: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_policy_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rules: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_policy_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rules?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      moonpay_policy_logs: {
        Row: {
          action_taken: string | null
          action_type: string
          after_state: Json | null
          approved_by: string | null
          auto_generated: boolean | null
          before_state: Json | null
          compliance_impact: string | null
          correlation_id: string | null
          created_at: string | null
          customer_id: string | null
          entity_id: string | null
          entity_type: string | null
          executed_at: string | null
          executed_by: string | null
          execution_status: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          ip_address: unknown | null
          log_id: string | null
          metadata: Json | null
          notes: string | null
          policy_id: string
          policy_name: string
          policy_type: string
          reason: string | null
          requires_action: boolean | null
          retention_period_days: number | null
          rule_conditions: Json | null
          rule_results: Json | null
          session_id: string | null
          severity: string | null
          source: string | null
          transaction_id: string | null
          triggered_by: string | null
          updated_at: string | null
          user_agent: string | null
          violation_details: Json | null
        }
        Insert: {
          action_taken?: string | null
          action_type: string
          after_state?: Json | null
          approved_by?: string | null
          auto_generated?: boolean | null
          before_state?: Json | null
          compliance_impact?: string | null
          correlation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          ip_address?: unknown | null
          log_id?: string | null
          metadata?: Json | null
          notes?: string | null
          policy_id: string
          policy_name: string
          policy_type: string
          reason?: string | null
          requires_action?: boolean | null
          retention_period_days?: number | null
          rule_conditions?: Json | null
          rule_results?: Json | null
          session_id?: string | null
          severity?: string | null
          source?: string | null
          transaction_id?: string | null
          triggered_by?: string | null
          updated_at?: string | null
          user_agent?: string | null
          violation_details?: Json | null
        }
        Update: {
          action_taken?: string | null
          action_type?: string
          after_state?: Json | null
          approved_by?: string | null
          auto_generated?: boolean | null
          before_state?: Json | null
          compliance_impact?: string | null
          correlation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_status?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          ip_address?: unknown | null
          log_id?: string | null
          metadata?: Json | null
          notes?: string | null
          policy_id?: string
          policy_name?: string
          policy_type?: string
          reason?: string | null
          requires_action?: boolean | null
          retention_period_days?: number | null
          rule_conditions?: Json | null
          rule_results?: Json | null
          session_id?: string | null
          severity?: string | null
          source?: string | null
          transaction_id?: string | null
          triggered_by?: string | null
          updated_at?: string | null
          user_agent?: string | null
          violation_details?: Json | null
        }
        Relationships: []
      }
      moonpay_projects: {
        Row: {
          contract_address: string | null
          created_at: string | null
          description: string | null
          external_project_id: string | null
          id: string
          max_supply: number | null
          metadata: Json | null
          name: string
          network: string
          total_supply: number | null
          updated_at: string | null
        }
        Insert: {
          contract_address?: string | null
          created_at?: string | null
          description?: string | null
          external_project_id?: string | null
          id?: string
          max_supply?: number | null
          metadata?: Json | null
          name: string
          network: string
          total_supply?: number | null
          updated_at?: string | null
        }
        Update: {
          contract_address?: string | null
          created_at?: string | null
          description?: string | null
          external_project_id?: string | null
          id?: string
          max_supply?: number | null
          metadata?: Json | null
          name?: string
          network?: string
          total_supply?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moonpay_swap_transactions: {
        Row: {
          base_amount: number
          base_currency: string
          created_at: string | null
          external_transaction_id: string | null
          fees: Json | null
          from_address: string
          id: string
          metadata: Json | null
          quote_amount: number
          quote_currency: string
          quote_id: string
          status: string
          to_address: string
          tx_hash: string | null
          updated_at: string | null
        }
        Insert: {
          base_amount: number
          base_currency: string
          created_at?: string | null
          external_transaction_id?: string | null
          fees?: Json | null
          from_address: string
          id?: string
          metadata?: Json | null
          quote_amount: number
          quote_currency: string
          quote_id: string
          status: string
          to_address: string
          tx_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          base_amount?: number
          base_currency?: string
          created_at?: string | null
          external_transaction_id?: string | null
          fees?: Json | null
          from_address?: string
          id?: string
          metadata?: Json | null
          quote_amount?: number
          quote_currency?: string
          quote_id?: string
          status?: string
          to_address?: string
          tx_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moonpay_transactions: {
        Row: {
          created_at: string | null
          crypto_amount: number | null
          crypto_currency: string
          customer_id: string | null
          external_transaction_id: string | null
          fees: Json | null
          fiat_amount: number
          fiat_currency: string
          id: string
          metadata: Json | null
          payment_method: string | null
          redirect_url: string | null
          status: string
          type: string
          updated_at: string | null
          wallet_address: string | null
          widget_redirect_url: string | null
        }
        Insert: {
          created_at?: string | null
          crypto_amount?: number | null
          crypto_currency: string
          customer_id?: string | null
          external_transaction_id?: string | null
          fees?: Json | null
          fiat_amount: number
          fiat_currency: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          redirect_url?: string | null
          status?: string
          type: string
          updated_at?: string | null
          wallet_address?: string | null
          widget_redirect_url?: string | null
        }
        Update: {
          created_at?: string | null
          crypto_amount?: number | null
          crypto_currency?: string
          customer_id?: string | null
          external_transaction_id?: string | null
          fees?: Json | null
          fiat_amount?: number
          fiat_currency?: string
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          redirect_url?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          wallet_address?: string | null
          widget_redirect_url?: string | null
        }
        Relationships: []
      }
      moonpay_webhook_config: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_attempts_count: number | null
          delivery_settings: Json | null
          description: string | null
          environment: string
          events: string[]
          failed_deliveries_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_delivery_attempt: string | null
          last_failure_reason: string | null
          last_successful_delivery: string | null
          metadata: Json | null
          retry_policy: Json | null
          secret_key: string | null
          status: string
          successful_deliveries_count: number | null
          updated_at: string | null
          url: string
          version: string | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_attempts_count?: number | null
          delivery_settings?: Json | null
          description?: string | null
          environment?: string
          events?: string[]
          failed_deliveries_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_delivery_attempt?: string | null
          last_failure_reason?: string | null
          last_successful_delivery?: string | null
          metadata?: Json | null
          retry_policy?: Json | null
          secret_key?: string | null
          status?: string
          successful_deliveries_count?: number | null
          updated_at?: string | null
          url: string
          version?: string | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_attempts_count?: number | null
          delivery_settings?: Json | null
          description?: string | null
          environment?: string
          events?: string[]
          failed_deliveries_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_delivery_attempt?: string | null
          last_failure_reason?: string | null
          last_successful_delivery?: string | null
          metadata?: Json | null
          retry_policy?: Json | null
          secret_key?: string | null
          status?: string
          successful_deliveries_count?: number | null
          updated_at?: string | null
          url?: string
          version?: string | null
          webhook_id?: string | null
        }
        Relationships: []
      }
      moonpay_webhook_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          last_processing_error: string | null
          processed: boolean | null
          processed_at: string | null
          processing_attempts: number | null
          received_at: string | null
          signature: string
        }
        Insert: {
          event_data: Json
          event_type: string
          id?: string
          last_processing_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          received_at?: string | null
          signature: string
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          last_processing_error?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processing_attempts?: number | null
          received_at?: string | null
          signature?: string
        }
        Relationships: []
      }
      multi_sig_confirmations: {
        Row: {
          confirmed: boolean | null
          created_at: string | null
          id: string
          owner: string
          signature: string
          signer: string | null
          timestamp: string | null
          transaction_id: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          owner: string
          signature: string
          signer?: string | null
          timestamp?: string | null
          transaction_id?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string | null
          id?: string
          owner?: string
          signature?: string
          signer?: string | null
          timestamp?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_sig_confirmations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_sig_transactions: {
        Row: {
          blockchain: string
          blockchain_specific_data: Json | null
          confirmations: number
          created_at: string | null
          data: string
          description: string | null
          destination_wallet_address: string
          executed: boolean
          hash: string
          id: string
          nonce: number
          required: number | null
          to: string | null
          token_address: string | null
          token_symbol: string | null
          updated_at: string | null
          value: string
          wallet_id: string | null
        }
        Insert: {
          blockchain: string
          blockchain_specific_data?: Json | null
          confirmations?: number
          created_at?: string | null
          data?: string
          description?: string | null
          destination_wallet_address: string
          executed?: boolean
          hash: string
          id?: string
          nonce: number
          required?: number | null
          to?: string | null
          token_address?: string | null
          token_symbol?: string | null
          updated_at?: string | null
          value: string
          wallet_id?: string | null
        }
        Update: {
          blockchain?: string
          blockchain_specific_data?: Json | null
          confirmations?: number
          created_at?: string | null
          data?: string
          description?: string | null
          destination_wallet_address?: string
          executed?: boolean
          hash?: string
          id?: string
          nonce?: number
          required?: number | null
          to?: string | null
          token_address?: string | null
          token_symbol?: string | null
          updated_at?: string | null
          value?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_sig_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_sig_wallets: {
        Row: {
          address: string
          block_reason: string | null
          blockchain: string
          blocked_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          owners: string[]
          status: string | null
          threshold: number
          updated_at: string | null
        }
        Insert: {
          address: string
          block_reason?: string | null
          blockchain: string
          blocked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          owners: string[]
          status?: string | null
          threshold: number
          updated_at?: string | null
        }
        Update: {
          address?: string
          block_reason?: string | null
          blockchain?: string
          blocked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          owners?: string[]
          status?: string | null
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      nav_oracle_configs: {
        Row: {
          active: boolean | null
          api_key_encrypted: string | null
          consecutive_failures: number | null
          created_at: string | null
          created_by: string | null
          endpoint_url: string | null
          fund_id: string
          id: string
          last_error: string | null
          last_update: string | null
          max_change_percent: number | null
          max_nav: number | null
          min_nav: number | null
          name: string
          oracle_type: string
          response_path: string | null
          success_rate: number | null
          update_frequency: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          api_key_encrypted?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          endpoint_url?: string | null
          fund_id: string
          id?: string
          last_error?: string | null
          last_update?: string | null
          max_change_percent?: number | null
          max_nav?: number | null
          min_nav?: number | null
          name: string
          oracle_type: string
          response_path?: string | null
          success_rate?: number | null
          update_frequency?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          api_key_encrypted?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          endpoint_url?: string | null
          fund_id?: string
          id?: string
          last_error?: string | null
          last_update?: string | null
          max_change_percent?: number | null
          max_nav?: number | null
          min_nav?: number | null
          name?: string
          oracle_type?: string
          response_path?: string | null
          success_rate?: number | null
          update_frequency?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          advance_notice_days: number[] | null
          created_at: string | null
          disabled: boolean | null
          email_recipients: string[] | null
          email_template: string | null
          event_types: string[] | null
          id: string
          notification_channels: string[] | null
          project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          advance_notice_days?: number[] | null
          created_at?: string | null
          disabled?: boolean | null
          email_recipients?: string[] | null
          email_template?: string | null
          event_types?: string[] | null
          id?: string
          notification_channels?: string[] | null
          project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          advance_notice_days?: number[] | null
          created_at?: string | null
          disabled?: boolean | null
          email_recipients?: string[] | null
          email_template?: string | null
          event_types?: string[] | null
          id?: string
          notification_channels?: string[] | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_required: boolean
          action_url: string | null
          created_at: string
          date: string
          description: string
          id: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_required?: boolean
          action_url?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_required?: boolean
          action_url?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_restrictions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          id: string
          reason: string
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          id?: string
          reason: string
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          id?: string
          reason?: string
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      onchain_claims: {
        Row: {
          data: string | null
          id: string
          identity_id: string | null
          issuer_id: string | null
          signature: string
          status: string
          topic: number
          valid_from: string | null
          valid_to: string | null
          verification_timestamp: string
        }
        Insert: {
          data?: string | null
          id?: string
          identity_id?: string | null
          issuer_id?: string | null
          signature: string
          status: string
          topic: number
          valid_from?: string | null
          valid_to?: string | null
          verification_timestamp?: string
        }
        Update: {
          data?: string | null
          id?: string
          identity_id?: string | null
          issuer_id?: string | null
          signature?: string
          status?: string
          topic?: number
          valid_from?: string | null
          valid_to?: string | null
          verification_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "onchain_claims_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "onchain_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onchain_claims_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "onchain_issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      onchain_identities: {
        Row: {
          blockchain: string
          created_at: string
          id: string
          identity_address: string
          is_active: boolean
          network: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          blockchain: string
          created_at?: string
          id?: string
          identity_address: string
          is_active?: boolean
          network: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          blockchain?: string
          created_at?: string
          id?: string
          identity_address?: string
          is_active?: boolean
          network?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onchain_issuers: {
        Row: {
          blockchain: string
          created_at: string
          id: string
          is_active: boolean
          issuer_address: string
          issuer_name: string
          network: string
          trusted_for_claims: number[]
          updated_at: string
        }
        Insert: {
          blockchain: string
          created_at?: string
          id?: string
          is_active?: boolean
          issuer_address: string
          issuer_name: string
          network: string
          trusted_for_claims?: number[]
          updated_at?: string
        }
        Update: {
          blockchain?: string
          created_at?: string
          id?: string
          is_active?: boolean
          issuer_address?: string
          issuer_name?: string
          network?: string
          trusted_for_claims?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      onchain_verification_history: {
        Row: {
          id: string
          identity_id: string | null
          reason: string | null
          required_claims: number[]
          result: boolean
          verification_timestamp: string
          verification_type: string
        }
        Insert: {
          id?: string
          identity_id?: string | null
          reason?: string | null
          required_claims?: number[]
          result: boolean
          verification_timestamp?: string
          verification_type: string
        }
        Update: {
          id?: string
          identity_id?: string | null
          reason?: string | null
          required_claims?: number[]
          result?: boolean
          verification_timestamp?: string
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "onchain_verification_history_identity_id_fkey"
            columns: ["identity_id"]
            isOneToOne: false
            referencedRelation: "onchain_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          business_type: string | null
          compliance_status: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          entity_structure: string | null
          governance_model: string | null
          id: string
          issuer_type: string | null
          jurisdiction: string | null
          legal_name: string | null
          legal_representatives: Json | null
          name: string
          onboarding_completed: boolean | null
          registration_date: string | null
          registration_number: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          business_type?: string | null
          compliance_status?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_structure?: string | null
          governance_model?: string | null
          id?: string
          issuer_type?: string | null
          jurisdiction?: string | null
          legal_name?: string | null
          legal_representatives?: Json | null
          name: string
          onboarding_completed?: boolean | null
          registration_date?: string | null
          registration_number?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          business_type?: string | null
          compliance_status?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_structure?: string | null
          governance_model?: string | null
          id?: string
          issuer_type?: string | null
          jurisdiction?: string | null
          legal_name?: string | null
          legal_representatives?: Json | null
          name?: string
          onboarding_completed?: boolean | null
          registration_date?: string | null
          registration_number?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payer: {
        Row: {
          name: string | null
          payer_id: number
        }
        Insert: {
          name?: string | null
          payer_id?: never
        }
        Update: {
          name?: string | null
          payer_id?: never
        }
        Relationships: []
      }
      paymaster_operations: {
        Row: {
          created_at: string | null
          gas_sponsored: number
          id: string
          paymaster_address: string
          paymaster_data: string
          policy_applied: Json
          post_op_gas_limit: number
          sponsor_address: string | null
          user_operation_id: string
          verification_gas_limit: number
        }
        Insert: {
          created_at?: string | null
          gas_sponsored: number
          id?: string
          paymaster_address: string
          paymaster_data: string
          policy_applied: Json
          post_op_gas_limit: number
          sponsor_address?: string | null
          user_operation_id: string
          verification_gas_limit: number
        }
        Update: {
          created_at?: string | null
          gas_sponsored?: number
          id?: string
          paymaster_address?: string
          paymaster_data?: string
          policy_applied?: Json
          post_op_gas_limit?: number
          sponsor_address?: string | null
          user_operation_id?: string
          verification_gas_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "paymaster_operations_user_operation_id_fkey"
            columns: ["user_operation_id"]
            isOneToOne: false
            referencedRelation: "user_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      policy_rule_approvers: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          id: string
          policy_rule_id: string
          status: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          id?: string
          policy_rule_id: string
          status?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          id?: string
          policy_rule_id?: string
          status?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_rule_approvers_policy_rule_id_fkey"
            columns: ["policy_rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      policy_rule_approvers_backup: {
        Row: {
          comment: string | null
          created_at: string | null
          created_by: string | null
          policy_rule_id: string | null
          status: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          policy_rule_id?: string | null
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          created_by?: string | null
          policy_rule_id?: string | null
          status?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      policy_template_approvers: {
        Row: {
          created_by: string | null
          status: string | null
          template_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_by?: string | null
          status?: string | null
          template_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_by?: string | null
          status?: string | null
          template_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_template_approvers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "policy_templates"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "policy_template_approvers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          status: string
          template_data: Json
          template_id: string
          template_name: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          status?: string
          template_data: Json
          template_id?: string
          template_name: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          status?: string
          template_data?: Json
          template_id?: string
          template_name?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pool: {
        Row: {
          creation_timestamp: string | null
          pool_id: number
          pool_name: string | null
          pool_type: Database["public"]["Enums"]["pool_type_enum"] | null
        }
        Insert: {
          creation_timestamp?: string | null
          pool_id?: never
          pool_name?: string | null
          pool_type?: Database["public"]["Enums"]["pool_type_enum"] | null
        }
        Update: {
          creation_timestamp?: string | null
          pool_id?: never
          pool_name?: string | null
          pool_type?: Database["public"]["Enums"]["pool_type_enum"] | null
        }
        Relationships: []
      }
      private_debt_products: {
        Row: {
          advisory_service_type: string | null
          collection_period_days: number | null
          company_name: string | null
          compliance_status: string | null
          created_at: string | null
          deal_id: string | null
          deal_size: number | null
          deal_structure_details: string | null
          debtor_credit_quality: string | null
          diversification_metrics: Json | null
          due_diligence_status: string | null
          execution_date: string | null
          exit_strategy_status: string | null
          financial_metrics: Json | null
          id: string
          industry_sector: string | null
          monitoring_frequency: number | null
          opportunity_source: string | null
          outcome: string | null
          portfolio_performance_metrics: Json | null
          project_id: string
          recovery_rate_percentage: number | null
          risk_profile: string | null
          screening_status: string | null
          status: string | null
          target_raise: number | null
          transaction_status: string | null
          updated_at: string | null
          valuation_amount: number | null
        }
        Insert: {
          advisory_service_type?: string | null
          collection_period_days?: number | null
          company_name?: string | null
          compliance_status?: string | null
          created_at?: string | null
          deal_id?: string | null
          deal_size?: number | null
          deal_structure_details?: string | null
          debtor_credit_quality?: string | null
          diversification_metrics?: Json | null
          due_diligence_status?: string | null
          execution_date?: string | null
          exit_strategy_status?: string | null
          financial_metrics?: Json | null
          id?: string
          industry_sector?: string | null
          monitoring_frequency?: number | null
          opportunity_source?: string | null
          outcome?: string | null
          portfolio_performance_metrics?: Json | null
          project_id: string
          recovery_rate_percentage?: number | null
          risk_profile?: string | null
          screening_status?: string | null
          status?: string | null
          target_raise?: number | null
          transaction_status?: string | null
          updated_at?: string | null
          valuation_amount?: number | null
        }
        Update: {
          advisory_service_type?: string | null
          collection_period_days?: number | null
          company_name?: string | null
          compliance_status?: string | null
          created_at?: string | null
          deal_id?: string | null
          deal_size?: number | null
          deal_structure_details?: string | null
          debtor_credit_quality?: string | null
          diversification_metrics?: Json | null
          due_diligence_status?: string | null
          execution_date?: string | null
          exit_strategy_status?: string | null
          financial_metrics?: Json | null
          id?: string
          industry_sector?: string | null
          monitoring_frequency?: number | null
          opportunity_source?: string | null
          outcome?: string | null
          portfolio_performance_metrics?: Json | null
          project_id?: string
          recovery_rate_percentage?: number | null
          risk_profile?: string | null
          screening_status?: string | null
          status?: string | null
          target_raise?: number | null
          transaction_status?: string | null
          updated_at?: string | null
          valuation_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_private_debt_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      private_equity_products: {
        Row: {
          capital_call: number | null
          capital_commitment: number | null
          carried_interest: number | null
          commitment_period: number | null
          created_at: string | null
          distributed_to_paid_in: number | null
          exit_date: string | null
          exit_mechanism: string | null
          financing_round: string | null
          formation_date: string | null
          fund_id: string | null
          fund_name: string | null
          fund_size: number | null
          fund_type: string | null
          fund_vintage_year: string | null
          geographic_focus: string | null
          hurdle_rate: number | null
          id: string
          internal_rate_of_return: number | null
          invested_capital: number | null
          investment_amount: number | null
          investment_date: string | null
          investment_stage: string | null
          investor_type: string | null
          management_fee: number | null
          net_asset_value: number | null
          ownership_percentage: number | null
          portfolio_company_id: string | null
          project_id: string
          residual_value_to_paid_in: number | null
          sector_focus: string | null
          stage_of_development: string | null
          status: string | null
          target_raise: number | null
          updated_at: string | null
          valuation_post_money: number | null
          valuation_pre_money: number | null
        }
        Insert: {
          capital_call?: number | null
          capital_commitment?: number | null
          carried_interest?: number | null
          commitment_period?: number | null
          created_at?: string | null
          distributed_to_paid_in?: number | null
          exit_date?: string | null
          exit_mechanism?: string | null
          financing_round?: string | null
          formation_date?: string | null
          fund_id?: string | null
          fund_name?: string | null
          fund_size?: number | null
          fund_type?: string | null
          fund_vintage_year?: string | null
          geographic_focus?: string | null
          hurdle_rate?: number | null
          id?: string
          internal_rate_of_return?: number | null
          invested_capital?: number | null
          investment_amount?: number | null
          investment_date?: string | null
          investment_stage?: string | null
          investor_type?: string | null
          management_fee?: number | null
          net_asset_value?: number | null
          ownership_percentage?: number | null
          portfolio_company_id?: string | null
          project_id: string
          residual_value_to_paid_in?: number | null
          sector_focus?: string | null
          stage_of_development?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
          valuation_post_money?: number | null
          valuation_pre_money?: number | null
        }
        Update: {
          capital_call?: number | null
          capital_commitment?: number | null
          carried_interest?: number | null
          commitment_period?: number | null
          created_at?: string | null
          distributed_to_paid_in?: number | null
          exit_date?: string | null
          exit_mechanism?: string | null
          financing_round?: string | null
          formation_date?: string | null
          fund_id?: string | null
          fund_name?: string | null
          fund_size?: number | null
          fund_type?: string | null
          fund_vintage_year?: string | null
          geographic_focus?: string | null
          hurdle_rate?: number | null
          id?: string
          internal_rate_of_return?: number | null
          invested_capital?: number | null
          investment_amount?: number | null
          investment_date?: string | null
          investment_stage?: string | null
          investor_type?: string | null
          management_fee?: number | null
          net_asset_value?: number | null
          ownership_percentage?: number | null
          portfolio_company_id?: string | null
          project_id?: string
          residual_value_to_paid_in?: number | null
          sector_focus?: string | null
          stage_of_development?: string | null
          status?: string | null
          target_raise?: number | null
          updated_at?: string | null
          valuation_post_money?: number | null
          valuation_pre_money?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_private_equity_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_lifecycle_events: {
        Row: {
          actor: string | null
          created_at: string | null
          details: string | null
          event_date: string | null
          event_type: string | null
          id: string
          product_id: string
          product_type: string | null
          quantity: number | null
          status: string | null
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          actor?: string | null
          created_at?: string | null
          details?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          product_id: string
          product_type?: string | null
          quantity?: number | null
          status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          actor?: string | null
          created_at?: string | null
          details?: string | null
          event_date?: string | null
          event_type?: string | null
          id?: string
          product_id?: string
          product_type?: string | null
          quantity?: number | null
          status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      production_data: {
        Row: {
          asset_id: string | null
          created_at: string | null
          output_mwh: number
          production_date: string
          production_id: string
          updated_at: string | null
          weather_condition_id: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          output_mwh: number
          production_date: string
          production_id?: string
          updated_at?: string | null
          weather_condition_id?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          output_mwh?: number
          production_date?: string
          production_id?: string
          updated_at?: string | null
          weather_condition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_data_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "production_data_weather_condition_id_fkey"
            columns: ["weather_condition_id"]
            isOneToOne: false
            referencedRelation: "weather_data"
            referencedColumns: ["weather_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_organization_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          project_id: string
          relationship_type: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          project_id: string
          relationship_type: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          project_id?: string
          relationship_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_organization_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_organization_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_wallets: {
        Row: {
          created_at: string
          id: string
          key_vault_id: string | null
          mnemonic: string | null
          private_key: string | null
          project_id: string
          public_key: string
          updated_at: string
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_vault_id?: string | null
          mnemonic?: string | null
          private_key?: string | null
          project_id: string
          public_key: string
          updated_at?: string
          wallet_address: string
          wallet_type: string
        }
        Update: {
          created_at?: string
          id?: string
          key_vault_id?: string | null
          mnemonic?: string | null
          private_key?: string | null
          project_id?: string
          public_key?: string
          updated_at?: string
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_wallets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_valuation: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration: string | null
          estimated_yield_percentage: number | null
          id: string
          investment_status: string
          is_primary: boolean
          jurisdiction: string | null
          legal_entity: string | null
          maturity_date: string | null
          minimum_investment: number | null
          name: string
          organization_id: string | null
          project_type: string | null
          regulatory_exemptions: Json[] | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          target_raise: number | null
          tax_id: string | null
          token_symbol: string | null
          total_notional: number | null
          transaction_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          company_valuation?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration?: string | null
          estimated_yield_percentage?: number | null
          id?: string
          investment_status?: string
          is_primary?: boolean
          jurisdiction?: string | null
          legal_entity?: string | null
          maturity_date?: string | null
          minimum_investment?: number | null
          name: string
          organization_id?: string | null
          project_type?: string | null
          regulatory_exemptions?: Json[] | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          target_raise?: number | null
          tax_id?: string | null
          token_symbol?: string | null
          total_notional?: number | null
          transaction_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company_valuation?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration?: string | null
          estimated_yield_percentage?: number | null
          id?: string
          investment_status?: string
          is_primary?: boolean
          jurisdiction?: string | null
          legal_entity?: string | null
          maturity_date?: string | null
          minimum_investment?: number | null
          name?: string
          organization_id?: string | null
          project_type?: string | null
          regulatory_exemptions?: Json[] | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          target_raise?: number | null
          tax_id?: string | null
          token_symbol?: string | null
          total_notional?: number | null
          transaction_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects_backup: {
        Row: {
          audit_frequency: string | null
          authorized_shares: number | null
          barrier_level: number | null
          blockchain_network: string | null
          business_continuity_plan: boolean | null
          call_date: string | null
          call_price: number | null
          callable_features: boolean | null
          capital_protection_level: number | null
          carbon_offset_potential: number | null
          collateral_type: string | null
          collection_period_days: number | null
          company_valuation: number | null
          complexity_indicator: string | null
          compliance_framework: string[] | null
          consensus_mechanism: string | null
          coupon_frequency: string | null
          created_at: string | null
          credit_rating: string | null
          cross_border_implications: string | null
          currency: string | null
          custodian_name: string | null
          custody_arrangements: string | null
          cybersecurity_framework: string[] | null
          data_processing_basis: string | null
          data_retention_policy: string | null
          debtor_credit_quality: string | null
          depeg_risk_mitigation: string[] | null
          description: string | null
          development_stage: string | null
          dilution_protection: string[] | null
          disaster_recovery_procedures: string | null
          diversification_metrics: Json | null
          dividend_policy: string | null
          duration: Database["public"]["Enums"]["project_duration"] | null
          environmental_certifications: string[] | null
          esg_risk_rating: string | null
          estimated_yield_percentage: number | null
          exit_strategy: string | null
          fee_structure_summary: string | null
          fund_vintage_year: number | null
          gas_fee_structure: string | null
          geographic_focus: string[] | null
          geographic_location: string | null
          governance_structure: string | null
          id: string | null
          investment_stage: string | null
          investment_status: string | null
          is_primary: boolean | null
          jurisdiction: string | null
          legal_entity: string | null
          liquidity_terms: string | null
          maturity_date: string | null
          minimum_investment: number | null
          name: string | null
          oracle_dependencies: string[] | null
          payoff_structure: string | null
          power_purchase_agreements: string | null
          principal_adverse_impacts: string | null
          privacy_policy_link: string | null
          project_capacity_mw: number | null
          project_type: string | null
          property_type: string | null
          recovery_rate_percentage: number | null
          redemption_mechanism: string | null
          regulatory_approvals: string[] | null
          regulatory_permissions: string[] | null
          reserve_management_policy: string | null
          risk_profile: string | null
          sector_focus: string[] | null
          security_collateral: string | null
          share_price: number | null
          smart_contract_address: string | null
          smart_contract_audit_status: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          sustainability_classification: string | null
          target_investor_type: string | null
          target_raise: number | null
          tax_id: string | null
          tax_reporting_obligations: string[] | null
          taxonomy_alignment_percentage: number | null
          third_party_custodian: boolean | null
          token_economics: string | null
          token_symbol: string | null
          total_notional: number | null
          transaction_start_date: string | null
          underlying_assets: string[] | null
          updated_at: string | null
          upgrade_governance: string | null
          voting_rights: string | null
        }
        Insert: {
          audit_frequency?: string | null
          authorized_shares?: number | null
          barrier_level?: number | null
          blockchain_network?: string | null
          business_continuity_plan?: boolean | null
          call_date?: string | null
          call_price?: number | null
          callable_features?: boolean | null
          capital_protection_level?: number | null
          carbon_offset_potential?: number | null
          collateral_type?: string | null
          collection_period_days?: number | null
          company_valuation?: number | null
          complexity_indicator?: string | null
          compliance_framework?: string[] | null
          consensus_mechanism?: string | null
          coupon_frequency?: string | null
          created_at?: string | null
          credit_rating?: string | null
          cross_border_implications?: string | null
          currency?: string | null
          custodian_name?: string | null
          custody_arrangements?: string | null
          cybersecurity_framework?: string[] | null
          data_processing_basis?: string | null
          data_retention_policy?: string | null
          debtor_credit_quality?: string | null
          depeg_risk_mitigation?: string[] | null
          description?: string | null
          development_stage?: string | null
          dilution_protection?: string[] | null
          disaster_recovery_procedures?: string | null
          diversification_metrics?: Json | null
          dividend_policy?: string | null
          duration?: Database["public"]["Enums"]["project_duration"] | null
          environmental_certifications?: string[] | null
          esg_risk_rating?: string | null
          estimated_yield_percentage?: number | null
          exit_strategy?: string | null
          fee_structure_summary?: string | null
          fund_vintage_year?: number | null
          gas_fee_structure?: string | null
          geographic_focus?: string[] | null
          geographic_location?: string | null
          governance_structure?: string | null
          id?: string | null
          investment_stage?: string | null
          investment_status?: string | null
          is_primary?: boolean | null
          jurisdiction?: string | null
          legal_entity?: string | null
          liquidity_terms?: string | null
          maturity_date?: string | null
          minimum_investment?: number | null
          name?: string | null
          oracle_dependencies?: string[] | null
          payoff_structure?: string | null
          power_purchase_agreements?: string | null
          principal_adverse_impacts?: string | null
          privacy_policy_link?: string | null
          project_capacity_mw?: number | null
          project_type?: string | null
          property_type?: string | null
          recovery_rate_percentage?: number | null
          redemption_mechanism?: string | null
          regulatory_approvals?: string[] | null
          regulatory_permissions?: string[] | null
          reserve_management_policy?: string | null
          risk_profile?: string | null
          sector_focus?: string[] | null
          security_collateral?: string | null
          share_price?: number | null
          smart_contract_address?: string | null
          smart_contract_audit_status?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          sustainability_classification?: string | null
          target_investor_type?: string | null
          target_raise?: number | null
          tax_id?: string | null
          tax_reporting_obligations?: string[] | null
          taxonomy_alignment_percentage?: number | null
          third_party_custodian?: boolean | null
          token_economics?: string | null
          token_symbol?: string | null
          total_notional?: number | null
          transaction_start_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
          upgrade_governance?: string | null
          voting_rights?: string | null
        }
        Update: {
          audit_frequency?: string | null
          authorized_shares?: number | null
          barrier_level?: number | null
          blockchain_network?: string | null
          business_continuity_plan?: boolean | null
          call_date?: string | null
          call_price?: number | null
          callable_features?: boolean | null
          capital_protection_level?: number | null
          carbon_offset_potential?: number | null
          collateral_type?: string | null
          collection_period_days?: number | null
          company_valuation?: number | null
          complexity_indicator?: string | null
          compliance_framework?: string[] | null
          consensus_mechanism?: string | null
          coupon_frequency?: string | null
          created_at?: string | null
          credit_rating?: string | null
          cross_border_implications?: string | null
          currency?: string | null
          custodian_name?: string | null
          custody_arrangements?: string | null
          cybersecurity_framework?: string[] | null
          data_processing_basis?: string | null
          data_retention_policy?: string | null
          debtor_credit_quality?: string | null
          depeg_risk_mitigation?: string[] | null
          description?: string | null
          development_stage?: string | null
          dilution_protection?: string[] | null
          disaster_recovery_procedures?: string | null
          diversification_metrics?: Json | null
          dividend_policy?: string | null
          duration?: Database["public"]["Enums"]["project_duration"] | null
          environmental_certifications?: string[] | null
          esg_risk_rating?: string | null
          estimated_yield_percentage?: number | null
          exit_strategy?: string | null
          fee_structure_summary?: string | null
          fund_vintage_year?: number | null
          gas_fee_structure?: string | null
          geographic_focus?: string[] | null
          geographic_location?: string | null
          governance_structure?: string | null
          id?: string | null
          investment_stage?: string | null
          investment_status?: string | null
          is_primary?: boolean | null
          jurisdiction?: string | null
          legal_entity?: string | null
          liquidity_terms?: string | null
          maturity_date?: string | null
          minimum_investment?: number | null
          name?: string | null
          oracle_dependencies?: string[] | null
          payoff_structure?: string | null
          power_purchase_agreements?: string | null
          principal_adverse_impacts?: string | null
          privacy_policy_link?: string | null
          project_capacity_mw?: number | null
          project_type?: string | null
          property_type?: string | null
          recovery_rate_percentage?: number | null
          redemption_mechanism?: string | null
          regulatory_approvals?: string[] | null
          regulatory_permissions?: string[] | null
          reserve_management_policy?: string | null
          risk_profile?: string | null
          sector_focus?: string[] | null
          security_collateral?: string | null
          share_price?: number | null
          smart_contract_address?: string | null
          smart_contract_audit_status?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          sustainability_classification?: string | null
          target_investor_type?: string | null
          target_raise?: number | null
          tax_id?: string | null
          tax_reporting_obligations?: string[] | null
          taxonomy_alignment_percentage?: number | null
          third_party_custodian?: boolean | null
          token_economics?: string | null
          token_symbol?: string | null
          total_notional?: number | null
          transaction_start_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
          upgrade_governance?: string | null
          voting_rights?: string | null
        }
        Relationships: []
      }
      provider: {
        Row: {
          address: string | null
          name: string | null
          provider_id: number
        }
        Insert: {
          address?: string | null
          name?: string | null
          provider_id?: never
        }
        Update: {
          address?: string | null
          name?: string | null
          provider_id?: never
        }
        Relationships: []
      }
      quantitative_investment_strategies_products: {
        Row: {
          adjustment_history: Json | null
          backtest_history: Json | null
          benchmark: string | null
          created_at: string | null
          currency: string | null
          data_sources: string[] | null
          id: string
          inception_date: string | null
          machine_learning_flags: boolean | null
          parameters: Json | null
          performance_attribution: Json | null
          project_id: string
          risk_metrics: number | null
          status: string | null
          strategy_id: string | null
          strategy_name: string | null
          strategy_type: string | null
          target_raise: number | null
          termination_date: string | null
          underlying_assets: string[] | null
          updated_at: string | null
        }
        Insert: {
          adjustment_history?: Json | null
          backtest_history?: Json | null
          benchmark?: string | null
          created_at?: string | null
          currency?: string | null
          data_sources?: string[] | null
          id?: string
          inception_date?: string | null
          machine_learning_flags?: boolean | null
          parameters?: Json | null
          performance_attribution?: Json | null
          project_id: string
          risk_metrics?: number | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          strategy_type?: string | null
          target_raise?: number | null
          termination_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
        }
        Update: {
          adjustment_history?: Json | null
          backtest_history?: Json | null
          benchmark?: string | null
          created_at?: string | null
          currency?: string | null
          data_sources?: string[] | null
          id?: string
          inception_date?: string | null
          machine_learning_flags?: boolean | null
          parameters?: Json | null
          performance_attribution?: Json | null
          project_id?: string
          risk_metrics?: number | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          strategy_type?: string | null
          target_raise?: number | null
          termination_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quantitative_investment_strategies_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      quantitative_strategies: {
        Row: {
          adjustment_history: Json | null
          backtest_history: Json | null
          benchmark: string | null
          created_at: string | null
          currency: string | null
          data_sources: string[] | null
          id: string
          inception_date: string | null
          machine_learning_flags: boolean | null
          parameters: Json | null
          performance_attribution: Json | null
          project_id: string
          risk_metrics: Json | null
          status: string | null
          strategy_id: string | null
          strategy_name: string | null
          strategy_type: string | null
          target_raise: number | null
          termination_date: string | null
          underlying_assets: string[] | null
          updated_at: string | null
        }
        Insert: {
          adjustment_history?: Json | null
          backtest_history?: Json | null
          benchmark?: string | null
          created_at?: string | null
          currency?: string | null
          data_sources?: string[] | null
          id?: string
          inception_date?: string | null
          machine_learning_flags?: boolean | null
          parameters?: Json | null
          performance_attribution?: Json | null
          project_id: string
          risk_metrics?: Json | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          strategy_type?: string | null
          target_raise?: number | null
          termination_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
        }
        Update: {
          adjustment_history?: Json | null
          backtest_history?: Json | null
          benchmark?: string | null
          created_at?: string | null
          currency?: string | null
          data_sources?: string[] | null
          id?: string
          inception_date?: string | null
          machine_learning_flags?: boolean | null
          parameters?: Json | null
          performance_attribution?: Json | null
          project_id?: string
          risk_metrics?: Json | null
          status?: string | null
          strategy_id?: string | null
          strategy_name?: string | null
          strategy_type?: string | null
          target_raise?: number | null
          termination_date?: string | null
          underlying_assets?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_quantitative_strategies_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ramp_network_config: {
        Row: {
          api_key_encrypted: string
          configuration: Json | null
          created_at: string
          created_by: string | null
          enabled_flows: string[]
          environment: string
          host_app_name: string
          host_logo_url: string
          id: string
          is_active: boolean
          organization_id: string | null
          updated_at: string
          webhook_secret_encrypted: string | null
        }
        Insert: {
          api_key_encrypted: string
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          enabled_flows?: string[]
          environment?: string
          host_app_name: string
          host_logo_url: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
        }
        Update: {
          api_key_encrypted?: string
          configuration?: Json | null
          created_at?: string
          created_by?: string | null
          enabled_flows?: string[]
          environment?: string
          host_app_name?: string
          host_logo_url?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
        }
        Relationships: []
      }
      ramp_supported_assets: {
        Row: {
          address: string | null
          chain: string
          created_at: string
          currency_code: string
          decimals: number
          enabled: boolean
          flow_type: string
          hidden: boolean
          id: string
          last_updated: string
          logo_url: string | null
          max_purchase_amount: number | null
          min_purchase_amount: number | null
          min_purchase_crypto_amount: string | null
          name: string
          network_fee: number | null
          price_data: Json | null
          symbol: string
          type: string
        }
        Insert: {
          address?: string | null
          chain: string
          created_at?: string
          currency_code?: string
          decimals: number
          enabled?: boolean
          flow_type: string
          hidden?: boolean
          id?: string
          last_updated?: string
          logo_url?: string | null
          max_purchase_amount?: number | null
          min_purchase_amount?: number | null
          min_purchase_crypto_amount?: string | null
          name: string
          network_fee?: number | null
          price_data?: Json | null
          symbol: string
          type: string
        }
        Update: {
          address?: string | null
          chain?: string
          created_at?: string
          currency_code?: string
          decimals?: number
          enabled?: boolean
          flow_type?: string
          hidden?: boolean
          id?: string
          last_updated?: string
          logo_url?: string | null
          max_purchase_amount?: number | null
          min_purchase_amount?: number | null
          min_purchase_crypto_amount?: string | null
          name?: string
          network_fee?: number | null
          price_data?: Json | null
          symbol?: string
          type?: string
        }
        Relationships: []
      }
      ramp_transaction_events: {
        Row: {
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
          ramp_event_id: string | null
          session_id: string | null
          timestamp: string
          transaction_id: string
          user_agent: string | null
        }
        Insert: {
          event_data: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          ramp_event_id?: string | null
          session_id?: string | null
          timestamp?: string
          transaction_id: string
          user_agent?: string | null
        }
        Update: {
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          ramp_event_id?: string | null
          session_id?: string | null
          timestamp?: string
          transaction_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ramp_transaction_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "fiat_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ramp_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          flow_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          flow_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          flow_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      real_estate_products: {
        Row: {
          acquisition_date: string | null
          area_type: string | null
          asset_number: string | null
          billing_frequency: string | null
          borrowing_rate: number | null
          building: string | null
          created_at: string | null
          development_stage: string | null
          disposition_date: string | null
          ending_date: string | null
          environmental_certifications: string[] | null
          geographic_location: string | null
          gross_amount: number | null
          id: string
          lease_begin_date: string | null
          lease_classification: string | null
          lease_end_date: string | null
          lease_manager: string | null
          lease_number: string | null
          project_id: string
          property_address: string | null
          property_id: string | null
          property_name: string | null
          property_type: string | null
          starting_date: string | null
          status: string | null
          target_raise: number | null
          taxable_amount: number | null
          tenant: string | null
          unit: string | null
          units: number | null
          updated_at: string | null
        }
        Insert: {
          acquisition_date?: string | null
          area_type?: string | null
          asset_number?: string | null
          billing_frequency?: string | null
          borrowing_rate?: number | null
          building?: string | null
          created_at?: string | null
          development_stage?: string | null
          disposition_date?: string | null
          ending_date?: string | null
          environmental_certifications?: string[] | null
          geographic_location?: string | null
          gross_amount?: number | null
          id?: string
          lease_begin_date?: string | null
          lease_classification?: string | null
          lease_end_date?: string | null
          lease_manager?: string | null
          lease_number?: string | null
          project_id: string
          property_address?: string | null
          property_id?: string | null
          property_name?: string | null
          property_type?: string | null
          starting_date?: string | null
          status?: string | null
          target_raise?: number | null
          taxable_amount?: number | null
          tenant?: string | null
          unit?: string | null
          units?: number | null
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string | null
          area_type?: string | null
          asset_number?: string | null
          billing_frequency?: string | null
          borrowing_rate?: number | null
          building?: string | null
          created_at?: string | null
          development_stage?: string | null
          disposition_date?: string | null
          ending_date?: string | null
          environmental_certifications?: string[] | null
          geographic_location?: string | null
          gross_amount?: number | null
          id?: string
          lease_begin_date?: string | null
          lease_classification?: string | null
          lease_end_date?: string | null
          lease_manager?: string | null
          lease_number?: string | null
          project_id?: string
          property_address?: string | null
          property_id?: string | null
          property_name?: string | null
          property_type?: string | null
          starting_date?: string | null
          status?: string | null
          target_raise?: number | null
          taxable_amount?: number | null
          tenant?: string | null
          unit?: string | null
          units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_real_estate_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rec_price_cache: {
        Row: {
          cache_id: string
          created_at: string | null
          date: string
          market_type: string
          price: number
          region: string
          source: string
          updated_at: string | null
        }
        Insert: {
          cache_id?: string
          created_at?: string | null
          date: string
          market_type: string
          price: number
          region: string
          source: string
          updated_at?: string | null
        }
        Update: {
          cache_id?: string
          created_at?: string | null
          date?: string
          market_type?: string
          price?: number
          region?: string
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      redemption_analytics: {
        Row: {
          average_processing_time: unknown | null
          average_request_size: number | null
          calculated_at: string | null
          eligible_investors: number | null
          id: string
          median_request_size: number | null
          participating_investors: number | null
          pro_rata_factor_applied: number | null
          redemption_window_id: string
          total_approved_tokens: number | null
          total_eligible_tokens: number | null
          total_fees_collected: number | null
          total_processed_tokens: number | null
          total_requested_tokens: number | null
        }
        Insert: {
          average_processing_time?: unknown | null
          average_request_size?: number | null
          calculated_at?: string | null
          eligible_investors?: number | null
          id?: string
          median_request_size?: number | null
          participating_investors?: number | null
          pro_rata_factor_applied?: number | null
          redemption_window_id: string
          total_approved_tokens?: number | null
          total_eligible_tokens?: number | null
          total_fees_collected?: number | null
          total_processed_tokens?: number | null
          total_requested_tokens?: number | null
        }
        Update: {
          average_processing_time?: unknown | null
          average_request_size?: number | null
          calculated_at?: string | null
          eligible_investors?: number | null
          id?: string
          median_request_size?: number | null
          participating_investors?: number | null
          pro_rata_factor_applied?: number | null
          redemption_window_id?: string
          total_approved_tokens?: number | null
          total_eligible_tokens?: number | null
          total_fees_collected?: number | null
          total_processed_tokens?: number | null
          total_requested_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_analytics_window"
            columns: ["redemption_window_id"]
            isOneToOne: false
            referencedRelation: "redemption_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_approvers: {
        Row: {
          approved: boolean
          approved_at: string | null
          approver_id: string
          avatar_url: string | null
          comments: string | null
          created_at: string
          decision_date: string | null
          id: string
          name: string
          redemption_id: string
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approver_id: string
          avatar_url?: string | null
          comments?: string | null
          created_at?: string
          decision_date?: string | null
          id?: string
          name: string
          redemption_id: string
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approver_id?: string
          avatar_url?: string | null
          comments?: string | null
          created_at?: string
          decision_date?: string | null
          id?: string
          name?: string
          redemption_id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redemption_approvers_redemption_id"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_approvers_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_notifications: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          read_at: string | null
          redemption_window_id: string
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          read_at?: string | null
          redemption_window_id: string
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          read_at?: string | null
          redemption_window_id?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_window"
            columns: ["redemption_window_id"]
            isOneToOne: false
            referencedRelation: "redemption_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_requests: {
        Row: {
          actual_processing_time: unknown | null
          approved_by: string | null
          business_rules_version: string | null
          compliance_status: string | null
          conversion_rate: number
          created_at: string
          destination_wallet_address: string
          distribution_date: string | null
          distribution_id: string | null
          distribution_ids: string[] | null
          distribution_tx_hash: string | null
          eligibility_check_id: string | null
          estimated_processing_time: unknown | null
          id: string
          investor_count: number | null
          investor_id: string | null
          investor_name: string | null
          is_bulk_redemption: boolean | null
          net_redemption_amount: number | null
          organization_id: string | null
          priority_level: number | null
          pro_rata_adjustment: number | null
          processed_by: string | null
          project_id: string | null
          redemption_fee: number | null
          redemption_type: string
          redemption_window_id: string | null
          rejected_by: string | null
          rejection_reason: string | null
          rejection_timestamp: string | null
          requested_by: string | null
          required_approvals: number
          source_wallet_address: string
          status: string
          token_amount: number
          token_symbol: string | null
          token_type: string
          updated_at: string
          usdc_amount: number | null
          validation_results: Json | null
          window_id: string | null
        }
        Insert: {
          actual_processing_time?: unknown | null
          approved_by?: string | null
          business_rules_version?: string | null
          compliance_status?: string | null
          conversion_rate: number
          created_at?: string
          destination_wallet_address: string
          distribution_date?: string | null
          distribution_id?: string | null
          distribution_ids?: string[] | null
          distribution_tx_hash?: string | null
          eligibility_check_id?: string | null
          estimated_processing_time?: unknown | null
          id?: string
          investor_count?: number | null
          investor_id?: string | null
          investor_name?: string | null
          is_bulk_redemption?: boolean | null
          net_redemption_amount?: number | null
          organization_id?: string | null
          priority_level?: number | null
          pro_rata_adjustment?: number | null
          processed_by?: string | null
          project_id?: string | null
          redemption_fee?: number | null
          redemption_type: string
          redemption_window_id?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          requested_by?: string | null
          required_approvals?: number
          source_wallet_address: string
          status: string
          token_amount: number
          token_symbol?: string | null
          token_type: string
          updated_at?: string
          usdc_amount?: number | null
          validation_results?: Json | null
          window_id?: string | null
        }
        Update: {
          actual_processing_time?: unknown | null
          approved_by?: string | null
          business_rules_version?: string | null
          compliance_status?: string | null
          conversion_rate?: number
          created_at?: string
          destination_wallet_address?: string
          distribution_date?: string | null
          distribution_id?: string | null
          distribution_ids?: string[] | null
          distribution_tx_hash?: string | null
          eligibility_check_id?: string | null
          estimated_processing_time?: unknown | null
          id?: string
          investor_count?: number | null
          investor_id?: string | null
          investor_name?: string | null
          is_bulk_redemption?: boolean | null
          net_redemption_amount?: number | null
          organization_id?: string | null
          priority_level?: number | null
          pro_rata_adjustment?: number | null
          processed_by?: string | null
          project_id?: string | null
          redemption_fee?: number | null
          redemption_type?: string
          redemption_window_id?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          rejection_timestamp?: string | null
          requested_by?: string | null
          required_approvals?: number
          source_wallet_address?: string
          status?: string
          token_amount?: number
          token_symbol?: string | null
          token_type?: string
          updated_at?: string
          usdc_amount?: number | null
          validation_results?: Json | null
          window_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redemption_requests_window"
            columns: ["redemption_window_id"]
            isOneToOne: false
            referencedRelation: "redemption_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_rules: {
        Row: {
          allow_any_time_redemption: boolean | null
          allow_continuous_redemption: boolean | null
          approval_config_id: string | null
          created_at: string | null
          enable_admin_override: boolean | null
          enable_pro_rata_distribution: boolean | null
          id: string
          immediate_execution: boolean | null
          is_redemption_open: boolean | null
          lock_tokens_on_request: boolean | null
          lock_up_period: number | null
          max_redemption_percentage: number | null
          notify_investors: boolean | null
          open_after_date: string | null
          organization_id: string | null
          product_id: string | null
          product_type: string | null
          project_id: string | null
          queue_unprocessed_requests: boolean | null
          redemption_eligibility_rules: Json | null
          redemption_type: string
          redemption_window_id: string | null
          repurchase_frequency: string | null
          require_multi_sig_approval: boolean | null
          required_approvers: number | null
          rule_id: string | null
          settlement_method: string | null
          submission_window_days: number | null
          target_raise_amount: number | null
          total_approvers: number | null
          updated_at: string | null
          use_latest_nav: boolean | null
          use_window_nav: boolean | null
        }
        Insert: {
          allow_any_time_redemption?: boolean | null
          allow_continuous_redemption?: boolean | null
          approval_config_id?: string | null
          created_at?: string | null
          enable_admin_override?: boolean | null
          enable_pro_rata_distribution?: boolean | null
          id?: string
          immediate_execution?: boolean | null
          is_redemption_open?: boolean | null
          lock_tokens_on_request?: boolean | null
          lock_up_period?: number | null
          max_redemption_percentage?: number | null
          notify_investors?: boolean | null
          open_after_date?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_type?: string | null
          project_id?: string | null
          queue_unprocessed_requests?: boolean | null
          redemption_eligibility_rules?: Json | null
          redemption_type: string
          redemption_window_id?: string | null
          repurchase_frequency?: string | null
          require_multi_sig_approval?: boolean | null
          required_approvers?: number | null
          rule_id?: string | null
          settlement_method?: string | null
          submission_window_days?: number | null
          target_raise_amount?: number | null
          total_approvers?: number | null
          updated_at?: string | null
          use_latest_nav?: boolean | null
          use_window_nav?: boolean | null
        }
        Update: {
          allow_any_time_redemption?: boolean | null
          allow_continuous_redemption?: boolean | null
          approval_config_id?: string | null
          created_at?: string | null
          enable_admin_override?: boolean | null
          enable_pro_rata_distribution?: boolean | null
          id?: string
          immediate_execution?: boolean | null
          is_redemption_open?: boolean | null
          lock_tokens_on_request?: boolean | null
          lock_up_period?: number | null
          max_redemption_percentage?: number | null
          notify_investors?: boolean | null
          open_after_date?: string | null
          organization_id?: string | null
          product_id?: string | null
          product_type?: string | null
          project_id?: string | null
          queue_unprocessed_requests?: boolean | null
          redemption_eligibility_rules?: Json | null
          redemption_type?: string
          redemption_window_id?: string | null
          repurchase_frequency?: string | null
          require_multi_sig_approval?: boolean | null
          required_approvers?: number | null
          rule_id?: string | null
          settlement_method?: string | null
          submission_window_days?: number | null
          target_raise_amount?: number | null
          total_approvers?: number | null
          updated_at?: string | null
          use_latest_nav?: boolean | null
          use_window_nav?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redemption_rules_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      redemption_settlements: {
        Row: {
          actual_completion: string | null
          burn_confirmed_at: string | null
          burn_gas_price: number | null
          burn_gas_used: number | null
          burn_status: string | null
          burn_transaction_hash: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          estimated_completion: string | null
          exchange_rate: number | null
          gas_estimate: number | null
          id: string
          last_retry_at: string | null
          nav_used: number | null
          organization_id: string | null
          project_id: string | null
          redemption_request_id: string
          retry_count: number | null
          settlement_fee: number | null
          settlement_type: string
          status: string
          token_amount: number
          token_contract_address: string
          transfer_amount: number
          transfer_confirmed_at: string | null
          transfer_currency: string
          transfer_gas_price: number | null
          transfer_gas_used: number | null
          transfer_status: string | null
          transfer_to_address: string
          transfer_transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          actual_completion?: string | null
          burn_confirmed_at?: string | null
          burn_gas_price?: number | null
          burn_gas_used?: number | null
          burn_status?: string | null
          burn_transaction_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          exchange_rate?: number | null
          gas_estimate?: number | null
          id?: string
          last_retry_at?: string | null
          nav_used?: number | null
          organization_id?: string | null
          project_id?: string | null
          redemption_request_id: string
          retry_count?: number | null
          settlement_fee?: number | null
          settlement_type: string
          status?: string
          token_amount: number
          token_contract_address: string
          transfer_amount: number
          transfer_confirmed_at?: string | null
          transfer_currency?: string
          transfer_gas_price?: number | null
          transfer_gas_used?: number | null
          transfer_status?: string | null
          transfer_to_address: string
          transfer_transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_completion?: string | null
          burn_confirmed_at?: string | null
          burn_gas_price?: number | null
          burn_gas_used?: number | null
          burn_status?: string | null
          burn_transaction_hash?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          exchange_rate?: number | null
          gas_estimate?: number | null
          id?: string
          last_retry_at?: string | null
          nav_used?: number | null
          organization_id?: string | null
          project_id?: string | null
          redemption_request_id?: string
          retry_count?: number | null
          settlement_fee?: number | null
          settlement_type?: string
          status?: string
          token_amount?: number
          token_contract_address?: string
          transfer_amount?: number
          transfer_confirmed_at?: string | null
          transfer_currency?: string
          transfer_gas_price?: number | null
          transfer_gas_used?: number | null
          transfer_status?: string | null
          transfer_to_address?: string
          transfer_transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemption_settlements_redemption_request_id_fkey"
            columns: ["redemption_request_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_window_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_auto_process: boolean | null
          default_enable_pro_rata_distribution: boolean | null
          default_nav_source: string | null
          description: string | null
          id: string
          is_active: boolean | null
          lockup_days: number | null
          name: string
          organization_id: string | null
          processing_date_mode: string
          processing_offset_days: number
          project_id: string | null
          submission_date_mode: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_auto_process?: boolean | null
          default_enable_pro_rata_distribution?: boolean | null
          default_nav_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lockup_days?: number | null
          name: string
          organization_id?: string | null
          processing_date_mode?: string
          processing_offset_days?: number
          project_id?: string | null
          submission_date_mode?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_auto_process?: boolean | null
          default_enable_pro_rata_distribution?: boolean | null
          default_nav_source?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lockup_days?: number | null
          name?: string
          organization_id?: string | null
          processing_date_mode?: string
          processing_offset_days?: number
          project_id?: string | null
          submission_date_mode?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_templates_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_windows: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_requests: number | null
          approved_value: number | null
          auto_process: boolean | null
          created_at: string | null
          created_by: string | null
          current_requests: number | null
          early_redemption_penalty: number | null
          enable_pro_rata_distribution: boolean | null
          end_date: string
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_modified_by: string | null
          last_status_change_at: string | null
          lockup_days: number | null
          max_redemption_amount: number | null
          min_redemption_amount: number | null
          name: string | null
          nav: number | null
          nav_date: string | null
          nav_source: string | null
          notes: string | null
          organization_id: string | null
          pro_rata_factor: number | null
          processed_at: string | null
          processed_by: string | null
          processing_date_mode: Database["public"]["Enums"]["processing_date_mode_enum"]
          processing_fee_percentage: number | null
          processing_offset_days: number
          processing_status: string | null
          project_id: string | null
          queued_requests: number | null
          queued_value: number | null
          rejected_requests: number | null
          rejected_value: number | null
          start_date: string
          status: string
          submission_date_mode: Database["public"]["Enums"]["submission_date_mode_enum"]
          submission_end_date: string
          submission_start_date: string
          submission_status: string | null
          total_request_value: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_requests?: number | null
          approved_value?: number | null
          auto_process?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_requests?: number | null
          early_redemption_penalty?: number | null
          enable_pro_rata_distribution?: boolean | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          last_status_change_at?: string | null
          lockup_days?: number | null
          max_redemption_amount?: number | null
          min_redemption_amount?: number | null
          name?: string | null
          nav?: number | null
          nav_date?: string | null
          nav_source?: string | null
          notes?: string | null
          organization_id?: string | null
          pro_rata_factor?: number | null
          processed_at?: string | null
          processed_by?: string | null
          processing_date_mode?: Database["public"]["Enums"]["processing_date_mode_enum"]
          processing_fee_percentage?: number | null
          processing_offset_days?: number
          processing_status?: string | null
          project_id?: string | null
          queued_requests?: number | null
          queued_value?: number | null
          rejected_requests?: number | null
          rejected_value?: number | null
          start_date: string
          status?: string
          submission_date_mode?: Database["public"]["Enums"]["submission_date_mode_enum"]
          submission_end_date: string
          submission_start_date: string
          submission_status?: string | null
          total_request_value?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_requests?: number | null
          approved_value?: number | null
          auto_process?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_requests?: number | null
          early_redemption_penalty?: number | null
          enable_pro_rata_distribution?: boolean | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_modified_by?: string | null
          last_status_change_at?: string | null
          lockup_days?: number | null
          max_redemption_amount?: number | null
          min_redemption_amount?: number | null
          name?: string | null
          nav?: number | null
          nav_date?: string | null
          nav_source?: string | null
          notes?: string | null
          organization_id?: string | null
          pro_rata_factor?: number | null
          processed_at?: string | null
          processed_by?: string | null
          processing_date_mode?: Database["public"]["Enums"]["processing_date_mode_enum"]
          processing_fee_percentage?: number | null
          processing_offset_days?: number
          processing_status?: string | null
          project_id?: string | null
          queued_requests?: number | null
          queued_value?: number | null
          rejected_requests?: number | null
          rejected_value?: number | null
          start_date?: string
          status?: string
          submission_date_mode?: Database["public"]["Enums"]["submission_date_mode_enum"]
          submission_end_date?: string
          submission_start_date?: string
          submission_status?: string | null
          total_request_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redemption_windows_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_equivalence_mapping: {
        Row: {
          created_at: string | null
          equivalence_type: string
          equivalent_jurisdiction: string
          expiry_date: string | null
          home_jurisdiction: string
          id: string
          mutual_recognition: boolean | null
          notes: string | null
          passport_rights: boolean | null
          recognition_date: string
          regulatory_framework: string
          simplified_procedures: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equivalence_type: string
          equivalent_jurisdiction: string
          expiry_date?: string | null
          home_jurisdiction: string
          id?: string
          mutual_recognition?: boolean | null
          notes?: string | null
          passport_rights?: boolean | null
          recognition_date: string
          regulatory_framework: string
          simplified_procedures?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equivalence_type?: string
          equivalent_jurisdiction?: string
          expiry_date?: string | null
          home_jurisdiction?: string
          id?: string
          mutual_recognition?: boolean | null
          notes?: string | null
          passport_rights?: boolean | null
          recognition_date?: string
          regulatory_framework?: string
          simplified_procedures?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_equivalence_mapping_equivalent_jurisdiction_fkey"
            columns: ["equivalent_jurisdiction"]
            isOneToOne: false
            referencedRelation: "geographic_jurisdictions"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "regulatory_equivalence_mapping_equivalent_jurisdiction_fkey"
            columns: ["equivalent_jurisdiction"]
            isOneToOne: false
            referencedRelation: "token_geographic_restrictions_view"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "regulatory_equivalence_mapping_home_jurisdiction_fkey"
            columns: ["home_jurisdiction"]
            isOneToOne: false
            referencedRelation: "geographic_jurisdictions"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "regulatory_equivalence_mapping_home_jurisdiction_fkey"
            columns: ["home_jurisdiction"]
            isOneToOne: false
            referencedRelation: "token_geographic_restrictions_view"
            referencedColumns: ["country_code"]
          },
        ]
      }
      regulatory_exemptions: {
        Row: {
          country: string
          created_at: string
          exemption_type: string
          explanation: string
          id: string
          region: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          exemption_type: string
          explanation: string
          id?: string
          region: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          exemption_type?: string
          explanation?: string
          id?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewable_energy_credits: {
        Row: {
          asset_id: string | null
          certification: string | null
          created_at: string | null
          incentive_id: string | null
          market_type: string
          price_per_rec: number
          project_id: string | null
          quantity: number
          rec_id: string
          receivable_id: string | null
          status: string
          total_value: number
          updated_at: string | null
          vintage_year: number
        }
        Insert: {
          asset_id?: string | null
          certification?: string | null
          created_at?: string | null
          incentive_id?: string | null
          market_type: string
          price_per_rec: number
          project_id?: string | null
          quantity: number
          rec_id?: string
          receivable_id?: string | null
          status: string
          total_value: number
          updated_at?: string | null
          vintage_year: number
        }
        Update: {
          asset_id?: string | null
          certification?: string | null
          created_at?: string | null
          incentive_id?: string | null
          market_type?: string
          price_per_rec?: number
          project_id?: string | null
          quantity?: number
          rec_id?: string
          receivable_id?: string | null
          status?: string
          total_value?: number
          updated_at?: string | null
          vintage_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_renewable_energy_credits_incentive_id"
            columns: ["incentive_id"]
            isOneToOne: false
            referencedRelation: "climate_incentives"
            referencedColumns: ["incentive_id"]
          },
          {
            foreignKeyName: "fk_renewable_energy_credits_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewable_energy_credits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "energy_assets"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "renewable_energy_credits_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "climate_receivables"
            referencedColumns: ["receivable_id"]
          },
        ]
      }
      restriction_validation_logs: {
        Row: {
          failed_rules: Json | null
          id: string
          transaction_hash: string | null
          validated_at: string | null
          validation_result: boolean
          wallet_id: string
          warnings: Json | null
        }
        Insert: {
          failed_rules?: Json | null
          id?: string
          transaction_hash?: string | null
          validated_at?: string | null
          validation_result: boolean
          wallet_id: string
          warnings?: Json | null
        }
        Update: {
          failed_rules?: Json | null
          id?: string
          transaction_hash?: string | null
          validated_at?: string | null
          validation_result?: boolean
          wallet_id?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "restriction_validation_logs_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      ripple_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          destination_tag: number | null
          exchange_rate: number | null
          fee: number | null
          from_account: string
          from_country: string | null
          hash: string
          id: string
          ledger_index: number | null
          memo: string | null
          payment_type: string | null
          sequence_number: number | null
          source_tag: number | null
          status: string
          to_account: string
          to_country: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          destination_tag?: number | null
          exchange_rate?: number | null
          fee?: number | null
          from_account: string
          from_country?: string | null
          hash: string
          id?: string
          ledger_index?: number | null
          memo?: string | null
          payment_type?: string | null
          sequence_number?: number | null
          source_tag?: number | null
          status?: string
          to_account: string
          to_country?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          destination_tag?: number | null
          exchange_rate?: number | null
          fee?: number | null
          from_account?: string
          from_country?: string | null
          hash?: string
          id?: string
          ledger_index?: number | null
          memo?: string | null
          payment_type?: string | null
          sequence_number?: number | null
          source_tag?: number | null
          status?: string
          to_account?: string
          to_country?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          assessment_type: string
          created_at: string | null
          factors: Json | null
          id: string
          metadata: Json | null
          recommendations: Json | null
          risk_level: string
          risk_score: number | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          assessment_type: string
          created_at?: string | null
          factors?: Json | null
          id?: string
          metadata?: Json | null
          recommendations?: Json | null
          risk_level: string
          risk_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          assessment_type?: string
          created_at?: string | null
          factors?: Json | null
          id?: string
          metadata?: Json | null
          recommendations?: Json | null
          risk_level?: string
          risk_score?: number | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_name: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_name: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_name?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_name_fkey"
            columns: ["permission_name"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          priority: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          created_at: string | null
          created_by: string
          is_template: boolean | null
          rule_details: Json | null
          rule_id: string
          rule_name: string
          rule_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          is_template?: boolean | null
          rule_details?: Json | null
          rule_id?: string
          rule_name: string
          rule_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          is_template?: boolean | null
          rule_details?: Json | null
          rule_id?: string
          rule_name?: string
          rule_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      secure_keys: {
        Row: {
          created_at: string | null
          encrypted_key: string
          id: string
          key_id: string
          last_used_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_key: string
          id?: string
          key_id: string
          last_used_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_key?: string
          id?: string
          key_id?: string
          last_used_at?: string | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          contract_address: string | null
          created_at: string
          details: string | null
          device_info: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          related_events: string[] | null
          severity: string
          status: string | null
          timestamp: string
          transaction_hash: string | null
          updated_at: string | null
          user_id: string | null
          wallet_address: string | null
          wallet_id: string | null
        }
        Insert: {
          contract_address?: string | null
          created_at?: string
          details?: string | null
          device_info?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_events?: string[] | null
          severity: string
          status?: string | null
          timestamp?: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
          wallet_id?: string | null
        }
        Update: {
          contract_address?: string | null
          created_at?: string
          details?: string | null
          device_info?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          related_events?: string[] | null
          severity?: string
          status?: string | null
          timestamp?: string
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
          wallet_address?: string | null
          wallet_id?: string | null
        }
        Relationships: []
      }
      settlement_metrics: {
        Row: {
          average_processing_time: unknown | null
          created_at: string | null
          date: string
          failed_settlements: number | null
          id: string
          successful_settlements: number | null
          total_fees_collected: number | null
          total_funds_transferred: number | null
          total_gas_used: number | null
          total_settlements: number | null
          total_tokens_burned: number | null
          updated_at: string | null
        }
        Insert: {
          average_processing_time?: unknown | null
          created_at?: string | null
          date: string
          failed_settlements?: number | null
          id?: string
          successful_settlements?: number | null
          total_fees_collected?: number | null
          total_funds_transferred?: number | null
          total_gas_used?: number | null
          total_settlements?: number | null
          total_tokens_burned?: number | null
          updated_at?: string | null
        }
        Update: {
          average_processing_time?: unknown | null
          created_at?: string | null
          date?: string
          failed_settlements?: number | null
          id?: string
          successful_settlements?: number | null
          total_fees_collected?: number | null
          total_funds_transferred?: number | null
          total_gas_used?: number | null
          total_settlements?: number | null
          total_tokens_burned?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sidebar_configurations: {
        Row: {
          configuration_data: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          min_role_priority: number | null
          name: string
          organization_id: string | null
          target_profile_type_enums:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          configuration_data: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_role_priority?: number | null
          name: string
          organization_id?: string | null
          target_profile_type_enums?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          configuration_data?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          min_role_priority?: number | null
          name?: string
          organization_id?: string | null
          target_profile_type_enums?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sidebar_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          href: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_visible: boolean | null
          item_id: string
          label: string
          min_role_priority: number | null
          organization_id: string | null
          profile_types: string[] | null
          required_permissions: string[] | null
          required_roles: string[] | null
          requires_project: boolean | null
          section_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          href: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          item_id: string
          label: string
          min_role_priority?: number | null
          organization_id?: string | null
          profile_types?: string[] | null
          required_permissions?: string[] | null
          required_roles?: string[] | null
          requires_project?: boolean | null
          section_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          href?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_visible?: boolean | null
          item_id?: string
          label?: string
          min_role_priority?: number | null
          organization_id?: string | null
          profile_types?: string[] | null
          required_permissions?: string[] | null
          required_roles?: string[] | null
          requires_project?: boolean | null
          section_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sidebar_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sidebar_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sidebar_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_sections: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          min_role_priority: number | null
          organization_id: string | null
          profile_types: string[] | null
          required_permissions: string[] | null
          required_roles: string[] | null
          section_id: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          min_role_priority?: number | null
          organization_id?: string | null
          profile_types?: string[] | null
          required_permissions?: string[] | null
          required_roles?: string[] | null
          section_id: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          min_role_priority?: number | null
          organization_id?: string | null
          profile_types?: string[] | null
          required_permissions?: string[] | null
          required_roles?: string[] | null
          section_id?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sidebar_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_migration_approvals: {
        Row: {
          approved_at: string | null
          approver_address: string
          id: string
          migration_id: string
          signature: string
        }
        Insert: {
          approved_at?: string | null
          approver_address: string
          id?: string
          migration_id: string
          signature: string
        }
        Update: {
          approved_at?: string | null
          approver_address?: string
          id?: string
          migration_id?: string
          signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_migration_approvals_migration_id_fkey"
            columns: ["migration_id"]
            isOneToOne: false
            referencedRelation: "signature_migrations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_migrations: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          current_approvals: number
          finalize_after: string | null
          finalized_at: string | null
          from_scheme: string
          id: string
          migration_data: Json | null
          migration_hash: string
          new_credential_id: string | null
          new_public_key: string
          required_approvals: number
          status: string
          to_scheme: string
          transaction_hash: string | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          current_approvals?: number
          finalize_after?: string | null
          finalized_at?: string | null
          from_scheme: string
          id?: string
          migration_data?: Json | null
          migration_hash: string
          new_credential_id?: string | null
          new_public_key: string
          required_approvals?: number
          status?: string
          to_scheme: string
          transaction_hash?: string | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          current_approvals?: number
          finalize_after?: string | null
          finalized_at?: string | null
          from_scheme?: string
          id?: string
          migration_data?: Json | null
          migration_hash?: string
          new_credential_id?: string | null
          new_public_key?: string
          required_approvals?: number
          status?: string
          to_scheme?: string
          transaction_hash?: string | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_migrations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          created_at: string | null
          id: string
          proposal_id: string | null
          signature: string
          signer: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proposal_id?: string | null
          signature: string
          signer: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proposal_id?: string | null
          signature?: string
          signer?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "transaction_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_contract_wallets: {
        Row: {
          created_at: string | null
          deployment_tx_hash: string | null
          diamond_proxy_address: string
          facet_registry_address: string
          id: string
          implementation_version: string
          is_deployed: boolean | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          deployment_tx_hash?: string | null
          diamond_proxy_address: string
          facet_registry_address: string
          id?: string
          implementation_version: string
          is_deployed?: boolean | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          deployment_tx_hash?: string | null
          diamond_proxy_address?: string
          facet_registry_address?: string
          id?: string
          implementation_version?: string
          is_deployed?: boolean | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_contract_wallets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      stablecoin_collateral: {
        Row: {
          auditor: string | null
          backing_amount: number | null
          collateral_asset: string | null
          created_at: string | null
          custodian: string | null
          id: string
          last_audit_date: string | null
          stablecoin_id: string
          updated_at: string | null
        }
        Insert: {
          auditor?: string | null
          backing_amount?: number | null
          collateral_asset?: string | null
          created_at?: string | null
          custodian?: string | null
          id?: string
          last_audit_date?: string | null
          stablecoin_id: string
          updated_at?: string | null
        }
        Update: {
          auditor?: string | null
          backing_amount?: number | null
          collateral_asset?: string | null
          created_at?: string | null
          custodian?: string | null
          id?: string
          last_audit_date?: string | null
          stablecoin_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stablecoin_collateral_stablecoin"
            columns: ["stablecoin_id"]
            isOneToOne: false
            referencedRelation: "stablecoin_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stablecoin_products: {
        Row: {
          algorithm_description: string | null
          algorithm_type: string | null
          asset_name: string | null
          asset_symbol: string | null
          asset_type: string | null
          audit_frequency: string | null
          audit_provider: string | null
          blockchain_network: string | null
          circulating_supply: number | null
          collateral_assets: string[] | null
          collateral_ratio: number | null
          collateral_type: string | null
          collateral_type_enum: string | null
          commodity_type: string | null
          compliance_rules: string | null
          contraction_mechanism: string | null
          created_at: string | null
          depeg_risk_mitigation: string[] | null
          embedded_rights: string | null
          expansion_mechanism: string | null
          fractionalization_enabled: boolean | null
          governance_token: string | null
          id: string
          interest_rate: number | null
          issuance_date: string | null
          issuer: string | null
          liquidation_penalty: number | null
          liquidation_terms: string | null
          minimum_collateralization_ratio: number | null
          negative_rebase_limit: number | null
          oracle_provider: string | null
          overcollateralization_threshold: number | null
          peg_value: number | null
          physical_redemption: boolean | null
          positive_rebase_limit: number | null
          project_id: string
          provenance_history_enabled: boolean | null
          rebase_frequency: string | null
          rebase_governance: string | null
          rebase_oracle: string | null
          redemption_fee: number | null
          redemption_mechanism: string | null
          reserve_assets: string[] | null
          reserve_audit_frequency: string | null
          reserve_custodian: string | null
          reserve_insurance: boolean | null
          reserve_management_policy: string | null
          secondary_token_symbol: string | null
          smart_contract_address: string | null
          stability_mechanism: string | null
          status: string | null
          storage_provider: string | null
          target_raise: number | null
          total_supply: number | null
          updated_at: string | null
        }
        Insert: {
          algorithm_description?: string | null
          algorithm_type?: string | null
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          audit_frequency?: string | null
          audit_provider?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          collateral_assets?: string[] | null
          collateral_ratio?: number | null
          collateral_type?: string | null
          collateral_type_enum?: string | null
          commodity_type?: string | null
          compliance_rules?: string | null
          contraction_mechanism?: string | null
          created_at?: string | null
          depeg_risk_mitigation?: string[] | null
          embedded_rights?: string | null
          expansion_mechanism?: string | null
          fractionalization_enabled?: boolean | null
          governance_token?: string | null
          id?: string
          interest_rate?: number | null
          issuance_date?: string | null
          issuer?: string | null
          liquidation_penalty?: number | null
          liquidation_terms?: string | null
          minimum_collateralization_ratio?: number | null
          negative_rebase_limit?: number | null
          oracle_provider?: string | null
          overcollateralization_threshold?: number | null
          peg_value?: number | null
          physical_redemption?: boolean | null
          positive_rebase_limit?: number | null
          project_id: string
          provenance_history_enabled?: boolean | null
          rebase_frequency?: string | null
          rebase_governance?: string | null
          rebase_oracle?: string | null
          redemption_fee?: number | null
          redemption_mechanism?: string | null
          reserve_assets?: string[] | null
          reserve_audit_frequency?: string | null
          reserve_custodian?: string | null
          reserve_insurance?: boolean | null
          reserve_management_policy?: string | null
          secondary_token_symbol?: string | null
          smart_contract_address?: string | null
          stability_mechanism?: string | null
          status?: string | null
          storage_provider?: string | null
          target_raise?: number | null
          total_supply?: number | null
          updated_at?: string | null
        }
        Update: {
          algorithm_description?: string | null
          algorithm_type?: string | null
          asset_name?: string | null
          asset_symbol?: string | null
          asset_type?: string | null
          audit_frequency?: string | null
          audit_provider?: string | null
          blockchain_network?: string | null
          circulating_supply?: number | null
          collateral_assets?: string[] | null
          collateral_ratio?: number | null
          collateral_type?: string | null
          collateral_type_enum?: string | null
          commodity_type?: string | null
          compliance_rules?: string | null
          contraction_mechanism?: string | null
          created_at?: string | null
          depeg_risk_mitigation?: string[] | null
          embedded_rights?: string | null
          expansion_mechanism?: string | null
          fractionalization_enabled?: boolean | null
          governance_token?: string | null
          id?: string
          interest_rate?: number | null
          issuance_date?: string | null
          issuer?: string | null
          liquidation_penalty?: number | null
          liquidation_terms?: string | null
          minimum_collateralization_ratio?: number | null
          negative_rebase_limit?: number | null
          oracle_provider?: string | null
          overcollateralization_threshold?: number | null
          peg_value?: number | null
          physical_redemption?: boolean | null
          positive_rebase_limit?: number | null
          project_id?: string
          provenance_history_enabled?: boolean | null
          rebase_frequency?: string | null
          rebase_governance?: string | null
          rebase_oracle?: string | null
          redemption_fee?: number | null
          redemption_mechanism?: string | null
          reserve_assets?: string[] | null
          reserve_audit_frequency?: string | null
          reserve_custodian?: string | null
          reserve_insurance?: boolean | null
          reserve_management_policy?: string | null
          secondary_token_symbol?: string | null
          smart_contract_address?: string | null
          stability_mechanism?: string | null
          status?: string | null
          storage_provider?: string | null
          target_raise?: number | null
          total_supply?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stablecoin_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_requirements: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          failure_reason: string | null
          id: string
          name: string
          order: number
          stage_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          failure_reason?: string | null
          id?: string
          name: string
          order: number
          stage_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          failure_reason?: string | null
          id?: string
          name?: string
          order?: number
          stage_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_requirements_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_conversion_transactions: {
        Row: {
          block_number: number | null
          confirmations: number | null
          conversion_type: string
          created_at: string | null
          destination_amount: number | null
          destination_currency: string
          destination_network: string | null
          destination_wallet: string | null
          error_message: string | null
          exchange_rate: number | null
          fees: number | null
          id: string
          metadata: Json | null
          network_fee: number | null
          source_amount: number
          source_currency: string
          source_network: string | null
          status: string | null
          stripe_fee: number | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          stripe_status: string | null
          transaction_hash: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          block_number?: number | null
          confirmations?: number | null
          conversion_type: string
          created_at?: string | null
          destination_amount?: number | null
          destination_currency: string
          destination_network?: string | null
          destination_wallet?: string | null
          error_message?: string | null
          exchange_rate?: number | null
          fees?: number | null
          id?: string
          metadata?: Json | null
          network_fee?: number | null
          source_amount: number
          source_currency: string
          source_network?: string | null
          status?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          block_number?: number | null
          confirmations?: number | null
          conversion_type?: string
          created_at?: string | null
          destination_amount?: number | null
          destination_currency?: string
          destination_network?: string | null
          destination_wallet?: string | null
          error_message?: string | null
          exchange_rate?: number | null
          fees?: number | null
          id?: string
          metadata?: Json | null
          network_fee?: number | null
          source_amount?: number
          source_currency?: string
          source_network?: string | null
          status?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          stripe_status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_conversion_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_stablecoin_accounts: {
        Row: {
          account_id: string
          account_status: string | null
          balance_usdb: number | null
          balance_usdc: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id: string
          account_status?: string | null
          balance_usdb?: number | null
          balance_usdc?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string
          account_status?: string | null
          balance_usdb?: number | null
          balance_usdc?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_stablecoin_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string | null
          data: Json
          event_type: string
          id: string
          processed: boolean | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          event_type: string
          id?: string
          processed?: boolean | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          event_type?: string
          id?: string
          processed?: boolean | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      structured_products: {
        Row: {
          barrier_level: number | null
          complex_features: Json | null
          coupon_rate: number | null
          created_at: string | null
          currency: string | null
          distribution_strategy: string | null
          event_history: Json | null
          id: string
          issue_date: string | null
          issuer: string | null
          maturity_date: string | null
          monitoring_triggers: Json | null
          nominal_amount: number | null
          payoff_structure: string | null
          product_id: string | null
          product_name: string | null
          project_id: string
          protection_level: number | null
          redemption_date: string | null
          risk_indicators: number | null
          risk_rating: number | null
          status: string | null
          strike_price: number | null
          target_audience: string | null
          target_raise: number | null
          underlying_assets: string[] | null
          updated_at: string | null
          valuation_history: Json | null
        }
        Insert: {
          barrier_level?: number | null
          complex_features?: Json | null
          coupon_rate?: number | null
          created_at?: string | null
          currency?: string | null
          distribution_strategy?: string | null
          event_history?: Json | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          maturity_date?: string | null
          monitoring_triggers?: Json | null
          nominal_amount?: number | null
          payoff_structure?: string | null
          product_id?: string | null
          product_name?: string | null
          project_id: string
          protection_level?: number | null
          redemption_date?: string | null
          risk_indicators?: number | null
          risk_rating?: number | null
          status?: string | null
          strike_price?: number | null
          target_audience?: string | null
          target_raise?: number | null
          underlying_assets?: string[] | null
          updated_at?: string | null
          valuation_history?: Json | null
        }
        Update: {
          barrier_level?: number | null
          complex_features?: Json | null
          coupon_rate?: number | null
          created_at?: string | null
          currency?: string | null
          distribution_strategy?: string | null
          event_history?: Json | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          maturity_date?: string | null
          monitoring_triggers?: Json | null
          nominal_amount?: number | null
          payoff_structure?: string | null
          product_id?: string | null
          product_name?: string | null
          project_id?: string
          protection_level?: number | null
          redemption_date?: string | null
          risk_indicators?: number | null
          risk_rating?: number | null
          status?: string | null
          strike_price?: number | null
          target_audience?: string | null
          target_raise?: number | null
          underlying_assets?: string[] | null
          updated_at?: string | null
          valuation_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_structured_products_project"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          allocated: boolean
          confirmed: boolean
          created_at: string | null
          currency: string
          distributed: boolean
          fiat_amount: number
          id: string
          investor_id: string
          notes: string | null
          project_id: string | null
          subscription_date: string | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          allocated?: boolean
          confirmed?: boolean
          created_at?: string | null
          currency: string
          distributed?: boolean
          fiat_amount: number
          id?: string
          investor_id: string
          notes?: string | null
          project_id?: string | null
          subscription_date?: string | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          allocated?: boolean
          confirmed?: boolean
          created_at?: string | null
          currency?: string
          distributed?: boolean
          fiat_amount?: number
          id?: string
          investor_id?: string
          notes?: string | null
          project_id?: string | null
          subscription_date?: string | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_processes: {
        Row: {
          cancellable: boolean | null
          created_at: string | null
          end_time: string | null
          error_details: Json | null
          id: string
          metadata: Json | null
          notification_sent: boolean | null
          priority: string | null
          process_name: string
          progress: number | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cancellable?: boolean | null
          created_at?: string | null
          end_time?: string | null
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          notification_sent?: boolean | null
          priority?: string | null
          process_name: string
          progress?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cancellable?: boolean | null
          created_at?: string | null
          end_time?: string | null
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          notification_sent?: boolean | null
          priority?: string | null
          process_name?: string
          progress?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      token_allocations: {
        Row: {
          allocation_date: string | null
          created_at: string
          distributed: boolean
          distribution_date: string | null
          distribution_tx_hash: string | null
          id: string
          investor_id: string
          minted: boolean
          minting_date: string | null
          minting_tx_hash: string | null
          notes: string | null
          project_id: string | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          subscription_id: string
          symbol: string | null
          token_amount: number
          token_id: string | null
          token_type: string
          updated_at: string | null
        }
        Insert: {
          allocation_date?: string | null
          created_at?: string
          distributed?: boolean
          distribution_date?: string | null
          distribution_tx_hash?: string | null
          id?: string
          investor_id: string
          minted?: boolean
          minting_date?: string | null
          minting_tx_hash?: string | null
          notes?: string | null
          project_id?: string | null
          standard?: Database["public"]["Enums"]["token_standard_enum"] | null
          subscription_id: string
          symbol?: string | null
          token_amount: number
          token_id?: string | null
          token_type: string
          updated_at?: string | null
        }
        Update: {
          allocation_date?: string | null
          created_at?: string
          distributed?: boolean
          distribution_date?: string | null
          distribution_tx_hash?: string | null
          id?: string
          investor_id?: string
          minted?: boolean
          minting_date?: string | null
          minting_tx_hash?: string | null
          notes?: string | null
          project_id?: string | null
          standard?: Database["public"]["Enums"]["token_standard_enum"] | null
          subscription_id?: string
          symbol?: string | null
          token_amount?: number
          token_id?: string | null
          token_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_allocations_investor_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "token_allocations_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_allocations_subscription_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_allocations_token_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_climate_properties: {
        Row: {
          average_discount_rate: number | null
          average_risk_score: number | null
          created_at: string | null
          discount_amount: number | null
          discounted_value: number | null
          pool_id: string | null
          project_id: string | null
          security_interest_details: string | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          average_discount_rate?: number | null
          average_risk_score?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discounted_value?: number | null
          pool_id?: string | null
          project_id?: string | null
          security_interest_details?: string | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          average_discount_rate?: number | null
          average_risk_score?: number | null
          created_at?: string | null
          discount_amount?: number | null
          discounted_value?: number | null
          pool_id?: string | null
          project_id?: string | null
          security_interest_details?: string | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_climate_properties_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_climate_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_deployment_history: {
        Row: {
          block_number: number | null
          blockchain: string
          environment: string
          error: string | null
          id: string
          project_id: string
          status: string
          timestamp: string
          token_id: string
          transaction_hash: string | null
        }
        Insert: {
          block_number?: number | null
          blockchain: string
          environment: string
          error?: string | null
          id?: string
          project_id: string
          status: string
          timestamp?: string
          token_id: string
          transaction_hash?: string | null
        }
        Update: {
          block_number?: number | null
          blockchain?: string
          environment?: string
          error?: string | null
          id?: string
          project_id?: string
          status?: string
          timestamp?: string
          token_id?: string
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_deployments: {
        Row: {
          contract_address: string
          deployed_at: string | null
          deployed_by: string
          deployment_data: Json | null
          deployment_strategy: string | null
          id: string
          network: string
          status: string
          token_id: string
          transaction_hash: string
        }
        Insert: {
          contract_address: string
          deployed_at?: string | null
          deployed_by: string
          deployment_data?: Json | null
          deployment_strategy?: string | null
          id?: string
          network: string
          status?: string
          token_id: string
          transaction_hash: string
        }
        Update: {
          contract_address?: string
          deployed_at?: string | null
          deployed_by?: string
          deployment_data?: Json | null
          deployment_strategy?: string | null
          id?: string
          network?: string
          status?: string
          token_id?: string
          transaction_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_deployments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_designs: {
        Row: {
          contract_address: string | null
          created_at: string | null
          deployment_date: string | null
          id: string
          name: string
          status: string
          total_supply: number
          type: string
        }
        Insert: {
          contract_address?: string | null
          created_at?: string | null
          deployment_date?: string | null
          id?: string
          name: string
          status?: string
          total_supply: number
          type: string
        }
        Update: {
          contract_address?: string | null
          created_at?: string | null
          deployment_date?: string | null
          id?: string
          name?: string
          status?: string
          total_supply?: number
          type?: string
        }
        Relationships: []
      }
      token_erc1155_balances: {
        Row: {
          address: string
          amount: string
          created_at: string | null
          id: string
          token_id: string
          token_type_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          amount: string
          created_at?: string | null
          id?: string
          token_id: string
          token_type_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          amount?: string
          created_at?: string | null
          id?: string
          token_id?: string
          token_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_balances_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_crafting_recipes: {
        Row: {
          cooldown_period: number | null
          created_at: string | null
          id: string
          input_tokens: Json
          is_active: boolean | null
          output_quantity: number | null
          output_token_type_id: string
          recipe_name: string
          required_level: number | null
          success_rate: number | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          cooldown_period?: number | null
          created_at?: string | null
          id?: string
          input_tokens: Json
          is_active?: boolean | null
          output_quantity?: number | null
          output_token_type_id: string
          recipe_name: string
          required_level?: number | null
          success_rate?: number | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          cooldown_period?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: Json
          is_active?: boolean | null
          output_quantity?: number | null
          output_token_type_id?: string
          recipe_name?: string
          required_level?: number | null
          success_rate?: number | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_crafting_recipes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_discount_tiers: {
        Row: {
          created_at: string | null
          discount_percentage: string
          id: string
          is_active: boolean | null
          max_quantity: number | null
          min_quantity: number
          tier_name: string | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity: number
          tier_name?: string | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: string
          id?: string
          is_active?: boolean | null
          max_quantity?: number | null
          min_quantity?: number
          tier_name?: string | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_discount_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_properties: {
        Row: {
          access_control: string | null
          airdrop_enabled: boolean | null
          airdrop_snapshot_block: number | null
          atomic_swaps_enabled: boolean | null
          base_price: string | null
          base_uri: string | null
          batch_minting_config: Json | null
          batch_minting_enabled: boolean | null
          batch_transfer_limits: Json | null
          bridge_enabled: boolean | null
          bridgeable_token_types: string[] | null
          bulk_discount_enabled: boolean | null
          bulk_discount_tiers: Json | null
          bundle_trading_enabled: boolean | null
          burn_roles: string[] | null
          burning_enabled: boolean | null
          claim_end_time: string | null
          claim_period_enabled: boolean | null
          claim_start_time: string | null
          community_treasury_enabled: boolean | null
          consumable_tokens: boolean | null
          container_config: Json | null
          container_enabled: boolean | null
          crafting_enabled: boolean | null
          created_at: string | null
          cross_collection_trading: boolean | null
          default_restriction_policy: string | null
          dynamic_uri_config: Json | null
          dynamic_uris: boolean | null
          enable_approval_for_all: boolean | null
          experience_points_enabled: boolean | null
          fusion_enabled: boolean | null
          has_royalty: boolean | null
          id: string
          is_burnable: boolean | null
          is_pausable: boolean | null
          layer2_support_enabled: boolean | null
          lazy_minting_enabled: boolean | null
          leveling_enabled: boolean | null
          marketplace_fee_percentage: string | null
          marketplace_fee_recipient: string | null
          marketplace_fees_enabled: boolean | null
          max_supply_per_type: string | null
          metadata_storage: string | null
          metadata_update_roles: string[] | null
          mint_roles: string[] | null
          price_multipliers: Json | null
          pricing_model: string | null
          proposal_creation_threshold: string | null
          referral_percentage: string | null
          referral_rewards_enabled: boolean | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          supply_tracking: boolean | null
          supply_tracking_advanced: boolean | null
          supported_layer2_networks: string[] | null
          token_id: string
          token_recipes: Json | null
          transfer_restrictions: Json | null
          treasury_percentage: string | null
          updatable_metadata: boolean | null
          updatable_uris: boolean | null
          updated_at: string | null
          use_geographic_restrictions: boolean | null
          voting_power_enabled: boolean | null
          voting_weight_per_token: Json | null
          whitelist_config: Json | null
          wrapped_versions: Json | null
        }
        Insert: {
          access_control?: string | null
          airdrop_enabled?: boolean | null
          airdrop_snapshot_block?: number | null
          atomic_swaps_enabled?: boolean | null
          base_price?: string | null
          base_uri?: string | null
          batch_minting_config?: Json | null
          batch_minting_enabled?: boolean | null
          batch_transfer_limits?: Json | null
          bridge_enabled?: boolean | null
          bridgeable_token_types?: string[] | null
          bulk_discount_enabled?: boolean | null
          bulk_discount_tiers?: Json | null
          bundle_trading_enabled?: boolean | null
          burn_roles?: string[] | null
          burning_enabled?: boolean | null
          claim_end_time?: string | null
          claim_period_enabled?: boolean | null
          claim_start_time?: string | null
          community_treasury_enabled?: boolean | null
          consumable_tokens?: boolean | null
          container_config?: Json | null
          container_enabled?: boolean | null
          crafting_enabled?: boolean | null
          created_at?: string | null
          cross_collection_trading?: boolean | null
          default_restriction_policy?: string | null
          dynamic_uri_config?: Json | null
          dynamic_uris?: boolean | null
          enable_approval_for_all?: boolean | null
          experience_points_enabled?: boolean | null
          fusion_enabled?: boolean | null
          has_royalty?: boolean | null
          id?: string
          is_burnable?: boolean | null
          is_pausable?: boolean | null
          layer2_support_enabled?: boolean | null
          lazy_minting_enabled?: boolean | null
          leveling_enabled?: boolean | null
          marketplace_fee_percentage?: string | null
          marketplace_fee_recipient?: string | null
          marketplace_fees_enabled?: boolean | null
          max_supply_per_type?: string | null
          metadata_storage?: string | null
          metadata_update_roles?: string[] | null
          mint_roles?: string[] | null
          price_multipliers?: Json | null
          pricing_model?: string | null
          proposal_creation_threshold?: string | null
          referral_percentage?: string | null
          referral_rewards_enabled?: boolean | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          supply_tracking?: boolean | null
          supply_tracking_advanced?: boolean | null
          supported_layer2_networks?: string[] | null
          token_id: string
          token_recipes?: Json | null
          transfer_restrictions?: Json | null
          treasury_percentage?: string | null
          updatable_metadata?: boolean | null
          updatable_uris?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          voting_power_enabled?: boolean | null
          voting_weight_per_token?: Json | null
          whitelist_config?: Json | null
          wrapped_versions?: Json | null
        }
        Update: {
          access_control?: string | null
          airdrop_enabled?: boolean | null
          airdrop_snapshot_block?: number | null
          atomic_swaps_enabled?: boolean | null
          base_price?: string | null
          base_uri?: string | null
          batch_minting_config?: Json | null
          batch_minting_enabled?: boolean | null
          batch_transfer_limits?: Json | null
          bridge_enabled?: boolean | null
          bridgeable_token_types?: string[] | null
          bulk_discount_enabled?: boolean | null
          bulk_discount_tiers?: Json | null
          bundle_trading_enabled?: boolean | null
          burn_roles?: string[] | null
          burning_enabled?: boolean | null
          claim_end_time?: string | null
          claim_period_enabled?: boolean | null
          claim_start_time?: string | null
          community_treasury_enabled?: boolean | null
          consumable_tokens?: boolean | null
          container_config?: Json | null
          container_enabled?: boolean | null
          crafting_enabled?: boolean | null
          created_at?: string | null
          cross_collection_trading?: boolean | null
          default_restriction_policy?: string | null
          dynamic_uri_config?: Json | null
          dynamic_uris?: boolean | null
          enable_approval_for_all?: boolean | null
          experience_points_enabled?: boolean | null
          fusion_enabled?: boolean | null
          has_royalty?: boolean | null
          id?: string
          is_burnable?: boolean | null
          is_pausable?: boolean | null
          layer2_support_enabled?: boolean | null
          lazy_minting_enabled?: boolean | null
          leveling_enabled?: boolean | null
          marketplace_fee_percentage?: string | null
          marketplace_fee_recipient?: string | null
          marketplace_fees_enabled?: boolean | null
          max_supply_per_type?: string | null
          metadata_storage?: string | null
          metadata_update_roles?: string[] | null
          mint_roles?: string[] | null
          price_multipliers?: Json | null
          pricing_model?: string | null
          proposal_creation_threshold?: string | null
          referral_percentage?: string | null
          referral_rewards_enabled?: boolean | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          supply_tracking?: boolean | null
          supply_tracking_advanced?: boolean | null
          supported_layer2_networks?: string[] | null
          token_id?: string
          token_recipes?: Json | null
          transfer_restrictions?: Json | null
          treasury_percentage?: string | null
          updatable_metadata?: boolean | null
          updatable_uris?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          voting_power_enabled?: boolean | null
          voting_weight_per_token?: Json | null
          whitelist_config?: Json | null
          wrapped_versions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_type_configs: {
        Row: {
          burn_rewards: Json | null
          crafting_materials: Json | null
          created_at: string | null
          experience_value: number | null
          id: string
          is_tradeable: boolean | null
          is_transferable: boolean | null
          mint_price: string | null
          rarity_tier: string | null
          supply_cap: string | null
          token_id: string
          token_type_id: string
          updated_at: string | null
          utility_type: string | null
        }
        Insert: {
          burn_rewards?: Json | null
          crafting_materials?: Json | null
          created_at?: string | null
          experience_value?: number | null
          id?: string
          is_tradeable?: boolean | null
          is_transferable?: boolean | null
          mint_price?: string | null
          rarity_tier?: string | null
          supply_cap?: string | null
          token_id: string
          token_type_id: string
          updated_at?: string | null
          utility_type?: string | null
        }
        Update: {
          burn_rewards?: Json | null
          crafting_materials?: Json | null
          created_at?: string | null
          experience_value?: number | null
          id?: string
          is_tradeable?: boolean | null
          is_transferable?: boolean | null
          mint_price?: string | null
          rarity_tier?: string | null
          supply_cap?: string | null
          token_id?: string
          token_type_id?: string
          updated_at?: string | null
          utility_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_type_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_types: {
        Row: {
          created_at: string | null
          description: string | null
          fungibility_type: string | null
          id: string
          max_supply: string | null
          metadata: Json | null
          name: string | null
          token_id: string
          token_type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fungibility_type?: string | null
          id?: string
          max_supply?: string | null
          metadata?: Json | null
          name?: string | null
          token_id: string
          token_type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fungibility_type?: string | null
          id?: string
          max_supply?: string | null
          metadata?: Json | null
          name?: string | null
          token_id?: string
          token_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_types_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1155_uri_mappings: {
        Row: {
          created_at: string | null
          id: string
          token_id: string
          token_type_id: string
          updated_at: string | null
          uri: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          token_id: string
          token_type_id: string
          updated_at?: string | null
          uri: string
        }
        Update: {
          created_at?: string | null
          id?: string
          token_id?: string
          token_type_id?: string
          updated_at?: string | null
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1155_uri_mappings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_controllers: {
        Row: {
          address: string
          created_at: string | null
          id: string
          permissions: string[] | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          permissions?: string[] | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_controllers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_corporate_actions: {
        Row: {
          action_details: Json
          action_type: string
          announcement_date: string
          created_at: string | null
          effective_date: string | null
          execution_transaction_hash: string | null
          id: string
          impact_on_price: string | null
          impact_on_supply: string | null
          payment_date: string | null
          record_date: string | null
          regulatory_approval_required: boolean | null
          shareholder_approval_required: boolean | null
          status: string | null
          token_id: string
          updated_at: string | null
          voting_deadline: string | null
        }
        Insert: {
          action_details: Json
          action_type: string
          announcement_date: string
          created_at?: string | null
          effective_date?: string | null
          execution_transaction_hash?: string | null
          id?: string
          impact_on_price?: string | null
          impact_on_supply?: string | null
          payment_date?: string | null
          record_date?: string | null
          regulatory_approval_required?: boolean | null
          shareholder_approval_required?: boolean | null
          status?: string | null
          token_id: string
          updated_at?: string | null
          voting_deadline?: string | null
        }
        Update: {
          action_details?: Json
          action_type?: string
          announcement_date?: string
          created_at?: string | null
          effective_date?: string | null
          execution_transaction_hash?: string | null
          id?: string
          impact_on_price?: string | null
          impact_on_supply?: string | null
          payment_date?: string | null
          record_date?: string | null
          regulatory_approval_required?: boolean | null
          shareholder_approval_required?: boolean | null
          status?: string | null
          token_id?: string
          updated_at?: string | null
          voting_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_corporate_actions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_custody_providers: {
        Row: {
          certification_level: string | null
          created_at: string | null
          custody_agreement_hash: string | null
          id: string
          integration_status: string | null
          is_active: boolean | null
          jurisdiction: string | null
          provider_address: string | null
          provider_lei: string | null
          provider_name: string
          provider_type: string
          regulatory_approvals: string[] | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          certification_level?: string | null
          created_at?: string | null
          custody_agreement_hash?: string | null
          id?: string
          integration_status?: string | null
          is_active?: boolean | null
          jurisdiction?: string | null
          provider_address?: string | null
          provider_lei?: string | null
          provider_name: string
          provider_type: string
          regulatory_approvals?: string[] | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          certification_level?: string | null
          created_at?: string | null
          custody_agreement_hash?: string | null
          id?: string
          integration_status?: string | null
          is_active?: boolean | null
          jurisdiction?: string | null
          provider_address?: string | null
          provider_lei?: string | null
          provider_name?: string
          provider_type?: string
          regulatory_approvals?: string[] | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_custody_providers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_documents: {
        Row: {
          created_at: string | null
          document_hash: string | null
          document_type: string | null
          document_uri: string
          id: string
          name: string
          token_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_hash?: string | null
          document_type?: string | null
          document_uri: string
          id?: string
          name: string
          token_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_hash?: string | null
          document_type?: string | null
          document_uri?: string
          id?: string
          name?: string
          token_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_documents_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_partition_balances: {
        Row: {
          balance: string
          holder_address: string
          id: string
          last_updated: string | null
          metadata: Json | null
          partition_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: string
          holder_address: string
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          partition_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: string
          holder_address?: string
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          partition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_partition_balances_partition_id_fkey"
            columns: ["partition_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_partitions"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_partition_operators: {
        Row: {
          authorized: boolean | null
          holder_address: string
          id: string
          last_updated: string | null
          metadata: Json | null
          operator_address: string
          partition_id: string
          updated_at: string | null
        }
        Insert: {
          authorized?: boolean | null
          holder_address: string
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          operator_address: string
          partition_id: string
          updated_at?: string | null
        }
        Update: {
          authorized?: boolean | null
          holder_address?: string
          id?: string
          last_updated?: string | null
          metadata?: Json | null
          operator_address?: string
          partition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_partition_operators_partition_id_fkey"
            columns: ["partition_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_partitions"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_partition_transfers: {
        Row: {
          amount: string
          from_address: string
          id: string
          metadata: Json | null
          operator_address: string | null
          partition_id: string
          timestamp: string | null
          to_address: string
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          amount: string
          from_address: string
          id?: string
          metadata?: Json | null
          operator_address?: string | null
          partition_id: string
          timestamp?: string | null
          to_address: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: string
          from_address?: string
          id?: string
          metadata?: Json | null
          operator_address?: string | null
          partition_id?: string
          timestamp?: string | null
          to_address?: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_partition_transfers_partition_id_fkey"
            columns: ["partition_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_partitions"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_partitions: {
        Row: {
          amount: string | null
          corporate_actions: boolean | null
          created_at: string | null
          custom_features: Json | null
          id: string
          metadata: Json | null
          name: string
          partition_id: string
          partition_type: string | null
          token_id: string
          total_supply: string | null
          transferable: boolean | null
          updated_at: string | null
        }
        Insert: {
          amount?: string | null
          corporate_actions?: boolean | null
          created_at?: string | null
          custom_features?: Json | null
          id?: string
          metadata?: Json | null
          name: string
          partition_id: string
          partition_type?: string | null
          token_id: string
          total_supply?: string | null
          transferable?: boolean | null
          updated_at?: string | null
        }
        Update: {
          amount?: string | null
          corporate_actions?: boolean | null
          created_at?: string | null
          custom_features?: Json | null
          id?: string
          metadata?: Json | null
          name?: string
          partition_id?: string
          partition_type?: string | null
          token_id?: string
          total_supply?: string | null
          transferable?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_partitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_properties: {
        Row: {
          accredited_investor_only: boolean | null
          advanced_corporate_actions: boolean | null
          advanced_governance_enabled: boolean | null
          advanced_risk_management: boolean | null
          aml_monitoring_enabled: boolean | null
          audit_trail_comprehensive: boolean | null
          auto_compliance: boolean | null
          automated_sanctions_screening: boolean | null
          beneficial_ownership_tracking: boolean | null
          board_election_support: boolean | null
          buyback_programs_enabled: boolean | null
          cap: string | null
          central_securities_depository_integration: boolean | null
          clearing_house_integration: boolean | null
          collateral_management_enabled: boolean | null
          compliance_automation_level: string | null
          compliance_module: string | null
          compliance_officer_notifications: boolean | null
          compliance_settings: Json | null
          concentration_limits: Json | null
          controller_address: string | null
          corporate_actions: boolean | null
          created_at: string | null
          cross_border_trading_enabled: boolean | null
          cross_chain_bridge_support: boolean | null
          cumulative_voting_enabled: boolean | null
          currency_hedging_enabled: boolean | null
          custody_integration_enabled: boolean | null
          custom_features: Json | null
          decimals: number | null
          default_restriction_policy: string | null
          disaster_recovery_enabled: boolean | null
          dividend_distribution: boolean | null
          document_hash: string | null
          document_management: boolean | null
          document_uri: string | null
          enforce_kyc: boolean | null
          enhanced_reporting_enabled: boolean | null
          esg_reporting_enabled: boolean | null
          financial_data_vendor_integration: boolean | null
          forced_redemption_enabled: boolean | null
          forced_transfers: boolean | null
          foreign_ownership_restrictions: Json | null
          geographic_restrictions: Json | null
          granular_control: boolean | null
          holding_period: number | null
          id: string
          initial_supply: string | null
          institutional_grade: boolean | null
          institutional_voting_services: boolean | null
          institutional_wallet_support: boolean | null
          insurance_coverage_enabled: boolean | null
          investor_accreditation: boolean | null
          investor_limits: Json | null
          investor_whitelist_enabled: boolean | null
          is_burnable: boolean | null
          is_issuable: boolean | null
          is_mintable: boolean | null
          is_multi_class: boolean | null
          is_pausable: boolean | null
          iso20022_messaging_support: boolean | null
          issuance_modules: boolean | null
          issuing_entity_lei: string | null
          issuing_entity_name: string | null
          issuing_jurisdiction: string | null
          jurisdiction_restrictions: Json | null
          kyc_settings: Json | null
          layer2_scaling_support: boolean | null
          legal_terms: string | null
          manual_approvals: boolean | null
          margin_requirements_dynamic: boolean | null
          market_data_feeds_enabled: boolean | null
          max_investor_count: number | null
          mergers_acquisitions_support: boolean | null
          multi_jurisdiction_compliance: boolean | null
          passport_regime_support: boolean | null
          pep_screening_enabled: boolean | null
          performance_analytics_enabled: boolean | null
          position_limits_enabled: boolean | null
          position_reconciliation_enabled: boolean | null
          price_discovery_mechanisms: Json | null
          prime_brokerage_support: boolean | null
          prospectus: string | null
          proxy_voting_enabled: boolean | null
          quorum_requirements: Json | null
          real_time_compliance_monitoring: boolean | null
          real_time_shareholder_registry: boolean | null
          recovery_mechanism: boolean | null
          regulation_type: string | null
          regulatory_equivalence_mapping: Json | null
          regulatory_filing_automation: boolean | null
          regulatory_reporting_automation: boolean | null
          require_kyc: boolean | null
          rights_offerings_enabled: boolean | null
          security_type: string | null
          settlement_integration: string | null
          share_repurchase_automation: boolean | null
          spin_offs_enabled: boolean | null
          stock_dividends_enabled: boolean | null
          stock_splits_enabled: boolean | null
          stress_testing_enabled: boolean | null
          suspicious_activity_reporting: boolean | null
          swift_integration_enabled: boolean | null
          third_party_custody_addresses: string[] | null
          token_details: string | null
          token_id: string
          traditional_finance_integration: boolean | null
          tranche_transferability: boolean | null
          transaction_monitoring_rules: Json | null
          transfer_restrictions: Json | null
          treasury_management_enabled: boolean | null
          treaty_benefits_enabled: boolean | null
          updated_at: string | null
          use_geographic_restrictions: boolean | null
          voting_delegation_enabled: boolean | null
          weighted_voting_by_class: boolean | null
          whitelist_config: Json | null
          whitelist_enabled: boolean | null
          withholding_tax_automation: boolean | null
        }
        Insert: {
          accredited_investor_only?: boolean | null
          advanced_corporate_actions?: boolean | null
          advanced_governance_enabled?: boolean | null
          advanced_risk_management?: boolean | null
          aml_monitoring_enabled?: boolean | null
          audit_trail_comprehensive?: boolean | null
          auto_compliance?: boolean | null
          automated_sanctions_screening?: boolean | null
          beneficial_ownership_tracking?: boolean | null
          board_election_support?: boolean | null
          buyback_programs_enabled?: boolean | null
          cap?: string | null
          central_securities_depository_integration?: boolean | null
          clearing_house_integration?: boolean | null
          collateral_management_enabled?: boolean | null
          compliance_automation_level?: string | null
          compliance_module?: string | null
          compliance_officer_notifications?: boolean | null
          compliance_settings?: Json | null
          concentration_limits?: Json | null
          controller_address?: string | null
          corporate_actions?: boolean | null
          created_at?: string | null
          cross_border_trading_enabled?: boolean | null
          cross_chain_bridge_support?: boolean | null
          cumulative_voting_enabled?: boolean | null
          currency_hedging_enabled?: boolean | null
          custody_integration_enabled?: boolean | null
          custom_features?: Json | null
          decimals?: number | null
          default_restriction_policy?: string | null
          disaster_recovery_enabled?: boolean | null
          dividend_distribution?: boolean | null
          document_hash?: string | null
          document_management?: boolean | null
          document_uri?: string | null
          enforce_kyc?: boolean | null
          enhanced_reporting_enabled?: boolean | null
          esg_reporting_enabled?: boolean | null
          financial_data_vendor_integration?: boolean | null
          forced_redemption_enabled?: boolean | null
          forced_transfers?: boolean | null
          foreign_ownership_restrictions?: Json | null
          geographic_restrictions?: Json | null
          granular_control?: boolean | null
          holding_period?: number | null
          id?: string
          initial_supply?: string | null
          institutional_grade?: boolean | null
          institutional_voting_services?: boolean | null
          institutional_wallet_support?: boolean | null
          insurance_coverage_enabled?: boolean | null
          investor_accreditation?: boolean | null
          investor_limits?: Json | null
          investor_whitelist_enabled?: boolean | null
          is_burnable?: boolean | null
          is_issuable?: boolean | null
          is_mintable?: boolean | null
          is_multi_class?: boolean | null
          is_pausable?: boolean | null
          iso20022_messaging_support?: boolean | null
          issuance_modules?: boolean | null
          issuing_entity_lei?: string | null
          issuing_entity_name?: string | null
          issuing_jurisdiction?: string | null
          jurisdiction_restrictions?: Json | null
          kyc_settings?: Json | null
          layer2_scaling_support?: boolean | null
          legal_terms?: string | null
          manual_approvals?: boolean | null
          margin_requirements_dynamic?: boolean | null
          market_data_feeds_enabled?: boolean | null
          max_investor_count?: number | null
          mergers_acquisitions_support?: boolean | null
          multi_jurisdiction_compliance?: boolean | null
          passport_regime_support?: boolean | null
          pep_screening_enabled?: boolean | null
          performance_analytics_enabled?: boolean | null
          position_limits_enabled?: boolean | null
          position_reconciliation_enabled?: boolean | null
          price_discovery_mechanisms?: Json | null
          prime_brokerage_support?: boolean | null
          prospectus?: string | null
          proxy_voting_enabled?: boolean | null
          quorum_requirements?: Json | null
          real_time_compliance_monitoring?: boolean | null
          real_time_shareholder_registry?: boolean | null
          recovery_mechanism?: boolean | null
          regulation_type?: string | null
          regulatory_equivalence_mapping?: Json | null
          regulatory_filing_automation?: boolean | null
          regulatory_reporting_automation?: boolean | null
          require_kyc?: boolean | null
          rights_offerings_enabled?: boolean | null
          security_type?: string | null
          settlement_integration?: string | null
          share_repurchase_automation?: boolean | null
          spin_offs_enabled?: boolean | null
          stock_dividends_enabled?: boolean | null
          stock_splits_enabled?: boolean | null
          stress_testing_enabled?: boolean | null
          suspicious_activity_reporting?: boolean | null
          swift_integration_enabled?: boolean | null
          third_party_custody_addresses?: string[] | null
          token_details?: string | null
          token_id: string
          traditional_finance_integration?: boolean | null
          tranche_transferability?: boolean | null
          transaction_monitoring_rules?: Json | null
          transfer_restrictions?: Json | null
          treasury_management_enabled?: boolean | null
          treaty_benefits_enabled?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          voting_delegation_enabled?: boolean | null
          weighted_voting_by_class?: boolean | null
          whitelist_config?: Json | null
          whitelist_enabled?: boolean | null
          withholding_tax_automation?: boolean | null
        }
        Update: {
          accredited_investor_only?: boolean | null
          advanced_corporate_actions?: boolean | null
          advanced_governance_enabled?: boolean | null
          advanced_risk_management?: boolean | null
          aml_monitoring_enabled?: boolean | null
          audit_trail_comprehensive?: boolean | null
          auto_compliance?: boolean | null
          automated_sanctions_screening?: boolean | null
          beneficial_ownership_tracking?: boolean | null
          board_election_support?: boolean | null
          buyback_programs_enabled?: boolean | null
          cap?: string | null
          central_securities_depository_integration?: boolean | null
          clearing_house_integration?: boolean | null
          collateral_management_enabled?: boolean | null
          compliance_automation_level?: string | null
          compliance_module?: string | null
          compliance_officer_notifications?: boolean | null
          compliance_settings?: Json | null
          concentration_limits?: Json | null
          controller_address?: string | null
          corporate_actions?: boolean | null
          created_at?: string | null
          cross_border_trading_enabled?: boolean | null
          cross_chain_bridge_support?: boolean | null
          cumulative_voting_enabled?: boolean | null
          currency_hedging_enabled?: boolean | null
          custody_integration_enabled?: boolean | null
          custom_features?: Json | null
          decimals?: number | null
          default_restriction_policy?: string | null
          disaster_recovery_enabled?: boolean | null
          dividend_distribution?: boolean | null
          document_hash?: string | null
          document_management?: boolean | null
          document_uri?: string | null
          enforce_kyc?: boolean | null
          enhanced_reporting_enabled?: boolean | null
          esg_reporting_enabled?: boolean | null
          financial_data_vendor_integration?: boolean | null
          forced_redemption_enabled?: boolean | null
          forced_transfers?: boolean | null
          foreign_ownership_restrictions?: Json | null
          geographic_restrictions?: Json | null
          granular_control?: boolean | null
          holding_period?: number | null
          id?: string
          initial_supply?: string | null
          institutional_grade?: boolean | null
          institutional_voting_services?: boolean | null
          institutional_wallet_support?: boolean | null
          insurance_coverage_enabled?: boolean | null
          investor_accreditation?: boolean | null
          investor_limits?: Json | null
          investor_whitelist_enabled?: boolean | null
          is_burnable?: boolean | null
          is_issuable?: boolean | null
          is_mintable?: boolean | null
          is_multi_class?: boolean | null
          is_pausable?: boolean | null
          iso20022_messaging_support?: boolean | null
          issuance_modules?: boolean | null
          issuing_entity_lei?: string | null
          issuing_entity_name?: string | null
          issuing_jurisdiction?: string | null
          jurisdiction_restrictions?: Json | null
          kyc_settings?: Json | null
          layer2_scaling_support?: boolean | null
          legal_terms?: string | null
          manual_approvals?: boolean | null
          margin_requirements_dynamic?: boolean | null
          market_data_feeds_enabled?: boolean | null
          max_investor_count?: number | null
          mergers_acquisitions_support?: boolean | null
          multi_jurisdiction_compliance?: boolean | null
          passport_regime_support?: boolean | null
          pep_screening_enabled?: boolean | null
          performance_analytics_enabled?: boolean | null
          position_limits_enabled?: boolean | null
          position_reconciliation_enabled?: boolean | null
          price_discovery_mechanisms?: Json | null
          prime_brokerage_support?: boolean | null
          prospectus?: string | null
          proxy_voting_enabled?: boolean | null
          quorum_requirements?: Json | null
          real_time_compliance_monitoring?: boolean | null
          real_time_shareholder_registry?: boolean | null
          recovery_mechanism?: boolean | null
          regulation_type?: string | null
          regulatory_equivalence_mapping?: Json | null
          regulatory_filing_automation?: boolean | null
          regulatory_reporting_automation?: boolean | null
          require_kyc?: boolean | null
          rights_offerings_enabled?: boolean | null
          security_type?: string | null
          settlement_integration?: string | null
          share_repurchase_automation?: boolean | null
          spin_offs_enabled?: boolean | null
          stock_dividends_enabled?: boolean | null
          stock_splits_enabled?: boolean | null
          stress_testing_enabled?: boolean | null
          suspicious_activity_reporting?: boolean | null
          swift_integration_enabled?: boolean | null
          third_party_custody_addresses?: string[] | null
          token_details?: string | null
          token_id?: string
          traditional_finance_integration?: boolean | null
          tranche_transferability?: boolean | null
          transaction_monitoring_rules?: Json | null
          transfer_restrictions?: Json | null
          treasury_management_enabled?: boolean | null
          treaty_benefits_enabled?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          voting_delegation_enabled?: boolean | null
          weighted_voting_by_class?: boolean | null
          whitelist_config?: Json | null
          whitelist_enabled?: boolean | null
          withholding_tax_automation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc1400_regulatory_filings: {
        Row: {
          auto_generated: boolean | null
          compliance_status: string | null
          created_at: string | null
          document_hash: string | null
          document_uri: string | null
          due_date: string | null
          filing_date: string
          filing_jurisdiction: string
          filing_reference: string | null
          filing_type: string
          id: string
          regulatory_body: string | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          compliance_status?: string | null
          created_at?: string | null
          document_hash?: string | null
          document_uri?: string | null
          due_date?: string | null
          filing_date: string
          filing_jurisdiction: string
          filing_reference?: string | null
          filing_type: string
          id?: string
          regulatory_body?: string | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          compliance_status?: string | null
          created_at?: string | null
          document_hash?: string | null
          document_uri?: string | null
          due_date?: string | null
          filing_date?: string
          filing_jurisdiction?: string
          filing_reference?: string | null
          filing_type?: string
          id?: string
          regulatory_body?: string | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc1400_regulatory_filings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc20_properties: {
        Row: {
          access_control: string | null
          allow_management: boolean | null
          anti_whale_enabled: boolean | null
          auto_liquidity_enabled: boolean | null
          blacklist_enabled: boolean | null
          burn_on_transfer: boolean | null
          burn_percentage: string | null
          burnable_by: string | null
          buy_fee_enabled: boolean | null
          cap: string | null
          charity_fee_percentage: string | null
          compliance_config: Json | null
          cooldown_period: number | null
          created_at: string | null
          default_restriction_policy: string | null
          deflation_enabled: boolean | null
          deflation_rate: string | null
          fee_on_transfer: Json | null
          gas_config: Json | null
          governance_enabled: boolean | null
          governance_features: Json | null
          governance_token_address: string | null
          id: string
          initial_supply: string | null
          is_burnable: boolean | null
          is_mintable: boolean | null
          is_pausable: boolean | null
          liquidity_fee_percentage: string | null
          lottery_enabled: boolean | null
          lottery_percentage: string | null
          marketing_fee_percentage: string | null
          max_total_supply: string | null
          max_wallet_amount: string | null
          mintable_by: string | null
          pausable_by: string | null
          permit: boolean | null
          presale_enabled: boolean | null
          presale_end_time: string | null
          presale_rate: string | null
          presale_start_time: string | null
          proposal_threshold: string | null
          quorum_percentage: string | null
          rebasing: Json | null
          reflection_enabled: boolean | null
          reflection_percentage: string | null
          sell_fee_enabled: boolean | null
          snapshot: boolean | null
          staking_enabled: boolean | null
          staking_rewards_rate: string | null
          timelock_delay: number | null
          token_id: string
          token_type: string | null
          trading_start_time: string | null
          transfer_config: Json | null
          updated_at: string | null
          use_geographic_restrictions: boolean | null
          vesting_cliff_period: number | null
          vesting_enabled: boolean | null
          vesting_release_frequency: string | null
          vesting_total_period: number | null
          voting_delay: number | null
          voting_period: number | null
          whitelist_config: Json | null
        }
        Insert: {
          access_control?: string | null
          allow_management?: boolean | null
          anti_whale_enabled?: boolean | null
          auto_liquidity_enabled?: boolean | null
          blacklist_enabled?: boolean | null
          burn_on_transfer?: boolean | null
          burn_percentage?: string | null
          burnable_by?: string | null
          buy_fee_enabled?: boolean | null
          cap?: string | null
          charity_fee_percentage?: string | null
          compliance_config?: Json | null
          cooldown_period?: number | null
          created_at?: string | null
          default_restriction_policy?: string | null
          deflation_enabled?: boolean | null
          deflation_rate?: string | null
          fee_on_transfer?: Json | null
          gas_config?: Json | null
          governance_enabled?: boolean | null
          governance_features?: Json | null
          governance_token_address?: string | null
          id?: string
          initial_supply?: string | null
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          liquidity_fee_percentage?: string | null
          lottery_enabled?: boolean | null
          lottery_percentage?: string | null
          marketing_fee_percentage?: string | null
          max_total_supply?: string | null
          max_wallet_amount?: string | null
          mintable_by?: string | null
          pausable_by?: string | null
          permit?: boolean | null
          presale_enabled?: boolean | null
          presale_end_time?: string | null
          presale_rate?: string | null
          presale_start_time?: string | null
          proposal_threshold?: string | null
          quorum_percentage?: string | null
          rebasing?: Json | null
          reflection_enabled?: boolean | null
          reflection_percentage?: string | null
          sell_fee_enabled?: boolean | null
          snapshot?: boolean | null
          staking_enabled?: boolean | null
          staking_rewards_rate?: string | null
          timelock_delay?: number | null
          token_id: string
          token_type?: string | null
          trading_start_time?: string | null
          transfer_config?: Json | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          vesting_cliff_period?: number | null
          vesting_enabled?: boolean | null
          vesting_release_frequency?: string | null
          vesting_total_period?: number | null
          voting_delay?: number | null
          voting_period?: number | null
          whitelist_config?: Json | null
        }
        Update: {
          access_control?: string | null
          allow_management?: boolean | null
          anti_whale_enabled?: boolean | null
          auto_liquidity_enabled?: boolean | null
          blacklist_enabled?: boolean | null
          burn_on_transfer?: boolean | null
          burn_percentage?: string | null
          burnable_by?: string | null
          buy_fee_enabled?: boolean | null
          cap?: string | null
          charity_fee_percentage?: string | null
          compliance_config?: Json | null
          cooldown_period?: number | null
          created_at?: string | null
          default_restriction_policy?: string | null
          deflation_enabled?: boolean | null
          deflation_rate?: string | null
          fee_on_transfer?: Json | null
          gas_config?: Json | null
          governance_enabled?: boolean | null
          governance_features?: Json | null
          governance_token_address?: string | null
          id?: string
          initial_supply?: string | null
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          liquidity_fee_percentage?: string | null
          lottery_enabled?: boolean | null
          lottery_percentage?: string | null
          marketing_fee_percentage?: string | null
          max_total_supply?: string | null
          max_wallet_amount?: string | null
          mintable_by?: string | null
          pausable_by?: string | null
          permit?: boolean | null
          presale_enabled?: boolean | null
          presale_end_time?: string | null
          presale_rate?: string | null
          presale_start_time?: string | null
          proposal_threshold?: string | null
          quorum_percentage?: string | null
          rebasing?: Json | null
          reflection_enabled?: boolean | null
          reflection_percentage?: string | null
          sell_fee_enabled?: boolean | null
          snapshot?: boolean | null
          staking_enabled?: boolean | null
          staking_rewards_rate?: string | null
          timelock_delay?: number | null
          token_id?: string
          token_type?: string | null
          trading_start_time?: string | null
          transfer_config?: Json | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          vesting_cliff_period?: number | null
          vesting_enabled?: boolean | null
          vesting_release_frequency?: string | null
          vesting_total_period?: number | null
          voting_delay?: number | null
          voting_period?: number | null
          whitelist_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc20_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_allocations: {
        Row: {
          created_at: string | null
          id: string
          linked_token_id: string | null
          recipient: string | null
          slot_id: string
          token_id: string
          token_id_within_slot: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          linked_token_id?: string | null
          recipient?: string | null
          slot_id: string
          token_id: string
          token_id_within_slot: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          linked_token_id?: string | null
          recipient?: string | null
          slot_id?: string
          token_id?: string
          token_id_within_slot?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_linked_token_id_fkey"
            columns: ["linked_token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_payment_schedules: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          is_completed: boolean | null
          payment_amount: string
          payment_date: string
          payment_type: string
          slot_id: string
          token_id: string
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_completed?: boolean | null
          payment_amount: string
          payment_date: string
          payment_type: string
          slot_id: string
          token_id: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_completed?: boolean | null
          payment_amount?: string
          payment_date?: string
          payment_type?: string
          slot_id?: string
          token_id?: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_payment_schedules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_properties: {
        Row: {
          access_control: string | null
          accredited_investor_only: boolean | null
          accrual_enabled: boolean | null
          accrual_frequency: string | null
          accrual_rate: string | null
          allows_slot_enumeration: boolean | null
          approval_workflow_enabled: boolean | null
          audit_trail_enhanced: boolean | null
          auto_unit_calculation: boolean | null
          base_uri: string | null
          batch_operations_enabled: boolean | null
          collateral_factor: string | null
          compound_interest_enabled: boolean | null
          coupon_frequency: string | null
          created_at: string | null
          cross_slot_transfers: boolean | null
          custom_extensions: string | null
          custom_slot_properties: Json | null
          default_restriction_policy: string | null
          delegate_enabled: boolean | null
          derivative_type: string | null
          dynamic_metadata: boolean | null
          dynamic_slot_creation: boolean | null
          early_redemption_enabled: boolean | null
          emergency_pause_enabled: boolean | null
          expiration_date: string | null
          financial_instrument_type: string | null
          flash_loan_enabled: boolean | null
          fractional_ownership_enabled: boolean | null
          fractionalizable: boolean | null
          geographic_restrictions: string[] | null
          has_royalty: boolean | null
          holding_period_restrictions: number | null
          id: string
          institutional_custody_support: boolean | null
          interest_rate: string | null
          is_burnable: boolean | null
          is_pausable: boolean | null
          kyc_required: boolean | null
          leverage_ratio: string | null
          liquidation_threshold: string | null
          liquidity_provision_enabled: boolean | null
          margin_requirements: Json | null
          market_maker_enabled: boolean | null
          maturity_date: string | null
          mergable: boolean | null
          metadata: Json | null
          metadata_storage: string | null
          minimum_trade_value: string | null
          multi_signature_required: boolean | null
          partial_value_trading: boolean | null
          payment_schedule: Json | null
          permissioning_advanced: boolean | null
          permissioning_enabled: boolean | null
          principal_amount: string | null
          proposal_value_threshold: string | null
          quorum_calculation_method: string | null
          recovery_mechanisms: Json | null
          redemption_penalty_rate: string | null
          regulatory_compliance_enabled: boolean | null
          reporting_requirements: Json | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          settlement_type: string | null
          slot_admin_roles: string[] | null
          slot_approvals: boolean | null
          slot_creation_enabled: boolean | null
          slot_enumeration_enabled: boolean | null
          slot_freeze_enabled: boolean | null
          slot_marketplace_enabled: boolean | null
          slot_merge_enabled: boolean | null
          slot_split_enabled: boolean | null
          slot_transfer_restrictions: Json | null
          slot_transfer_validation: Json | null
          slot_type: string | null
          slot_voting_enabled: boolean | null
          splittable: boolean | null
          staking_yield_rate: string | null
          strike_price: string | null
          supply_tracking: boolean | null
          token_id: string
          trading_fee_percentage: string | null
          trading_fees_enabled: boolean | null
          transfer_limits: Json | null
          underlying_asset: string | null
          underlying_asset_address: string | null
          updatable_slots: boolean | null
          updatable_uris: boolean | null
          updatable_values: boolean | null
          updated_at: string | null
          use_geographic_restrictions: boolean | null
          value_adjustment_enabled: boolean | null
          value_aggregation: boolean | null
          value_aggregation_enabled: boolean | null
          value_approvals: boolean | null
          value_calculation_formula: string | null
          value_computation_method: string | null
          value_decimals: number | null
          value_marketplace_enabled: boolean | null
          value_oracle_address: string | null
          value_transfer_restrictions: Json | null
          value_transfers_enabled: boolean | null
          value_weighted_voting: boolean | null
          voting_power_calculation: string | null
          whitelist_config: Json | null
          yield_farming_enabled: boolean | null
        }
        Insert: {
          access_control?: string | null
          accredited_investor_only?: boolean | null
          accrual_enabled?: boolean | null
          accrual_frequency?: string | null
          accrual_rate?: string | null
          allows_slot_enumeration?: boolean | null
          approval_workflow_enabled?: boolean | null
          audit_trail_enhanced?: boolean | null
          auto_unit_calculation?: boolean | null
          base_uri?: string | null
          batch_operations_enabled?: boolean | null
          collateral_factor?: string | null
          compound_interest_enabled?: boolean | null
          coupon_frequency?: string | null
          created_at?: string | null
          cross_slot_transfers?: boolean | null
          custom_extensions?: string | null
          custom_slot_properties?: Json | null
          default_restriction_policy?: string | null
          delegate_enabled?: boolean | null
          derivative_type?: string | null
          dynamic_metadata?: boolean | null
          dynamic_slot_creation?: boolean | null
          early_redemption_enabled?: boolean | null
          emergency_pause_enabled?: boolean | null
          expiration_date?: string | null
          financial_instrument_type?: string | null
          flash_loan_enabled?: boolean | null
          fractional_ownership_enabled?: boolean | null
          fractionalizable?: boolean | null
          geographic_restrictions?: string[] | null
          has_royalty?: boolean | null
          holding_period_restrictions?: number | null
          id?: string
          institutional_custody_support?: boolean | null
          interest_rate?: string | null
          is_burnable?: boolean | null
          is_pausable?: boolean | null
          kyc_required?: boolean | null
          leverage_ratio?: string | null
          liquidation_threshold?: string | null
          liquidity_provision_enabled?: boolean | null
          margin_requirements?: Json | null
          market_maker_enabled?: boolean | null
          maturity_date?: string | null
          mergable?: boolean | null
          metadata?: Json | null
          metadata_storage?: string | null
          minimum_trade_value?: string | null
          multi_signature_required?: boolean | null
          partial_value_trading?: boolean | null
          payment_schedule?: Json | null
          permissioning_advanced?: boolean | null
          permissioning_enabled?: boolean | null
          principal_amount?: string | null
          proposal_value_threshold?: string | null
          quorum_calculation_method?: string | null
          recovery_mechanisms?: Json | null
          redemption_penalty_rate?: string | null
          regulatory_compliance_enabled?: boolean | null
          reporting_requirements?: Json | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          settlement_type?: string | null
          slot_admin_roles?: string[] | null
          slot_approvals?: boolean | null
          slot_creation_enabled?: boolean | null
          slot_enumeration_enabled?: boolean | null
          slot_freeze_enabled?: boolean | null
          slot_marketplace_enabled?: boolean | null
          slot_merge_enabled?: boolean | null
          slot_split_enabled?: boolean | null
          slot_transfer_restrictions?: Json | null
          slot_transfer_validation?: Json | null
          slot_type?: string | null
          slot_voting_enabled?: boolean | null
          splittable?: boolean | null
          staking_yield_rate?: string | null
          strike_price?: string | null
          supply_tracking?: boolean | null
          token_id: string
          trading_fee_percentage?: string | null
          trading_fees_enabled?: boolean | null
          transfer_limits?: Json | null
          underlying_asset?: string | null
          underlying_asset_address?: string | null
          updatable_slots?: boolean | null
          updatable_uris?: boolean | null
          updatable_values?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          value_adjustment_enabled?: boolean | null
          value_aggregation?: boolean | null
          value_aggregation_enabled?: boolean | null
          value_approvals?: boolean | null
          value_calculation_formula?: string | null
          value_computation_method?: string | null
          value_decimals?: number | null
          value_marketplace_enabled?: boolean | null
          value_oracle_address?: string | null
          value_transfer_restrictions?: Json | null
          value_transfers_enabled?: boolean | null
          value_weighted_voting?: boolean | null
          voting_power_calculation?: string | null
          whitelist_config?: Json | null
          yield_farming_enabled?: boolean | null
        }
        Update: {
          access_control?: string | null
          accredited_investor_only?: boolean | null
          accrual_enabled?: boolean | null
          accrual_frequency?: string | null
          accrual_rate?: string | null
          allows_slot_enumeration?: boolean | null
          approval_workflow_enabled?: boolean | null
          audit_trail_enhanced?: boolean | null
          auto_unit_calculation?: boolean | null
          base_uri?: string | null
          batch_operations_enabled?: boolean | null
          collateral_factor?: string | null
          compound_interest_enabled?: boolean | null
          coupon_frequency?: string | null
          created_at?: string | null
          cross_slot_transfers?: boolean | null
          custom_extensions?: string | null
          custom_slot_properties?: Json | null
          default_restriction_policy?: string | null
          delegate_enabled?: boolean | null
          derivative_type?: string | null
          dynamic_metadata?: boolean | null
          dynamic_slot_creation?: boolean | null
          early_redemption_enabled?: boolean | null
          emergency_pause_enabled?: boolean | null
          expiration_date?: string | null
          financial_instrument_type?: string | null
          flash_loan_enabled?: boolean | null
          fractional_ownership_enabled?: boolean | null
          fractionalizable?: boolean | null
          geographic_restrictions?: string[] | null
          has_royalty?: boolean | null
          holding_period_restrictions?: number | null
          id?: string
          institutional_custody_support?: boolean | null
          interest_rate?: string | null
          is_burnable?: boolean | null
          is_pausable?: boolean | null
          kyc_required?: boolean | null
          leverage_ratio?: string | null
          liquidation_threshold?: string | null
          liquidity_provision_enabled?: boolean | null
          margin_requirements?: Json | null
          market_maker_enabled?: boolean | null
          maturity_date?: string | null
          mergable?: boolean | null
          metadata?: Json | null
          metadata_storage?: string | null
          minimum_trade_value?: string | null
          multi_signature_required?: boolean | null
          partial_value_trading?: boolean | null
          payment_schedule?: Json | null
          permissioning_advanced?: boolean | null
          permissioning_enabled?: boolean | null
          principal_amount?: string | null
          proposal_value_threshold?: string | null
          quorum_calculation_method?: string | null
          recovery_mechanisms?: Json | null
          redemption_penalty_rate?: string | null
          regulatory_compliance_enabled?: boolean | null
          reporting_requirements?: Json | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          settlement_type?: string | null
          slot_admin_roles?: string[] | null
          slot_approvals?: boolean | null
          slot_creation_enabled?: boolean | null
          slot_enumeration_enabled?: boolean | null
          slot_freeze_enabled?: boolean | null
          slot_marketplace_enabled?: boolean | null
          slot_merge_enabled?: boolean | null
          slot_split_enabled?: boolean | null
          slot_transfer_restrictions?: Json | null
          slot_transfer_validation?: Json | null
          slot_type?: string | null
          slot_voting_enabled?: boolean | null
          splittable?: boolean | null
          staking_yield_rate?: string | null
          strike_price?: string | null
          supply_tracking?: boolean | null
          token_id?: string
          trading_fee_percentage?: string | null
          trading_fees_enabled?: boolean | null
          transfer_limits?: Json | null
          underlying_asset?: string | null
          underlying_asset_address?: string | null
          updatable_slots?: boolean | null
          updatable_uris?: boolean | null
          updatable_values?: boolean | null
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          value_adjustment_enabled?: boolean | null
          value_aggregation?: boolean | null
          value_aggregation_enabled?: boolean | null
          value_approvals?: boolean | null
          value_calculation_formula?: string | null
          value_computation_method?: string | null
          value_decimals?: number | null
          value_marketplace_enabled?: boolean | null
          value_oracle_address?: string | null
          value_transfer_restrictions?: Json | null
          value_transfers_enabled?: boolean | null
          value_weighted_voting?: boolean | null
          voting_power_calculation?: string | null
          whitelist_config?: Json | null
          yield_farming_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_slot_configs: {
        Row: {
          created_at: string | null
          divisible: boolean | null
          id: string
          max_value: string | null
          min_value: string | null
          slot_description: string | null
          slot_id: string
          slot_name: string | null
          slot_properties: Json | null
          slot_type: string | null
          token_id: string
          tradeable: boolean | null
          transferable: boolean | null
          updated_at: string | null
          value_precision: number | null
          value_units: string | null
        }
        Insert: {
          created_at?: string | null
          divisible?: boolean | null
          id?: string
          max_value?: string | null
          min_value?: string | null
          slot_description?: string | null
          slot_id: string
          slot_name?: string | null
          slot_properties?: Json | null
          slot_type?: string | null
          token_id: string
          tradeable?: boolean | null
          transferable?: boolean | null
          updated_at?: string | null
          value_precision?: number | null
          value_units?: string | null
        }
        Update: {
          created_at?: string | null
          divisible?: boolean | null
          id?: string
          max_value?: string | null
          min_value?: string | null
          slot_description?: string | null
          slot_id?: string
          slot_name?: string | null
          slot_properties?: Json | null
          slot_type?: string | null
          token_id?: string
          tradeable?: boolean | null
          transferable?: boolean | null
          updated_at?: string | null
          value_precision?: number | null
          value_units?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slot_configs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_slots: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string | null
          slot_id: string
          slot_transferable: boolean | null
          token_id: string
          updated_at: string | null
          value_units: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          slot_id: string
          slot_transferable?: boolean | null
          token_id: string
          updated_at?: string | null
          value_units?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string | null
          slot_id?: string
          slot_transferable?: boolean | null
          token_id?: string
          updated_at?: string | null
          value_units?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_slots_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc3525_value_adjustments: {
        Row: {
          adjustment_amount: string
          adjustment_date: string | null
          adjustment_reason: string | null
          adjustment_type: string
          approved_by: string | null
          created_at: string | null
          id: string
          oracle_price: string | null
          oracle_source: string | null
          slot_id: string
          token_id: string
          transaction_hash: string | null
        }
        Insert: {
          adjustment_amount: string
          adjustment_date?: string | null
          adjustment_reason?: string | null
          adjustment_type: string
          approved_by?: string | null
          created_at?: string | null
          id?: string
          oracle_price?: string | null
          oracle_source?: string | null
          slot_id: string
          token_id: string
          transaction_hash?: string | null
        }
        Update: {
          adjustment_amount?: string
          adjustment_date?: string | null
          adjustment_reason?: string | null
          adjustment_type?: string
          approved_by?: string | null
          created_at?: string | null
          id?: string
          oracle_price?: string | null
          oracle_source?: string | null
          slot_id?: string
          token_id?: string
          transaction_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc3525_value_adjustments_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_asset_allocations: {
        Row: {
          asset: string
          created_at: string | null
          description: string | null
          expected_apy: string | null
          id: string
          percentage: string
          protocol: string | null
          token_id: string
          updated_at: string | null
        }
        Insert: {
          asset: string
          created_at?: string | null
          description?: string | null
          expected_apy?: string | null
          id?: string
          percentage: string
          protocol?: string | null
          token_id: string
          updated_at?: string | null
        }
        Update: {
          asset?: string
          created_at?: string | null
          description?: string | null
          expected_apy?: string | null
          id?: string
          percentage?: string
          protocol?: string | null
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_asset_allocations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_fee_tiers: {
        Row: {
          created_at: string | null
          deposit_fee_rate: string | null
          id: string
          is_active: boolean | null
          management_fee_rate: string
          max_balance: string | null
          min_balance: string
          performance_fee_rate: string
          tier_benefits: Json | null
          tier_name: string
          token_id: string
          updated_at: string | null
          withdrawal_fee_rate: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_fee_rate?: string | null
          id?: string
          is_active?: boolean | null
          management_fee_rate: string
          max_balance?: string | null
          min_balance: string
          performance_fee_rate: string
          tier_benefits?: Json | null
          tier_name: string
          token_id: string
          updated_at?: string | null
          withdrawal_fee_rate?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_fee_rate?: string | null
          id?: string
          is_active?: boolean | null
          management_fee_rate?: string
          max_balance?: string | null
          min_balance?: string
          performance_fee_rate?: string
          tier_benefits?: Json | null
          tier_name?: string
          token_id?: string
          updated_at?: string | null
          withdrawal_fee_rate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_fee_tiers_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_performance_metrics: {
        Row: {
          apy: string | null
          benchmark_performance: string | null
          created_at: string | null
          daily_yield: string | null
          id: string
          max_drawdown: string | null
          metric_date: string
          net_flow: string | null
          new_deposits: string | null
          share_price: string
          sharpe_ratio: string | null
          token_id: string
          total_assets: string
          total_fees_collected: string | null
          volatility: string | null
          withdrawals: string | null
        }
        Insert: {
          apy?: string | null
          benchmark_performance?: string | null
          created_at?: string | null
          daily_yield?: string | null
          id?: string
          max_drawdown?: string | null
          metric_date: string
          net_flow?: string | null
          new_deposits?: string | null
          share_price: string
          sharpe_ratio?: string | null
          token_id: string
          total_assets: string
          total_fees_collected?: string | null
          volatility?: string | null
          withdrawals?: string | null
        }
        Update: {
          apy?: string | null
          benchmark_performance?: string | null
          created_at?: string | null
          daily_yield?: string | null
          id?: string
          max_drawdown?: string | null
          metric_date?: string
          net_flow?: string | null
          new_deposits?: string | null
          share_price?: string
          sharpe_ratio?: string | null
          token_id?: string
          total_assets?: string
          total_fees_collected?: string | null
          volatility?: string | null
          withdrawals?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_performance_metrics_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_properties: {
        Row: {
          access_control: string | null
          apy_tracking_enabled: boolean | null
          arbitrage_enabled: boolean | null
          asset_address: string | null
          asset_decimals: number | null
          asset_name: string | null
          asset_symbol: string | null
          audit_trail_comprehensive: boolean | null
          auto_compounding_enabled: boolean | null
          automated_rebalancing: boolean | null
          automated_reporting: boolean | null
          benchmark_index: string | null
          benchmark_tracking_enabled: boolean | null
          borrowing_enabled: boolean | null
          bridge_protocols: string[] | null
          circuit_breaker_enabled: boolean | null
          compliance_reporting_enabled: boolean | null
          compound_frequency: string | null
          created_at: string | null
          cross_chain_yield_enabled: boolean | null
          cross_dex_optimization: boolean | null
          custody_integration: boolean | null
          custom_strategy: boolean | null
          default_restriction_policy: string | null
          defi_protocol_integrations: string[] | null
          deposit_fee: string | null
          deposit_limit: string | null
          diversification_enabled: boolean | null
          dynamic_fees_enabled: boolean | null
          early_withdrawal_penalty: string | null
          emergency_exit_enabled: boolean | null
          emergency_shutdown: boolean | null
          fee_rebate_enabled: boolean | null
          fee_recipient: string | null
          fee_structure: Json | null
          fee_tier_system_enabled: boolean | null
          fee_voting_enabled: boolean | null
          flash_loans: boolean | null
          fund_administration_enabled: boolean | null
          gas_fee_optimization: boolean | null
          governance_token_address: string | null
          governance_token_enabled: boolean | null
          id: string
          impermanent_loss_protection: boolean | null
          institutional_grade: boolean | null
          insurance_coverage_amount: string | null
          insurance_enabled: boolean | null
          insurance_provider: string | null
          is_burnable: boolean | null
          is_mintable: boolean | null
          is_pausable: boolean | null
          late_withdrawal_penalty: string | null
          lending_protocol_enabled: boolean | null
          leverage_enabled: boolean | null
          liquidity_incentives_rate: string | null
          liquidity_mining_enabled: boolean | null
          liquidity_provider_rewards: Json | null
          liquidity_reserve: string | null
          management_fee: string | null
          manager_performance_threshold: string | null
          manager_replacement_enabled: boolean | null
          market_making_enabled: boolean | null
          max_deposit: string | null
          max_drawdown_threshold: string | null
          max_leverage_ratio: string | null
          max_slippage: string | null
          max_withdrawal: string | null
          min_deposit: string | null
          min_withdrawal: string | null
          mobile_app_integration: boolean | null
          multi_asset_enabled: boolean | null
          notification_system_enabled: boolean | null
          performance_fee: string | null
          performance_fee_high_water_mark: boolean | null
          performance_history_retention: number | null
          performance_metrics: boolean | null
          performance_tracking: boolean | null
          permit: boolean | null
          portfolio_analytics_enabled: boolean | null
          real_time_pnl_tracking: boolean | null
          rebalance_threshold: string | null
          rebalancing_enabled: boolean | null
          rebalancing_rules: Json | null
          regulatory_framework: string | null
          risk_management_enabled: boolean | null
          risk_tolerance: string | null
          social_trading_enabled: boolean | null
          stop_loss_enabled: boolean | null
          stop_loss_threshold: string | null
          strategy_complexity: string | null
          strategy_controller: string | null
          strategy_documentation: string | null
          strategy_voting_enabled: boolean | null
          tax_reporting_enabled: boolean | null
          third_party_audits_enabled: boolean | null
          token_id: string
          updated_at: string | null
          use_geographic_restrictions: boolean | null
          vault_strategy: string | null
          vault_type: string | null
          voting_power_per_share: string | null
          whitelist_config: Json | null
          withdrawal_fee: string | null
          withdrawal_limit: string | null
          withdrawal_rules: Json | null
          yield_distribution_schedule: string | null
          yield_optimization_enabled: boolean | null
          yield_optimization_strategy: string | null
          yield_source: string | null
          yield_sources: Json | null
        }
        Insert: {
          access_control?: string | null
          apy_tracking_enabled?: boolean | null
          arbitrage_enabled?: boolean | null
          asset_address?: string | null
          asset_decimals?: number | null
          asset_name?: string | null
          asset_symbol?: string | null
          audit_trail_comprehensive?: boolean | null
          auto_compounding_enabled?: boolean | null
          automated_rebalancing?: boolean | null
          automated_reporting?: boolean | null
          benchmark_index?: string | null
          benchmark_tracking_enabled?: boolean | null
          borrowing_enabled?: boolean | null
          bridge_protocols?: string[] | null
          circuit_breaker_enabled?: boolean | null
          compliance_reporting_enabled?: boolean | null
          compound_frequency?: string | null
          created_at?: string | null
          cross_chain_yield_enabled?: boolean | null
          cross_dex_optimization?: boolean | null
          custody_integration?: boolean | null
          custom_strategy?: boolean | null
          default_restriction_policy?: string | null
          defi_protocol_integrations?: string[] | null
          deposit_fee?: string | null
          deposit_limit?: string | null
          diversification_enabled?: boolean | null
          dynamic_fees_enabled?: boolean | null
          early_withdrawal_penalty?: string | null
          emergency_exit_enabled?: boolean | null
          emergency_shutdown?: boolean | null
          fee_rebate_enabled?: boolean | null
          fee_recipient?: string | null
          fee_structure?: Json | null
          fee_tier_system_enabled?: boolean | null
          fee_voting_enabled?: boolean | null
          flash_loans?: boolean | null
          fund_administration_enabled?: boolean | null
          gas_fee_optimization?: boolean | null
          governance_token_address?: string | null
          governance_token_enabled?: boolean | null
          id?: string
          impermanent_loss_protection?: boolean | null
          institutional_grade?: boolean | null
          insurance_coverage_amount?: string | null
          insurance_enabled?: boolean | null
          insurance_provider?: string | null
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          late_withdrawal_penalty?: string | null
          lending_protocol_enabled?: boolean | null
          leverage_enabled?: boolean | null
          liquidity_incentives_rate?: string | null
          liquidity_mining_enabled?: boolean | null
          liquidity_provider_rewards?: Json | null
          liquidity_reserve?: string | null
          management_fee?: string | null
          manager_performance_threshold?: string | null
          manager_replacement_enabled?: boolean | null
          market_making_enabled?: boolean | null
          max_deposit?: string | null
          max_drawdown_threshold?: string | null
          max_leverage_ratio?: string | null
          max_slippage?: string | null
          max_withdrawal?: string | null
          min_deposit?: string | null
          min_withdrawal?: string | null
          mobile_app_integration?: boolean | null
          multi_asset_enabled?: boolean | null
          notification_system_enabled?: boolean | null
          performance_fee?: string | null
          performance_fee_high_water_mark?: boolean | null
          performance_history_retention?: number | null
          performance_metrics?: boolean | null
          performance_tracking?: boolean | null
          permit?: boolean | null
          portfolio_analytics_enabled?: boolean | null
          real_time_pnl_tracking?: boolean | null
          rebalance_threshold?: string | null
          rebalancing_enabled?: boolean | null
          rebalancing_rules?: Json | null
          regulatory_framework?: string | null
          risk_management_enabled?: boolean | null
          risk_tolerance?: string | null
          social_trading_enabled?: boolean | null
          stop_loss_enabled?: boolean | null
          stop_loss_threshold?: string | null
          strategy_complexity?: string | null
          strategy_controller?: string | null
          strategy_documentation?: string | null
          strategy_voting_enabled?: boolean | null
          tax_reporting_enabled?: boolean | null
          third_party_audits_enabled?: boolean | null
          token_id: string
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          vault_strategy?: string | null
          vault_type?: string | null
          voting_power_per_share?: string | null
          whitelist_config?: Json | null
          withdrawal_fee?: string | null
          withdrawal_limit?: string | null
          withdrawal_rules?: Json | null
          yield_distribution_schedule?: string | null
          yield_optimization_enabled?: boolean | null
          yield_optimization_strategy?: string | null
          yield_source?: string | null
          yield_sources?: Json | null
        }
        Update: {
          access_control?: string | null
          apy_tracking_enabled?: boolean | null
          arbitrage_enabled?: boolean | null
          asset_address?: string | null
          asset_decimals?: number | null
          asset_name?: string | null
          asset_symbol?: string | null
          audit_trail_comprehensive?: boolean | null
          auto_compounding_enabled?: boolean | null
          automated_rebalancing?: boolean | null
          automated_reporting?: boolean | null
          benchmark_index?: string | null
          benchmark_tracking_enabled?: boolean | null
          borrowing_enabled?: boolean | null
          bridge_protocols?: string[] | null
          circuit_breaker_enabled?: boolean | null
          compliance_reporting_enabled?: boolean | null
          compound_frequency?: string | null
          created_at?: string | null
          cross_chain_yield_enabled?: boolean | null
          cross_dex_optimization?: boolean | null
          custody_integration?: boolean | null
          custom_strategy?: boolean | null
          default_restriction_policy?: string | null
          defi_protocol_integrations?: string[] | null
          deposit_fee?: string | null
          deposit_limit?: string | null
          diversification_enabled?: boolean | null
          dynamic_fees_enabled?: boolean | null
          early_withdrawal_penalty?: string | null
          emergency_exit_enabled?: boolean | null
          emergency_shutdown?: boolean | null
          fee_rebate_enabled?: boolean | null
          fee_recipient?: string | null
          fee_structure?: Json | null
          fee_tier_system_enabled?: boolean | null
          fee_voting_enabled?: boolean | null
          flash_loans?: boolean | null
          fund_administration_enabled?: boolean | null
          gas_fee_optimization?: boolean | null
          governance_token_address?: string | null
          governance_token_enabled?: boolean | null
          id?: string
          impermanent_loss_protection?: boolean | null
          institutional_grade?: boolean | null
          insurance_coverage_amount?: string | null
          insurance_enabled?: boolean | null
          insurance_provider?: string | null
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          late_withdrawal_penalty?: string | null
          lending_protocol_enabled?: boolean | null
          leverage_enabled?: boolean | null
          liquidity_incentives_rate?: string | null
          liquidity_mining_enabled?: boolean | null
          liquidity_provider_rewards?: Json | null
          liquidity_reserve?: string | null
          management_fee?: string | null
          manager_performance_threshold?: string | null
          manager_replacement_enabled?: boolean | null
          market_making_enabled?: boolean | null
          max_deposit?: string | null
          max_drawdown_threshold?: string | null
          max_leverage_ratio?: string | null
          max_slippage?: string | null
          max_withdrawal?: string | null
          min_deposit?: string | null
          min_withdrawal?: string | null
          mobile_app_integration?: boolean | null
          multi_asset_enabled?: boolean | null
          notification_system_enabled?: boolean | null
          performance_fee?: string | null
          performance_fee_high_water_mark?: boolean | null
          performance_history_retention?: number | null
          performance_metrics?: boolean | null
          performance_tracking?: boolean | null
          permit?: boolean | null
          portfolio_analytics_enabled?: boolean | null
          real_time_pnl_tracking?: boolean | null
          rebalance_threshold?: string | null
          rebalancing_enabled?: boolean | null
          rebalancing_rules?: Json | null
          regulatory_framework?: string | null
          risk_management_enabled?: boolean | null
          risk_tolerance?: string | null
          social_trading_enabled?: boolean | null
          stop_loss_enabled?: boolean | null
          stop_loss_threshold?: string | null
          strategy_complexity?: string | null
          strategy_controller?: string | null
          strategy_documentation?: string | null
          strategy_voting_enabled?: boolean | null
          tax_reporting_enabled?: boolean | null
          third_party_audits_enabled?: boolean | null
          token_id?: string
          updated_at?: string | null
          use_geographic_restrictions?: boolean | null
          vault_strategy?: string | null
          vault_type?: string | null
          voting_power_per_share?: string | null
          whitelist_config?: Json | null
          withdrawal_fee?: string | null
          withdrawal_limit?: string | null
          withdrawal_rules?: Json | null
          yield_distribution_schedule?: string | null
          yield_optimization_enabled?: boolean | null
          yield_optimization_strategy?: string | null
          yield_source?: string | null
          yield_sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_strategy_params: {
        Row: {
          created_at: string | null
          default_value: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          param_type: string | null
          token_id: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          param_type?: string | null
          token_id: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          default_value?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          param_type?: string | null
          token_id?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_strategy_params_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc4626_vault_strategies: {
        Row: {
          actual_apy: string | null
          allocation_percentage: string
          created_at: string | null
          expected_apy: string | null
          id: string
          is_active: boolean | null
          last_rebalance: string | null
          max_allocation_percentage: string | null
          min_allocation_percentage: string | null
          protocol_address: string | null
          protocol_name: string | null
          risk_score: number | null
          strategy_name: string
          strategy_type: string
          token_id: string
          updated_at: string | null
        }
        Insert: {
          actual_apy?: string | null
          allocation_percentage: string
          created_at?: string | null
          expected_apy?: string | null
          id?: string
          is_active?: boolean | null
          last_rebalance?: string | null
          max_allocation_percentage?: string | null
          min_allocation_percentage?: string | null
          protocol_address?: string | null
          protocol_name?: string | null
          risk_score?: number | null
          strategy_name: string
          strategy_type: string
          token_id: string
          updated_at?: string | null
        }
        Update: {
          actual_apy?: string | null
          allocation_percentage?: string
          created_at?: string | null
          expected_apy?: string | null
          id?: string
          is_active?: boolean | null
          last_rebalance?: string | null
          max_allocation_percentage?: string | null
          min_allocation_percentage?: string | null
          protocol_address?: string | null
          protocol_name?: string | null
          risk_score?: number | null
          strategy_name?: string
          strategy_type?: string
          token_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc4626_vault_strategies_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc721_attributes: {
        Row: {
          created_at: string | null
          id: string
          token_id: string
          trait_type: string
          updated_at: string | null
          values: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          token_id: string
          trait_type: string
          updated_at?: string | null
          values: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          token_id?: string
          trait_type?: string
          updated_at?: string | null
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_attributes_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc721_mint_phases: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          max_per_wallet: number | null
          max_supply: number | null
          merkle_root: string | null
          phase_name: string
          phase_order: number
          price: string | null
          start_time: string | null
          token_id: string
          updated_at: string | null
          whitelist_required: boolean | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          max_per_wallet?: number | null
          max_supply?: number | null
          merkle_root?: string | null
          phase_name: string
          phase_order: number
          price?: string | null
          start_time?: string | null
          token_id: string
          updated_at?: string | null
          whitelist_required?: boolean | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          max_per_wallet?: number | null
          max_supply?: number | null
          merkle_root?: string | null
          phase_name?: string
          phase_order?: number
          price?: string | null
          start_time?: string | null
          token_id?: string
          updated_at?: string | null
          whitelist_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_mint_phases_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc721_properties: {
        Row: {
          access_control: string | null
          admin_mint_enabled: boolean | null
          asset_type: string | null
          auto_increment_ids: boolean | null
          auto_reveal: boolean | null
          base_uri: string | null
          batch_minting_config: Json | null
          breeding_enabled: boolean | null
          bridge_contracts: Json | null
          burn_roles: string[] | null
          contract_uri: string | null
          created_at: string | null
          creator_earnings_address: string | null
          creator_earnings_enabled: boolean | null
          creator_earnings_percentage: string | null
          cross_chain_enabled: boolean | null
          custom_base_uri: string | null
          custom_operator_filter_address: string | null
          default_restriction_policy: string | null
          dutch_auction_duration: number | null
          dutch_auction_enabled: boolean | null
          dutch_auction_end_price: string | null
          dutch_auction_start_price: string | null
          dynamic_uri_config: Json | null
          enable_dynamic_metadata: boolean | null
          enable_fractional_ownership: boolean | null
          enumerable: boolean | null
          evolution_enabled: boolean | null
          has_royalty: boolean | null
          id: string
          is_burnable: boolean | null
          is_mintable: boolean | null
          is_pausable: boolean | null
          layer2_enabled: boolean | null
          layer2_networks: string[] | null
          marketplace_approved: string[] | null
          max_mints_per_tx: number | null
          max_mints_per_wallet: number | null
          max_supply: string | null
          metadata_frozen: boolean | null
          metadata_provenance_hash: string | null
          metadata_storage: string | null
          mint_phases_enabled: boolean | null
          mint_roles: string[] | null
          minting_method: string | null
          minting_price: string | null
          operator_filter_enabled: boolean | null
          permission_config: Json | null
          placeholder_image_uri: string | null
          pre_reveal_uri: string | null
          public_mint_enabled: boolean | null
          public_sale_enabled: boolean | null
          public_sale_end_time: string | null
          public_sale_price: string | null
          public_sale_start_time: string | null
          reserved_tokens: number | null
          reveal_batch_size: number | null
          reveal_delay: number | null
          revealable: boolean | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          soulbound: boolean | null
          staking_enabled: boolean | null
          staking_rewards_rate: string | null
          staking_rewards_token_address: string | null
          supply_cap_enabled: boolean | null
          supply_validation_enabled: boolean | null
          token_id: string
          total_supply_cap: string | null
          transfer_locked: boolean | null
          transfer_restrictions: Json | null
          updatable_uris: boolean | null
          updated_at: string | null
          uri_storage: string | null
          use_geographic_restrictions: boolean | null
          use_safe_transfer: boolean | null
          utility_enabled: boolean | null
          utility_type: string | null
          whitelist_config: Json | null
          whitelist_sale_enabled: boolean | null
          whitelist_sale_end_time: string | null
          whitelist_sale_price: string | null
          whitelist_sale_start_time: string | null
        }
        Insert: {
          access_control?: string | null
          admin_mint_enabled?: boolean | null
          asset_type?: string | null
          auto_increment_ids?: boolean | null
          auto_reveal?: boolean | null
          base_uri?: string | null
          batch_minting_config?: Json | null
          breeding_enabled?: boolean | null
          bridge_contracts?: Json | null
          burn_roles?: string[] | null
          contract_uri?: string | null
          created_at?: string | null
          creator_earnings_address?: string | null
          creator_earnings_enabled?: boolean | null
          creator_earnings_percentage?: string | null
          cross_chain_enabled?: boolean | null
          custom_base_uri?: string | null
          custom_operator_filter_address?: string | null
          default_restriction_policy?: string | null
          dutch_auction_duration?: number | null
          dutch_auction_enabled?: boolean | null
          dutch_auction_end_price?: string | null
          dutch_auction_start_price?: string | null
          dynamic_uri_config?: Json | null
          enable_dynamic_metadata?: boolean | null
          enable_fractional_ownership?: boolean | null
          enumerable?: boolean | null
          evolution_enabled?: boolean | null
          has_royalty?: boolean | null
          id?: string
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          layer2_enabled?: boolean | null
          layer2_networks?: string[] | null
          marketplace_approved?: string[] | null
          max_mints_per_tx?: number | null
          max_mints_per_wallet?: number | null
          max_supply?: string | null
          metadata_frozen?: boolean | null
          metadata_provenance_hash?: string | null
          metadata_storage?: string | null
          mint_phases_enabled?: boolean | null
          mint_roles?: string[] | null
          minting_method?: string | null
          minting_price?: string | null
          operator_filter_enabled?: boolean | null
          permission_config?: Json | null
          placeholder_image_uri?: string | null
          pre_reveal_uri?: string | null
          public_mint_enabled?: boolean | null
          public_sale_enabled?: boolean | null
          public_sale_end_time?: string | null
          public_sale_price?: string | null
          public_sale_start_time?: string | null
          reserved_tokens?: number | null
          reveal_batch_size?: number | null
          reveal_delay?: number | null
          revealable?: boolean | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          soulbound?: boolean | null
          staking_enabled?: boolean | null
          staking_rewards_rate?: string | null
          staking_rewards_token_address?: string | null
          supply_cap_enabled?: boolean | null
          supply_validation_enabled?: boolean | null
          token_id: string
          total_supply_cap?: string | null
          transfer_locked?: boolean | null
          transfer_restrictions?: Json | null
          updatable_uris?: boolean | null
          updated_at?: string | null
          uri_storage?: string | null
          use_geographic_restrictions?: boolean | null
          use_safe_transfer?: boolean | null
          utility_enabled?: boolean | null
          utility_type?: string | null
          whitelist_config?: Json | null
          whitelist_sale_enabled?: boolean | null
          whitelist_sale_end_time?: string | null
          whitelist_sale_price?: string | null
          whitelist_sale_start_time?: string | null
        }
        Update: {
          access_control?: string | null
          admin_mint_enabled?: boolean | null
          asset_type?: string | null
          auto_increment_ids?: boolean | null
          auto_reveal?: boolean | null
          base_uri?: string | null
          batch_minting_config?: Json | null
          breeding_enabled?: boolean | null
          bridge_contracts?: Json | null
          burn_roles?: string[] | null
          contract_uri?: string | null
          created_at?: string | null
          creator_earnings_address?: string | null
          creator_earnings_enabled?: boolean | null
          creator_earnings_percentage?: string | null
          cross_chain_enabled?: boolean | null
          custom_base_uri?: string | null
          custom_operator_filter_address?: string | null
          default_restriction_policy?: string | null
          dutch_auction_duration?: number | null
          dutch_auction_enabled?: boolean | null
          dutch_auction_end_price?: string | null
          dutch_auction_start_price?: string | null
          dynamic_uri_config?: Json | null
          enable_dynamic_metadata?: boolean | null
          enable_fractional_ownership?: boolean | null
          enumerable?: boolean | null
          evolution_enabled?: boolean | null
          has_royalty?: boolean | null
          id?: string
          is_burnable?: boolean | null
          is_mintable?: boolean | null
          is_pausable?: boolean | null
          layer2_enabled?: boolean | null
          layer2_networks?: string[] | null
          marketplace_approved?: string[] | null
          max_mints_per_tx?: number | null
          max_mints_per_wallet?: number | null
          max_supply?: string | null
          metadata_frozen?: boolean | null
          metadata_provenance_hash?: string | null
          metadata_storage?: string | null
          mint_phases_enabled?: boolean | null
          mint_roles?: string[] | null
          minting_method?: string | null
          minting_price?: string | null
          operator_filter_enabled?: boolean | null
          permission_config?: Json | null
          placeholder_image_uri?: string | null
          pre_reveal_uri?: string | null
          public_mint_enabled?: boolean | null
          public_sale_enabled?: boolean | null
          public_sale_end_time?: string | null
          public_sale_price?: string | null
          public_sale_start_time?: string | null
          reserved_tokens?: number | null
          reveal_batch_size?: number | null
          reveal_delay?: number | null
          revealable?: boolean | null
          royalty_percentage?: string | null
          royalty_receiver?: string | null
          sales_config?: Json | null
          soulbound?: boolean | null
          staking_enabled?: boolean | null
          staking_rewards_rate?: string | null
          staking_rewards_token_address?: string | null
          supply_cap_enabled?: boolean | null
          supply_validation_enabled?: boolean | null
          token_id?: string
          total_supply_cap?: string | null
          transfer_locked?: boolean | null
          transfer_restrictions?: Json | null
          updatable_uris?: boolean | null
          updated_at?: string | null
          uri_storage?: string | null
          use_geographic_restrictions?: boolean | null
          use_safe_transfer?: boolean | null
          utility_enabled?: boolean | null
          utility_type?: string | null
          whitelist_config?: Json | null
          whitelist_sale_enabled?: boolean | null
          whitelist_sale_end_time?: string | null
          whitelist_sale_price?: string | null
          whitelist_sale_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_properties_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_erc721_trait_definitions: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          possible_values: Json | null
          rarity_weights: Json | null
          token_id: string
          trait_name: string
          trait_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          possible_values?: Json | null
          rarity_weights?: Json | null
          token_id: string
          trait_name: string
          trait_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          possible_values?: Json | null
          rarity_weights?: Json | null
          token_id?: string
          trait_name?: string
          trait_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_erc721_trait_definitions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_events: {
        Row: {
          data: Json | null
          event_type: string
          id: string
          is_read: boolean
          message: string
          severity: string
          timestamp: string
          token_id: string
        }
        Insert: {
          data?: Json | null
          event_type: string
          id?: string
          is_read?: boolean
          message: string
          severity: string
          timestamp?: string
          token_id: string
        }
        Update: {
          data?: Json | null
          event_type?: string
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          timestamp?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_geographic_restrictions: {
        Row: {
          country_code: string
          created_at: string | null
          created_by: string | null
          effective_date: string
          expiry_date: string | null
          holding_period_restriction: number | null
          id: string
          max_investment_amount: string | null
          max_ownership_percentage: number | null
          min_investment_amount: string | null
          notes: string | null
          reporting_requirements: Json | null
          requires_local_custodian: boolean | null
          requires_regulatory_approval: boolean | null
          requires_tax_clearance: boolean | null
          restriction_type: string
          token_id: string
          transfer_restrictions: Json | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          expiry_date?: string | null
          holding_period_restriction?: number | null
          id?: string
          max_investment_amount?: string | null
          max_ownership_percentage?: number | null
          min_investment_amount?: string | null
          notes?: string | null
          reporting_requirements?: Json | null
          requires_local_custodian?: boolean | null
          requires_regulatory_approval?: boolean | null
          requires_tax_clearance?: boolean | null
          restriction_type: string
          token_id: string
          transfer_restrictions?: Json | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          expiry_date?: string | null
          holding_period_restriction?: number | null
          id?: string
          max_investment_amount?: string | null
          max_ownership_percentage?: number | null
          min_investment_amount?: string | null
          notes?: string | null
          reporting_requirements?: Json | null
          requires_local_custodian?: boolean | null
          requires_regulatory_approval?: boolean | null
          requires_tax_clearance?: boolean | null
          restriction_type?: string
          token_id?: string
          transfer_restrictions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_geographic_restrictions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "geographic_jurisdictions"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "token_geographic_restrictions_view"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_operations: {
        Row: {
          amount: number | null
          asset_token_address: string | null
          blocks: Json | null
          error_message: string | null
          id: string
          lock_duration: number | null
          lock_id: string | null
          lock_reason: string | null
          nft_token_id: string | null
          operation_type: string
          operator: string
          partition: string | null
          recipient: string | null
          sender: string | null
          slot_id: string | null
          status: string | null
          target_address: string | null
          timestamp: string | null
          token_id: string
          token_type_id: string | null
          transaction_hash: string | null
          unlock_time: string | null
          value: number | null
        }
        Insert: {
          amount?: number | null
          asset_token_address?: string | null
          blocks?: Json | null
          error_message?: string | null
          id?: string
          lock_duration?: number | null
          lock_id?: string | null
          lock_reason?: string | null
          nft_token_id?: string | null
          operation_type: string
          operator: string
          partition?: string | null
          recipient?: string | null
          sender?: string | null
          slot_id?: string | null
          status?: string | null
          target_address?: string | null
          timestamp?: string | null
          token_id: string
          token_type_id?: string | null
          transaction_hash?: string | null
          unlock_time?: string | null
          value?: number | null
        }
        Update: {
          amount?: number | null
          asset_token_address?: string | null
          blocks?: Json | null
          error_message?: string | null
          id?: string
          lock_duration?: number | null
          lock_id?: string | null
          lock_reason?: string | null
          nft_token_id?: string | null
          operation_type?: string
          operator?: string
          partition?: string | null
          recipient?: string | null
          sender?: string | null
          slot_id?: string | null
          status?: string | null
          target_address?: string | null
          timestamp?: string | null
          token_id?: string
          token_type_id?: string | null
          transaction_hash?: string | null
          unlock_time?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_operations_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_sanctions_rules: {
        Row: {
          auto_block_sanctioned_entities: boolean | null
          created_at: string | null
          enhanced_due_diligence_required: boolean | null
          id: string
          last_screening_update: string | null
          manual_review_threshold: string | null
          sanctions_regime: string
          screening_enabled: boolean | null
          screening_frequency: string | null
          token_id: string
          updated_at: string | null
          whitelist_override_allowed: boolean | null
        }
        Insert: {
          auto_block_sanctioned_entities?: boolean | null
          created_at?: string | null
          enhanced_due_diligence_required?: boolean | null
          id?: string
          last_screening_update?: string | null
          manual_review_threshold?: string | null
          sanctions_regime: string
          screening_enabled?: boolean | null
          screening_frequency?: string | null
          token_id: string
          updated_at?: string | null
          whitelist_override_allowed?: boolean | null
        }
        Update: {
          auto_block_sanctioned_entities?: boolean | null
          created_at?: string | null
          enhanced_due_diligence_required?: boolean | null
          id?: string
          last_screening_update?: string | null
          manual_review_threshold?: string | null
          sanctions_regime?: string
          screening_enabled?: boolean | null
          screening_frequency?: string | null
          token_id?: string
          updated_at?: string | null
          whitelist_override_allowed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_sanctions_rules_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_templates: {
        Row: {
          blocks: Json
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          project_id: string
          standard: string
          updated_at: string | null
        }
        Insert: {
          blocks: Json
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          project_id: string
          standard: string
          updated_at?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string
          standard?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      token_versions: {
        Row: {
          blocks: Json | null
          created_at: string | null
          created_by: string | null
          data: Json
          decimals: number | null
          id: string
          metadata: Json | null
          name: string | null
          notes: string | null
          standard: string | null
          symbol: string | null
          token_id: string
          version: number
        }
        Insert: {
          blocks?: Json | null
          created_at?: string | null
          created_by?: string | null
          data: Json
          decimals?: number | null
          id?: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          standard?: string | null
          symbol?: string | null
          token_id: string
          version: number
        }
        Update: {
          blocks?: Json | null
          created_at?: string | null
          created_by?: string | null
          data?: Json
          decimals?: number | null
          id?: string
          metadata?: Json | null
          name?: string | null
          notes?: string | null
          standard?: string | null
          symbol?: string | null
          token_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_versions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_whitelists: {
        Row: {
          approval_date: string | null
          approval_reason: string | null
          approved_by: string | null
          blockchain: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          removal_by: string | null
          removal_date: string | null
          removal_reason: string | null
          token_id: string
          updated_at: string | null
          updated_by: string | null
          wallet_address: string
        }
        Insert: {
          approval_date?: string | null
          approval_reason?: string | null
          approved_by?: string | null
          blockchain: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          removal_by?: string | null
          removal_date?: string | null
          removal_reason?: string | null
          token_id: string
          updated_at?: string | null
          updated_by?: string | null
          wallet_address: string
        }
        Update: {
          approval_date?: string | null
          approval_reason?: string | null
          approved_by?: string | null
          blockchain?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          removal_by?: string | null
          removal_date?: string | null
          removal_reason?: string | null
          token_id?: string
          updated_at?: string | null
          updated_by?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "fk_token_whitelists_token_id"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_whitelists_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          address: string | null
          approvals: string[] | null
          blockchain: string | null
          blocks: Json
          config_mode:
            | Database["public"]["Enums"]["token_config_mode_enum"]
            | null
          contract_preview: string | null
          created_at: string | null
          decimals: number
          deployed_by: string | null
          deployment_environment: string | null
          deployment_error: string | null
          deployment_status: string | null
          deployment_timestamp: string | null
          deployment_transaction: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          project_id: string
          reviewers: string[] | null
          standard: Database["public"]["Enums"]["token_standard_enum"]
          status: Database["public"]["Enums"]["token_status_enum"]
          symbol: string
          total_supply: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          approvals?: string[] | null
          blockchain?: string | null
          blocks: Json
          config_mode?:
            | Database["public"]["Enums"]["token_config_mode_enum"]
            | null
          contract_preview?: string | null
          created_at?: string | null
          decimals?: number
          deployed_by?: string | null
          deployment_environment?: string | null
          deployment_error?: string | null
          deployment_status?: string | null
          deployment_timestamp?: string | null
          deployment_transaction?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          project_id: string
          reviewers?: string[] | null
          standard: Database["public"]["Enums"]["token_standard_enum"]
          status?: Database["public"]["Enums"]["token_status_enum"]
          symbol: string
          total_supply?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          approvals?: string[] | null
          blockchain?: string | null
          blocks?: Json
          config_mode?:
            | Database["public"]["Enums"]["token_config_mode_enum"]
            | null
          contract_preview?: string | null
          created_at?: string | null
          decimals?: number
          deployed_by?: string | null
          deployment_environment?: string | null
          deployment_error?: string | null
          deployment_status?: string | null
          deployment_timestamp?: string | null
          deployment_transaction?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string
          reviewers?: string[] | null
          standard?: Database["public"]["Enums"]["token_standard_enum"]
          status?: Database["public"]["Enums"]["token_status_enum"]
          symbol?: string
          total_supply?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_events: {
        Row: {
          actor: string | null
          actor_role: string | null
          created_at: string
          data: Json
          event_type: string
          id: string
          request_id: string
          timestamp: string
        }
        Insert: {
          actor?: string | null
          actor_role?: string | null
          created_at?: string
          data: Json
          event_type: string
          id?: string
          request_id: string
          timestamp?: string
        }
        Update: {
          actor?: string | null
          actor_role?: string | null
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          request_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      transaction_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean | null
          transaction_id: string | null
          type: string
          wallet_address: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          transaction_id?: string | null
          type: string
          wallet_address: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          transaction_id?: string | null
          type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      transaction_proposals: {
        Row: {
          blockchain: string
          created_at: string | null
          created_by: string | null
          data: string | null
          description: string | null
          id: string
          nonce: number | null
          status: string
          title: string
          to_address: string
          token_address: string | null
          token_symbol: string | null
          updated_at: string | null
          value: string
          wallet_id: string | null
        }
        Insert: {
          blockchain: string
          created_at?: string | null
          created_by?: string | null
          data?: string | null
          description?: string | null
          id?: string
          nonce?: number | null
          status?: string
          title: string
          to_address: string
          token_address?: string | null
          token_symbol?: string | null
          updated_at?: string | null
          value: string
          wallet_id?: string | null
        }
        Update: {
          blockchain?: string
          created_at?: string | null
          created_by?: string | null
          data?: string | null
          description?: string | null
          id?: string
          nonce?: number | null
          status?: string
          title?: string
          to_address?: string
          token_address?: string | null
          token_symbol?: string | null
          updated_at?: string | null
          value?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_proposals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_signatures: {
        Row: {
          created_at: string
          id: string
          proposal_id: string
          signature: string
          signer: string
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          proposal_id: string
          signature: string
          signer: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          proposal_id?: string
          signature?: string
          signer?: string
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_signatures_proposal_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "transaction_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          block_hash: string | null
          block_number: number | null
          blockchain: string
          confirmations: number | null
          created_at: string | null
          destination_tag: number | null
          estimated_confirmation_time: unknown | null
          from_address: string
          gas_limit: number | null
          gas_price: number | null
          gas_used: number | null
          id: string
          max_fee_per_gas: number | null
          max_priority_fee_per_gas: number | null
          memo: string | null
          network_fee: number | null
          status: string
          to_address: string
          token_address: string | null
          token_symbol: string | null
          transaction_hash: string
          transaction_index: number | null
          transfer_type: string | null
          type: string
          updated_at: string | null
          value: number
        }
        Insert: {
          block_hash?: string | null
          block_number?: number | null
          blockchain?: string
          confirmations?: number | null
          created_at?: string | null
          destination_tag?: number | null
          estimated_confirmation_time?: unknown | null
          from_address: string
          gas_limit?: number | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          max_fee_per_gas?: number | null
          max_priority_fee_per_gas?: number | null
          memo?: string | null
          network_fee?: number | null
          status?: string
          to_address: string
          token_address?: string | null
          token_symbol?: string | null
          transaction_hash: string
          transaction_index?: number | null
          transfer_type?: string | null
          type?: string
          updated_at?: string | null
          value?: number
        }
        Update: {
          block_hash?: string | null
          block_number?: number | null
          blockchain?: string
          confirmations?: number | null
          created_at?: string | null
          destination_tag?: number | null
          estimated_confirmation_time?: unknown | null
          from_address?: string
          gas_limit?: number | null
          gas_price?: number | null
          gas_used?: number | null
          id?: string
          max_fee_per_gas?: number | null
          max_priority_fee_per_gas?: number | null
          memo?: string | null
          network_fee?: number | null
          status?: string
          to_address?: string
          token_address?: string | null
          token_symbol?: string | null
          transaction_hash?: string
          transaction_index?: number | null
          transfer_type?: string | null
          type?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          backup_codes: Json | null
          created_at: string | null
          enabled: boolean
          id: string
          secret: string | null
          updated_at: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          secret?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string | null
          enabled?: boolean
          id?: string
          secret?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_operations: {
        Row: {
          actual_gas_cost: number | null
          block_number: number | null
          call_data: string
          call_gas_limit: number
          created_at: string | null
          failure_reason: string | null
          gas_used: number | null
          id: string
          init_code: string | null
          max_fee_per_gas: number
          max_priority_fee_per_gas: number
          nonce: number
          paymaster_and_data: string | null
          pre_verification_gas: number
          sender_address: string
          signature_data: string
          status: string | null
          transaction_hash: string | null
          updated_at: string | null
          user_op_hash: string
          verification_gas_limit: number
          wallet_id: string
        }
        Insert: {
          actual_gas_cost?: number | null
          block_number?: number | null
          call_data: string
          call_gas_limit: number
          created_at?: string | null
          failure_reason?: string | null
          gas_used?: number | null
          id?: string
          init_code?: string | null
          max_fee_per_gas: number
          max_priority_fee_per_gas: number
          nonce: number
          paymaster_and_data?: string | null
          pre_verification_gas: number
          sender_address: string
          signature_data: string
          status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_op_hash: string
          verification_gas_limit: number
          wallet_id: string
        }
        Update: {
          actual_gas_cost?: number | null
          block_number?: number | null
          call_data?: string
          call_gas_limit?: number
          created_at?: string | null
          failure_reason?: string | null
          gas_used?: number | null
          id?: string
          init_code?: string | null
          max_fee_per_gas?: number
          max_priority_fee_per_gas?: number
          nonce?: number
          paymaster_and_data?: string | null
          pre_verification_gas?: number
          sender_address?: string
          signature_data?: string
          status?: string | null
          transaction_hash?: string | null
          updated_at?: string | null
          user_op_hash?: string
          verification_gas_limit?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_operations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organization_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organization_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          ip_address: string | null
          last_active_at: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          last_active_at?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_sidebar_preferences: {
        Row: {
          collapsed_sections: string[] | null
          created_at: string | null
          custom_order: Json | null
          hidden_items: string[] | null
          id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          collapsed_sections?: string[] | null
          created_at?: string | null
          custom_order?: Json | null
          hidden_items?: string[] | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          collapsed_sections?: string[] | null
          created_at?: string | null
          custom_order?: Json | null
          hidden_items?: string[] | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sidebar_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          encrypted_private_key: string | null
          id: string
          name: string
          public_key: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          encrypted_private_key?: string | null
          id: string
          name: string
          public_key?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          encrypted_private_key?: string | null
          id?: string
          name?: string
          public_key?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_details: {
        Row: {
          blockchain_specific_data: Json
          created_at: string | null
          id: string
          updated_at: string | null
          wallet_id: string | null
        }
        Insert: {
          blockchain_specific_data: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Update: {
          blockchain_specific_data?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_details_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_facets: {
        Row: {
          added_at: string | null
          facet_address: string
          facet_name: string
          function_selectors: string[]
          id: string
          is_active: boolean | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          added_at?: string | null
          facet_address: string
          facet_name: string
          function_selectors?: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          added_at?: string | null
          facet_address?: string
          facet_name?: string
          function_selectors?: string[]
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_facets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_guardians: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          guardian_address: string
          guardian_name: string | null
          id: string
          requested_at: string | null
          security_period_ends: string | null
          status: string | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          guardian_address: string
          guardian_name?: string | null
          id?: string
          requested_at?: string | null
          security_period_ends?: string | null
          status?: string | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          guardian_address?: string
          guardian_name?: string | null
          id?: string
          requested_at?: string | null
          security_period_ends?: string | null
          status?: string | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_guardians_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_locks: {
        Row: {
          can_unlock_early: boolean
          created_at: string | null
          id: string
          is_locked: boolean
          lock_data: Json | null
          lock_nonce: number
          lock_reason: string | null
          lock_type: string
          locked_at: string
          locked_by: string
          unlock_hash: string | null
          unlock_reason: string | null
          unlock_time: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          can_unlock_early?: boolean
          created_at?: string | null
          id?: string
          is_locked?: boolean
          lock_data?: Json | null
          lock_nonce?: number
          lock_reason?: string | null
          lock_type: string
          locked_at?: string
          locked_by: string
          unlock_hash?: string | null
          unlock_reason?: string | null
          unlock_time?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          can_unlock_early?: boolean
          created_at?: string | null
          id?: string
          is_locked?: boolean
          lock_data?: Json | null
          lock_nonce?: number
          lock_reason?: string | null
          lock_type?: string
          locked_at?: string
          locked_by?: string
          unlock_hash?: string | null
          unlock_reason?: string | null
          unlock_time?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_locks_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_restriction_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          rule_data: Json
          rule_type: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          rule_data?: Json
          rule_type: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          rule_data?: Json
          rule_type?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_restriction_rules_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_signatories: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
          status: string | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role: string
          status?: string | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          status?: string | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_transaction_drafts: {
        Row: {
          amount: number
          blockchain: string
          created_at: string | null
          data: Json | null
          expires_at: string
          from_address: string
          id: string
          nonce: number | null
          raw_transaction: string
          to_address: string
          transaction_id: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          blockchain: string
          created_at?: string | null
          data?: Json | null
          expires_at: string
          from_address: string
          id?: string
          nonce?: number | null
          raw_transaction: string
          to_address: string
          transaction_id: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          blockchain?: string
          created_at?: string | null
          data?: Json | null
          expires_at?: string
          from_address?: string
          id?: string
          nonce?: number | null
          raw_transaction?: string
          to_address?: string
          transaction_id?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallet_transaction_drafts_wallet_id"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          chain_id: string | null
          confirmation_count: number | null
          created_at: string | null
          data: Json | null
          from_address: string | null
          gas_limit: number | null
          gas_price: number | null
          id: string
          nonce: number | null
          status: string | null
          to_address: string | null
          token_address: string | null
          token_symbol: string | null
          tx_hash: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          chain_id?: string | null
          confirmation_count?: number | null
          created_at?: string | null
          data?: Json | null
          from_address?: string | null
          gas_limit?: number | null
          gas_price?: number | null
          id?: string
          nonce?: number | null
          status?: string | null
          to_address?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_hash?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          chain_id?: string | null
          confirmation_count?: number | null
          created_at?: string | null
          data?: Json | null
          from_address?: string | null
          gas_limit?: number | null
          gas_price?: number | null
          id?: string
          nonce?: number | null
          status?: string | null
          to_address?: string | null
          token_address?: string | null
          token_symbol?: string | null
          tx_hash?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          blockchain: string
          created_at: string
          guardian_policy: Json
          id: string
          investor_id: string
          is_multi_sig_enabled: boolean
          signatories: Json
          status: string
          updated_at: string
          wallet_address: string | null
          wallet_type: string
        }
        Insert: {
          blockchain?: string
          created_at?: string
          guardian_policy?: Json
          id?: string
          investor_id: string
          is_multi_sig_enabled?: boolean
          signatories?: Json
          status?: string
          updated_at?: string
          wallet_address?: string | null
          wallet_type: string
        }
        Update: {
          blockchain?: string
          created_at?: string
          guardian_policy?: Json
          id?: string
          investor_id?: string
          is_multi_sig_enabled?: boolean
          signatories?: Json
          status?: string
          updated_at?: string
          wallet_address?: string | null
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
        ]
      }
      weather_data: {
        Row: {
          created_at: string | null
          date: string
          location: string
          sunlight_hours: number | null
          temperature: number | null
          updated_at: string | null
          weather_id: string
          wind_speed: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          location: string
          sunlight_hours?: number | null
          temperature?: number | null
          updated_at?: string | null
          weather_id?: string
          wind_speed?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          location?: string
          sunlight_hours?: number | null
          temperature?: number | null
          updated_at?: string | null
          weather_id?: string
          wind_speed?: number | null
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          challenge_type: string
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          wallet_id: string
        }
        Insert: {
          challenge: string
          challenge_type: string
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          wallet_id: string
        }
        Update: {
          challenge?: string
          challenge_type?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_challenges_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          authenticator_data: string | null
          created_at: string | null
          credential_id: string
          device_name: string | null
          id: string
          is_primary: boolean | null
          platform: string | null
          public_key_x: string
          public_key_y: string
          updated_at: string | null
          wallet_id: string
        }
        Insert: {
          authenticator_data?: string | null
          created_at?: string | null
          credential_id: string
          device_name?: string | null
          id?: string
          is_primary?: boolean | null
          platform?: string | null
          public_key_x: string
          public_key_y: string
          updated_at?: string | null
          wallet_id: string
        }
        Update: {
          authenticator_data?: string | null
          created_at?: string | null
          credential_id?: string
          device_name?: string | null
          id?: string
          is_primary?: boolean | null
          platform?: string | null
          public_key_x?: string
          public_key_y?: string
          updated_at?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webauthn_credentials_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelist_entries: {
        Row: {
          added_by: string | null
          address: string
          created_at: string | null
          id: string
          label: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          added_by?: string | null
          address: string
          created_at?: string | null
          id?: string
          label?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          added_by?: string | null
          address?: string
          created_at?: string | null
          id?: string
          label?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whitelist_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          required_approvals: number
          rule_id: string | null
          total_approvers: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          required_approvals: number
          rule_id?: string | null
          total_approvers: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          required_approvals?: number
          rule_id?: string | null
          total_approvers?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelist_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whitelist_settings_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      whitelist_signatories: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          id: string
          user_id: string | null
          whitelist_id: string | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          id?: string
          user_id?: string | null
          whitelist_id?: string | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          id?: string
          user_id?: string | null
          whitelist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelist_signatories_whitelist_id_fkey"
            columns: ["whitelist_id"]
            isOneToOne: false
            referencedRelation: "whitelist_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stages: {
        Row: {
          completion_percentage: number
          created_at: string
          description: string | null
          id: string
          name: string
          order: number
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completion_percentage?: number
          created_at?: string
          description?: string | null
          id: string
          name: string
          order: number
          organization_id: string
          status: string
          updated_at?: string
        }
        Update: {
          completion_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order?: number
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_redemption_opportunities: {
        Row: {
          all_eligible: boolean | null
          combined_reasons: string | null
          distribution_ids: string[] | null
          earliest_window_start: string | null
          eligible_distributions: number | null
          investor_id: string | null
          latest_window_end: string | null
          product_id: string | null
          product_type: string | null
          project_id: string | null
          total_distributed_amount: number | null
          total_max_redeemable: number | null
          total_remaining_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_investor_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "distributions_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_analytics: {
        Row: {
          action: string | null
          batch_operation_id: string | null
          category: string | null
          correlation_id: string | null
          duration: number | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          project_id: string | null
          session_id: string | null
          severity: string | null
          source: string | null
          status: string | null
          system_process_id: string | null
          timestamp: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          batch_operation_id?: string | null
          category?: string | null
          correlation_id?: string | null
          duration?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: string | null
          project_id?: string | null
          session_id?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          system_process_id?: string | null
          timestamp?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          batch_operation_id?: string | null
          category?: string | null
          correlation_id?: string | null
          duration?: number | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: string | null
          project_id?: string | null
          session_id?: string | null
          severity?: string | null
          source?: string | null
          status?: string | null
          system_process_id?: string | null
          timestamp?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      approval_configs_with_approvers: {
        Row: {
          active: boolean | null
          approval_mode: string | null
          approver_count: number | null
          auto_approval_conditions: Json | null
          auto_approve_threshold: number | null
          config_description: string | null
          config_name: string | null
          configured_approvers: Json | null
          consensus_type: string | null
          created_at: string | null
          created_by: string | null
          eligible_roles: string[] | null
          escalation_config: Json | null
          id: string | null
          last_modified_by: string | null
          notification_config: Json | null
          permission_id: string | null
          required_approvals: number | null
          requires_all_approvers: boolean | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_configs_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_coverage: {
        Row: {
          function_name: unknown | null
          schema_name: unknown | null
          table_name: unknown | null
          trigger_name: unknown | null
        }
        Relationships: []
      }
      climate_cash_flow_forecast: {
        Row: {
          projection_date: string | null
          source_type: string | null
          total_projected: number | null
        }
        Relationships: []
      }
      climate_investor_pool_summary: {
        Row: {
          avg_risk_score: number | null
          investment_amount: number | null
          investor_id: string | null
          pool_id: string | null
          pool_name: string | null
          total_receivables: number | null
        }
        Relationships: [
          {
            foreignKeyName: "climate_investor_pools_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "climate_investor_pools_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
        ]
      }
      climate_token_summary: {
        Row: {
          average_discount_rate: number | null
          average_risk_score: number | null
          discount_amount: number | null
          discounted_value: number | null
          name: string | null
          pool_id: string | null
          pool_name: string | null
          project_id: string | null
          risk_profile: string | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          symbol: string | null
          token_id: string | null
          total_supply: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_climate_properties_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "climate_tokenization_pools"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "tokens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      database_audit_coverage: {
        Row: {
          has_recent_audit: boolean | null
          last_audit_event: string | null
          recent_event_count: number | null
          table_name: unknown | null
        }
        Relationships: []
      }
      latest_nav_by_fund: {
        Row: {
          change_amount: number | null
          change_percent: number | null
          created_at: string | null
          date: string | null
          fund_id: string | null
          nav: number | null
          source: string | null
          validated: boolean | null
        }
        Relationships: []
      }
      project_type_stats: {
        Row: {
          active_count: number | null
          avg_target_raise: number | null
          category: string | null
          project_count: number | null
          project_type: string | null
          total_target_raise: number | null
        }
        Relationships: []
      }
      redemption_eligibility: {
        Row: {
          active_window_id: string | null
          allow_continuous_redemption: boolean | null
          distribution_id: string | null
          eligibility_reason: string | null
          fully_redeemed: boolean | null
          investor_id: string | null
          is_eligible_now: boolean | null
          is_redemption_open: boolean | null
          lock_up_period: number | null
          max_redeemable_amount: number | null
          max_redemption_percentage: number | null
          open_after_date: string | null
          product_id: string | null
          product_type: string | null
          project_id: string | null
          redemption_percentage_used: number | null
          remaining_amount: number | null
          rule_id: string | null
          submission_end_date: string | null
          submission_start_date: string | null
          total_distributed: number | null
          window_end: string | null
          window_start: string | null
          window_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributions_investor_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["investor_id"]
          },
          {
            foreignKeyName: "distributions_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      redemption_rules_with_product_details: {
        Row: {
          allow_any_time_redemption: boolean | null
          allow_continuous_redemption: boolean | null
          available_capacity: number | null
          capacity_percentage: number | null
          capacity_status: string | null
          created_at: string | null
          effective_target_raise: number | null
          enable_admin_override: boolean | null
          enable_pro_rata_distribution: boolean | null
          id: string | null
          immediate_execution: boolean | null
          is_redemption_open: boolean | null
          lock_tokens_on_request: boolean | null
          lock_up_period: number | null
          max_redemption_percentage: number | null
          notify_investors: boolean | null
          open_after_date: string | null
          organization_id: string | null
          product_currency: string | null
          product_details: Json | null
          product_id: string | null
          product_name: string | null
          product_status: string | null
          product_table: string | null
          product_type: string | null
          project_id: string | null
          project_name: string | null
          project_type: string | null
          queue_unprocessed_requests: boolean | null
          redemption_eligibility_rules: Json | null
          redemption_type: string | null
          repurchase_frequency: string | null
          require_multi_sig_approval: boolean | null
          required_approvers: number | null
          rule_id: string | null
          settlement_method: string | null
          submission_window_days: number | null
          target_raise_amount: number | null
          total_approvers: number | null
          total_redeemed_amount: number | null
          updated_at: string | null
          use_latest_nav: boolean | null
          use_window_nav: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_redemption_rules_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      redemption_system_health: {
        Row: {
          active_windows: number | null
          continuous_redemption_projects: number | null
          eligible_investors: number | null
          open_redemption_projects: number | null
          projects_with_rules: number | null
          total_redeemable_amount: number | null
          total_rules: number | null
        }
        Relationships: []
      }
      restriction_statistics: {
        Row: {
          active_rules: number | null
          blocked_countries: number | null
          blocked_investor_types: number | null
          total_rules: number | null
        }
        Relationships: []
      }
      settlement_summary: {
        Row: {
          actual_completion: string | null
          completion_time: string | null
          created_at: string | null
          id: string | null
          nav_used: number | null
          processing_time_seconds: number | null
          redemption_request_id: string | null
          settlement_type: string | null
          status: string | null
          token_amount: number | null
          transfer_amount: number | null
        }
        Insert: {
          actual_completion?: string | null
          completion_time?: never
          created_at?: string | null
          id?: string | null
          nav_used?: number | null
          processing_time_seconds?: never
          redemption_request_id?: string | null
          settlement_type?: string | null
          status?: string | null
          token_amount?: number | null
          transfer_amount?: number | null
        }
        Update: {
          actual_completion?: string | null
          completion_time?: never
          created_at?: string | null
          id?: string | null
          nav_used?: number | null
          processing_time_seconds?: never
          redemption_request_id?: string | null
          settlement_type?: string | null
          status?: string | null
          token_amount?: number | null
          transfer_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "redemption_settlements_redemption_request_id_fkey"
            columns: ["redemption_request_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_configurations_with_names: {
        Row: {
          computed_profile_types:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          computed_role_names: string[] | null
          configuration_data: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          min_role_priority: number | null
          name: string | null
          organization_id: string | null
          target_profile_type_enums:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids: string[] | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          computed_profile_types?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          computed_role_names?: never
          configuration_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          min_role_priority?: number | null
          name?: string | null
          organization_id?: string | null
          target_profile_type_enums?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          computed_profile_types?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          computed_role_names?: never
          configuration_data?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          min_role_priority?: number | null
          name?: string | null
          organization_id?: string | null
          target_profile_type_enums?:
            | Database["public"]["Enums"]["profile_type"][]
            | null
          target_role_ids?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sidebar_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_process_activities: {
        Row: {
          action: string | null
          activity_id: string | null
          activity_metadata: Json | null
          activity_status: string | null
          activity_time: string | null
          end_time: string | null
          entity_id: string | null
          entity_type: string | null
          priority: string | null
          process_id: string | null
          process_name: string | null
          progress: number | null
          start_time: string | null
          status: string | null
        }
        Relationships: []
      }
      system_process_activity: {
        Row: {
          activity_count: number | null
          duration_seconds: number | null
          end_time: string | null
          failed_activities: number | null
          process_id: string | null
          process_name: string | null
          process_status: string | null
          start_time: string | null
        }
        Relationships: []
      }
      system_process_performance: {
        Row: {
          avg_duration_seconds: number | null
          failed_executions: number | null
          max_duration_seconds: number | null
          min_duration_seconds: number | null
          process_name: string | null
          success_rate: number | null
          successful_executions: number | null
          total_executions: number | null
        }
        Relationships: []
      }
      token_erc1155_view: {
        Row: {
          access_control: string | null
          airdrop_enabled: boolean | null
          base_price: string | null
          base_uri: string | null
          batch_minting_config: Json | null
          batch_transfer_limits: Json | null
          bridge_enabled: boolean | null
          bulk_discount_enabled: boolean | null
          burning_enabled: boolean | null
          claim_end_time: string | null
          claim_period_enabled: boolean | null
          claim_start_time: string | null
          container_config: Json | null
          crafting_enabled: boolean | null
          decimals: number | null
          description: string | null
          dynamic_uri_config: Json | null
          enable_approval_for_all: boolean | null
          erc1155_property_id: string | null
          experience_points_enabled: boolean | null
          fusion_enabled: boolean | null
          has_royalty: boolean | null
          is_burnable: boolean | null
          is_pausable: boolean | null
          lazy_minting_enabled: boolean | null
          marketplace_fees_enabled: boolean | null
          metadata: Json | null
          metadata_storage: string | null
          name: string | null
          pricing_model: string | null
          property_created_at: string | null
          property_updated_at: string | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          supply_tracking: boolean | null
          symbol: string | null
          token_created_at: string | null
          token_id: string | null
          token_updated_at: string | null
          total_supply: string | null
          transfer_restrictions: Json | null
          updatable_metadata: boolean | null
          updatable_uris: boolean | null
          voting_power_enabled: boolean | null
          whitelist_config: Json | null
        }
        Relationships: []
      }
      token_erc1400_view: {
        Row: {
          advanced_corporate_actions: boolean | null
          advanced_governance_enabled: boolean | null
          advanced_risk_management: boolean | null
          aml_monitoring_enabled: boolean | null
          auto_compliance: boolean | null
          automated_sanctions_screening: boolean | null
          beneficial_ownership_tracking: boolean | null
          cap: string | null
          compliance_automation_level: string | null
          compliance_module: string | null
          compliance_settings: Json | null
          controller_address: string | null
          corporate_actions: boolean | null
          cross_border_trading_enabled: boolean | null
          custody_integration_enabled: boolean | null
          custom_features: Json | null
          decimals: number | null
          description: string | null
          dividend_distribution: boolean | null
          document_hash: string | null
          document_management: boolean | null
          document_uri: string | null
          enforce_kyc: boolean | null
          enhanced_reporting_enabled: boolean | null
          erc1400_property_id: string | null
          forced_redemption_enabled: boolean | null
          forced_transfers: boolean | null
          geographic_restrictions: Json | null
          granular_control: boolean | null
          holding_period: number | null
          initial_supply: string | null
          institutional_grade: boolean | null
          insurance_coverage_enabled: boolean | null
          investor_accreditation: boolean | null
          is_burnable: boolean | null
          is_issuable: boolean | null
          is_mintable: boolean | null
          is_multi_class: boolean | null
          is_pausable: boolean | null
          iso20022_messaging_support: boolean | null
          issuance_modules: boolean | null
          issuing_entity_lei: string | null
          issuing_entity_name: string | null
          issuing_jurisdiction: string | null
          kyc_settings: Json | null
          legal_terms: string | null
          manual_approvals: boolean | null
          max_investor_count: number | null
          metadata: Json | null
          multi_jurisdiction_compliance: boolean | null
          name: string | null
          prime_brokerage_support: boolean | null
          property_created_at: string | null
          property_updated_at: string | null
          prospectus: string | null
          proxy_voting_enabled: boolean | null
          real_time_compliance_monitoring: boolean | null
          recovery_mechanism: boolean | null
          regulation_type: string | null
          require_kyc: boolean | null
          security_type: string | null
          settlement_integration: string | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          stock_splits_enabled: boolean | null
          swift_integration_enabled: boolean | null
          symbol: string | null
          token_created_at: string | null
          token_details: string | null
          token_id: string | null
          token_updated_at: string | null
          total_supply: string | null
          traditional_finance_integration: boolean | null
          tranche_transferability: boolean | null
          transfer_restrictions: Json | null
          treasury_management_enabled: boolean | null
          whitelist_enabled: boolean | null
        }
        Relationships: []
      }
      token_erc20_view: {
        Row: {
          access_control: string | null
          allow_management: boolean | null
          anti_whale_enabled: boolean | null
          cap: string | null
          compliance_config: Json | null
          decimals: number | null
          description: string | null
          erc20_property_id: string | null
          fee_on_transfer: Json | null
          gas_config: Json | null
          governance_enabled: boolean | null
          governance_features: Json | null
          initial_supply: string | null
          is_burnable: boolean | null
          is_mintable: boolean | null
          is_pausable: boolean | null
          max_wallet_amount: string | null
          metadata: Json | null
          name: string | null
          permit: boolean | null
          presale_enabled: boolean | null
          presale_rate: string | null
          property_created_at: string | null
          property_updated_at: string | null
          proposal_threshold: string | null
          quorum_percentage: string | null
          rebasing: Json | null
          reflection_enabled: boolean | null
          reflection_percentage: string | null
          snapshot: boolean | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          symbol: string | null
          token_created_at: string | null
          token_id: string | null
          token_type: string | null
          token_updated_at: string | null
          total_supply: string | null
          trading_start_time: string | null
          transfer_config: Json | null
          vesting_cliff_period: number | null
          vesting_enabled: boolean | null
          voting_delay: number | null
          voting_period: number | null
          whitelist_config: Json | null
        }
        Relationships: []
      }
      token_erc3525_view: {
        Row: {
          access_control: string | null
          accredited_investor_only: boolean | null
          accrual_enabled: boolean | null
          accrual_rate: string | null
          allows_slot_enumeration: boolean | null
          base_uri: string | null
          compound_interest_enabled: boolean | null
          coupon_frequency: string | null
          cross_slot_transfers: boolean | null
          decimals: number | null
          derivative_type: string | null
          description: string | null
          dynamic_metadata: boolean | null
          dynamic_slot_creation: boolean | null
          early_redemption_enabled: boolean | null
          erc3525_property_id: string | null
          expiration_date: string | null
          financial_instrument_type: string | null
          flash_loan_enabled: boolean | null
          fractional_ownership_enabled: boolean | null
          has_royalty: boolean | null
          interest_rate: string | null
          is_burnable: boolean | null
          is_pausable: boolean | null
          kyc_required: boolean | null
          liquidity_provision_enabled: boolean | null
          maturity_date: string | null
          mergable: boolean | null
          metadata: Json | null
          metadata_storage: string | null
          minimum_trade_value: string | null
          name: string | null
          partial_value_trading: boolean | null
          permissioning_enabled: boolean | null
          principal_amount: string | null
          property_created_at: string | null
          property_updated_at: string | null
          regulatory_compliance_enabled: boolean | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          settlement_type: string | null
          slot_approvals: boolean | null
          slot_creation_enabled: boolean | null
          slot_transfer_validation: Json | null
          slot_type: string | null
          splittable: boolean | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          strike_price: string | null
          supply_tracking: boolean | null
          symbol: string | null
          token_created_at: string | null
          token_id: string | null
          token_updated_at: string | null
          total_supply: string | null
          underlying_asset: string | null
          updatable_slots: boolean | null
          updatable_uris: boolean | null
          updatable_values: boolean | null
          value_aggregation: boolean | null
          value_approvals: boolean | null
          value_computation_method: string | null
          value_decimals: number | null
          value_transfers_enabled: boolean | null
          yield_farming_enabled: boolean | null
        }
        Relationships: []
      }
      token_erc4626_view: {
        Row: {
          access_control: string | null
          apy_tracking_enabled: boolean | null
          asset_address: string | null
          asset_decimals: number | null
          asset_name: string | null
          asset_symbol: string | null
          auto_compounding_enabled: boolean | null
          automated_rebalancing: boolean | null
          benchmark_index: string | null
          benchmark_tracking_enabled: boolean | null
          circuit_breaker_enabled: boolean | null
          compliance_reporting_enabled: boolean | null
          compound_frequency: string | null
          cross_chain_yield_enabled: boolean | null
          custom_strategy: boolean | null
          decimals: number | null
          description: string | null
          emergency_exit_enabled: boolean | null
          emergency_shutdown: boolean | null
          erc4626_property_id: string | null
          fee_structure: Json | null
          fee_voting_enabled: boolean | null
          flash_loans: boolean | null
          governance_token_enabled: boolean | null
          institutional_grade: boolean | null
          insurance_enabled: boolean | null
          is_burnable: boolean | null
          is_mintable: boolean | null
          is_pausable: boolean | null
          liquidity_mining_enabled: boolean | null
          market_making_enabled: boolean | null
          metadata: Json | null
          multi_asset_enabled: boolean | null
          name: string | null
          performance_metrics: boolean | null
          permit: boolean | null
          property_created_at: string | null
          property_updated_at: string | null
          rebalancing_enabled: boolean | null
          rebalancing_rules: Json | null
          risk_management_enabled: boolean | null
          risk_tolerance: string | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          strategy_complexity: string | null
          strategy_controller: string | null
          strategy_voting_enabled: boolean | null
          symbol: string | null
          third_party_audits_enabled: boolean | null
          token_created_at: string | null
          token_id: string | null
          token_updated_at: string | null
          total_supply: string | null
          vault_strategy: string | null
          vault_type: string | null
          yield_optimization_enabled: boolean | null
          yield_source: string | null
        }
        Relationships: []
      }
      token_erc721_view: {
        Row: {
          access_control: string | null
          asset_type: string | null
          auto_increment_ids: boolean | null
          base_uri: string | null
          contract_uri: string | null
          cross_chain_enabled: boolean | null
          decimals: number | null
          description: string | null
          enable_dynamic_metadata: boolean | null
          enable_fractional_ownership: boolean | null
          enumerable: boolean | null
          erc721_property_id: string | null
          has_royalty: boolean | null
          is_burnable: boolean | null
          is_pausable: boolean | null
          max_mints_per_tx: number | null
          max_mints_per_wallet: number | null
          max_supply: string | null
          metadata: Json | null
          metadata_storage: string | null
          minting_method: string | null
          minting_price: string | null
          name: string | null
          permission_config: Json | null
          pre_reveal_uri: string | null
          property_created_at: string | null
          property_updated_at: string | null
          public_sale_enabled: boolean | null
          public_sale_price: string | null
          public_sale_start_time: string | null
          reserved_tokens: number | null
          revealable: boolean | null
          royalty_percentage: string | null
          royalty_receiver: string | null
          sales_config: Json | null
          soulbound: boolean | null
          staking_enabled: boolean | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          status: Database["public"]["Enums"]["token_status_enum"] | null
          symbol: string | null
          token_created_at: string | null
          token_id: string | null
          token_updated_at: string | null
          total_supply: string | null
          updatable_uris: boolean | null
          uri_storage: string | null
          utility_enabled: boolean | null
          utility_type: string | null
          whitelist_config: Json | null
          whitelist_sale_enabled: boolean | null
          whitelist_sale_price: string | null
          whitelist_sale_start_time: string | null
        }
        Relationships: []
      }
      token_geographic_restrictions_view: {
        Row: {
          country_code: string | null
          country_name: string | null
          effective_date: string | null
          expiry_date: string | null
          is_eu_sanctioned: boolean | null
          is_ofac_sanctioned: boolean | null
          is_un_sanctioned: boolean | null
          max_ownership_percentage: number | null
          notes: string | null
          region: string | null
          regulatory_regime: string | null
          requires_local_custodian: boolean | null
          requires_regulatory_approval: boolean | null
          restriction_type: string | null
          sanctions_risk_level: string | null
          standard: Database["public"]["Enums"]["token_standard_enum"] | null
          token_id: string | null
          token_name: string | null
          token_symbol: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "climate_token_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1155_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc1400_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc20_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc3525_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc4626_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_erc721_view"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "token_whitelist_summary"
            referencedColumns: ["token_id"]
          },
          {
            foreignKeyName: "token_geographic_restrictions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_whitelist_summary: {
        Row: {
          created_at: string | null
          erc1155_whitelist_enabled: boolean | null
          erc1400_whitelist_enabled: boolean | null
          erc20_whitelist_enabled: boolean | null
          erc3525_whitelist_enabled: boolean | null
          erc4626_whitelist_enabled: boolean | null
          erc721_whitelist_enabled: boolean | null
          token_id: string | null
          token_name: string | null
          token_standard:
            | Database["public"]["Enums"]["token_standard_enum"]
            | null
          token_symbol: string | null
          updated_at: string | null
          whitelisted_address_count: number | null
        }
        Relationships: []
      }
      transfer_history: {
        Row: {
          amount: number | null
          asset: string | null
          block_number: number | null
          blockchain: string | null
          confirmations: number | null
          created_at: string | null
          from_address: string | null
          gas_used: number | null
          hash: string | null
          id: string | null
          memo: string | null
          network_fee: number | null
          status: string | null
          to_address: string | null
          transfer_type: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          asset?: string | null
          block_number?: number | null
          blockchain?: string | null
          confirmations?: number | null
          created_at?: string | null
          from_address?: string | null
          gas_used?: number | null
          hash?: string | null
          id?: string | null
          memo?: string | null
          network_fee?: number | null
          status?: string | null
          to_address?: string | null
          transfer_type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          asset?: string | null
          block_number?: number | null
          blockchain?: string | null
          confirmations?: number | null
          created_at?: string | null
          from_address?: string | null
          gas_used?: number | null
          hash?: string | null
          id?: string | null
          memo?: string | null
          network_fee?: number | null
          status?: string | null
          to_address?: string | null
          transfer_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          failed_activities: number | null
          first_activity: string | null
          last_activity: string | null
          successful_activities: number | null
          total_activities: number | null
          unique_actions: number | null
          unique_sources: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      user_permissions_view: {
        Row: {
          email: string | null
          organization_id: string | null
          permission_description: string | null
          permission_name: string | null
          role_name: string | null
          scope: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      valid_policy_approvers: {
        Row: {
          comment: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          policy_rule_id: string | null
          status: string | null
          timestamp: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_rule_approvers_policy_rule_id_fkey"
            columns: ["policy_rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
    }
    Functions: {
      add_investors_to_group: {
        Args: { p_group_id: string; p_investor_ids: string[] }
        Returns: undefined
      }
      add_policy_approver: {
        Args:
          | {
              created_by: string
              policy_id: string
              status_val?: string
              user_id: string
            }
          | { p_created_by: string; p_policy_id: string; p_user_id: string }
        Returns: undefined
      }
      add_policy_approver_with_cast: {
        Args: { created_by_id: string; policy_id: string; user_id: string }
        Returns: boolean
      }
      add_table_to_realtime: {
        Args: { table_name: string }
        Returns: undefined
      }
      admin_set_profile_type: {
        Args: {
          new_profile_type: Database["public"]["Enums"]["profile_type"]
          user_auth_id: string
        }
        Returns: undefined
      }
      analyze_activity_indexes: {
        Args: Record<PropertyKey, never>
        Returns: {
          index_name: string
          scans: number
          usage: string
        }[]
      }
      analyze_table_for_audit: {
        Args: { table_name_param: string }
        Returns: {
          column_count: number
          estimated_audit_entries: number
          has_created_at: boolean
          has_id: boolean
          has_project_id: boolean
          has_updated_at: boolean
          has_user_id: boolean
          table_name: string
        }[]
      }
      archive_old_moonpay_compliance_alerts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      assign_redemption_approvers: {
        Args: { p_approval_config_id: string; p_redemption_request_id: string }
        Returns: boolean
      }
      backup_trigger_definitions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_duplicate_wallet: {
        Args: {
          p_credential_type: string
          p_network: string
          p_project_id: string
        }
        Returns: boolean
      }
      check_permission: {
        Args: { p_action: string; p_resource: string; p_role_name: string }
        Returns: boolean
      }
      check_redemption_eligibility: {
        Args: {
          p_investor_id: string
          p_product_id?: string
          p_product_type?: string
          p_project_id: string
          p_requested_amount: number
        }
        Returns: {
          distribution_ids: string[]
          eligible: boolean
          max_amount: number
          reason: string
          validation_details: Json
          window_id: string
        }[]
      }
      check_user_permission: {
        Args: { permission: string; user_id: string }
        Returns: boolean
      }
      cleanup_expired_asset_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_transaction_drafts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_moonpay_policy_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_validation_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_webhook_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_orphaned_policy_approvers: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      column_exists: {
        Args: {
          p_column_name: string
          p_schema_name: string
          p_table_name: string
        }
        Returns: boolean
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      create_audit_trigger: {
        Args: { is_high_volume?: boolean; table_name: string }
        Returns: undefined
      }
      create_project_with_cap_table: {
        Args: { cap_table_name: string; project_data: Json }
        Returns: Json
      }
      create_selective_audit_trigger: {
        Args: { p_condition?: string; p_table: string }
        Returns: undefined
      }
      create_transaction_events_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_project_cascade: {
        Args: { project_id: string }
        Returns: undefined
      }
      delete_user_with_privileges: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      exec: {
        Args: { query: string }
        Returns: Json
      }
      execute_safely: {
        Args: { p_statement: string }
        Returns: boolean
      }
      get_activity_counts_by_timeframe: {
        Args: { p_end_time: string; p_interval?: string; p_start_time: string }
        Returns: {
          activity_count: number
          time_bucket: string
        }[]
      }
      get_activity_distribution_by_category: {
        Args: { p_end_time: string; p_start_time: string }
        Returns: {
          activity_count: number
          category: string
          percentage: number
        }[]
      }
      get_activity_hierarchy: {
        Args: { root_id: string }
        Returns: {
          action: string
          activity_timestamp: string
          id: string
          level: number
          status: string
        }[]
      }
      get_all_table_schemas: {
        Args: Record<PropertyKey, never>
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
          table_name: string
        }[]
      }
      get_audit_repopulation_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          metric: string
          value: string
        }[]
      }
      get_audit_statistics: {
        Args: { p_hours_back?: number }
        Returns: Json
      }
      get_moonpay_webhook_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_webhooks: number
          avg_success_rate: number
          failed_webhooks: number
          total_webhooks: number
        }[]
      }
      get_product_id_for_project: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_product_table_name: {
        Args: { p_project_type: string }
        Returns: string
      }
      get_project_target_raise: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_recent_activities: {
        Args: { days_back?: number }
        Returns: {
          action: string
          activity_time: string
          details: string
          entity_id: string
          entity_type: string
          id: string
          source: string
          status: string
          user_id: string
          username: string
        }[]
      }
      get_redemption_capacity: {
        Args: { p_redemption_rule_id: string }
        Returns: {
          available_capacity: number
          capacity_percentage: number
          target_raise_amount: number
          total_redeemed_amount: number
        }[]
      }
      get_redemption_rule_product_details: {
        Args: { p_redemption_rule_id: string }
        Returns: Json
      }
      get_redemption_rules_by_product_type: {
        Args: { p_product_type: string }
        Returns: {
          is_redemption_open: boolean
          product_details: Json
          product_name: string
          product_status: string
          project_name: string
          redemption_rule_id: string
          redemption_type: string
        }[]
      }
      get_redemption_rules_near_capacity: {
        Args: { p_threshold_percentage?: number }
        Returns: {
          available_capacity: number
          capacity_percentage: number
          capacity_status: string
          product_name: string
          project_name: string
          redemption_rule_id: string
          target_raise_amount: number
        }[]
      }
      get_table_row_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      get_token_whitelist_addresses: {
        Args: { p_token_id: string }
        Returns: {
          address: string
          approved_date: string
          is_active: boolean
          source: string
        }[]
      }
      get_total_redemption_capacity: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_rules_count: number
          overall_usage_percentage: number
          rules_with_limits_count: number
          total_available_capacity: number
          total_redeemed: number
          total_target_raise: number
        }[]
      }
      get_unique_group_memberships: {
        Args: { investor_ids: string[] }
        Returns: {
          group_id: string
          investor_count: number
        }[]
      }
      get_unique_member_count: {
        Args: { group_id_param: string }
        Returns: number
      }
      get_user_profile: {
        Args: { user_auth_id: string }
        Returns: {
          auth_id: string
          created_at: string
          email: string
          first_name: string
          last_name: string
          name: string
          profile_type: Database["public"]["Enums"]["profile_type"]
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_users_by_role_for_approval: {
        Args: { role_names: string[] }
        Returns: {
          role_id: string
          role_name: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_users_with_any_permission: {
        Args: { permission_names: string[] }
        Returns: {
          email: string
          name: string
          role: string
          user_id: string
        }[]
      }
      get_users_with_permission: {
        Args: { permission_name: string }
        Returns: {
          email: string
          name: string
          role: string
          user_id: string
        }[]
      }
      get_users_with_permission_simple: {
        Args: { p_permission_id: string }
        Returns: string[]
      }
      insert_energy_asset_safe: {
        Args: {
          p_capacity: number
          p_location: string
          p_name: string
          p_owner_id?: string
          p_type: string
        }
        Returns: string
      }
      insert_policy_approver: {
        Args: { p_created_by: string; p_policy_id: string; p_user_id: string }
        Returns: undefined
      }
      is_address_whitelisted: {
        Args: { p_address: string; p_token_id: string }
        Returns: boolean
      }
      link_redemption_request_to_window: {
        Args: { request_id: string; window_id: string }
        Returns: boolean
      }
      list_tables: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
        }[]
      }
      log_audit: {
        Args: {
          p_action: string
          p_details?: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_status?: string
          p_user_id: string
        }
        Returns: string
      }
      log_database_operation: {
        Args: {
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_operation: string
          p_record_id: string
          p_table_name: string
          p_user_id?: string
        }
        Returns: string
      }
      migrate_token_json_to_tables: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      purge_duplicate_lifecycle_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      reconcile_redemption_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          after_requests: number
          after_value: number
          before_requests: number
          before_value: number
          window_id: string
          window_name: string
        }[]
      }
      refresh_activity_metrics: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      refresh_all_redemption_window_statistics: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      remove_investors_from_group: {
        Args: { p_group_id: string; p_investor_ids: string[] }
        Returns: undefined
      }
      reserve_redemption_amounts: {
        Args: { p_distribution_ids: string[]; p_total_amount: number }
        Returns: boolean
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      safe_cast_to_uuid: {
        Args: { input: string }
        Returns: string
      }
      safe_uuid_cast: {
        Args: { text_id: string }
        Returns: string
      }
      save_consensus_config: {
        Args: {
          p_consensus_type: string
          p_eligible_roles: string[]
          p_required_approvals: number
        }
        Returns: boolean
      }
      sidebar_config_matches_user: {
        Args: {
          config_profile_enums: Database["public"]["Enums"]["profile_type"][]
          config_role_ids: string[]
          user_profile_type: Database["public"]["Enums"]["profile_type"]
          user_role_ids: string[]
        }
        Returns: boolean
      }
      sync_group_memberships: {
        Args: { group_id_param: string }
        Returns: undefined
      }
      sync_investor_group_memberships: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      table_exists: {
        Args: { p_schema_name: string; p_table_name: string }
        Returns: boolean
      }
      track_system_process: {
        Args: { description?: string; metadata?: Json; process_name: string }
        Returns: string
      }
      update_bulk_operation_progress: {
        Args: {
          p_failed_count?: number
          p_operation_id: string
          p_processed_count?: number
          p_progress: number
          p_status?: string
        }
        Returns: boolean
      }
      update_redemption_window_statistics: {
        Args: { window_uuid: string }
        Returns: undefined
      }
      update_system_process_progress: {
        Args: {
          p_process_id: string
          p_processed_count?: number
          p_progress: number
          p_status?: string
        }
        Returns: boolean
      }
      update_system_process_status: {
        Args: { error_details?: string; new_status: string; process_id: string }
        Returns: boolean
      }
      update_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      upsert_policy_template_approver: {
        Args: {
          p_created_by: string
          p_status?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_has_delete_permission: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_blockchain_address: {
        Args: { address: string; blockchain: string }
        Returns: boolean
      }
      validate_geographic_restriction: {
        Args: {
          p_investment_amount?: number
          p_investor_country_code: string
          p_token_id: string
        }
        Returns: {
          blocking_reason: string
          is_allowed: boolean
          max_ownership_percentage: number
          requires_enhanced_dd: boolean
          restriction_type: string
        }[]
      }
      validate_project_type: {
        Args: { p_project_type: string }
        Returns: boolean
      }
      validate_redemption_amount: {
        Args: { p_redemption_rule_id: string; p_requested_amount: number }
        Returns: {
          available_capacity: number
          error_message: string
          is_valid: boolean
          target_raise_amount: number
        }[]
      }
      validate_whitelist_config_permissive: {
        Args: { config: Json }
        Returns: boolean
      }
    }
    Enums: {
      compliance_status: "compliant" | "non_compliant" | "pending_review"
      document_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
        | "active"
        | "pending_review"
      document_type:
        | "commercial_register"
        | "certificate_incorporation"
        | "memorandum_articles"
        | "director_list"
        | "shareholder_register"
        | "financial_statements"
        | "regulatory_status"
        | "qualification_summary"
        | "business_description"
        | "organizational_chart"
        | "key_people_cv"
        | "aml_kyc_description"
        | "passport"
        | "drivers_license"
        | "national_id"
        | "utility_bill"
        | "bank_statement"
        | "proof_of_income"
        | "proof_of_address"
        | "employment_letter"
        | "tax_return"
        | "social_security"
      individual_document_type:
        | "passport"
        | "drivers_license"
        | "national_id"
        | "state_id"
        | "voter_id"
        | "proof_of_address"
        | "utility_bill"
        | "bank_statement"
        | "lease_agreement"
        | "mortgage_statement"
        | "phone_bill"
        | "internet_bill"
        | "insurance_statement"
        | "investment_agreement"
        | "accreditation_letter"
        | "tax_document"
        | "w2_form"
        | "tax_return"
        | "income_statement"
        | "employment_letter"
        | "pay_stub"
        | "financial_statement"
        | "power_of_attorney"
        | "trust_document"
        | "beneficial_ownership"
        | "source_of_funds"
        | "source_of_wealth"
        | "articles_of_incorporation"
        | "bylaws"
        | "operating_agreement"
        | "certificate_of_good_standing"
        | "tax_exemption_letter"
        | "audit_report"
        | "board_resolution"
        | "legal_opinion"
        | "prospectus"
        | "offering_memorandum"
        | "regulatory_filing"
        | "compliance_certificate"
        | "other"
      issuer_document_type:
        | "issuer_creditworthiness"
        | "project_security_type"
        | "offering_details"
        | "term_sheet"
        | "special_rights"
        | "underwriters"
        | "use_of_proceeds"
        | "financial_highlights"
        | "timing"
        | "risk_factors"
      issuer_role: "admin" | "editor" | "viewer" | "compliance_officer"
      kyc_status: "approved" | "pending" | "failed" | "not_started" | "expired"
      LimitType:
        | "POSITION_SIZE"
        | "DAILY_LOSS"
        | "VAR_LIMIT"
        | "CONCENTRATION"
        | "LEVERAGE"
      OrderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT"
      pool_type_enum: "Total Pool" | "Tranche"
      processing_date_mode_enum: "fixed" | "same_day" | "offset"
      product_status:
        | "Active"
        | "Called"
        | "Matured"
        | "Redeemed"
        | "Expired"
        | "Suspended"
        | "Delisted"
        | "Open"
        | "Closed"
      profile_type: "service provider" | "issuer" | "investor" | "super admin"
      project_duration:
        | "1_month"
        | "3_months"
        | "6_months"
        | "9_months"
        | "12_months"
        | "over_12_months"
      stablecoin_collateral_type:
        | "Fiat"
        | "Crypto"
        | "Commodity"
        | "Algorithmic"
        | "Hybrid"
        | "None"
      submission_date_mode_enum: "fixed" | "relative"
      token_config_mode_enum: "min" | "max" | "basic" | "advanced"
      token_standard_enum:
        | "ERC-20"
        | "ERC-721"
        | "ERC-1155"
        | "ERC-1400"
        | "ERC-3525"
        | "ERC-4626"
      token_status_enum:
        | "DRAFT"
        | "UNDER REVIEW"
        | "APPROVED"
        | "READY TO MINT"
        | "MINTED"
        | "DEPLOYED"
        | "PAUSED"
        | "DISTRIBUTED"
        | "REJECTED"
      TradeSide: "BUY" | "SELL"
      TradeStatus:
        | "PENDING"
        | "PARTIALLY_FILLED"
        | "FILLED"
        | "CANCELLED"
        | "REJECTED"
        | "SETTLED"
      UserRole:
        | "ADMIN"
        | "TRADER"
        | "RISK_MANAGER"
        | "COMPLIANCE"
        | "SETTLEMENT"
      workflow_status: "pending" | "completed" | "rejected"
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
      compliance_status: ["compliant", "non_compliant", "pending_review"],
      document_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
        "active",
        "pending_review",
      ],
      document_type: [
        "commercial_register",
        "certificate_incorporation",
        "memorandum_articles",
        "director_list",
        "shareholder_register",
        "financial_statements",
        "regulatory_status",
        "qualification_summary",
        "business_description",
        "organizational_chart",
        "key_people_cv",
        "aml_kyc_description",
        "passport",
        "drivers_license",
        "national_id",
        "utility_bill",
        "bank_statement",
        "proof_of_income",
        "proof_of_address",
        "employment_letter",
        "tax_return",
        "social_security",
      ],
      individual_document_type: [
        "passport",
        "drivers_license",
        "national_id",
        "state_id",
        "voter_id",
        "proof_of_address",
        "utility_bill",
        "bank_statement",
        "lease_agreement",
        "mortgage_statement",
        "phone_bill",
        "internet_bill",
        "insurance_statement",
        "investment_agreement",
        "accreditation_letter",
        "tax_document",
        "w2_form",
        "tax_return",
        "income_statement",
        "employment_letter",
        "pay_stub",
        "financial_statement",
        "power_of_attorney",
        "trust_document",
        "beneficial_ownership",
        "source_of_funds",
        "source_of_wealth",
        "articles_of_incorporation",
        "bylaws",
        "operating_agreement",
        "certificate_of_good_standing",
        "tax_exemption_letter",
        "audit_report",
        "board_resolution",
        "legal_opinion",
        "prospectus",
        "offering_memorandum",
        "regulatory_filing",
        "compliance_certificate",
        "other",
      ],
      issuer_document_type: [
        "issuer_creditworthiness",
        "project_security_type",
        "offering_details",
        "term_sheet",
        "special_rights",
        "underwriters",
        "use_of_proceeds",
        "financial_highlights",
        "timing",
        "risk_factors",
      ],
      issuer_role: ["admin", "editor", "viewer", "compliance_officer"],
      kyc_status: ["approved", "pending", "failed", "not_started", "expired"],
      LimitType: [
        "POSITION_SIZE",
        "DAILY_LOSS",
        "VAR_LIMIT",
        "CONCENTRATION",
        "LEVERAGE",
      ],
      OrderType: ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"],
      pool_type_enum: ["Total Pool", "Tranche"],
      processing_date_mode_enum: ["fixed", "same_day", "offset"],
      product_status: [
        "Active",
        "Called",
        "Matured",
        "Redeemed",
        "Expired",
        "Suspended",
        "Delisted",
        "Open",
        "Closed",
      ],
      profile_type: ["service provider", "issuer", "investor", "super admin"],
      project_duration: [
        "1_month",
        "3_months",
        "6_months",
        "9_months",
        "12_months",
        "over_12_months",
      ],
      stablecoin_collateral_type: [
        "Fiat",
        "Crypto",
        "Commodity",
        "Algorithmic",
        "Hybrid",
        "None",
      ],
      submission_date_mode_enum: ["fixed", "relative"],
      token_config_mode_enum: ["min", "max", "basic", "advanced"],
      token_standard_enum: [
        "ERC-20",
        "ERC-721",
        "ERC-1155",
        "ERC-1400",
        "ERC-3525",
        "ERC-4626",
      ],
      token_status_enum: [
        "DRAFT",
        "UNDER REVIEW",
        "APPROVED",
        "READY TO MINT",
        "MINTED",
        "DEPLOYED",
        "PAUSED",
        "DISTRIBUTED",
        "REJECTED",
      ],
      TradeSide: ["BUY", "SELL"],
      TradeStatus: [
        "PENDING",
        "PARTIALLY_FILLED",
        "FILLED",
        "CANCELLED",
        "REJECTED",
        "SETTLED",
      ],
      UserRole: ["ADMIN", "TRADER", "RISK_MANAGER", "COMPLIANCE", "SETTLEMENT"],
      workflow_status: ["pending", "completed", "rejected"],
    },
  },
} as const
