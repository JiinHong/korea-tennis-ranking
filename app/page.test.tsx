import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCachedNationalRankingPageData } from "@/lib/nationalRanking/repository";

import Home from "./page";

vi.mock("@/lib/nationalRanking/repository", () => ({
  getCachedNationalRankingPageData: vi.fn(),
}));

const rankingRow = {
  rank: 1,
  clubSlug: "seoultech",
  universityName: "서울과학기술대학교",
  clubName: "STC",
  displayName: "서울과학기술대학교 STC",
  points: 1234.56,
  latestEditionPoints: 80,
  championships: 1,
  runnerUps: 0,
};

const rankingPageData = {
  formulaVersion: "national-club-v1",
  calculatedAt: "2026-07-12T12:00:00.000Z",
  rankings: {
    men: [rankingRow],
    women: [{ ...rankingRow, clubSlug: "yonsei", clubName: "YTC" }],
    combined: [{ ...rankingRow, points: 2469.12 }],
  },
};

describe("Home", () => {
  beforeEach(() => {
    vi.mocked(getCachedNationalRankingPageData).mockReset();
  });

  it("게시된 전국 랭킹과 산정 메타데이터를 조용한 운영 화면에 보여준다", async () => {
    vi.mocked(getCachedNationalRankingPageData).mockResolvedValue(rankingPageData);

    render(await Home());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "전국 대학 테니스 동아리 랭킹",
      })
    ).toBeDefined();
    expect(screen.getByText("national-club-v1")).toBeDefined();
    const calculatedAt = screen.getByText(/2026.*7.*12/) as HTMLTimeElement;
    expect(calculatedAt.getAttribute("datetime")).toBe(
      "2026-07-12T12:00:00.000Z"
    );
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("서울과학기술대학교")).toBeDefined();
    expect(screen.queryByText(/구축할 예정입니다/)).toBeNull();
    expect(screen.queryByText("영월")).toBeNull();

    const seoultechLink = screen.getByRole("link", {
      name: "서울과기대 단식 랭킹",
    });
    expect(seoultechLink.getAttribute("href")).toBe("/seoultech");
  });

  it("게시된 스냅샷이 없으면 준비 상태를 보여준다", async () => {
    vi.mocked(getCachedNationalRankingPageData).mockResolvedValue(null);

    render(await Home());

    expect(
      screen.getByText("검증된 전국 랭킹을 준비하고 있습니다.")
    ).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("랭킹 조회 실패 시 다시 시도 링크를 보여주고 다음 요청에서 복구한다", async () => {
    vi.mocked(getCachedNationalRankingPageData)
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(rankingPageData);

    const firstRender = render(await Home());
    const alert = screen.getByRole("alert");

    expect(
      within(alert).getByText("전국 랭킹을 불러오지 못했습니다.")
    ).toBeDefined();
    expect(
      within(alert).getByRole("link", { name: "다시 시도" }).getAttribute("href")
    ).toBe("/");
    expect(screen.queryByRole("table")).toBeNull();

    firstRender.unmount();
    render(await Home());

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("national-club-v1")).toBeDefined();
    expect(getCachedNationalRankingPageData).toHaveBeenCalledTimes(2);
  });
});
