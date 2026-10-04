import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase public env vars are missing. Realtime and client uploads will fail.");
}

/**
 * Browser / client-side Supabase client (anon key).
 * Use this for:
 * - Public enrollment form INSERT (so Realtime fires)
 * - Realtime subscriptions in admin
 * - Client-side storage uploads when policy allows
 */
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

/**
 * Server-side Supabase client with service role (for signed URLs, admin storage ops).
 * Never expose the service role key to the browser.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
