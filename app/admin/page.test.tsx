import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getAdminClubOverviews } from "@/lib/supabaseAdminRepository";

import AdminPage, { metadata } from "./page";

vi.mock("@/lib/supabaseAdminRepository", () => ({
  getAdminClubOverviews: vi.fn(),
}));

describe("AdminPage", () => {
  it("shows club operations and the secret policy without requiring login", async () => {
    vi.mocked(getAdminClubOverviews).mockResolvedValue([
      {
        id: "club-seoul",
        slug: "seoultech",
        name: "서울과학기술대학교 테니스",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        season: {
          id: "season-3",
          name: "시즌3",
          startsOn: "2026-07-01",
          endsOn: null,
        },
        roster: { total: 50, active: 49, injured: 1, inactive: 0, left: 0 },
        matches: { confirmed: 12, latestPlayedOn: "2026-07-08" },
        rules: {
          challengeRange: 4,
          rematchCooldownDays: 14,
          inactivityPenaltyDrop: 2,
        },
      },
    ]);

    const ui = await AdminPage();
    render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: "랭킹 운영 관리" })
    ).toBeDefined();
    expect(screen.queryByText(/로그인/)).toBeNull();

    const club = screen.getByRole("article", {
      name: "서울과학기술대학교 테니스 운영 현황",
    });
    expect(within(club).getByText("시즌3")).toBeDefined();
    expect(within(club).getByText("50")).toBeDefined();
    expect(within(club).getByText("12")).toBeDefined();
    expect(within(club).getByText("2026. 7. 8.")).toBeDefined();
    expect(within(club).getByText("4계단")).toBeDefined();
    expect(within(club).getByText("14일")).toBeDefined();
    expect(within(club).getByText("부상 선수")).toBeDefined();
    expect(within(club).queryByText("보호 기록")).toBeNull();

    const publicPageLink = within(club).getByRole("link", {
      name: "공개 랭킹 보기",
    });
    expect(publicPageLink.getAttribute("href")).toBe("/seoultech");
    expect(screen.getAllByText("비밀키 없음").length).toBeGreaterThan(0);
    expect(screen.getAllByText("비밀키 필요").length).toBeGreaterThan(0);
    expect(screen.getByText("선수 추가")).toBeDefined();
    expect(screen.getByText("월간 미참여 강등 적용")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "선수 관리" }).getAttribute("href")
    ).toBe("/admin/players");
    expect(
      screen.getByRole("link", { name: "경기 관리" }).getAttribute("href")
    ).toBe("/admin/matches");
  });

  it("keeps the admin route out of search results", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
