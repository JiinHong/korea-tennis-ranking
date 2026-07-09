import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("server-only", () => ({}));

const originalEnv = process.env;

describe("getSupabaseServerClient", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.mocked(createClient).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("throws a clear error when SUPABASE_URL is missing", () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    expect(() => getSupabaseServerClient()).toThrow("SUPABASE_URL is missing");
  });

  test("throws a clear error when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseServerClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY is missing"
    );
  });

  test("creates a server-only Supabase client without browser session persistence", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    getSupabaseServerClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  });
});
