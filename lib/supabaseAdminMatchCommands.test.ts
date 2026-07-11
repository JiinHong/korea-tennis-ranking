import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminMatchCommandError,
  createSupabaseAdminMatchCommandAdapter,
  manageAdminMatch,
  type SupabaseAdminMatchCommandAdapter,
} from "./supabaseAdminMatchCommands";

const result = {
  action: "edit" as const,
  matchId: "match-1",
  status: "confirmed" as const,
  rankingsRecalculated: true,
};

describe("manageAdminMatch", () => {
  it("passes a typed edit mutation to the adapter", async () => {
    const adapter: SupabaseAdminMatchCommandAdapter = {
      mutate: vi.fn().mockResolvedValue(result),
    };
    const input = {
      action: "edit" as const,
      clubSlug: "seoultech",
      matchId: "match-1",
      player1Id: "player-1",
      player2Id: "player-2",
      player1Score: 6,
      player2Score: 4,
      playedOn: "2026-07-08",
      adminSecret: "secret",
    };

    await expect(manageAdminMatch(input, adapter)).resolves.toEqual(result);
    expect(adapter.mutate).toHaveBeenCalledWith(input);
  });
});

describe("createSupabaseAdminMatchCommandAdapter", () => {
  it("maps an edit to guarded RPC parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const adapter = createSupabaseAdminMatchCommandAdapter({ rpc });

    await adapter.mutate({
      action: "edit",
      clubSlug: "seoultech",
      matchId: "match-1",
      player1Id: "player-1",
      player2Id: "player-2",
      player1Score: 6,
      player2Score: 4,
      playedOn: "2026-07-08",
      adminSecret: "secret",
    });

    expect(rpc).toHaveBeenCalledWith("manage_admin_match_with_secret", {
      p_action: "edit",
      p_club_slug: "seoultech",
      p_match_id: "match-1",
      p_player1_id: "player-1",
      p_player2_id: "player-2",
      p_player1_score: 6,
      p_player2_score: 4,
      p_played_on: "2026-07-08",
      p_admin_secret: "secret",
    });
  });

  it("maps void and restore without edit-only values", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ...result, action: "void", status: "voided" },
      error: null,
    });
    const adapter = createSupabaseAdminMatchCommandAdapter({ rpc });

    await adapter.mutate({
      action: "void",
      clubSlug: "seoultech",
      matchId: "match-1",
      adminSecret: "secret",
    });

    expect(rpc).toHaveBeenCalledWith(
      "manage_admin_match_with_secret",
      expect.objectContaining({
        p_action: "void",
        p_player1_id: null,
        p_player2_id: null,
        p_player1_score: null,
        p_player2_score: null,
        p_played_on: null,
      })
    );
  });

  it("marks SQLSTATE 42501 as a forbidden command error", async () => {
    const adapter = createSupabaseAdminMatchCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "관리자 비밀키가 올바르지 않습니다." },
      }),
    });

    await expect(
      adapter.mutate({
        action: "restore",
        clubSlug: "seoultech",
        matchId: "match-1",
        adminSecret: "wrong",
      })
    ).rejects.toMatchObject({
      kind: "forbidden",
      message: "관리자 비밀키가 올바르지 않습니다.",
    } satisfies Partial<AdminMatchCommandError>);
  });

  it("does not expose unexpected database errors", async () => {
    const adapter = createSupabaseAdminMatchCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "private database details" },
      }),
    });

    await expect(
      adapter.mutate({
        action: "void",
        clubSlug: "seoultech",
        matchId: "match-1",
        adminSecret: "secret",
      })
    ).rejects.toEqual(new Error("경기 관리 작업을 저장하지 못했습니다."));
  });
});
