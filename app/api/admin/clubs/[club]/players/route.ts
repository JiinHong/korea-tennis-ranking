import { getClubConfig } from "@/lib/clubs";
import {
  AdminPlayerCommandError,
  manageAdminPlayer,
} from "@/lib/supabaseAdminPlayerCommands";
import type { PlayerStatus } from "@/lib/rankingRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminPlayerRouteContext = {
  params: Promise<{ club: string }>;
};

type UnknownBody = Record<string, unknown>;

const playerStatuses: PlayerStatus[] = [
  "active",
  "injured",
  "inactive",
  "left",
];

function errorResponse(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

function isAdminSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 200
  );
}

function normalizedName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim();
  return name.length >= 1 && name.length <= 50 ? name : null;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function isPlayerStatus(value: unknown): value is PlayerStatus {
  return playerStatuses.includes(value as PlayerStatus);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

async function readBody(request: Request): Promise<UnknownBody | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as UnknownBody) : null;
  } catch {
    return null;
  }
}

function commandError(error: unknown): Response {
  if (error instanceof AdminPlayerCommandError) {
    return errorResponse(
      error.message,
      error.kind === "forbidden" ? 403 : 400
    );
  }

  return errorResponse("선수 관리 작업을 완료하지 못했습니다.", 500);
}

async function clubSlug(context: AdminPlayerRouteContext): Promise<string | null> {
  const { club } = await context.params;
  return getClubConfig(club)?.slug ?? null;
}

export async function POST(
  request: Request,
  context: AdminPlayerRouteContext
) {
  const slug = await clubSlug(context);

  if (!slug) return errorResponse("등록되지 않은 동아리입니다.", 404);

  const body = await readBody(request);
  const name = normalizedName(body?.name);

  if (!body || !name || !isAdminSecret(body.adminSecret)) {
    return errorResponse("선수 추가 입력값이 올바르지 않습니다.", 400);
  }

  try {
    const player = await manageAdminPlayer({
      action: "add",
      clubSlug: slug,
      name,
      adminSecret: body.adminSecret,
    });

    return Response.json({ ok: true, player }, { status: 201 });
  } catch (error) {
    return commandError(error);
  }
}

export async function PATCH(
  request: Request,
  context: AdminPlayerRouteContext
) {
  const slug = await clubSlug(context);

  if (!slug) return errorResponse("등록되지 않은 동아리입니다.", 404);

  const body = await readBody(request);

  if (
    !body ||
    !isIdentifier(body.seasonPlayerId) ||
    !isAdminSecret(body.adminSecret)
  ) {
    return errorResponse("선수 수정 입력값이 올바르지 않습니다.", 400);
  }

  try {
    if (body.operation === "rename") {
      const name = normalizedName(body.name);

      if (!name) {
        return errorResponse("선수 이름이 올바르지 않습니다.", 400);
      }

      const player = await manageAdminPlayer({
        action: "rename",
        clubSlug: slug,
        seasonPlayerId: body.seasonPlayerId,
        name,
        adminSecret: body.adminSecret,
      });

      return Response.json({ ok: true, player });
    }

    if (body.operation === "status" && isPlayerStatus(body.status)) {
      const player = await manageAdminPlayer({
        action: "status",
        clubSlug: slug,
        seasonPlayerId: body.seasonPlayerId,
        status: body.status,
        adminSecret: body.adminSecret,
      });

      return Response.json({ ok: true, player });
    }

    if (body.operation === "rank" && isPositiveInteger(body.targetRank)) {
      const player = await manageAdminPlayer({
        action: "rank",
        clubSlug: slug,
        seasonPlayerId: body.seasonPlayerId,
        targetRank: body.targetRank,
        adminSecret: body.adminSecret,
      });

      return Response.json({ ok: true, player });
    }

    return errorResponse("선수 수정 작업이 올바르지 않습니다.", 400);
  } catch (error) {
    return commandError(error);
  }
}
