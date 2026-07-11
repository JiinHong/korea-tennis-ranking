import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminMonthlyClub } from "@/lib/supabaseMonthlySettlements";
import type {
  AdminMonthlyAutomationStatus,
  MonthlyAutomationRunStatus,
} from "@/lib/supabaseMonthlyAutomationStatus";

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

const emptyAutomationStatus: AdminMonthlyAutomationStatus = {
  available: true,
  nextRunAt: "2026-07-31T15:10:00.000Z",
  latestByClubId: {},
};

const unavailableAutomationStatus: AdminMonthlyAutomationStatus = {
  available: false,
  nextRunAt: "2026-07-31T15:10:00.000Z",
  latestByClubId: {},
};

function automationStatusWith(
  status: MonthlyAutomationRunStatus
): AdminMonthlyAutomationStatus {
  return {
    available: true,
    nextRunAt: "2026-08-31T15:10:00.000Z",
    latestByClubId: {
      "club-seoultech": {
        id: `run-${status}`,
        clubId: "club-seoultech",
        seasonId: "season-3",
        targetMonth: "2026-07",
        status,
        settlementId: status === "failed" ? null : "settlement-1",
        errorCode: status === "failed" ? "22023" : null,
        publicMessage:
          status === "succeeded"
            ? "자동 정산을 완료했습니다."
            : status === "skipped"
              ? "이미 정산되어 건너뛰었습니다."
              : "자동 정산에 실패했습니다. 미리보기에서 수동 정산을 확인해주세요.",
        executedAt: "2026-07-31T15:10:00.000Z",
      },
    },
  };
}

afterEach(() => {
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("AdminMonthlyManager", () => {
  it("shows a keyless preview with participation, targets, and expected ranks", () => {
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={emptyAutomationStatus}
      />
    );

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
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={emptyAutomationStatus}
      />
    );

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
        automationStatus={emptyAutomationStatus}
      />
    );

    expect(
      screen.getByText("아직 정산할 수 있는 완료 월이 없습니다.")
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /정산 적용/ })).toBeNull();
  });

  it("shows the next run and an explicit waiting state before the first run", () => {
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={emptyAutomationStatus}
      />
    );

    expect(screen.getByRole("heading", { name: "자동 정산" })).toBeDefined();
    expect(screen.getByText("실행 대기")).toBeDefined();
    expect(screen.getByText("아직 실행 기록 없음")).toBeDefined();
    expect(screen.getByText("2026. 8. 1. 00:10")).toBeDefined();
  });

  it("keeps the manual flow visible when automation status is unavailable", () => {
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={unavailableAutomationStatus}
      />
    );

    expect(screen.getByText("확인 불가")).toBeDefined();
    expect(
      screen.getByText(
        "자동 정산 상태를 불러오지 못했습니다. 미리보기와 수동 정산은 계속 사용할 수 있습니다."
      )
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "2026년 7월 정산 적용" })
    ).toBeDefined();
  });

  it.each([
    ["succeeded", "정상 완료"],
    ["skipped", "건너뜀"],
    ["failed", "확인 필요"],
  ] as const)("renders the %s automation outcome", (status, label) => {
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={automationStatusWith(status)}
      />
    );

    expect(screen.getByText(label)).toBeDefined();
    expect(screen.getAllByText("2026년 7월").length).toBeGreaterThan(0);
  });

  it("shows safe failure guidance and the non-secret error code", () => {
    render(
      <AdminMonthlyManager
        clubs={clubs}
        automationStatus={automationStatusWith("failed")}
      />
    );

    expect(
      screen.getByText(
        "자동 정산에 실패했습니다. 미리보기에서 수동 정산을 확인해주세요."
      )
    ).toBeDefined();
    expect(screen.getByText("오류 코드 22023")).toBeDefined();
    expect(screen.queryByText(/SQL/)).toBeNull();
  });
});
