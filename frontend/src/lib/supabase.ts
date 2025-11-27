import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types (auto-generated from schema)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          company: string | null;
          industry: string | null;
          plan: "free" | "pro" | "enterprise";
          credits_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          industry?: string | null;
          plan?: "free" | "pro" | "enterprise";
          credits_balance?: number;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company?: string | null;
          industry?: string | null;
          plan?: "free" | "pro" | "enterprise";
          credits_balance?: number;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          industry: string | null;
          target_channel: string[];
          aspect_ratio: string;
          duration: number;
          style_preset: string;
          client_requirements: string | null;
          reference_urls: string[];
          brand_guidelines: Record<string, any>;
          status: string;
          progress: number;
          error_message: string | null;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string | null;
          industry?: string | null;
          target_channel?: string[];
          aspect_ratio?: string;
          duration?: number;
          style_preset?: string;
          client_requirements?: string | null;
          reference_urls?: string[];
          brand_guidelines?: Record<string, any>;
          status?: string;
          progress?: number;
        };
        Update: {
          title?: string;
          description?: string | null;
          industry?: string | null;
          target_channel?: string[];
          aspect_ratio?: string;
          duration?: number;
          style_preset?: string;
          client_requirements?: string | null;
          reference_urls?: string[];
          brand_guidelines?: Record<string, any>;
          status?: string;
          progress?: number;
          error_message?: string | null;
        };
      };
      assets: {
        Row: {
          id: string;
          project_id: string;
          type: "image" | "video" | "audio" | "thumbnail";
          name: string | null;
          url: string;
          prompt_used: string | null;
          vendor: string | null;
          model_version: string | null;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          file_size_bytes: number | null;
          mime_type: string | null;
          status: string;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          project_id: string;
          type: "image" | "video" | "audio" | "thumbnail";
          name?: string | null;
          url: string;
          prompt_used?: string | null;
          vendor?: string | null;
          status?: string;
        };
        Update: {
          name?: string | null;
          url?: string;
          status?: string;
          metadata?: Record<string, any>;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          is_active: boolean;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          user_id: string;
          title?: string | null;
          is_active?: boolean;
        };
        Update: {
          title?: string | null;
          is_active?: boolean;
          last_message_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          action_cards: any[];
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          action_cards?: any[];
          metadata?: Record<string, any>;
        };
        Update: {
          content?: string;
          action_cards?: any[];
          metadata?: Record<string, any>;
        };
      };
    };
  };
}

// Helper functions
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserProjects(userId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createProject(
  project: Database["public"]["Tables"]["projects"]["Insert"]
) {
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectAssets(projectId: string) {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// Auth helpers
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { full_name?: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}
