import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createInternalAnalyticsToken,
  INTERNAL_ANALYTICS_COOKIE_NAME,
  verifyInternalAnalyticsToken,
} from "@/lib/internalAnalytics";

import { DELETE, GET, POST } from "./route";

const originalSecret = process.env.INTERNAL_ANALYTICS_SECRET;

describe("/api/internal/analytics", () => {
  beforeEach(() => {
    process.env.INTERNAL_ANALYTICS_SECRET = "a-long-test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.INTERNAL_ANALYTICS_SECRET;
    } else {
      process.env.INTERNAL_ANALYTICS_SECRET = originalSecret;
    }
  });

  it("등록 쿠키가 없으면 일반 사용자 상태를 반환한다", async () => {
    const response = await GET(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ internal: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("유효하게 서명된 쿠키가 있으면 내부 사용자 상태를 반환한다", async () => {
    const token = createInternalAnalyticsToken("a-long-test-secret");
    const response = await GET(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics", {
        headers: {
          cookie: `${INTERNAL_ANALYTICS_COOKIE_NAME}=${token}`,
        },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ internal: true });
  });

  it("올바른 비밀키를 입력하면 브라우저 등록 쿠키를 발급한다", async () => {
    const response = await POST(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics", {
        method: "POST",
        body: JSON.stringify({ secret: "a-long-test-secret" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ internal: true });

    const cookie = response.cookies.get(INTERNAL_ANALYTICS_COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();
    expect(
      verifyCookie(cookie?.value, "a-long-test-secret")
    ).toBe(true);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=31536000");
  });

  it("틀린 비밀키로는 내부 사용자로 등록할 수 없다", async () => {
    const response = await POST(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics", {
        method: "POST",
        body: JSON.stringify({ secret: "wrong" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      internal: false,
      message: "비밀키가 올바르지 않습니다.",
    });
    expect(response.cookies.get(INTERNAL_ANALYTICS_COOKIE_NAME)).toBeUndefined();
  });

  it("추측하기 쉬운 짧은 서버 비밀키로는 등록 기능을 열지 않는다", async () => {
    process.env.INTERNAL_ANALYTICS_SECRET = "admin";

    const response = await POST(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics", {
        method: "POST",
        body: JSON.stringify({ secret: "admin" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      internal: false,
      message: "내부 사용자 비밀키를 16자 이상으로 다시 설정해주세요.",
    });
    expect(response.cookies.get(INTERNAL_ANALYTICS_COOKIE_NAME)).toBeUndefined();
  });

  it("등록 해제 시 브라우저 쿠키를 만료시킨다", async () => {
    const response = await DELETE(
      new NextRequest("https://koreatennisranking.com/api/internal/analytics", {
        method: "DELETE",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ internal: false });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

function verifyCookie(value: string | undefined, secret: string): boolean {
  if (!value) return false;

  return verifyInternalAnalyticsToken(value, secret);
}
