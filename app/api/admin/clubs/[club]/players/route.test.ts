import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminPlayerCommandError,
  manageAdminPlayer,
} from "@/lib/supabaseAdminPlayerCommands";

import { PATCH, POST } from "./route";

vi.mock("@/lib/supabaseAdminPlayerCommands", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/supabaseAdminPlayerCommands")
  >();

  return { ...original, manageAdminPlayer: vi.fn() };
});

const context = { params: Promise.resolve({ club: "seoultech" }) };
const result = {
  action: "add" as const,
  seasonPlayerId: "season-player-1",
  playerId: "player-1",
  name: "새 선수",
  rank: 51,
  status: "active" as const,
};

function request(method: "POST" | "PATCH", body: unknown) {
  return new Request(
    "https://example.com/api/admin/clubs/seoultech/players",
    {
      method,
      body: JSON.stringify(body),
    }
  );
}

describe("POST /api/admin/clubs/[club]/players", () => {
  beforeEach(() => {
    vi.mocked(manageAdminPlayer).mockReset();
  });

  it("adds a player through the guarded command", async () => {
    vi.mocked(manageAdminPlayer).mockResolvedValue(result);

    const response = await POST(
      request("POST", { name: " 새 선수 ", adminSecret: "secret" }),
      context
    );

    expect(response.status).toBe(201);
    expect(manageAdminPlayer).toHaveBeenCalledWith({
      action: "add",
      clubSlug: "seoultech",
      name: "새 선수",
      adminSecret: "secret",
    });
    expect(await response.json()).toEqual({ ok: true, player: result });
  });

  it("rejects malformed add input", async () => {
    const response = await POST(
      request("POST", { name: "", adminSecret: "" }),
      context
    );

    expect(response.status).toBe(400);
    expect(manageAdminPlayer).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown club", async () => {
    const response = await POST(
      request("POST", { name: "새 선수", adminSecret: "secret" }),
      { params: Promise.resolve({ club: "unknown" }) }
    );

    expect(response.status).toBe(404);
    expect(manageAdminPlayer).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/admin/clubs/[club]/players", () => {
  beforeEach(() => {
    vi.mocked(manageAdminPlayer).mockReset();
  });

  it("renames a current-season player", async () => {
    vi.mocked(manageAdminPlayer).mockResolvedValue({
      ...result,
      action: "rename",
      name: "수정 선수",
    });

    const response = await PATCH(
      request("PATCH", {
        operation: "rename",
        seasonPlayerId: "season-player-1",
        name: "수정 선수",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(manageAdminPlayer).toHaveBeenCalledWith({
      action: "rename",
      clubSlug: "seoultech",
      seasonPlayerId: "season-player-1",
      name: "수정 선수",
      adminSecret: "secret",
    });
  });

  it("changes player status using the supported status union", async () => {
    vi.mocked(manageAdminPlayer).mockResolvedValue({
      ...result,
      action: "status",
      status: "inactive",
    });

    const response = await PATCH(
      request("PATCH", {
        operation: "status",
        seasonPlayerId: "season-player-1",
        status: "inactive",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(manageAdminPlayer).toHaveBeenCalledWith({
      action: "status",
      clubSlug: "seoultech",
      seasonPlayerId: "season-player-1",
      status: "inactive",
      adminSecret: "secret",
    });
  });

  it("changes a current-season player's rank", async () => {
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
    vi.mocked(manageAdminPlayer).mockResolvedValue(rankResult);

    const response = await PATCH(
      request("PATCH", {
        operation: "rank",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(manageAdminPlayer).toHaveBeenCalledWith({
      action: "rank",
      clubSlug: "seoultech",
      seasonPlayerId: "season-player-1",
      targetRank: 2,
      adminSecret: "secret",
    });
    expect(await response.json()).toEqual({ ok: true, player: rankResult });
  });

  it.each([0, -1, 1.5, "2", null])(
    "rejects an invalid target rank: %s",
    async (targetRank) => {
      const response = await PATCH(
        request("PATCH", {
          operation: "rank",
          seasonPlayerId: "season-player-1",
          targetRank,
          adminSecret: "secret",
        }),
        context
      );

      expect(response.status).toBe(400);
      expect(manageAdminPlayer).not.toHaveBeenCalled();
    }
  );

  it("rejects a rank change without the admin secret", async () => {
    const response = await PATCH(
      request("PATCH", {
        operation: "rank",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "",
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(manageAdminPlayer).not.toHaveBeenCalled();
  });

  it("returns 404 for a rank change on an unknown club", async () => {
    const response = await PATCH(
      request("PATCH", {
        operation: "rank",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "secret",
      }),
      { params: Promise.resolve({ club: "unknown" }) }
    );

    expect(response.status).toBe(404);
    expect(manageAdminPlayer).not.toHaveBeenCalled();
  });

  it("rejects unsupported player statuses", async () => {
    const response = await PATCH(
      request("PATCH", {
        operation: "status",
        seasonPlayerId: "season-player-1",
        status: "deleted",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(manageAdminPlayer).not.toHaveBeenCalled();
  });

  it("returns 403 when the admin secret is wrong", async () => {
    vi.mocked(manageAdminPlayer).mockRejectedValue(
      new AdminPlayerCommandError(
        "forbidden",
        "관리자 비밀키가 올바르지 않습니다."
      )
    );

    const response = await PATCH(
      request("PATCH", {
        operation: "rename",
        seasonPlayerId: "season-player-1",
        name: "수정 선수",
        adminSecret: "wrong",
      }),
      context
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      message: "관리자 비밀키가 올바르지 않습니다.",
    });
  });

  it("returns database validation messages as 400", async () => {
    vi.mocked(manageAdminPlayer).mockRejectedValue(
      new AdminPlayerCommandError(
        "validation",
        "같은 이름의 선수가 이미 등록되어 있습니다."
      )
    );

    const response = await PATCH(
      request("PATCH", {
        operation: "rename",
        seasonPlayerId: "season-player-1",
        name: "중복 선수",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(400);
  });

  it("hides unexpected command failures", async () => {
    vi.mocked(manageAdminPlayer).mockRejectedValue(
      new Error("private database details")
    );

    const response = await PATCH(
      request("PATCH", {
        operation: "rank",
        seasonPlayerId: "season-player-1",
        targetRank: 2,
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      message: "선수 관리 작업을 완료하지 못했습니다.",
    });
  });
});
