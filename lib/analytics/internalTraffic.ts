import { createHmac, timingSafeEqual } from "node:crypto";

export const INTERNAL_ANALYTICS_COOKIE_NAME =
  "korea_tennis_internal_analytics";
export const INTERNAL_ANALYTICS_USER_ID = "internal:jinhong";

const TOKEN_VERSION = "v1";
const TOKEN_PAYLOAD = INTERNAL_ANALYTICS_USER_ID;

function createSignature(secret: string): string {
  return createHmac("sha256", secret)
    .update(`${TOKEN_VERSION}:${TOKEN_PAYLOAD}`)
    .digest("base64url");
}

function safelyCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createInternalAnalyticsToken(secret: string): string {
  return `${TOKEN_VERSION}.${createSignature(secret)}`;
}

export function verifyInternalAnalyticsToken(
  token: string,
  secret: string
): boolean {
  const [version, signature, remainder] = token.split(".");

  if (
    !secret ||
    version !== TOKEN_VERSION ||
    !signature ||
    remainder !== undefined
  ) {
    return false;
  }

  return safelyCompare(signature, createSignature(secret));
}

export function verifyInternalAnalyticsSecret(
  candidate: string,
  expected: string
): boolean {
  if (!candidate || !expected) return false;

  return safelyCompare(candidate, expected);
}
