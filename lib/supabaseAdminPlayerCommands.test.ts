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
});
