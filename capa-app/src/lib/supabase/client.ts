import { createBrowserClient } from "@supabase/ssr";
import { config } from "../config";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
}