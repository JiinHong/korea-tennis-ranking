import { getClubConfig } from "@/lib/clubs";
import { recordSupabaseMatch } from "@/lib/supabaseMatchCommands";
import {
  getSupabaseMatchValidationContext,
} from "@/lib/supabaseRankingRepository";
import {
  resolveMatchRoles,
  validateChallengeRange,
  validateRematchCooldown,
  validateScore,
  type MatchInput,
  type RankedPlayer,
  type RuleResult,
} from "@/lib/rankingRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchRouteContext = {
  params: Promise<{
    club: string;
  }>;
};

type PublicMatchBody = {
  player1Id?: unknown;
  player2Id?: unknown;
  player1Score?: unknown;
  player2Score?: unknown;
  sourceKey?: unknown;
};

type ParsedMatchSubmission = {
  input: MatchInput;
  sourceKey: string;
};

function badRequest(message: string) {
  return Response.json(
    {
      ok: false,
      message,
    },
    {
      status: 400,
    }
  );
}

function getSeoulDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("경기 날짜를 확인하지 못했습니다.");
  }

  return `${year}-${month}-${day}`;
}

function parseMatchSubmission(body: PublicMatchBody): ParsedMatchSubmission | null {
  if (
    typeof body.player1Id !== "string" ||
    typeof body.player2Id !== "string" ||
    typeof body.player1Score !== "number" ||
    typeof body.player2Score !== "number" ||
    typeof body.sourceKey !== "string" ||
    body.sourceKey.trim().length === 0 ||
    body.sourceKey.length > 128
  ) {
    return null;
  }

  return {
    input: {
      player1Id: body.player1Id,
      player2Id: body.player2Id,
      player1Score: body.player1Score,
      player2Score: body.player2Score,
      playedOn: getSeoulDate(),
    },
    sourceKey: body.sourceKey,
  };
}

function rejectIfInvalid(result: RuleResult): Response | null {
  if (result.ok) {
    return null;
  }

  return badRequest(result.message);
}

function publicPlayer(player: RankedPlayer) {
  return { id: player.id, name: player.name, rank: player.rank };
}

export async function GET(_request: Request, context: MatchRouteContext) {
  const { club: clubSlug } = await context.params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    return Response.json(
      { ok: false, message: "등록되지 않은 동아리입니다." },
      { status: 404 }
    );
  }

  try {
    const validationContext = await getSupabaseMatchValidationContext(club.slug);
    const players = validationContext.players
      .filter((player) => player.status === "active")
      .sort((a, b) => a.rank - b.rank)
      .map(publicPlayer);

    return Response.json({ ok: true, players });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: Request, context: MatchRouteContext) {
  const { club: clubSlug } = await context.params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    return Response.json(
      {
        ok: false,
        message: "등록되지 않은 동아리입니다.",
      },
      {
        status: 404,
      }
    );
  }

  let body: PublicMatchBody;

  try {
    body = await request.json();
  } catch {
    return badRequest("경기 결과 입력값이 올바르지 않습니다.");
  }

  const submission = parseMatchSubmission(body);

  if (!submission) {
    return badRequest("경기 결과 입력값이 올바르지 않습니다.");
  }

  const { input, sourceKey } = submission;

  if (input.player1Id === input.player2Id) {
    return badRequest("서로 다른 두 선수를 선택해주세요.");
  }

  const scoreError = rejectIfInvalid(validateScore(input));

  if (scoreError) {
    return scoreError;
  }

  try {
    const validationContext = await getSupabaseMatchValidationContext(club.slug);
    const roles = resolveMatchRoles(validationContext.players, input);
    const challengeRangeError = rejectIfInvalid(
      validateChallengeRange(
        validationContext.players,
        roles.challenger.id,
        roles.defender.id,
        validationContext.config
      )
    );

    if (challengeRangeError) {
      return challengeRangeError;
    }

    const rematchError = rejectIfInvalid(
      validateRematchCooldown(
        input,
        validationContext.previousMatches,
        validationContext.config
      )
    );

    if (rematchError) {
      return rematchError;
    }

    const match = await recordSupabaseMatch(club.slug, input, sourceKey);

    return Response.json(
      {
        ok: true,
        message: match.duplicate
          ? "이미 반영된 경기 결과입니다."
          : "경기 결과가 반영되었습니다.",
        match,
      },
      {
        status: match.duplicate ? 200 : 201,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return badRequest(message);
  }
}
