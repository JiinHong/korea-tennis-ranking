import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSupabaseMatchValidationContext } from "@/lib/supabaseRankingRepository";

import { POST } from "./route";

vi.mock("@/lib/supabaseRankingRepository", () => ({
  getSupabaseMatchValidationContext: vi.fn(),
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

function postRequest(body: unknown) {
  return new Request("https://example.com/api/clubs/seoultech/matches", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/clubs/[club]/matches", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseMatchValidationContext).mockReset();
  });

  it("validates a public match submission and returns the resolved roles", async () => {
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue(validContext);

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(getSupabaseMatchValidationContext).toHaveBeenCalledWith("seoultech");
    expect(body).toEqual({
      ok: true,
      message: "경기 결과를 검증했습니다. 저장 기능은 다음 단계에서 연결됩니다.",
      validation: {
        challenger: { id: "p4", name: "이민우", rank: 4 },
        defender: { id: "p1", name: "오준석", rank: 1 },
        winnerId: "p4",
        loserId: "p1",
      },
    });
  });

  it("rejects an invalid score before reading Supabase context", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 5,
        player2Score: 4,
        playedOn: "2026-07-10",
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
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      players: [
        ...validContext.players,
        { id: "p5", name: "이도현", rank: 5, status: "active" as const },
        { id: "p6", name: "김혜은", rank: 6, status: "active" as const },
      ],
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p6",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
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
    vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
      ...validContext,
      previousMatches: [
        { playerAId: "p1", playerBId: "p4", playedOn: "2026-07-01" },
      ],
    });

    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
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

  it("returns 404 for unknown club slugs", async () => {
    const response = await POST(
      postRequest({
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
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
