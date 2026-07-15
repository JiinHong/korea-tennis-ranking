import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";

import NationalRankingTable from "./NationalRankingTable";

const navigation = vi.hoisted(() => ({
  query: "",
  replace: vi.fn(),
}));
const analytics = vi.hoisted(() => ({
  trackAmplitudeEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

vi.mock("@/lib/amplitudeAnalytics", () => analytics);

const rankings: NationalRankingPageData["rankings"] = {
  men: [
    {
      rank: 1,
      clubSlug: "seoultech-neutinamu",
      universityName: "서울과학기술대학교",
      clubName: "STC",
      displayName: "서울과학기술대학교 STC",
      points: 1234,
      latestEditionPoints: 80,
      championships: 1,
      runnerUps: 1,
      bestResults: [
        {
          editionKey: "yanggu-2025-men",
          tournamentSlug: "yanggu",
          tournamentName: "국토정중앙배(양구)",
          year: 2025,
          gender: "men",
          actualEntrants: 64,
          stage: "champion",
          sourceTeamName: "느티나무 A",
        },
        {
          editionKey: "gyeongin-2024-men",
          tournamentSlug: "gyeongin",
          tournamentName: "경인지구 연맹전",
          year: 2024,
          gender: "men",
          actualEntrants: 48,
          stage: "runner_up",
          sourceTeamName: "느티나무",
        },
      ],
      honors: [
        {
          editionKey: "yanggu-2025-men",
          tournamentSlug: "yanggu",
          tournamentName: "국토정중앙배(양구)",
          year: 2025,
          gender: "men",
          stage: "champion",
        },
        {
          editionKey: "gyeongin-2024-men",
          tournamentSlug: "gyeongin",
          tournamentName: "경인지구 연맹전",
          year: 2024,
          gender: "men",
          stage: "runner_up",
        },
      ],
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
      bestResults: [
        {
          editionKey: "inje-2025-men",
          tournamentSlug: "inje",
          tournamentName: "하늘내린인제",
          year: 2025,
          gender: "men",
          actualEntrants: 24,
          stage: "quarterfinal",
          sourceTeamName: "KAIST",
        },
      ],
      honors: [],
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
      bestResults: [],
      honors: [],
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
      bestResults: [],
      honors: [],
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
      bestResults: [],
      honors: [],
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
      bestResults: [],
      honors: [
        {
          editionKey: "wemix-2025-women",
          tournamentSlug: "wemix",
          tournamentName: "WEMIX OPEN",
          year: 2025,
          gender: "women",
          stage: "runner_up",
        },
      ],
    },
  ],
  combined: [
    {
      rank: 1,
      clubSlug: "korea",
      universityName: "고려대학교",
      clubName: "KUTC",
      displayName: "고려대학교 KUTC",
      points: 2111,
      latestEditionPoints: 120,
      championships: 2,
      runnerUps: 1,
      bestResults: [],
      honors: [
        {
          editionKey: "chuncheon-2025-men",
          tournamentSlug: "chuncheon",
          tournamentName: "춘천소양강배",
          year: 2025,
          gender: "men",
          stage: "champion",
        },
        {
          editionKey: "inje-2024-women",
          tournamentSlug: "inje",
          tournamentName: "하늘내린인제",
          year: 2024,
          gender: "women",
          stage: "runner_up",
        },
      ],
    },
  ],
};

describe("NationalRankingTable", () => {
  beforeEach(() => {
    navigation.query = "";
    navigation.replace.mockReset();
    analytics.trackAmplitudeEvent.mockClear();
  });

  it("부문 전환과 동아리 최고 성적 열기를 이름 있는 이벤트로 기록한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    fireEvent.click(screen.getByRole("tab", { name: "여자부" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "연세대학교 YTC 최고 성적 펼치기",
      })
    );

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "National Ranking Division Changed",
      { division: "women" }
    );
    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "National Club Preview Opened",
      {
        club_slug: "yonsei",
        division: "women",
        rank: 1,
      }
    );
  });

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
    expect(screen.getByText("1,234")).toBeDefined();
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

  it("동아리 칸을 누르면 최고 성적과 현재 부문이 담긴 전체 성적 링크를 펼친다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const disclosure = screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    });
    fireEvent.click(disclosure);

    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("region", {
        name: "서울과학기술대학교 STC 최고 성적",
      })
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "전체 성적 보기" }).getAttribute("href")
    ).toBe("/clubs/seoultech-neutinamu?gender=men");
  });

  it("랭킹 행 전체를 펼치기 버튼의 터치 영역으로 두고 닫힌 상태를 복원한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const disclosure = screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    });
    const rankingRow = disclosure.closest("tr");
    const rankCell = rankingRow?.querySelector(".national-ranking-rank");
    const scoreCell = rankingRow?.querySelector(".national-ranking-score");

    expect(rankingRow?.classList.contains("national-ranking-main-row")).toBe(true);
    expect(rankingRow?.getAttribute("data-expanded")).toBe("false");

    fireEvent.click(rankCell as HTMLTableCellElement);
    expect(rankingRow?.getAttribute("data-expanded")).toBe("true");

    fireEvent.click(scoreCell as HTMLTableCellElement);
    expect(rankingRow?.getAttribute("data-expanded")).toBe("false");
  });

  it("왕관은 행 펼치기 버튼과 별도로 조작한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const disclosure = screen.getByRole("button", {
      name: "서울과학기술대학교 STC 최고 성적 펼치기",
    });
    const rankingRow = disclosure.closest("tr");
    const honor = within(rankingRow as HTMLTableRowElement).getByRole("button", {
      name: "2025 양구 남자부 우승",
    });

    expect(
      honor.closest(".national-ranking-club-disclosure")
    ).toBeNull();
    fireEvent.click(honor);
    expect(rankingRow?.getAttribute("data-expanded")).toBe("false");
  });

  it("객체 프로토타입과 같은 안전한 슬러그도 일반 성적 링크로 다룬다", () => {
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
          bestResults: [],
          honors: [],
        },
      ],
    };

    render(<NationalRankingTable rankings={rankingsWithPrototypeSlug} />);

    const disclosure = screen.getByRole("button", {
      name: "프로토타입대학교 테니스부 최고 성적 펼치기",
    });
    fireEvent.click(disclosure);
    expect(
      screen.getByRole("link", { name: "전체 성적 보기" }).getAttribute("href")
    ).toBe("/clubs/constructor?gender=men");
  });

  it("동아리 이름 뒤에는 2025년 우승과 준우승 왕관만 표시한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const champion = screen.getByRole("button", {
      name: "2025 양구 남자부 우승",
    });

    expect(champion).toBeDefined();
    expect(champion.closest("a")).toBeNull();
    expect(screen.getByLabelText("2025년 수상 기록")).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: "서울과학기술대학교 STC 최고 성적 펼치기",
      })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "2024 경인지구 남자부 준우승" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "2025 위믹스 여자부 준우승" })
    ).toBeNull();
  });

  it("동아리명과 왕관 묶음을 같은 하단 행에 배치한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    const clubName = screen.getByText("STC");
    const honors = screen.getByLabelText("2025년 수상 기록");

    expect(clubName.classList.contains("national-ranking-club-name")).toBe(
      true
    );
    expect(clubName.parentElement).toBe(honors.parentElement);
  });

  it("여자부와 종합 랭킹을 부가 라벨 없이 같은 표 안에서 전환한다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    fireEvent.click(screen.getByRole("tab", { name: "여자부" }));

    expect(
      screen.getByRole("tab", { name: "여자부" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByText("연세대학교")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "2025 위믹스 여자부 준우승" })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "2025 양구 남자부 우승" })
    ).toBeNull();
    expect(screen.queryByText("서울과학기술대학교")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "종합" }));

    expect(screen.queryByText("보조 랭킹")).toBeNull();
    expect(screen.getByText("고려대학교")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "2025 춘천 남자부 우승" })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "2024 인제 여자부 준우승" })
    ).toBeNull();
    expect(screen.queryByText("연세대학교")).toBeNull();
    expect(
      within(screen.getByRole("table")).getAllByRole("row", { hidden: true })
    ).toHaveLength(3);
  });

  it("한 동아리를 펼치면 이전에 열려 있던 동아리를 닫는다", () => {
    render(<NationalRankingTable rankings={rankings} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "서울과학기술대학교 STC 최고 성적 펼치기",
      })
    );
    expect(
      screen.getByRole("region", {
        name: "서울과학기술대학교 STC 최고 성적",
      })
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", {
        name: "한국과학기술원 KAIST Tennis 최고 성적 펼치기",
      })
    );

    expect(
      screen.queryByRole("region", {
        name: "서울과학기술대학교 STC 최고 성적",
      })
    ).toBeNull();
    expect(
      screen.getByRole("region", {
        name: "한국과학기술원 KAIST Tennis 최고 성적",
      })
    ).toBeDefined();
  });

  it("URL의 여자부를 초기 선택하고 부문 전환 시 열린 행을 닫으며 URL을 바꾼다", () => {
    navigation.query = "gender=women";
    render(<NationalRankingTable rankings={rankings} />);

    expect(
      screen.getByRole("tab", { name: "여자부" }).getAttribute("aria-selected")
    ).toBe("true");

    fireEvent.click(
      screen.getByRole("button", {
        name: "연세대학교 YTC 최고 성적 펼치기",
      })
    );
    fireEvent.click(screen.getByRole("tab", { name: "남자부" }));

    expect(navigation.replace).toHaveBeenCalledWith("/?gender=men", {
      scroll: false,
    });
    expect(
      screen.queryByRole("region", { name: "연세대학교 YTC 최고 성적" })
    ).toBeNull();
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
