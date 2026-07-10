import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getSupabaseReadClient } from "@/lib/supabaseServer";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("server-only", () => ({}));

const originalEnv = process.env;

describe("getSupabaseReadClient", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.mocked(createClient).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("throws a clear error when SUPABASE_URL is missing", () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    expect(() => getSupabaseReadClient()).toThrow("SUPABASE_URL is missing");
  });

  test("throws a clear error when SUPABASE_PUBLISHABLE_KEY is missing", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    expect(() => getSupabaseReadClient()).toThrow(
      "SUPABASE_PUBLISHABLE_KEY is missing"
    );
  });

  test("creates an RLS-protected server client with the publishable key", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    getSupabaseReadClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  });
});
