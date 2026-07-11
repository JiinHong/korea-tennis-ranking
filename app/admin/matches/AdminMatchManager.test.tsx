import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminMatchClub } from "@/lib/supabaseAdminMatches";

import AdminMatchManager from "./AdminMatchManager";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const clubs: AdminMatchClub[] = [
  {
    id: "club-seoultech",
    slug: "seoultech",
    name: "서울과기대",
    title: "단식 랭킹",
    season: { id: "season-3", name: "시즌3" },
    players: [
      { playerId: "player-1", name: "오준석", currentRank: 1, status: "active" },
      { playerId: "player-2", name: "김도훈", currentRank: 2, status: "active" },
    ],
    matches: [
      {
        id: "match-1",
        playedOn: "2026-07-08",
        sequenceNo: 2,
        challengerPlayerId: "player-2",
        challengerName: "김도훈",
        challengerRankBefore: 2,
        defenderPlayerId: "player-1",
        defenderName: "오준석",
        defenderRankBefore: 1,
        winnerPlayerId: "player-1",
        winnerName: "오준석",
        winnerScore: 6,
        loserScore: 4,
        defenseResult: "방어 성공",
        source: "import",
        status: "confirmed",
        updatedAt: "2026-07-10T00:00:00Z",
      },
      {
        id: "match-2",
        playedOn: "2026-07-07",
        sequenceNo: 1,
        challengerPlayerId: "player-2",
        challengerName: "김도훈",
        challengerRankBefore: 2,
        defenderPlayerId: "player-1",
        defenderName: "오준석",
        defenderRankBefore: 1,
        winnerPlayerId: "player-2",
        winnerName: "김도훈",
        winnerScore: 6,
        loserScore: 3,
        defenseResult: "방어 실패",
        source: "public_form",
        status: "voided",
        updatedAt: "2026-07-10T01:00:00Z",
      },
    ],
  },
];

function successResponse(action: "edit" | "void" | "restore") {
  return {
    ok: true,
    json: async () => ({
      ok: true,
      match: {
        action,
        matchId: "match-1",
        status: action === "void" ? "voided" : "confirmed",
        rankingsRecalculated: true,
      },
    }),
  };
}

afterEach(() => {
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("AdminMatchManager", () => {
  it("shows all matches and filters voided records", () => {
    render(<AdminMatchManager clubs={clubs} />);

    expect(screen.getAllByText("2026. 7. 8.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026. 7. 7.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "무효 경기" }));

    expect(screen.queryByText("2026. 7. 8.")).toBeNull();
    expect(screen.getAllByText("2026. 7. 7.").length).toBeGreaterThan(0);
  });

  it("prefills the edit dialog and submits corrected match data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse("edit"));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminMatchManager clubs={clubs} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "2026. 7. 8. 김도훈 대 오준석 경기 수정",
      })
    );

    expect(screen.getByRole("dialog", { name: "경기 수정" })).toBeDefined();
    expect(screen.getByLabelText("선수 1")).toHaveProperty("value", "player-2");
    expect(screen.getByLabelText("선수 1 점수")).toHaveProperty("value", "4");
    expect(screen.getByLabelText("선수 2 점수")).toHaveProperty("value", "6");

    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      operation: "edit",
      matchId: "match-1",
      player1Id: "player-2",
      player2Id: "player-1",
      player1Score: 4,
      player2Score: 6,
      playedOn: "2026-07-08",
      adminSecret: "admin-secret",
    });
  });

  it("voids a confirmed match only after secret confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse("void"));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminMatchManager clubs={clubs} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "2026. 7. 8. 김도훈 대 오준석 경기 무효",
      })
    );
    expect(screen.getByText("이 경기를 순위 계산에서 제외합니다.")).toBeDefined();
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "무효 처리" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      operation: "void",
      matchId: "match-1",
      adminSecret: "admin-secret",
    });
  });

  it("offers restoration for a voided match", () => {
    render(<AdminMatchManager clubs={clubs} />);

    expect(
      screen.getByRole("button", { name: "김도훈 대 오준석 경기 복구" })
    ).toBeDefined();
  });

  it("keeps a failed mutation open and clears the secret", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          message: "관리자 비밀키가 올바르지 않습니다.",
        }),
      })
    );
    render(<AdminMatchManager clubs={clubs} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "2026. 7. 8. 김도훈 대 오준석 경기 무효",
      })
    );
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "무효 처리" }));

    expect(
      await screen.findByText("관리자 비밀키가 올바르지 않습니다.")
    ).toBeDefined();
    expect(screen.getByLabelText("관리자 비밀키")).toHaveProperty("value", "");
  });
});
