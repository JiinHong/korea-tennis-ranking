import { getClubConfig } from "@/lib/clubs";
import { validateScore } from "@/lib/rankingRules";
import {
  AdminMatchCommandError,
  manageAdminMatch,
} from "@/lib/supabaseAdminMatchCommands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminMatchRouteContext = {
  params: Promise<{ club: string }>;
};

type UnknownBody = Record<string, unknown>;

function errorResponse(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

function isAdminSecret(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
  if (error instanceof AdminMatchCommandError) {
    return errorResponse(error.message, error.kind === "forbidden" ? 403 : 400);
  }

  return errorResponse("경기 관리 작업을 완료하지 못했습니다.", 500);
}

export async function PATCH(
  request: Request,
  context: AdminMatchRouteContext
) {
  const { club } = await context.params;
  const slug = getClubConfig(club)?.slug;

  if (!slug) return errorResponse("등록되지 않은 동아리입니다.", 404);

  const body = await readBody(request);

  if (
    !body ||
    !isIdentifier(body.matchId) ||
    !isAdminSecret(body.adminSecret)
  ) {
    return errorResponse("경기 수정 입력값이 올바르지 않습니다.", 400);
  }

  try {
    if (body.operation === "void" || body.operation === "restore") {
      const match = await manageAdminMatch({
        action: body.operation,
        clubSlug: slug,
        matchId: body.matchId,
        adminSecret: body.adminSecret,
      });

      return Response.json({ ok: true, match });
    }

    if (body.operation !== "edit") {
      return errorResponse("경기 수정 작업이 올바르지 않습니다.", 400);
    }

    if (
      !isIdentifier(body.player1Id) ||
      !isIdentifier(body.player2Id) ||
      body.player1Id === body.player2Id ||
      !isScore(body.player1Score) ||
      !isScore(body.player2Score) ||
      !isIsoDate(body.playedOn)
    ) {
      return errorResponse("경기 수정 입력값이 올바르지 않습니다.", 400);
    }

    const scoreResult = validateScore({
      player1Id: body.player1Id,
      player2Id: body.player2Id,
      player1Score: body.player1Score,
      player2Score: body.player2Score,
      playedOn: body.playedOn,
    });

    if (!scoreResult.ok) return errorResponse(scoreResult.message, 400);

    const match = await manageAdminMatch({
      action: "edit",
      clubSlug: slug,
      matchId: body.matchId,
      player1Id: body.player1Id,
      player2Id: body.player2Id,
      player1Score: body.player1Score,
      player2Score: body.player2Score,
      playedOn: body.playedOn,
      adminSecret: body.adminSecret,
    });

    return Response.json({ ok: true, match });
  } catch (error) {
    return commandError(error);
  }
}
