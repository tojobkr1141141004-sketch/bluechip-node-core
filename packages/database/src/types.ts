export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: {
        Row: { id:string; display_name:string|null; username:string|null; avatar_url:string|null; status:string; created_at:string; updated_at:string };
        Insert: { id:string; display_name?:string|null; username?:string|null; avatar_url?:string|null; status?:string; created_at?:string; updated_at?:string };
        Update: { id?:string; display_name?:string|null; username?:string|null; avatar_url?:string|null; status?:string; created_at?:string; updated_at?:string };
        Relationships: [];
      };
      user_settings: {
        Row: { user_id:string; locale:string; timezone:string; created_at:string; updated_at:string };
        Insert: { user_id:string; locale?:string; timezone?:string; created_at?:string; updated_at?:string };
        Update: { user_id?:string; locale?:string; timezone?:string };
        Relationships: [];
      };
      member_directory: {
        Row: { user_id:string; email:string|null; confirmed_at:string|null; last_sign_in_at:string|null; created_at:string; updated_at:string };
        Insert: { user_id:string; email?:string|null; confirmed_at?:string|null; last_sign_in_at?:string|null; created_at?:string; updated_at?:string };
        Update: { user_id?:string; email?:string|null; confirmed_at?:string|null; last_sign_in_at?:string|null; created_at?:string; updated_at?:string };
        Relationships: [];
      };
      admin_roles: {
        Row: { id:string; code:string; name:string; description:string; is_system:boolean; created_at:string };
        Insert: { id?:string; code:string; name:string; description?:string; is_system?:boolean; created_at?:string };
        Update: { id?:string; code?:string; name?:string; description?:string; is_system?:boolean; created_at?:string };
        Relationships: [];
      };
      admin_permissions: {
        Row: { id:string; code:string; name:string; description:string; created_at:string };
        Insert: { id?:string; code:string; name:string; description?:string; created_at?:string };
        Update: { id?:string; code?:string; name?:string; description?:string; created_at?:string };
        Relationships: [];
      };
      admin_role_permissions: {
        Row: { role_id:string; permission_id:string; created_at:string };
        Insert: { role_id:string; permission_id:string; created_at?:string };
        Update: { role_id?:string; permission_id?:string; created_at?:string };
        Relationships: [
          { foreignKeyName:"admin_role_permissions_role_id_fkey"; columns:["role_id"]; isOneToOne:false; referencedRelation:"admin_roles"; referencedColumns:["id"] },
          { foreignKeyName:"admin_role_permissions_permission_id_fkey"; columns:["permission_id"]; isOneToOne:false; referencedRelation:"admin_permissions"; referencedColumns:["id"] }
        ];
      };
      admin_users: {
        Row: { user_id:string; status:string; created_at:string; updated_at:string };
        Insert: { user_id:string; status?:string; created_at?:string; updated_at?:string };
        Update: { user_id?:string; status?:string; created_at?:string; updated_at?:string };
        Relationships: [];
      };
      admin_user_roles: {
        Row: { user_id:string; role_id:string; created_at:string };
        Insert: { user_id:string; role_id:string; created_at?:string };
        Update: { user_id?:string; role_id?:string; created_at?:string };
        Relationships: [
          { foreignKeyName:"admin_user_roles_user_id_fkey"; columns:["user_id"]; isOneToOne:false; referencedRelation:"admin_users"; referencedColumns:["user_id"] },
          { foreignKeyName:"admin_user_roles_role_id_fkey"; columns:["role_id"]; isOneToOne:false; referencedRelation:"admin_roles"; referencedColumns:["id"] }
        ];
      };
      audit_logs: {
        Row: { id:string; actor_user_id:string|null; target_user_id:string|null; event_type:string; action:string; resource_type:string|null; resource_id:string|null; ip_address:unknown; user_agent:string|null; metadata:Json; created_at:string };
        Insert: { id?:string; actor_user_id?:string|null; target_user_id?:string|null; event_type:string; action:string; resource_type?:string|null; resource_id?:string|null; ip_address?:unknown; user_agent?:string|null; metadata?:Json; created_at?:string };
        Update: { id?:string; actor_user_id?:string|null; target_user_id?:string|null; event_type?:string; action?:string; resource_type?:string|null; resource_id?:string|null; ip_address?:unknown; user_agent?:string|null; metadata?:Json; created_at?:string };
        Relationships: [];
      };
    };
    Views: {
      admin_member_directory: {
        Row: { id:string; email:string|null; display_name:string|null; username:string|null; status:string; created_at:string; updated_at:string; confirmed_at:string|null; last_sign_in_at:string|null };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
