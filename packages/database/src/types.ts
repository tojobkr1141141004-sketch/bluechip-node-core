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
      admin_permissions: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: string
          code: string
          created_at: string
          decimals: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          asset_type: string
          code: string
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          code?: string
          created_at?: string
          decimals?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          amount: number
          asset_id: string
          completed_at: string | null
          created_at: string
          external_reference: string | null
          id: string
          ledger_transaction_id: string | null
          rejection_reason: string | null
          request_hash: string
          request_key: string
          status: string
          updated_at: string
          user_id: string
          user_note: string
        }
        Insert: {
          amount: number
          asset_id: string
          completed_at?: string | null
          created_at?: string
          external_reference?: string | null
          id?: string
          ledger_transaction_id?: string | null
          rejection_reason?: string | null
          request_hash: string
          request_key: string
          status?: string
          updated_at?: string
          user_id: string
          user_note?: string
        }
        Update: {
          amount?: number
          asset_id?: string
          completed_at?: string | null
          created_at?: string
          external_reference?: string | null
          id?: string
          ledger_transaction_id?: string | null
          rejection_reason?: string | null
          request_hash?: string
          request_key?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_note?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      ledger_account_balances: {
        Row: {
          account_id: string
          balance: number
          updated_at: string
        }
        Insert: {
          account_id: string
          balance?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_account_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "user_asset_balances"
            referencedColumns: ["account_id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          account_type: string
          allow_negative: boolean
          asset_id: string
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          allow_negative?: boolean
          asset_id: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          allow_negative?: boolean
          asset_id?: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          asset_id: string
          created_at: string
          direction: string
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          asset_id: string
          created_at?: string
          direction: string
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          asset_id?: string
          created_at?: string
          direction?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          idempotency_key: string
          reference_id: string | null
          reference_type: string | null
          request_hash: string
          reversal_of_transaction_id: string | null
          transaction_type: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          idempotency_key: string
          reference_id?: string | null
          reference_type?: string | null
          request_hash: string
          reversal_of_transaction_id?: string | null
          transaction_type: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          idempotency_key?: string
          reference_id?: string | null
          reference_type?: string | null
          request_hash?: string
          reversal_of_transaction_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "ledger_transactions_reversal_of_transaction_id_fkey"
            columns: ["reversal_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_reversal_of_transaction_id_fkey"
            columns: ["reversal_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      member_directory: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string | null
          last_sign_in_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          last_sign_in_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string | null
          last_sign_in_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mining_calculation_errors: {
        Row: {
          calculation_run_id: string
          contract_id: string | null
          created_at: string
          error_message: string
          id: string
          sqlstate: string
        }
        Insert: {
          calculation_run_id: string
          contract_id?: string | null
          created_at?: string
          error_message: string
          id?: string
          sqlstate: string
        }
        Update: {
          calculation_run_id?: string
          contract_id?: string | null
          created_at?: string
          error_message?: string
          id?: string
          sqlstate?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_calculation_errors_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      mining_calculation_runs: {
        Row: {
          created_at: string
          error_count: number
          finished_at: string | null
          id: string
          processed_contracts: number
          rewarded_contracts: number
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          finished_at?: string | null
          id?: string
          processed_contracts?: number
          rewarded_contracts?: number
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_count?: number
          finished_at?: string | null
          id?: string
          processed_contracts?: number
          rewarded_contracts?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      mining_contracts: {
        Row: {
          capacity: number
          created_at: string
          id: string
          idempotency_key: string
          last_calculated_at: string
          pending_reward: number
          product_id: string
          product_version_id: string
          request_hash: string
          scheduled_end_at: string
          started_at: string
          status: string
          total_reward_earned: number
          total_reward_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          idempotency_key: string
          last_calculated_at: string
          pending_reward?: number
          product_id: string
          product_version_id: string
          request_hash: string
          scheduled_end_at: string
          started_at: string
          status?: string
          total_reward_earned?: number
          total_reward_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          last_calculated_at?: string
          pending_reward?: number
          product_id?: string
          product_version_id?: string
          request_hash?: string
          scheduled_end_at?: string
          started_at?: string
          status?: string
          total_reward_earned?: number
          total_reward_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
        ]
      }
      mining_product_versions: {
        Row: {
          capacity_unit: string
          created_at: string
          created_by: string | null
          id: string
          max_capacity: number | null
          min_capacity: number
          product_id: string
          published_at: string | null
          reward_asset_id: string
          reward_per_unit_per_day: number
          status: string
          term_days: number
          version: number
        }
        Insert: {
          capacity_unit: string
          created_at?: string
          created_by?: string | null
          id?: string
          max_capacity?: number | null
          min_capacity: number
          product_id: string
          published_at?: string | null
          reward_asset_id: string
          reward_per_unit_per_day: number
          status?: string
          term_days?: number
          version: number
        }
        Update: {
          capacity_unit?: string
          created_at?: string
          created_by?: string | null
          id?: string
          max_capacity?: number | null
          min_capacity?: number
          product_id?: string
          published_at?: string | null
          reward_asset_id?: string
          reward_per_unit_per_day?: number
          status?: string
          term_days?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      mining_products: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_public: boolean
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mining_reward_accruals: {
        Row: {
          asset_id: string
          calculation_run_id: string
          contract_id: string
          created_at: string
          elapsed_seconds: number
          id: string
          period_end: string
          period_start: string
          product_version_id: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          asset_id: string
          calculation_run_id: string
          contract_id: string
          created_at?: string
          elapsed_seconds: number
          id?: string
          period_end: string
          period_start: string
          product_version_id: string
          reward_amount: number
          user_id: string
        }
        Update: {
          asset_id?: string
          calculation_run_id?: string
          contract_id?: string
          created_at?: string
          elapsed_seconds?: number
          id?: string
          period_end?: string
          period_start?: string
          product_version_id?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
        ]
      }
      mining_reward_payments: {
        Row: {
          accrual_id: string
          amount: number
          asset_id: string
          calculation_run_id: string
          contract_id: string
          created_at: string
          id: string
          idempotency_key: string
          ledger_transaction_id: string
          user_id: string
        }
        Insert: {
          accrual_id: string
          amount: number
          asset_id: string
          calculation_run_id: string
          contract_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          ledger_transaction_id: string
          user_id: string
        }
        Update: {
          accrual_id?: string
          amount?: number
          asset_id?: string
          calculation_run_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          ledger_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "admin_mining_reward_events"
            referencedColumns: ["accrual_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "mining_reward_accruals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "user_mining_reward_history"
            referencedColumns: ["accrual_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      mining_settings: {
        Row: {
          calculation_enabled: boolean
          calculation_interval_seconds: number
          calculation_timezone: string
          id: number
          max_accounts_per_run: number
          reward_precision: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          calculation_enabled?: boolean
          calculation_interval_seconds?: number
          calculation_timezone?: string
          id?: number
          max_accounts_per_run?: number
          reward_precision?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          calculation_enabled?: boolean
          calculation_interval_seconds?: number
          calculation_timezone?: string
          id?: number
          max_accounts_per_run?: number
          reward_precision?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          locale: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          locale?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          asset_id: string
          completed_at: string | null
          completion_transaction_id: string | null
          created_at: string
          destination_name: string | null
          destination_network: string | null
          destination_type: string
          destination_value: string
          external_reference: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          rejection_reason: string | null
          request_hash: string
          request_key: string
          reserve_transaction_id: string | null
          status: string
          updated_at: string
          user_id: string
          user_note: string
        }
        Insert: {
          amount: number
          asset_id: string
          completed_at?: string | null
          completion_transaction_id?: string | null
          created_at?: string
          destination_name?: string | null
          destination_network?: string | null
          destination_type: string
          destination_value: string
          external_reference?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          rejection_reason?: string | null
          request_hash: string
          request_key: string
          reserve_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_note?: string
        }
        Update: {
          amount?: number
          asset_id?: string
          completed_at?: string | null
          completion_transaction_id?: string | null
          created_at?: string
          destination_name?: string | null
          destination_network?: string | null
          destination_type?: string
          destination_value?: string
          external_reference?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          rejection_reason?: string | null
          request_hash?: string
          request_key?: string
          reserve_transaction_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_note?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
    }
    Views: {
      admin_deposit_requests: {
        Row: {
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          completed_at: string | null
          created_at: string | null
          decimals: number | null
          external_reference: string | null
          id: string | null
          ledger_transaction_id: string | null
          rejection_reason: string | null
          request_key: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_note: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      admin_member_directory: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          status: string | null
          updated_at: string | null
          username: string | null
        }
        Relationships: []
      }
      admin_mining_calculation_errors: {
        Row: {
          calculation_run_id: string | null
          contract_id: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          error_message: string | null
          id: string | null
          product_code: string | null
          product_name: string | null
          sqlstate: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_calculation_errors_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_calculation_errors_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      admin_mining_calculation_runs: {
        Row: {
          created_at: string | null
          error_count: number | null
          finished_at: string | null
          id: string | null
          processed_contracts: number | null
          rewarded_contracts: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_count?: number | null
          finished_at?: string | null
          id?: string | null
          processed_contracts?: number | null
          rewarded_contracts?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_count?: number | null
          finished_at?: string | null
          id?: string | null
          processed_contracts?: number | null
          rewarded_contracts?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      admin_mining_contracts: {
        Row: {
          capacity: number | null
          capacity_unit: string | null
          contract_id: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          last_calculated_at: string | null
          pending_reward: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          product_version_id: string | null
          reward_asset_code: string | null
          reward_asset_name: string | null
          reward_per_unit_per_day: number | null
          scheduled_end_at: string | null
          started_at: string | null
          status: string | null
          total_reward_earned: number | null
          total_reward_paid: number | null
          user_id: string | null
          username: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
        ]
      }
      admin_mining_daily_summary: {
        Row: {
          accrual_count: number | null
          accrued_amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          contract_count: number | null
          paid_amount: number | null
          summary_date: string | null
          unpaid_amount: number | null
          user_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      admin_mining_product_versions: {
        Row: {
          capacity_unit: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          max_capacity: number | null
          min_capacity: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          published_at: string | null
          reward_asset_code: string | null
          reward_asset_id: string | null
          reward_asset_name: string | null
          reward_per_unit_per_day: number | null
          status: string | null
          term_days: number | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      admin_mining_products: {
        Row: {
          capacity_unit: string | null
          created_at: string | null
          description: string | null
          is_public: boolean | null
          max_capacity: number | null
          min_capacity: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          published_at: string | null
          published_version: number | null
          published_version_id: string | null
          reward_asset_code: string | null
          reward_asset_id: string | null
          reward_asset_name: string | null
          reward_per_unit_per_day: number | null
          sort_order: number | null
          status: string | null
          term_days: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      admin_mining_reconciliation_summary: {
        Row: {
          accrual_count: number | null
          accrued_amount: number | null
          active_contracts: number | null
          cancelled_contracts: number | null
          completed_contracts: number | null
          error_count: number | null
          invalid_contracts: number | null
          overdue_contracts: number | null
          paid_amount: number | null
          payment_count: number | null
          reconciliation_status: string | null
          unbalanced_ledger_count: number | null
          unpaid_amount: number | null
        }
        Relationships: []
      }
      admin_mining_reward_events: {
        Row: {
          accrual_id: string | null
          accrued_amount: number | null
          accrued_at: string | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          calculation_run_id: string | null
          contract_id: string | null
          elapsed_seconds: number | null
          ledger_transaction_id: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_id: string | null
          period_end: string | null
          period_start: string | null
          product_code: string | null
          product_name: string | null
          product_version_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_calculation_run_id_fkey"
            columns: ["calculation_run_id"]
            isOneToOne: false
            referencedRelation: "mining_calculation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      admin_withdrawal_requests: {
        Row: {
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          completed_at: string | null
          completion_transaction_id: string | null
          created_at: string | null
          decimals: number | null
          destination_name: string | null
          destination_network: string | null
          destination_type: string | null
          destination_value: string | null
          external_reference: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string | null
          rejection_reason: string | null
          request_key: string | null
          reserve_transaction_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_note: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      user_asset_balances: {
        Row: {
          account_id: string | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          asset_type: string | null
          balance: number | null
          created_at: string | null
          decimals: number | null
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_deposit_requests: {
        Row: {
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          completed_at: string | null
          created_at: string | null
          decimals: number | null
          external_reference: string | null
          id: string | null
          ledger_transaction_id: string | null
          rejection_reason: string | null
          request_key: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_note: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      user_ledger_history: {
        Row: {
          account_id: string | null
          account_type: string | null
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          direction: string | null
          entry_created_at: string | null
          entry_id: string | null
          owner_user_id: string | null
          reference_id: string | null
          reference_type: string | null
          reversal_of_transaction_id: string | null
          transaction_id: string | null
          transaction_status: string | null
          transaction_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "ledger_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "ledger_transactions_reversal_of_transaction_id_fkey"
            columns: ["reversal_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_reversal_of_transaction_id_fkey"
            columns: ["reversal_of_transaction_id"]
            isOneToOne: false
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      user_mining_contracts: {
        Row: {
          capacity: number | null
          capacity_unit: string | null
          contract_id: string | null
          created_at: string | null
          last_calculated_at: string | null
          pending_reward: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          product_version_id: string | null
          reward_asset_code: string | null
          reward_asset_decimals: number | null
          reward_asset_id: string | null
          reward_asset_name: string | null
          reward_per_unit_per_day: number | null
          scheduled_end_at: string | null
          started_at: string | null
          status: string | null
          total_reward_earned: number | null
          total_reward_paid: number | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mining_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_contracts_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      user_mining_products: {
        Row: {
          capacity_unit: string | null
          description: string | null
          max_capacity: number | null
          min_capacity: number | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          published_at: string | null
          reward_asset_code: string | null
          reward_asset_decimals: number | null
          reward_asset_id: string | null
          reward_asset_name: string | null
          reward_per_unit_per_day: number | null
          sort_order: number | null
          term_days: number | null
          version: number | null
          version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_product_versions_reward_asset_id_fkey"
            columns: ["reward_asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      user_mining_reward_history: {
        Row: {
          accrual_id: string | null
          asset_id: string | null
          contract_id: string | null
          created_at: string | null
          elapsed_seconds: number | null
          period_end: string | null
          period_start: string | null
          product_code: string | null
          product_name: string | null
          product_version_id: string | null
          reward_amount: number | null
          reward_asset_code: string | null
          reward_asset_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_products"
            referencedColumns: ["published_version_id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "mining_product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_accruals_product_version_id_fkey"
            columns: ["product_version_id"]
            isOneToOne: false
            referencedRelation: "user_mining_products"
            referencedColumns: ["version_id"]
          },
        ]
      }
      user_mining_reward_payments: {
        Row: {
          accrual_id: string | null
          amount: number | null
          asset_id: string | null
          contract_id: string | null
          created_at: string | null
          ledger_transaction_id: string | null
          payment_id: string | null
          reward_asset_code: string | null
          reward_asset_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "admin_mining_reward_events"
            referencedColumns: ["accrual_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "mining_reward_accruals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_accrual_id_fkey"
            columns: ["accrual_id"]
            isOneToOne: true
            referencedRelation: "user_mining_reward_history"
            referencedColumns: ["accrual_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "admin_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "mining_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "user_mining_contracts"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mining_reward_payments_ledger_transaction_id_fkey"
            columns: ["ledger_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
      user_withdrawal_requests: {
        Row: {
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          completed_at: string | null
          completion_transaction_id: string | null
          created_at: string | null
          decimals: number | null
          destination_name: string | null
          destination_network: string | null
          destination_type: string | null
          destination_value: string | null
          external_reference: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string | null
          rejection_reason: string | null
          request_key: string | null
          reserve_transaction_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          user_note: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "user_asset_balances"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_completion_transaction_id_fkey"
            columns: ["completion_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_reserve_transaction_id_fkey"
            columns: ["reserve_transaction_id"]
            isOneToOne: true
            referencedRelation: "user_ledger_history"
            referencedColumns: ["transaction_id"]
          },
        ]
      }
    }
    Functions: {
      approve_deposit_request: {
        Args: { p_external_reference: string; p_request_id: string }
        Returns: string
      }
      approve_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      cancel_deposit_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      cancel_withdrawal_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      complete_withdrawal_request: {
        Args: { p_external_reference: string; p_request_id: string }
        Returns: string
      }
      create_deposit_request: {
        Args: {
          p_amount: number
          p_asset_id: string
          p_request_key: string
          p_user_note?: string
        }
        Returns: string
      }
      create_mining_contract: {
        Args: {
          p_capacity: number
          p_idempotency_key?: string
          p_product_version_id: string
          p_started_at?: string
          p_user_id: string
        }
        Returns: string
      }
      create_mining_product: {
        Args: {
          p_code: string
          p_description?: string
          p_name: string
          p_sort_order?: number
        }
        Returns: string
      }
      create_mining_product_version: {
        Args: {
          p_capacity_unit: string
          p_max_capacity?: number
          p_min_capacity: number
          p_product_id: string
          p_reward_asset_id: string
          p_reward_per_unit_per_day: number
          p_term_days?: number
        }
        Returns: string
      }
      create_withdrawal_request: {
        Args: {
          p_amount: number
          p_asset_id: string
          p_destination_name: string
          p_destination_network: string
          p_destination_type: string
          p_destination_value: string
          p_request_key: string
          p_user_note?: string
        }
        Returns: string
      }
      ensure_user_asset_account: {
        Args: { p_asset_id: string }
        Returns: string
      }
      fail_withdrawal_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: string
      }
      get_mining_member_candidates: {
        Args: never
        Returns: {
          display_name: string
          email: string
          status: string
          user_id: string
          username: string
        }[]
      }
      post_ledger_transaction: {
        Args: {
          p_asset_id: string
          p_description?: string
          p_entries: Json
          p_idempotency_key: string
          p_reference_id?: string
          p_reference_type?: string
          p_transaction_type: string
        }
        Returns: string
      }
      publish_mining_product_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      reject_deposit_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      reject_withdrawal_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      reverse_ledger_transaction: {
        Args: {
          p_description?: string
          p_idempotency_key: string
          p_transaction_id: string
        }
        Returns: string
      }
      run_mining_calculation_now: { Args: never; Returns: Json }
      start_deposit_review: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      start_withdrawal_review: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      update_mining_product: {
        Args: {
          p_description: string
          p_is_public: boolean
          p_name: string
          p_product_id: string
          p_sort_order: number
          p_status: string
        }
        Returns: undefined
      }
      update_mining_settings: {
        Args: {
          p_calculation_enabled: boolean
          p_calculation_interval_seconds: number
          p_calculation_timezone: string
          p_max_accounts_per_run: number
          p_reward_precision: number
        }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
