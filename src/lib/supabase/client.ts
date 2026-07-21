import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Static site, no server: one browser-side client per tab, session persisted
// in localStorage by supabase-js itself.
export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Magic-link email delivers `#access_token=...` in the redirect URL;
          // implicit flow lets any browser that opens the link complete sign-in
          // (no code-verifier tying it to the device that requested the link).
          detectSessionInUrl: true,
          flowType: "implicit",
        },
      }
    );
  }
  return client;
}
