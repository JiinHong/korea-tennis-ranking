import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel deployment configuration", () => {
  it("runs functions in the same Seoul region as Supabase", () => {
    const configPath = join(process.cwd(), "vercel.json");
    const config = existsSync(configPath)
      ? (JSON.parse(readFileSync(configPath, "utf8")) as {
          regions?: string[];
        })
      : {};

    expect(config.regions).toEqual(["icn1"]);
  });
});
