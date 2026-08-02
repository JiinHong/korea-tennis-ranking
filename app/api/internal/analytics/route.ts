import { NextRequest, NextResponse } from "next/server";

import {
  createInternalAnalyticsToken,
  INTERNAL_ANALYTICS_COOKIE_NAME,
  verifyInternalAnalyticsSecret,
  verifyInternalAnalyticsToken,
} from "@/lib/analytics/internalTraffic";

const INTERNAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MINIMUM_INTERNAL_SECRET_LENGTH = 16;

type InternalAnalyticsResponse = {
  internal: boolean;
  message?: string;
};

function getConfiguredSecret(): string {
  return process.env.INTERNAL_ANALYTICS_SECRET?.trim() ?? "";
}

function jsonResponse(
  body: InternalAnalyticsResponse,
  status = 200
): NextResponse<InternalAnalyticsResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function GET(request: NextRequest) {
  const secret = getConfiguredSecret();
  const token = request.cookies.get(INTERNAL_ANALYTICS_COOKIE_NAME)?.value;
  const internal = Boolean(
    secret.length >= MINIMUM_INTERNAL_SECRET_LENGTH &&
      token &&
      verifyInternalAnalyticsToken(token, secret)
  );

  return jsonResponse({ internal });
}

export async function POST(request: NextRequest) {
  const configuredSecret = getConfiguredSecret();

  if (!configuredSecret) {
    return jsonResponse(
      {
        internal: false,
        message: "내부 사용자 등록 기능이 설정되지 않았습니다.",
      },
      503
    );
  }

  if (configuredSecret.length < MINIMUM_INTERNAL_SECRET_LENGTH) {
    return jsonResponse(
      {
        internal: false,
        message: "내부 사용자 비밀키를 16자 이상으로 다시 설정해주세요.",
      },
      503
    );
  }

  let submittedSecret = "";

  try {
    const body = (await request.json()) as { secret?: unknown };
    submittedSecret =
      typeof body.secret === "string" ? body.secret.trim() : "";
  } catch {
    return jsonResponse(
      { internal: false, message: "요청 형식이 올바르지 않습니다." },
      400
    );
  }

  if (!verifyInternalAnalyticsSecret(submittedSecret, configuredSecret)) {
    return jsonResponse(
      { internal: false, message: "비밀키가 올바르지 않습니다." },
      401
    );
  }

  const response = jsonResponse({ internal: true });
  response.cookies.set(
    INTERNAL_ANALYTICS_COOKIE_NAME,
    createInternalAnalyticsToken(configuredSecret),
    cookieOptions(INTERNAL_COOKIE_MAX_AGE_SECONDS)
  );
  return response;
}

export async function DELETE() {
  const response = jsonResponse({ internal: false });
  response.cookies.set(
    INTERNAL_ANALYTICS_COOKIE_NAME,
    "",
    cookieOptions(0)
  );
  return response;
}
