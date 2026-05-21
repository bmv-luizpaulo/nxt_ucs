import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Standard client for client-side or general usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client using the Service Role Key to bypass RLS policies in backend/ETL operations
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase; // Fallback to standard client to prevent runtime reference crashes if key is omitted

// Operational client targeting the 'operational' schema for Anti-Corruption Layer views
export const supabaseOperational = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'operational',
      },
    })
  : supabase;

// Analytics client targeting the 'analytics' schema for analytical and aggregated views
export const supabaseAnalytics = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'analytics',
      },
    })
  : supabase;

// Domain client targeting the 'domain' schema for business-focused semantic views
export const supabaseDomain = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'domain',
      },
    })
  : supabase;
