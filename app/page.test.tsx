import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCachedNationalRankingPageData } from "@/lib/nationalRanking/repository";

import Home from "./page";

vi.mock("@/lib/nationalRanking/repository", () => ({
  getCachedNationalRankingPageData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const rankingRow = {
  rank: 1,
  clubSlug: "seoultech-neutinamu",
  universityName: "서울과학기술대학교",
  clubName: "STC",
  displayName: "서울과학기술대학교 STC",
  points: 1234,
  latestEditionPoints: 80,
  championships: 1,
  runnerUps: 0,
  bestResults: [],
  honors: [],
};

const rankingPageData = {
  formulaVersion: "national-club-v3",
  calculatedAt: "2026-07-12T12:00:00.000Z",
  rankings: {
    men: [rankingRow],
    women: [{ ...rankingRow, clubSlug: "yonsei", clubName: "YTC" }],
    combined: [{ ...rankingRow, points: 2468 }],
  },
};

describe("Home", () => {
  beforeEach(() => {
    vi.mocked(getCachedNationalRankingPageData).mockReset();
  });

  it("게시된 전국 랭킹과 최근 1년 왕관 안내를 보여준다", async () => {
    vi.mocked(getCachedNationalRankingPageData).mockResolvedValue(rankingPageData);

    render(await Home());

    expect(screen.getByText("KOREA CAMPUS TENNIS RANKING")).toBeDefined();
    expect(screen.queryByText("NATIONAL CLUB RANKING")).toBeNull();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "전국 대학 테니스 동아리 랭킹",
      })
    ).toBeDefined();
    expect(
      screen.getByText(
        "최근 3년간 5개 대학 테니스 대회 성적을 반영한 랭킹입니다."
      )
    ).toBeDefined();
    expect(
      screen.getByText("양구 · 경인지구 · 춘천 · 인제 · WEMIX OPEN")
    ).toBeDefined();
    expect(
      screen.queryByText(
        "국토정중앙배(양구), 경인지구 연맹전, 춘천소양강배, 하늘내린인제, WEMIX OPEN의 최근 3년간 성적을 바탕으로 산정합니다."
      )
    ).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "랭킹 계산 방식 보기" })
        .getAttribute("href")
    ).toBe("/methodology");
    expect(
      screen.queryByRole("button", { name: "랭킹 산정 방식 안내" })
    ).toBeNull();
    expect(screen.queryByText("national-club-v3")).toBeNull();
    expect(screen.queryByText("계산식")).toBeNull();
    expect(screen.queryByText("산정 시각")).toBeNull();
    const crownGuide = screen.getByText(": 최근 1년간의 입상").closest("p");
    const crownImage = crownGuide?.querySelector("img");
    expect(crownGuide?.textContent).toBe(": 최근 1년간의 입상");
    expect(crownImage?.getAttribute("alt")).toBe("왕관");
    expect(crownImage?.getAttribute("src")).toContain(
      encodeURIComponent("/national-ranking/black-crown.png")
    );
    expect(
      screen.queryByText("왕관은 최근 1년간의 입상을 의미합니다.")
    ).toBeNull();
    expect(screen.queryByText("※ 2026년 7월 기준")).toBeNull();
    expect(screen.queryByRole("time")).toBeNull();
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("서울과학기술대학교")).toBeDefined();
    expect(screen.queryByText(/구축할 예정입니다/)).toBeNull();
    expect(screen.queryByText("영월")).toBeNull();

    expect(
      screen.queryByRole("link", { name: "서울과기대 단식 랭킹" })
    ).toBeNull();
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
    expect(
      screen.getByText(": 최근 1년간의 입상").closest("p")?.textContent
    ).toBe(": 최근 1년간의 입상");
    expect(getCachedNationalRankingPageData).toHaveBeenCalledTimes(2);
  });
});
