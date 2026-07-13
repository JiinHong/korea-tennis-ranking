import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";

import NationalRankingTable from "./NationalRankingTable";

const rankings: NationalRankingPageData["rankings"] = {
  men: [
    {
      rank: 1,
      clubSlug: "seoultech-neutinamu",
      universityName: "서울과학기술대학교",
      clubName: "STC",
      displayName: "서울과학기술대학교 STC",
      points: 1234.56,
      latestEditionPoints: 80,
      championships: 1,
      runnerUps: 0,
    },
    {
      rank: 2,
      clubSlug: "kaist",
      universityName: "한국과학기술원",
      clubName: "KAIST Tennis",
      displayName: "한국과학기술원 KAIST Tennis",
      points: 1100,
      latestEditionPoints: 70,
      championships: 0,
      runnerUps: 1,
    },
    {
      rank: 9,
      clubSlug: "korea-petc",
      universityName: "고려대학교",
      clubName: "PETC",
      displayName: "고려대학교 PETC",
      points: 530,
      latestEditionPoints: 40,
      championships: 0,
      runnerUps: 0,
    },
    {
      rank: 10,
      clubSlug: "hanyang",
      universityName: "한양대학교",
      clubName: "HYTC",
      displayName: "한양대학교 HYTC",
      points: 500,
      latestEditionPoints: 30,
      championships: 0,
      runnerUps: 0,
    },
    {
      rank: 11,
      clubSlug: "soongsil",
      universityName: "숭실대학교",
      clubName: "SSUTC",
      displayName: "숭실대학교 SSUTC",
      points: 450,
      latestEditionPoints: 20,
      championships: 0,
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

  it("순위 번호를 1위 금색, 2~10위 은색, 11위부터 브론즈색 등급으로 구분한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const rankCells = Array.from(
      screen
        .getByRole("table")
        .querySelectorAll<HTMLTableCellElement>(".national-ranking-rank")
    );

    expect(
      rankCells.map((cell) => [cell.textContent, cell.dataset.rankTier])
    ).toEqual([
      ["1", "gold"],
      ["2", "silver"],
      ["9", "silver"],
      ["10", "silver"],
      ["11", "bronze"],
    ]);
  });

  it("과기대와 PETC 동아리 이름만 각 단식 랭킹으로 연결한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    expect(
      screen
        .getByRole("link", {
          name: "서울과학기술대학교 STC 단식 랭킹 보기",
        })
        .getAttribute("href")
    ).toBe("/seoultech");
    expect(
      screen
        .getByRole("link", { name: "고려대학교 PETC 단식 랭킹 보기" })
        .getAttribute("href")
    ).toBe("/petc");
    expect(
      screen.queryByRole("link", {
        name: "한국과학기술원 KAIST Tennis 단식 랭킹 보기",
      })
    ).toBeNull();
  });

  it("객체 프로토타입과 같은 슬러그는 단식 랭킹 링크로 오인하지 않는다", () => {
    const rankingsWithPrototypeSlug: NationalRankingPageData["rankings"] = {
      ...rankings,
      men: [
        ...rankings.men,
        {
          rank: 12,
          clubSlug: "constructor",
          universityName: "프로토타입대학교",
          clubName: "테니스부",
          displayName: "프로토타입대학교 테니스부",
          points: 10,
          latestEditionPoints: 0,
          championships: 0,
          runnerUps: 0,
        },
      ],
    };

    render(<NationalRankingTable rankings={rankingsWithPrototypeSlug} />);

    expect(screen.getByText("프로토타입대학교").closest("a")).toBeNull();
  });

  it("여자부와 종합 랭킹을 부가 라벨 없이 같은 표 안에서 전환한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    fireEvent.click(screen.getByRole("tab", { name: "여자부" }));

    expect(
      screen.getByRole("tab", { name: "여자부" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByText("연세대학교")).toBeDefined();
    expect(screen.queryByText("서울과학기술대학교")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "종합" }));

    expect(screen.queryByText("보조 랭킹")).toBeNull();
    expect(screen.getByText("고려대학교")).toBeDefined();
    expect(screen.queryByText("연세대학교")).toBeNull();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  });

  it("선택된 탭만 탭 순서에 두고 탭 패널도 포커스할 수 있게 한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    expect(screen.getByRole("tab", { name: "남자부" }).tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "여자부" }).tabIndex).toBe(-1);
    expect(screen.getByRole("tab", { name: "종합" }).tabIndex).toBe(-1);
    expect(screen.getByRole("tabpanel").tabIndex).toBe(0);

    fireEvent.click(screen.getByRole("tab", { name: "여자부" }));

    expect(screen.getByRole("tab", { name: "남자부" }).tabIndex).toBe(-1);
    expect(screen.getByRole("tab", { name: "여자부" }).tabIndex).toBe(0);
  });

  it("방향키와 Home, End로 탭을 순환하며 대상 탭을 활성화하고 포커스한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const menTab = screen.getByRole("tab", { name: "남자부" });
    const womenTab = screen.getByRole("tab", { name: "여자부" });
    const combinedTab = screen.getByRole("tab", { name: "종합" });

    menTab.focus();
    fireEvent.keyDown(menTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(womenTab);
    expect(womenTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("연세대학교")).toBeDefined();

    fireEvent.keyDown(womenTab, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(menTab);
    expect(menTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(menTab, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(combinedTab);
    expect(combinedTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(combinedTab, { key: "Home" });
    expect(document.activeElement).toBe(menTab);
    expect(menTab.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(menTab, { key: "End" });
    expect(document.activeElement).toBe(combinedTab);
    expect(combinedTab.getAttribute("aria-selected")).toBe("true");
  });
});
