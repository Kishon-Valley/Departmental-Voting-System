import "../env.js";

import { createClient } from '@supabase/supabase-js';

// In Vercel, environment variables are automatically available
// But we still need to check they're set
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL or VITE_SUPABASE_URL must be set. Did you forget to set your Supabase project URL?",
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY must be set. Did you forget to set your Supabase anon key?",
  );
}

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
