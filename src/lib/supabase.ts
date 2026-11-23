import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface LanesProjectRow {
  id: string;
  user_id: string;
  project_name: string;
  daw_state: Json;
  midi_data: Json | null;
  created_at: string;
  updated_at: string;
}

export interface LanesProjectInsert {
  id?: string;
  user_id: string;
  project_name: string;
  daw_state?: Json;
  midi_data?: Json | null;
  created_at?: string;
  updated_at?: string;
}

export interface LanesProjectUpdate {
  project_name?: string;
  daw_state?: Json;
  midi_data?: Json | null;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      lanes_projects: {
        Row: LanesProjectRow;
        Insert: LanesProjectInsert;
        Update: LanesProjectUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let browserClient: SupabaseClient<Database> | null = null;

function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  const url =
    metaEnv?.VITE_SUPABASE_URL?.trim() ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL?.trim() : undefined);

  const anonKey =
    metaEnv?.VITE_SUPABASE_ANON_KEY?.trim() ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY?.trim() : undefined);

  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable for Lanes Supabase client.');
  }
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable for Lanes Supabase client.');
  }

  return { url: url.replace(/\/$/, ''), anonKey };
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = resolveSupabaseConfig();
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export const supabase: SupabaseClient<Database> = getSupabaseClient();
