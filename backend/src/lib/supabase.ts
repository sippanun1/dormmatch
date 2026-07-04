import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
// Supports both new-style keys (sb_secret_/sb_publishable_) and legacy names
const supabaseServiceKey = (process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY)!;
const supabaseAnonKey = (process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY)!;

// Admin client — bypasses RLS, use for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fresh client for password verification (signInWithPassword).
// Never sign in on supabaseAdmin — it would replace the client's auth
// state with the user's session and break RLS bypass for all requests.
export function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Creates a client scoped to a specific user's JWT — respects RLS
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
