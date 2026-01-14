/**
 * TypeScript типы для Supabase БД
 * Это базовая структура, позже будет сгенерирована из схемы
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          is_system_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          is_system_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          is_system_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      enterprises: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      enterprise_memberships: {
        Row: {
          id: string;
          enterprise_id: string;
          user_id: string;
          role: "owner" | "admin";
          created_at: string;
        };
        Insert: {
          id?: string;
          enterprise_id: string;
          user_id: string;
          role: "owner" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          enterprise_id?: string;
          user_id?: string;
          role?: "owner" | "admin";
          created_at?: string;
        };
      };
    };
    Functions: {
      is_system_admin: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      get_user_enterprise_role: {
        Args: { p_user_id: string; p_enterprise_id: string };
        Returns: "owner" | "admin" | null;
      };
      get_user_enterprises: {
        Args: { p_user_id: string };
        Returns: Array<{
          id: string;
          name: string;
          role: "owner" | "admin";
          is_owner: boolean;
        }>;
      };
    };
  };
}
