import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getAdminMonthlyClubs } from "@/lib/supabaseMonthlySettlements";
import { getAdminMonthlyAutomationStatus } from "@/lib/supabaseMonthlyAutomationStatus";

import AdminMonthlyPage, { metadata } from "./page";

vi.mock("@/lib/supabaseMonthlySettlements", () => ({
  getAdminMonthlyClubs: vi.fn(),
}));

vi.mock("@/lib/supabaseMonthlyAutomationStatus", () => ({
  getAdminMonthlyAutomationStatus: vi.fn(),
  createUnavailableMonthlyAutomationStatus: vi.fn(() => ({
    available: false,
    nextRunAt: "2026-07-31T15:10:00.000Z",
    latestByClubId: {},
  })),
}));

vi.mock("./AdminMonthlyManager", () => ({
  default: ({
    clubs,
    automationStatus,
  }: {
    clubs: Array<{ name: string }>;
    automationStatus: { nextRunAt: string; available?: boolean };
  }) => (
    <div>
      <span>{clubs.map((club) => club.name).join(", ")}</span>
      <time>{automationStatus.nextRunAt}</time>
      {automationStatus.available === false ? (
        <span>자동 정산 상태 확인 불가</span>
      ) : null}
    </div>
  ),
}));

describe("AdminMonthlyPage", () => {
  it("renders open preview data inside a dedicated monthly settlement page", async () => {
    vi.mocked(getAdminMonthlyClubs).mockResolvedValue([
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
        previews: [],
      },
    ]);
    vi.mocked(getAdminMonthlyAutomationStatus).mockResolvedValue({
      available: true,
      nextRunAt: "2026-07-31T15:10:00.000Z",
      latestByClubId: {},
    });

    render(await AdminMonthlyPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "월간 미참여 정산" })
    ).toBeDefined();
    expect(screen.getByText("서울과기대")).toBeDefined();
    expect(screen.getByText(/2026-07-31T15:10:00.000Z/)).toBeDefined();
    expect(getAdminMonthlyAutomationStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByText("미리보기는 비밀키 없음")).toBeDefined();
    expect(screen.getByRole("link", { name: "운영 현황" }).getAttribute("href")).toBe(
      "/admin"
    );
  });

  it("keeps the manual preview available when automation status lookup fails", async () => {
    vi.mocked(getAdminMonthlyClubs).mockResolvedValue([
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
        previews: [],
      },
    ]);
    vi.mocked(getAdminMonthlyAutomationStatus).mockRejectedValue(
      new Error("temporary status lookup failure")
    );

    render(await AdminMonthlyPage());

    expect(screen.getByText("서울과기대")).toBeDefined();
    expect(screen.getByText("자동 정산 상태 확인 불가")).toBeDefined();
  });

  it("keeps the monthly settlement route out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
