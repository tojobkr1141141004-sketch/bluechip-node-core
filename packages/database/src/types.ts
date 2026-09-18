export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          username: string | null;
          avatar_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          locale: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          locale?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          code: string;
          name: string;
          asset_type: string;
          decimals: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          asset_type: string;
          decimals?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          asset_type?: string;
          decimals?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ledger_accounts: {
        Row: {
          id: string;
          asset_id: string;
          account_type: string;
          owner_user_id: string | null;
          code: string | null;
          name: string;
          allow_negative: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          account_type: string;
          owner_user_id?: string | null;
          code?: string | null;
          name: string;
          allow_negative?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          account_type?: string;
          owner_user_id?: string | null;
          code?: string | null;
          name?: string;
          allow_negative?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          }
        ];
      };
      ledger_account_balances: {
        Row: {
          account_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_account_balances_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "ledger_accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      ledger_transactions: {
        Row: {
          id: string;
          asset_id: string;
          transaction_type: string;
          idempotency_key: string;
          request_hash: string;
          reference_type: string | null;
          reference_id: string | null;
          reversal_of_transaction_id: string | null;
          description: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          transaction_type: string;
          idempotency_key: string;
          request_hash: string;
          reference_type?: string | null;
          reference_id?: string | null;
          reversal_of_transaction_id?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          transaction_type?: string;
          idempotency_key?: string;
          request_hash?: string;
          reference_type?: string | null;
          reference_id?: string | null;
          reversal_of_transaction_id?: string | null;
          description?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_transactions_reversal_of_transaction_id_fkey";
            columns: ["reversal_of_transaction_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      ledger_entries: {
        Row: {
          id: string;
          transaction_id: string;
          account_id: string;
          asset_id: string;
          direction: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          account_id: string;
          asset_id: string;
          direction: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          account_id?: string;
          asset_id?: string;
          direction?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "ledger_transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "ledger_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          }
        ];
      };
      member_directory: {
        Row: {
          user_id: string;
          email: string | null;
          confirmed_at: string | null;
          last_sign_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          confirmed_at?: string | null;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          confirmed_at?: string | null;
          last_sign_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "admin_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "admin_permissions";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          user_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "admin_user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "admin_roles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          target_user_id: string | null;
          event_type: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          ip_address: unknown;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          target_user_id?: string | null;
          event_type: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: unknown;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          target_user_id?: string | null;
          event_type?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: unknown;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      user_asset_balances: {
        Row: {
          account_id: string;
          user_id: string;
          asset_id: string;
          asset_code: string;
          asset_name: string;
          asset_type: string;
          decimals: number;
          balance: number;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_asset_balances_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "ledger_accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      user_ledger_history: {
        Row: {
          transaction_id: string;
          asset_id: string;
          asset_code: string;
          asset_name: string;
          transaction_type: string;
          transaction_status: string;
          description: string;
          reference_type: string | null;
          reference_id: string | null;
          reversal_of_transaction_id: string | null;
          created_by: string | null;
          created_at: string;
          entry_id: string;
          account_id: string;
          account_type: string;
          owner_user_id: string | null;
          direction: string;
          amount: number;
          entry_created_at: string;
        };
        Relationships: [];
      };
      admin_member_directory: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          username: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
          last_sign_in_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      ensure_user_asset_account: {
        Args: { p_asset_id: string };
        Returns: string;
      };
      post_ledger_transaction: {
        Args: {
          p_asset_id: string;
          p_transaction_type: string;
          p_idempotency_key: string;
          p_entries: Json;
          p_description?: string;
          p_reference_type?: string | null;
          p_reference_id?: string | null;
        };
        Returns: string;
      };
      reverse_ledger_transaction: {
        Args: {
          p_transaction_id: string;
          p_idempotency_key: string;
          p_description?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
