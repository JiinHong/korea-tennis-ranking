import { getClubConfig } from "@/lib/clubs";
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
  playedOn?: unknown;
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

function parseMatchInput(body: PublicMatchBody): MatchInput | null {
  if (
    typeof body.player1Id !== "string" ||
    typeof body.player2Id !== "string" ||
    typeof body.player1Score !== "number" ||
    typeof body.player2Score !== "number" ||
    typeof body.playedOn !== "string"
  ) {
    return null;
  }

  return {
    player1Id: body.player1Id,
    player2Id: body.player2Id,
    player1Score: body.player1Score,
    player2Score: body.player2Score,
    playedOn: body.playedOn,
  };
}

function rejectIfInvalid(result: RuleResult): Response | null {
  if (result.ok) {
    return null;
  }

  return badRequest(result.message);
}

function publicPlayer(player: RankedPlayer) {
  return {
    id: player.id,
    name: player.name,
    rank: player.rank,
  };
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

  const input = parseMatchInput(body);

  if (!input) {
    return badRequest("경기 결과 입력값이 올바르지 않습니다.");
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

    return Response.json(
      {
        ok: true,
        message: "경기 결과를 검증했습니다. 저장 기능은 다음 단계에서 연결됩니다.",
        validation: {
          challenger: publicPlayer(roles.challenger),
          defender: publicPlayer(roles.defender),
          winnerId: roles.winnerId,
          loserId: roles.loserId,
        },
      },
      {
        status: 202,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return badRequest(message);
  }
}
