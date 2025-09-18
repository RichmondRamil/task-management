// lib/supabase.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from "./types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for browser)
export const createClient = () => createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)

// Legacy exports for compatibility
export {
  createPagesBrowserClient,
  createPagesServerClient,
  createMiddlewareClient
} from "@supabase/auth-helpers-nextjs";
