import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recordSupabaseMatch } from "@/lib/supabaseMatchCommands";
import { getSupabaseMatchValidationContext } from "@/lib/supabaseRankingRepository";

import { GET, POST } from "./route";

vi.mock("@/lib/supabaseRankingRepository", () => ({
  getSupabaseMatchValidationContext: vi.fn(),
}));

vi.mock("@/lib/supabaseMatchCommands", () => ({
  recordSupabaseMatch: vi.fn(),
}));

const validContext = {
  players: [
    { id: "p1", name: "오준석", rank: 1, status: "active" as const },
    { id: "p2", name: "김도훈", rank: 2, status: "active" as const },
    { id: "p3", name: "박정용", rank: 3, status: "active" as const },
    { id: "p4", name: "이민우", rank: 4, status: "active" as const },
  ],
  previousMatches: [],
  config: {
    challengeRange: 4,
    rematchCooldownDays: 14,
    inactivityPenaltyDrop: 2,
  },
};

afterEach(() => {
  vi.useRealTimers();
});

function postRequest(body: unknown) {
  return new Request("https://example.com/api/clubs/seoultech/matches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/clubs/[club]/matches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T03:00:00.000Z"));
    vi.mocked(getSupabaseMatchValidationContext).mockReset();
    vi.mocked(recordSupabaseMatch).mockReset();
  });

  it("persists a valid public match and returns the recorded result", async () => {
    vi.mocked(recordSupabaseMatch).mockResolvedValue({
      matchId: "match-1",
      duplicate: false,
      defenseResult: "방어 실패",
      rankChanged: true,
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(getSupabaseMatchValidationContext).not.toHaveBeenCalled();
    expect(recordSupabaseMatch).toHaveBeenCalledWith(
      "seoultech",
      {
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
      },
      "submission-1"
    );
    expect(body).toEqual({
      ok: true,
      message: "경기 결과가 반영되었습니다.",
      match: {
        matchId: "match-1",
        duplicate: false,
        defenseResult: "방어 실패",
        rankChanged: true,
      },
    });
  });

  it("returns the existing match when a completed submission is retried", async () => {
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      previousMatches: [
        { playerAId: "p1", playerBId: "p4", playedOn: "2026-07-10" },
      ],
    });
    vi.mocked(recordSupabaseMatch).mockResolvedValue({
      matchId: "match-1",
      duplicate: true,
      defenseResult: "방어 실패",
      rankChanged: true,
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(200);
    expect(recordSupabaseMatch).toHaveBeenCalledTimes(1);
    expect(await response.json()).toMatchObject({
      ok: true,
      message: "이미 반영된 경기 결과입니다.",
      match: { matchId: "match-1", duplicate: true },
    });
  });

  it("rejects a missing submission key before reading Supabase context", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(400);
    expect(getSupabaseMatchValidationContext).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      message: "경기 결과 입력값이 올바르지 않습니다.",
    });
  });

  it("rejects selecting the same player twice", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p1",
        player1Score: 6,
        player2Score: 4,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(400);
    expect(getSupabaseMatchValidationContext).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      ok: false,
      message: "서로 다른 두 선수를 선택해주세요.",
    });
  });

  it("rejects an invalid score before reading Supabase context", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 5,
        player2Score: 4,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(getSupabaseMatchValidationContext).not.toHaveBeenCalled();
    expect(body).toEqual({
      ok: false,
      message: "승자는 반드시 6점이어야 합니다.",
    });
  });

  it("rejects a challenge outside the allowed range", async () => {
    vi.mocked(recordSupabaseMatch).mockRejectedValue(
      new Error("도전 가능한 순위 범위를 벗어났습니다.")
    );

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p6",
        player1Score: 4,
        player2Score: 6,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      message: "도전 가능한 순위 범위를 벗어났습니다.",
    });
  });

  it("rejects a rematch within the cooldown window", async () => {
    vi.mocked(recordSupabaseMatch).mockRejectedValue(
      new Error("동일 선수와는 2주 동안 재경기할 수 없습니다.")
    );

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      message: "동일 선수와는 2주 동안 재경기할 수 없습니다.",
    });
  });

  it("tells an injured player to report recovery after the database rejects the match", async () => {
    vi.mocked(recordSupabaseMatch).mockRejectedValue(
      new Error("활동 중인 선수끼리만 경기할 수 있습니다.")
    );
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      players: [
        { id: "p1", name: "오준석", rank: 1, status: "injured" as const },
        ...validContext.players.slice(1),
      ],
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 4,
        sourceKey: "injured-submission",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      message:
        "부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요.",
    });
  });

  it("keeps the generic database message for other non-active statuses", async () => {
    vi.mocked(recordSupabaseMatch).mockRejectedValue(
      new Error("활동 중인 선수끼리만 경기할 수 있습니다.")
    );
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      players: [
        { id: "p1", name: "오준석", rank: 1, status: "inactive" as const },
        ...validContext.players.slice(1),
      ],
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 4,
        sourceKey: "inactive-submission",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      message: "활동 중인 선수끼리만 경기할 수 있습니다.",
    });
  });

  it("returns 404 for unknown club slugs", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        sourceKey: "submission-1",
      }),
      { params: Promise.resolve({ club: "unknown" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      message: "등록되지 않은 동아리입니다.",
    });
  });
});

describe("GET /api/clubs/[club]/matches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T03:00:00.000Z"));
    vi.mocked(getSupabaseMatchValidationContext).mockReset();
  });

  it("returns only active players as ranked match options", async () => {
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      config: {
        ...validContext.config,
        challengeRange: 2,
      },
      players: [
        ...validContext.players,
        { id: "p5", name: "부상 선수", rank: 5, status: "injured" as const },
      ],
    });

    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ club: "seoultech" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      challengeRange: 2,
      rematchCooldowns: [],
      players: [
        { id: "p1", name: "오준석", rank: 1 },
        { id: "p2", name: "김도훈", rank: 2 },
        { id: "p3", name: "박정용", rank: 3 },
        { id: "p4", name: "이민우", rank: 4 },
      ],
    });
  });

  it("returns only active rematch cooldowns using the latest completed match per pair", async () => {
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      players: [
        ...validContext.players,
        { id: "p5", name: "비활동 선수", rank: 5, status: "inactive" as const },
      ],
      previousMatches: [
        { playerAId: "p2", playerBId: "p1", playedOn: "2026-06-30" },
        { playerAId: "p1", playerBId: "p2", playedOn: "2026-06-20" },
        { playerAId: "p3", playerBId: "p4", playedOn: "2026-06-26" },
        { playerAId: "p1", playerBId: "p3", playedOn: "2026-07-11" },
        { playerAId: "p1", playerBId: "p5", playedOn: "2026-07-01" },
      ],
    });

    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ club: "seoultech" }),
    });
    const body = await response.json();

    expect(body).toMatchObject({
      rematchCooldowns: [
        { playerAId: "p1", playerBId: "p2", availableOn: "2026-07-14" },
      ],
    });
    expect(body.rematchCooldowns).toEqual([
      { playerAId: "p1", playerBId: "p2", availableOn: "2026-07-14" },
    ]);
  });
});
