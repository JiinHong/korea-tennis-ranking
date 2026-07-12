import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminPlayerCommandError,
  createSupabaseAdminPlayerCommandAdapter,
  manageAdminPlayer,
  type SupabaseAdminPlayerCommandAdapter,
} from "./supabaseAdminPlayerCommands";

const result = {
  action: "add" as const,
  seasonPlayerId: "season-player-1",
  playerId: "player-1",
  name: "새 선수",
  rank: 51,
  status: "active" as const,
};

const rankResult = {
  ...result,
  action: "rank" as const,
  oldRank: 5,
  rank: 2,
  changes: [
    {
      seasonPlayerId: "season-player-1",
      name: "새 선수",
      oldRank: 5,
      newRank: 2,
    },
  ],
};

describe("manageAdminPlayer", () => {
  it("passes a typed add mutation to the adapter", async () => {
    const adapter: SupabaseAdminPlayerCommandAdapter = {
      mutate: vi.fn().mockResolvedValue(result),
    };

    await expect(
      manageAdminPlayer(
        {
          action: "add",
          clubSlug: "seoultech",
          name: "새 선수",
          adminSecret: "secret",
        },
        adapter
      )
    ).resolves.toEqual(result);
    expect(adapter.mutate).toHaveBeenCalledWith({
      action: "add",
      clubSlug: "seoultech",
      name: "새 선수",
      adminSecret: "secret",
    });
  });

  it("passes a typed rank mutation to the adapter", async () => {
    const adapter: SupabaseAdminPlayerCommandAdapter = {
      mutate: vi.fn().mockResolvedValue(rankResult),
    };

    await expect(
      manageAdminPlayer(
        {
          action: "rank",
          clubSlug: "seoultech",
          seasonPlayerId: "season-player-1",
          targetRank: 2,
          adminSecret: "secret",
        },
        adapter
      )
    ).resolves.toEqual(rankResult);
  });
});

describe("createSupabaseAdminPlayerCommandAdapter", () => {
  it("maps status changes to the guarded RPC parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ...result, action: "status", status: "inactive" },
      error: null,
    });
    const adapter = createSupabaseAdminPlayerCommandAdapter({ rpc });

    await adapter.mutate({
      action: "status",
      clubSlug: "seoultech",
      seasonPlayerId: "season-player-1",
      status: "inactive",
      adminSecret: "secret",
    });

    expect(rpc).toHaveBeenCalledWith("manage_admin_player_with_secret", {
      p_action: "status",
      p_club_slug: "seoultech",
      p_season_player_id: "season-player-1",
      p_name: null,
      p_status: "inactive",
      p_admin_secret: "secret",
    });
  });

  it("maps rank changes to the guarded RPC target parameter", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: rankResult, error: null });
    const adapter = createSupabaseAdminPlayerCommandAdapter({ rpc });

    await expect(
      adapter.mutate({
        action: "rank",
        clubSlug: "seoultech",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "secret",
      })
    ).resolves.toEqual(rankResult);

    expect(rpc).toHaveBeenCalledWith("manage_admin_player_with_secret", {
      p_action: "rank",
      p_club_slug: "seoultech",
      p_season_player_id: "season-player-1",
      p_name: null,
      p_status: null,
      p_admin_secret: "secret",
      p_target_rank: 2,
    });
  });

  it("marks SQLSTATE 42501 as a forbidden command error", async () => {
    const adapter = createSupabaseAdminPlayerCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "관리자 비밀키가 올바르지 않습니다." },
      }),
    });

    await expect(
      adapter.mutate({
        action: "rename",
        clubSlug: "seoultech",
        seasonPlayerId: "season-player-1",
        name: "수정 선수",
        adminSecret: "wrong",
      })
    ).rejects.toMatchObject({
      kind: "forbidden",
      message: "관리자 비밀키가 올바르지 않습니다.",
    } satisfies Partial<AdminPlayerCommandError>);
  });

  it("keeps ordinary database validation errors distinct", async () => {
    const adapter = createSupabaseAdminPlayerCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "이미 현재 시즌에 등록된 선수입니다." },
      }),
    });

    await expect(
      adapter.mutate({
        action: "add",
        clubSlug: "seoultech",
        name: "중복 선수",
        adminSecret: "secret",
      })
    ).rejects.toMatchObject({ kind: "validation" });
  });

  it("does not expose unexpected database errors as validation messages", async () => {
    const adapter = createSupabaseAdminPlayerCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "XX000",
          message: "internal database details that must stay private",
        },
      }),
    });

    await expect(
      adapter.mutate({
        action: "add",
        clubSlug: "seoultech",
        name: "새 선수",
        adminSecret: "secret",
      })
    ).rejects.toEqual(new Error("선수 관리 작업을 저장하지 못했습니다."));
  });

  it("rejects an invalid RPC response", async () => {
    const adapter = createSupabaseAdminPlayerCommandAdapter({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(
      adapter.mutate({
        action: "add",
        clubSlug: "seoultech",
        name: "새 선수",
        adminSecret: "secret",
      })
    ).rejects.toThrow("선수 관리 결과를 확인하지 못했습니다.");
  });

  it("rejects a rank response without its old rank and change list", async () => {
    const adapter = createSupabaseAdminPlayerCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: { ...result, action: "rank", rank: 2 },
        error: null,
      }),
    });

    await expect(
      adapter.mutate({
        action: "rank",
        clubSlug: "seoultech",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "secret",
      })
    ).rejects.toThrow("선수 관리 결과를 확인하지 못했습니다.");
  });
});
