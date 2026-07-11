import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminMatchCommandError,
  manageAdminMatch,
} from "@/lib/supabaseAdminMatchCommands";

import { PATCH } from "./route";

vi.mock("@/lib/supabaseAdminMatchCommands", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/supabaseAdminMatchCommands")
  >();
  return { ...original, manageAdminMatch: vi.fn() };
});

const context = { params: Promise.resolve({ club: "seoultech" }) };
const result = {
  action: "edit" as const,
  matchId: "match-1",
  status: "confirmed" as const,
  rankingsRecalculated: true as const,
};

function request(body: unknown) {
  return new Request(
    "https://example.com/api/admin/clubs/seoultech/matches",
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

describe("PATCH /api/admin/clubs/[club]/matches", () => {
  beforeEach(() => {
    vi.mocked(manageAdminMatch).mockReset();
  });

  it("edits a match through the guarded command", async () => {
    vi.mocked(manageAdminMatch).mockResolvedValue(result);

    const response = await PATCH(
      request({
        operation: "edit",
        matchId: "match-1",
        player1Id: "player-1",
        player2Id: "player-2",
        player1Score: 6,
        player2Score: 4,
        playedOn: "2026-07-08",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(manageAdminMatch).toHaveBeenCalledWith({
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
  });

  it.each(["void", "restore"] as const)(
    "submits a %s status mutation without edit fields",
    async (operation) => {
      vi.mocked(manageAdminMatch).mockResolvedValue({
        ...result,
        action: operation,
        status: operation === "void" ? "voided" : "confirmed",
      });

      const response = await PATCH(
        request({ operation, matchId: "match-1", adminSecret: "secret" }),
        context
      );

      expect(response.status).toBe(200);
      expect(manageAdminMatch).toHaveBeenCalledWith({
        action: operation,
        clubSlug: "seoultech",
        matchId: "match-1",
        adminSecret: "secret",
      });
    }
  );

  it("rejects an invalid score before calling the command", async () => {
    const response = await PATCH(
      request({
        operation: "edit",
        matchId: "match-1",
        player1Id: "player-1",
        player2Id: "player-2",
        player1Score: 5,
        player2Score: 4,
        playedOn: "2026-07-08",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      message: "승자는 반드시 6점이어야 합니다.",
    });
    expect(manageAdminMatch).not.toHaveBeenCalled();
  });

  it("rejects duplicate players and malformed dates", async () => {
    const response = await PATCH(
      request({
        operation: "edit",
        matchId: "match-1",
        player1Id: "player-1",
        player2Id: "player-1",
        player1Score: 6,
        player2Score: 4,
        playedOn: "July 8",
        adminSecret: "secret",
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(manageAdminMatch).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown club", async () => {
    const response = await PATCH(
      request({ operation: "void", matchId: "match-1", adminSecret: "secret" }),
      { params: Promise.resolve({ club: "unknown" }) }
    );

    expect(response.status).toBe(404);
    expect(manageAdminMatch).not.toHaveBeenCalled();
  });

  it("returns 403 when the admin secret is wrong", async () => {
    vi.mocked(manageAdminMatch).mockRejectedValue(
      new AdminMatchCommandError(
        "forbidden",
        "관리자 비밀키가 올바르지 않습니다."
      )
    );

    const response = await PATCH(
      request({ operation: "void", matchId: "match-1", adminSecret: "wrong" }),
      context
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      message: "관리자 비밀키가 올바르지 않습니다.",
    });
  });
});
