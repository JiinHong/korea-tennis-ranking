import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseMatchCommandAdapter,
  recordSupabaseMatch,
  type SupabaseMatchCommandAdapter,
} from "@/lib/supabaseMatchCommands";

vi.mock("server-only", () => ({}));

describe("recordSupabaseMatch", () => {
  it("calls the atomic match RPC and returns its normalized result", async () => {
    const rpcResult = {
      matchId: "match-1",
      duplicate: false,
      defenseResult: "방어 실패",
      rankChanged: true,
    };
    const adapter: SupabaseMatchCommandAdapter = {
      recordPublicMatch: vi.fn().mockResolvedValue(rpcResult),
    };

    const result = await recordSupabaseMatch(
      "seoultech",
      {
        player1Id: "player-1",
        player2Id: "player-2",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
      },
      "submission-1",
      adapter
    );

    expect(adapter.recordPublicMatch).toHaveBeenCalledWith({
      clubSlug: "seoultech",
      player1Id: "player-1",
      player2Id: "player-2",
      player1Score: 4,
      player2Score: 6,
      playedOn: "2026-07-10",
      sourceKey: "submission-1",
    });
    expect(result).toEqual(rpcResult);
  });

  it("keeps the write secret on the server and calls the guarded RPC", async () => {
    const rpcResult = {
      matchId: "match-1",
      duplicate: false,
      defenseResult: "방어 성공",
      rankChanged: false,
    };
    const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
    const adapter = createSupabaseMatchCommandAdapter(
      { rpc },
      "server-write-secret"
    );

    await adapter.recordPublicMatch({
      clubSlug: "seoultech",
      player1Id: "player-1",
      player2Id: "player-2",
      player1Score: 6,
      player2Score: 4,
      playedOn: "2026-07-10",
      sourceKey: "submission-1",
    });

    expect(rpc).toHaveBeenCalledWith("record_public_match_with_secret", {
      p_club_slug: "seoultech",
      p_player1_id: "player-1",
      p_player2_id: "player-2",
      p_player1_score: 6,
      p_player2_score: 4,
      p_played_on: "2026-07-10",
      p_source_key: "submission-1",
      p_write_secret: "server-write-secret",
    });
  });
});
