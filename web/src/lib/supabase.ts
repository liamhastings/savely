import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
// The project's publishable key (older projects call it the "anon" key). Safe to ship
// to the browser — it only identifies the project; users still have to sign in.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** null until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
