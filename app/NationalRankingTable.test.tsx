import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";

import NationalRankingTable from "./NationalRankingTable";

const rankings: NationalRankingPageData["rankings"] = {
  men: [
    {
      rank: 1,
      clubSlug: "seoultech",
      universityName: "서울과학기술대학교",
      clubName: "STC",
      displayName: "서울과학기술대학교 STC",
      points: 1234.56,
      latestEditionPoints: 80,
      championships: 1,
      runnerUps: 0,
    },
  ],
  women: [
    {
      rank: 1,
      clubSlug: "yonsei",
      universityName: "연세대학교",
      clubName: "YTC",
      displayName: "연세대학교 YTC",
      points: 987,
      latestEditionPoints: 60,
      championships: 0,
      runnerUps: 1,
    },
  ],
  combined: [
    {
      rank: 1,
      clubSlug: "korea",
      universityName: "고려대학교",
      clubName: "KUTC",
      displayName: "고려대학교 KUTC",
      points: 2111.11,
      latestEditionPoints: 120,
      championships: 2,
      runnerUps: 1,
    },
  ],
};

describe("NationalRankingTable", () => {
  it("기본 남자부 랭킹을 실제 표와 안정적인 열로 보여준다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    expect(screen.getByRole("tablist")).toBeDefined();
    expect(
      screen.getByRole("tab", { name: "남자부" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByRole("tab", { name: "여자부" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "종합" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "순위" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "동아리" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "점수" })).toBeDefined();
    expect(screen.getByText("서울과학기술대학교")).toBeDefined();
    expect(screen.getByText("STC")).toBeDefined();
    expect(screen.getByText("1,234.6")).toBeDefined();
    expect(screen.queryByText("연세대학교")).toBeNull();
  });

  it("여자부와 보조 종합 랭킹을 같은 표 안에서 전환한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    fireEvent.click(screen.getByRole("tab", { name: "여자부" }));

    expect(
      screen.getByRole("tab", { name: "여자부" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByText("연세대학교")).toBeDefined();
    expect(screen.queryByText("서울과학기술대학교")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "종합" }));

    expect(screen.getByText("보조 랭킹")).toBeDefined();
    expect(screen.getByText("고려대학교")).toBeDefined();
    expect(screen.queryByText("연세대학교")).toBeNull();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  });
});
