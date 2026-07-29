import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Player detail loading boundary", () => {
  it("동적 선수 상세 데이터가 도착하기 전 즉시 보여줄 화면을 제공한다", () => {
    const loadingModulePath = resolve(
      process.cwd(),
      "app/[club]/players/[player]/loading.tsx"
    );

    expect(existsSync(loadingModulePath)).toBe(true);
  });
});
