import "server-only";

import { createClient } from "@supabase/supabase-js";

function requireServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

export function getSupabaseReadClient() {
  return createClient(
    requireServerEnv("SUPABASE_URL"),
    requireServerEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
