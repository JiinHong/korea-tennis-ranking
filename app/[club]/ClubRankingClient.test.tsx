import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ClubRankingClient from "./ClubRankingClient";

const analytics = vi.hoisted(() => ({
  trackAmplitudeEvent: vi.fn(() => Promise.resolve()),
}));
const navigation = vi.hoisted(() => ({
  query: "",
}));

vi.mock("@/lib/amplitudeAnalytics", () => analytics);
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

const club = {
  slug: "seoultech",
  title: "서울과학기술대학교 테니스 단식 랭킹",
  titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
  organization: "서울과학기술대학교 테니스",
  subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
  logoPath: "/seoultech-symbol.png",
  logoAlt: "서울과학기술대학교 로고",
  apiPath: "/api/clubs/seoultech/ranking",
};

describe("ClubRankingClient", () => {
  beforeEach(() => {
    analytics.trackAmplitudeEvent.mockClear();
    navigation.query = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("초기 로딩 중에는 브랜드와 랭킹 스켈레톤만 보여준다", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    const { container } = render(<ClubRankingClient club={club} />);

    expect(
      screen.getByRole("heading", {
        name: "서울과학기술대학교 테니스 단식 랭킹",
      })
    ).toBeDefined();
    expect(
      screen.getByRole("img", { name: "서울과학기술대학교 로고" })
    ).toBeDefined();
    expect(
      screen.getByText("실시간 순위를 불러오고 있어요")
    ).toBeDefined();
    expect(screen.getByText("잠시만 기다려주세요")).toBeDefined();
    expect(
      container.querySelectorAll(".campus-ranking-loading-row")
    ).toHaveLength(3);
    expect(screen.queryByLabelText("랭킹 요약")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "경기 결과 입력" })
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "운영 규칙 보기" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "전체 랭킹" })).toBeNull();
    expect(screen.queryByText("등록된 선수가 없습니다.")).toBeNull();
    expect(screen.queryByText(/구글 시트/)).toBeNull();
  });

  it("서울과기대 랭킹의 뒤로가기는 느티나무 대회 성적으로 이동한다", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<ClubRankingClient club={club} />);

    expect(
      screen
        .getByRole("link", { name: "느티나무 대회 성적 보러가기" })
        .getAttribute("href")
    ).toBe("/clubs/seoultech-neutinamu?gender=combined");
  });

  it("PETC 랭킹은 진입했던 여자부 대회 성적으로 돌아간다", () => {
    navigation.query = "fromGender=women";
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(
      <ClubRankingClient
        club={{
          ...club,
          slug: "petc",
          title: "고려대학교 체육교육과 PETC 테니스 단식 랭킹",
          titleLines: ["고려대학교 체육교육과 PETC", "테니스 단식 랭킹"],
        }}
      />
    );

    expect(
      screen
        .getByRole("link", { name: "PETC 대회 성적 보러가기" })
        .getAttribute("href")
    ).toBe("/clubs/korea-petc?gender=women");
  });

  it("동아리별 최신 대회 결과 안내를 성별을 유지한 링크로 보여준다", async () => {
    navigation.query = "fromGender=women";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [],
          detailsByPlayer: {},
        }),
      })
    );

    const { rerender } = render(<ClubRankingClient club={club} />);

    const seoultechLink = await screen.findByRole("link", {
      name: "느티나무 대회 기록 확인하기",
    });
    expect(screen.getByText("2026 하늘내린인제 결과가 반영됐어요")).toBeDefined();
    expect(seoultechLink.getAttribute("href")).toBe(
      "/clubs/seoultech-neutinamu?gender=women"
    );

    rerender(
      <ClubRankingClient
        club={{
          ...club,
          slug: "petc",
          title: "고려대학교 체육교육과 PETC 테니스 단식 랭킹",
          titleLines: ["고려대학교 체육교육과 PETC", "테니스 단식 랭킹"],
        }}
      />
    );

    expect(
      await screen.findByRole("link", {
        name: "PETC 대회 기록 확인하기",
      })
    ).toBeDefined();
  });

  it("경기가 있는 선수의 최근 30일 순위 변동만 랭킹 옆에 표시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            {
              rank: 1,
              name: "오준석",
              note: "",
              rankChange: 2,
              wins: 1,
              losses: 0,
              matches: 1,
              recent5: ["W"],
            },
            {
              rank: 2,
              name: "김도훈",
              note: "",
              rankChange: -1,
              wins: 0,
              losses: 1,
              matches: 1,
              recent5: ["L"],
            },
            {
              rank: 3,
              name: "박정용",
              note: "",
              rankChange: -3,
              wins: 0,
              losses: 0,
              matches: 0,
              recent5: [],
            },
          ],
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    expect(
      (await screen.findByLabelText("최근 30일 동안 2계단 상승")).textContent
    ).toBe("↑ 2");
    expect(
      screen.getByLabelText("최근 30일 동안 1계단 하락").textContent
    ).toBe("↓ 1");
    expect(
      screen.queryByLabelText("최근 30일 동안 3계단 하락")
    ).toBeNull();
    expect(screen.queryByLabelText("지난주와 같은 순위")).toBeNull();
  });

  it("운영 규칙 문서로 이동하는 링크와 클릭 로그를 제공한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            players: [],
            detailsByPlayer: {},
          }),
        })
      )
    );

    render(<ClubRankingClient club={club} />);

    const rulesLink = await screen.findByRole("link", {
      name: "운영 규칙 보기",
    });
    rulesLink.addEventListener("click", (event) => event.preventDefault());

    expect(rulesLink.getAttribute("href")).toBe("/seoultech/rules");

    fireEvent.click(rulesLink);

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Campus Rules Opened",
      { club_slug: "seoultech" }
    );
  });

  it("랭킹의 핵심 조작을 동아리 정보와 함께 기록한다", async () => {
    const rankingResponse = {
      ok: true,
      json: async () => ({
        ok: true,
        players: [
          {
            rank: 1,
            name: "오준석",
            note: "",
            wins: 1,
            losses: 0,
            matches: 1,
            recent5: ["W"],
          },
        ],
        detailsByPlayer: {},
      }),
    };
    const matchOptionsResponse = {
      ok: true,
      json: async () => ({
        ok: true,
        players: [],
        challengeRange: 4,
        rematchCooldowns: [],
      }),
    };
    const fetchMock = vi.fn((input: string | URL | Request) =>
      Promise.resolve(
        String(input).endsWith("/matches")
          ? matchOptionsResponse
          : rankingResponse
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubRankingClient club={club} />);

    const playerLink = await screen.findByRole("link", {
      name: "오준석 상세 전적 보기",
    });
    playerLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(screen.getByRole("button", { name: "경기 결과 입력" }));
    fireEvent.click(playerLink);

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Campus Match Entry Opened",
      { club_slug: "seoultech" }
    );
    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Player Profile Opened",
      { club_slug: "seoultech", rank: 1, source: "ranking" }
    );
  });

  it("10위까지는 큰 랭킹 행으로, 11위부터는 compact 행으로 보여준다", async () => {
    const players = Array.from({ length: 12 }, (_, index) => {
      const rank = index + 1;

      return {
        rank,
        name: `${rank}위 선수`,
        note: "",
        wins: 0,
        losses: 0,
        matches: 0,
        recent5: [],
      };
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players,
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const tenthRow = await screen.findByRole("link", {
      name: "10위 선수 상세 전적 보기",
    });
    const eleventhRow = await screen.findByRole("link", {
      name: "11위 선수 상세 전적 보기",
    });

    expect(tenthRow.classList.contains("is-featured")).toBe(true);
    expect(tenthRow.classList.contains("is-compact")).toBe(false);
    expect(eleventhRow.classList.contains("is-compact")).toBe(true);
    expect(eleventhRow.classList.contains("is-featured")).toBe(false);
    expect(tenthRow.querySelectorAll(".form-dot")).toHaveLength(5);
    expect(eleventhRow.querySelectorAll(".form-dot")).toHaveLength(5);
  });

  it("이름 아래 중복 경기 수 대신 선수의 가장 최근 경기일을 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            {
              rank: 11,
              name: "배진욱",
              note: "",
              wins: 1,
              losses: 1,
              matches: 2,
              recent5: ["W", "L"],
            },
            {
              rank: 12,
              name: "홍순범",
              note: "",
              wins: 0,
              losses: 0,
              matches: 0,
              recent5: [],
            },
          ],
          matches: [
            {
              date: "2026. 7. 29",
              challenger: "배진욱",
              challengerRank: 11,
              defender: "조인석",
              defenderRank: 9,
              winner: "배진욱",
              score: "6:4",
              defenseResult: "방어 실패",
            },
            {
              date: "2026. 7. 2",
              challenger: "홍순범",
              challengerRank: 15,
              defender: "배진욱",
              defenderRank: 13,
              winner: "홍순범",
              score: "6:3",
              defenseResult: "방어 실패",
            },
          ],
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const playedRow = await screen.findByRole("link", {
      name: "배진욱 상세 전적 보기",
    });
    const idleRow = screen.getByRole("link", {
      name: "홍순범 상세 전적 보기",
    });

    expect(within(playedRow).getByText("최근 경기 7/29")).toBeDefined();
    expect(within(playedRow).queryByText("2경기 출전")).toBeNull();
    expect(within(playedRow).getByText("2경기")).toBeDefined();
    expect(playedRow.querySelectorAll(".form-dot")).toHaveLength(5);
    expect(within(idleRow).getByText("경기 기록 없음")).toBeDefined();
  });

  it("캠퍼스 피드형 랭킹 화면 언어를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          summary: {
            totalMatches: 1,
            recent30Matches: 1,
          },
          players: [
            {
              rank: 1,
              name: "오준석",
              note: "",
              wins: 0,
              losses: 0,
              matches: 0,
              recent5: [],
            },
            {
              rank: 7,
              name: "박종건",
              note: "",
              wins: 1,
              losses: 0,
              matches: 1,
              recent5: ["W"],
            },
          ],
          detailsByPlayer: {
            오준석: {
              name: "오준석",
              rank: 1,
              note: "",
              wins: 2,
              losses: 1,
              matches: 3,
              winRate: 67,
              challengerRecord: {
                wins: 0,
                losses: 0,
                matches: 0,
              },
              defenderRecord: {
                wins: 2,
                losses: 1,
                matches: 3,
              },
              seasonRecords: [
                {
                  season: "시즌3",
                  wins: 1,
                  losses: 1,
                  matches: 2,
                  winRate: 50,
                },
                {
                  season: "시즌1",
                  wins: 1,
                  losses: 0,
                  matches: 1,
                  winRate: 100,
                },
              ],
              opponentRecords: [
                {
                  opponent: "김도훈",
                  wins: 2,
                  losses: 1,
                  matches: 3,
                  winRate: 67,
                  latestDate: "2026. 7. 2",
                  latestScore: "6:2",
                  latestResult: "W",
                },
              ],
              recentMatches: [
                {
                  date: "2026. 7. 2",
                  season: "시즌3",
                  opponent: "김도훈",
                  result: "W",
                  score: "6:2",
                  role: "방어자",
                  defenseResult: "방어 성공",
                },
              ],
            },
            박종건: {
              name: "박종건",
              rank: 7,
              note: "",
              wins: 1,
              losses: 0,
              matches: 1,
              winRate: 100,
              challengerRecord: {
                wins: 0,
                losses: 0,
                matches: 0,
              },
              defenderRecord: {
                wins: 1,
                losses: 0,
                matches: 1,
              },
              seasonRecords: [
                {
                  season: "시즌3",
                  wins: 1,
                  losses: 0,
                  matches: 1,
                  winRate: 100,
                },
              ],
              opponentRecords: [],
              recentMatches: [],
            },
          },
        }),
      })
    );

    const { container } = render(<ClubRankingClient club={club} />);

    const nationalBackLink = screen.getByRole("link", {
      name: "느티나무 대회 성적 보러가기",
    });
    expect(nationalBackLink.getAttribute("href")).toBe(
      "/clubs/seoultech-neutinamu?gender=combined"
    );
    expect(nationalBackLink.classList.contains("campus-results-link")).toBe(true);
    expect(nationalBackLink.classList.contains("is-forward")).toBe(false);
    expect(nationalBackLink.closest(".summary-inner")).not.toBeNull();
    expect(nationalBackLink.querySelector(".national-back-icon")).not.toBeNull();
    expect(nationalBackLink.querySelector(".national-back-label")?.textContent).toBe(
      "느티나무 대회 성적 보러가기"
    );

    const campusKicker = screen.getByText("캠퍼스 랭킹");
    expect(campusKicker).toBeDefined();
    expect(campusKicker.closest(".brand-title-stack")).toBeNull();
    expect(campusKicker.nextElementSibling?.classList.contains("brand-title-row")).toBe(
      true
    );
    expect(
      screen.getByRole("heading", {
        name: "서울과학기술대학교 테니스 단식 랭킹",
      })
    ).toBeDefined();
    expect(container.querySelector('img[src="/court-mark.svg"]')).toBeNull();
    expect(
      screen.getByRole("img", { name: "서울과학기술대학교 로고" })
    ).toBeDefined();
    expect(
      container.querySelector('img[src*="seoultech-symbol"]')
    ).toBeDefined();
    expect(container.querySelector(".brand-title-row")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll(".club-title-line")).map(
        (line) => line.textContent
      )
    ).toEqual(["서울과학기술대학교", "테니스 단식 랭킹"]);
    expect(screen.queryByText(/마지막 업데이트/)).toBeNull();
    const liveStamp = await screen.findByLabelText("실시간 업데이트 시간");
    expect(liveStamp.textContent).toMatch(/\d{4}\. \d{1,2}\. \d{1,2} \d{2}:\d{2}/);
    expect(liveStamp.querySelector(".live-indicator")).not.toBeNull();
    expect(screen.getByText("최근 30일")).toBeDefined();
    const heroStats = container.querySelector(".hero-stats");
    expect(heroStats?.closest(".hero-meta-row")).not.toBeNull();
    expect(container.querySelector(".hero-live-actions")).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "랭킹 새로고침" })
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "경기 결과 입력" })
    ).toBeDefined();
    expect(
      screen.queryByRole("region", { name: "상위 랭킹" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "오늘의 랭킹" })
    ).toBeNull();
    expect((await screen.findAllByText("박종건")).length).toBeGreaterThan(0);
    const topThreeHeading = screen.getByRole("heading", {
      name: "현재 TOP 3",
    });
    const rankingHeading = screen.getByRole("heading", { name: "전체 랭킹" });

    expect(rankingHeading.classList.contains("campus-ranking-list-title")).toBe(
      true
    );
    expect(screen.queryByRole("region", { name: "랭킹 필터" })).toBeNull();
    expect(screen.queryByText("50명이 표시되고 있습니다.")).toBeNull();
    expect(screen.queryByText("선수 검색")).toBeNull();
    expect(screen.queryByPlaceholderText("이름 또는 비고")).toBeNull();
    expect(screen.queryByRole("button", { name: "경기 있음" })).toBeNull();
    expect(screen.queryByRole("button", { name: "부상" })).toBeNull();
    expect(
      topThreeHeading.compareDocumentPosition(rankingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "활동 피드" })).toBeNull();
    expect(
      screen.getByRole("region", { name: "캠퍼스 랭킹 피드" })
    ).toBeDefined();
  });

  it("선수 카드는 현재 화면에 패널을 열지 않고 상세 페이지 링크로 이동한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            {
              rank: 1,
              name: "오준석",
              note: "",
              wins: 1,
              losses: 1,
              matches: 2,
              recent5: ["W", "L"],
            },
          ],
          detailsByPlayer: {
            오준석: {
              name: "오준석",
              rank: 1,
              note: "",
              wins: 2,
              losses: 1,
              matches: 3,
              winRate: 67,
              challengerRecord: {
                wins: 0,
                losses: 0,
                matches: 0,
              },
              defenderRecord: {
                wins: 2,
                losses: 1,
                matches: 3,
              },
              seasonRecords: [
                {
                  season: "시즌3",
                  wins: 1,
                  losses: 1,
                  matches: 2,
                  winRate: 50,
                },
                {
                  season: "시즌1",
                  wins: 1,
                  losses: 0,
                  matches: 1,
                  winRate: 100,
                },
              ],
              opponentRecords: [
                {
                  opponent: "김도훈",
                  wins: 2,
                  losses: 1,
                  matches: 3,
                  winRate: 67,
                  latestDate: "2026. 7. 2",
                  latestScore: "6:2",
                  latestResult: "W",
                },
              ],
              recentMatches: [
                {
                  date: "2026. 7. 2",
                  season: "시즌3",
                  opponent: "김도훈",
                  result: "W",
                  score: "6:2",
                  role: "방어자",
                  defenseResult: "방어 성공",
                },
              ],
            },
          },
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const playerLink = await screen.findByRole("link", {
      name: "오준석 상세 전적 보기",
    });

    expect(decodeURIComponent(playerLink.getAttribute("href") ?? "")).toBe(
      "/seoultech/players/오준석"
    );
    expect(
      screen.queryByRole("region", { name: "오준석 상세 전적" })
    ).toBeNull();
  });

  it("비고가 아니라 선수 상태로 부상을 표시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          players: [
            {
              rank: 2,
              name: "김도훈",
              note: "왼손잡이",
              status: "injured",
              wins: 0,
              losses: 0,
              matches: 0,
              recent5: [],
            },
          ],
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const playerLink = await screen.findByRole("link", {
      name: "김도훈 상세 전적 보기",
    });
    expect(within(playerLink).getByText("부상")).toBeDefined();
  });

  it("TOP 3, 최근 30일 기록, 대회 결과 안내, 전체 랭킹을 순서대로 보여준다", async () => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
    });
    vi.setSystemTime(new Date("2026-07-29T12:00:00+09:00"));

    const players = [
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 3,
        losses: 0,
        matches: 3,
        recent5: ["W", "W", "W"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 1,
        losses: 1,
        matches: 2,
        recent5: ["L", "W"],
      },
      {
        rank: 3,
        name: "박정용",
        note: "",
        wins: 2,
        losses: 1,
        matches: 3,
        recent5: ["L", "W", "W"],
      },
      {
        rank: 4,
        name: "이민우",
        note: "",
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
    ];
    const matches = [
      {
        date: "2026. 7. 29",
        challenger: "김도훈",
        challengerRank: 2,
        defender: "오준석",
        defenderRank: 1,
        winner: "오준석",
        score: "6:3",
        defenseResult: "방어 성공",
      },
      {
        date: "2026. 7. 20",
        challenger: "박정용",
        challengerRank: 3,
        defender: "김도훈",
        defenderRank: 2,
        winner: "김도훈",
        score: "6:4",
        defenseResult: "방어 성공",
      },
      {
        date: "2026. 7. 10",
        challenger: "박정용",
        challengerRank: 3,
        defender: "오준석",
        defenderRank: 1,
        winner: "박정용",
        score: "6:5",
        defenseResult: "방어 실패",
      },
      {
        date: "2026. 6. 29",
        challenger: "이민우",
        challengerRank: 4,
        defender: "박정용",
        defenderRank: 3,
        winner: "박정용",
        score: "6:2",
        defenseResult: "방어 성공",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          summary: {
            totalMatches: 6,
            recent30Matches: 6,
          },
          players,
          matches,
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const topThreeSection = await screen.findByRole("region", {
      name: "현재 TOP 3",
    });
    const podiumPlayers = within(topThreeSection).getAllByRole("link");
    expect(
      podiumPlayers.map((playerLink) =>
        playerLink.querySelector(".campus-podium-name")?.textContent?.trim()
      )
    ).toEqual(["김도훈", "오준석", "박정용"]);

    const recentRecords = screen.getByRole("region", {
      name: "최근 30일 기록",
    });
    expect(within(recentRecords).getByText("최다 출전")).toBeDefined();
    expect(within(recentRecords).getByText("최다 승리")).toBeDefined();
    expect(within(recentRecords).getByText("최다 방어")).toBeDefined();
    expect(within(recentRecords).getAllByText("박정용")).toHaveLength(2);
    expect(within(recentRecords).getByText("3경기")).toBeDefined();
    expect(within(recentRecords).getByText("2승")).toBeDefined();
    expect(within(recentRecords).getByText("1회")).toBeDefined();

    const rankingHeading = screen.getByRole("heading", { name: "전체 랭킹" });
    const resultUpdateLink = screen.getByRole("link", {
      name: "느티나무 대회 기록 확인하기",
    });
    const resultUpdate = resultUpdateLink.closest("aside");
    const historyLink = screen.getByRole("link", { name: "최근 경기 보기" });
    historyLink.addEventListener("click", (event) => event.preventDefault());

    expect(
      topThreeSection.compareDocumentPosition(recentRecords) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      recentRecords.compareDocumentPosition(rankingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(resultUpdate).not.toBeNull();
    expect(
      recentRecords.compareDocumentPosition(resultUpdate as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      (resultUpdate as Node).compareDocumentPosition(rankingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(historyLink.getAttribute("href")).toBe("/seoultech/matches");
    expect(historyLink.closest(".campus-ranking-heading")).not.toBeNull();
    expect(screen.queryByRole("region", { name: "최근 경기" })).toBeNull();

    fireEvent.click(historyLink);

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Campus Match History Opened",
      { club_slug: "seoultech", source: "ranking_header" }
    );
  });
});
