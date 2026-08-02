import { describe, expect, it } from "vitest";

import {
  createInternalAnalyticsToken,
  verifyInternalAnalyticsSecret,
  verifyInternalAnalyticsToken,
} from "./internalTraffic";

describe("internal analytics token", () => {
  const secret = "a-long-test-secret";

  it("서버 비밀키로 서명한 토큰만 유효하다", () => {
    const token = createInternalAnalyticsToken(secret);

    expect(verifyInternalAnalyticsToken(token, secret)).toBe(true);
    expect(verifyInternalAnalyticsToken(`${token}tampered`, secret)).toBe(false);
    expect(verifyInternalAnalyticsToken(token, "another-secret")).toBe(false);
  });

  it("입력한 비밀키를 timing-safe 방식으로 비교한다", () => {
    expect(verifyInternalAnalyticsSecret(secret, secret)).toBe(true);
    expect(verifyInternalAnalyticsSecret("wrong", secret)).toBe(false);
    expect(verifyInternalAnalyticsSecret("", secret)).toBe(false);
  });
});
