import "server-only";

import type { MatchInput } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type RecordPublicMatchParams = {
  clubSlug: string;
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  playedOn: string;
  sourceKey: string;
};

export type RecordedMatch = {
  matchId: string;
  duplicate: boolean;
  defenseResult: string;
  rankChanged: boolean;
};

export type SupabaseMatchCommandAdapter = {
  recordPublicMatch(params: RecordPublicMatchParams): Promise<RecordedMatch>;
};

type SupabaseMatchRpcClient = {
  rpc(
    functionName: string,
    params: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

function requireMatchWriteSecret(): string {
  const value = process.env.PUBLIC_MATCH_WRITE_SECRET;

  if (!value) {
    throw new Error("PUBLIC_MATCH_WRITE_SECRET is missing");
  }

  return value;
}

export async function recordSupabaseMatch(
  clubSlug: string,
  input: MatchInput,
  sourceKey: string,
  adapter: SupabaseMatchCommandAdapter = createSupabaseMatchCommandAdapter()
): Promise<RecordedMatch> {
  return adapter.recordPublicMatch({
    clubSlug,
    player1Id: input.player1Id,
    player2Id: input.player2Id,
    player1Score: input.player1Score,
    player2Score: input.player2Score,
    playedOn: input.playedOn,
    sourceKey,
  });
}

export function createSupabaseMatchCommandAdapter(
  supabase: SupabaseMatchRpcClient = getSupabaseReadClient(),
  writeSecret = requireMatchWriteSecret()
): SupabaseMatchCommandAdapter {

  return {
    async recordPublicMatch(params) {
      const { data, error } = await supabase.rpc(
        "record_public_match_with_secret",
        {
          p_club_slug: params.clubSlug,
          p_player1_id: params.player1Id,
          p_player2_id: params.player2Id,
          p_player1_score: params.player1Score,
          p_player2_score: params.player2Score,
          p_played_on: params.playedOn,
          p_source_key: params.sourceKey,
          p_write_secret: writeSecret,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!data || typeof data !== "object") {
        throw new Error("경기 저장 결과를 확인하지 못했습니다.");
      }

      return data as RecordedMatch;
    },
  };
}
