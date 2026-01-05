/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

export function validateEnvironmentVariables() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required in all environments
  // Check both SUPABASE_URL and VITE_SUPABASE_URL (for Vercel compatibility)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl) {
    errors.push("SUPABASE_URL or VITE_SUPABASE_URL must be set");
  }

  if (!supabaseAnonKey) {
    errors.push("SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY must be set");
  }

  // Required in production
  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
      errors.push("JWT_SECRET or SESSION_SECRET must be set in production");
    }
  } else {
    // Warning in development
    if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
      warnings.push("JWT_SECRET or SESSION_SECRET not set - using insecure default (development only)");
    }
  }

  // Optional but recommended
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY not set - file uploads may not work properly");
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn("⚠️  Environment variable warnings:");
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Throw errors
  if (errors.length > 0) {
    throw new Error(
      "❌ Missing required environment variables:\n" +
      errors.map(err => `   - ${err}`).join("\n") +
      "\n\nPlease set these variables in your .env file or environment."
    );
  }
}

