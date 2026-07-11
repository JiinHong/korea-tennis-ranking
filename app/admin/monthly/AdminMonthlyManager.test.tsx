import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminMonthlyClub } from "@/lib/supabaseMonthlySettlements";

import AdminMonthlyManager from "./AdminMonthlyManager";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const clubs: AdminMonthlyClub[] = [
  {
    id: "club-seoultech",
    slug: "seoultech",
    name: "서울과기대",
    title: "단식 랭킹",
    season: {
      id: "season-3",
      name: "시즌3",
      startsOn: "2026-07-01",
      endsOn: null,
    },
    penaltyDrop: 2,
    previews: [
      {
        targetMonth: "2026-07",
        penaltyDrop: 2,
        alreadyApplied: false,
        targets: [
          {
            playerId: "p2",
            name: "김도훈",
            initialRank: 2,
            currentRank: 2,
            expectedRank: 3,
            status: "injured",
            eligible: true,
            matchCount: 0,
            penalized: true,
            actualDrop: 1,
          },
        ],
        players: [
          {
            playerId: "p1",
            name: "오준석",
            initialRank: 1,
            currentRank: 1,
            expectedRank: 1,
            status: "active",
            eligible: true,
            matchCount: 1,
            penalized: false,
            actualDrop: 0,
          },
          {
            playerId: "p2",
            name: "김도훈",
            initialRank: 2,
            currentRank: 2,
            expectedRank: 3,
            status: "injured",
            eligible: true,
            matchCount: 0,
            penalized: true,
            actualDrop: 1,
          },
          {
            playerId: "p3",
            name: "박정용",
            initialRank: 3,
            currentRank: 3,
            expectedRank: 2,
            status: "active",
            eligible: true,
            matchCount: 1,
            penalized: false,
            actualDrop: -1,
          },
        ],
      },
    ],
  },
];

afterEach(() => {
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("AdminMonthlyManager", () => {
  it("shows a keyless preview with participation, targets, and expected ranks", () => {
    render(<AdminMonthlyManager clubs={clubs} />);

    expect(screen.queryByLabelText("관리자 비밀키")).toBeNull();
    expect(screen.getAllByText("2026년 7월").length).toBeGreaterThan(0);
    expect(screen.getByText("참여 2명")).toBeDefined();
    expect(screen.getByText("미참여 1명")).toBeDefined();
    expect(screen.getByText("김도훈")).toBeDefined();
    expect(screen.getByText("부상")).toBeDefined();
    expect(screen.getByText("2위 → 3위")).toBeDefined();
  });

  it("asks for the secret only when applying and refreshes after success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, settlement: { targetMonth: "2026-07" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminMonthlyManager clubs={clubs} />);

    fireEvent.click(screen.getByRole("button", { name: "2026년 7월 정산 적용" }));
    expect(
      screen.getByRole("dialog", { name: "2026년 7월 정산 적용" })
    ).toBeDefined();
    fireEvent.change(screen.getByLabelText("관리자 비밀키"), {
      target: { value: "admin-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/clubs/seoultech/monthly-settlements",
      expect.objectContaining({ method: "POST" })
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      targetMonth: "2026-07",
      adminSecret: "admin-secret",
    });
  });

  it("shows a clear empty state before the first season month has completed", () => {
    render(
      <AdminMonthlyManager
        clubs={[{ ...clubs[0], previews: [] }]}
      />
    );

    expect(
      screen.getByText("아직 정산할 수 있는 완료 월이 없습니다.")
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /정산 적용/ })).toBeNull();
  });
});
