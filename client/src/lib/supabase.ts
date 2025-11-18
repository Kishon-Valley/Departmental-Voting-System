import { createClient } from '@supabase/supabase-js';

// Supabase configuration - these should be in environment variables
// For now, we'll get them from the server via an API call or use public env vars
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not found. File uploads may not work.');
}

// Create Supabase client for client-side operations
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

