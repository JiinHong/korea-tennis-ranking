import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ClubRankingClient from "./ClubRankingClient";

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
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("로딩 상태에서 특정 데이터 저장소 이름을 노출하지 않는다", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<ClubRankingClient club={club} />);

    expect(screen.getByText("최신 순위를 가져오고 있습니다.")).toBeDefined();
    expect(screen.queryByText(/구글 시트/)).toBeNull();
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
      name: "전국 대학 랭킹으로 돌아가기",
    });
    expect(nationalBackLink.getAttribute("href")).toBe(
      "https://koreatennisranking.com/"
    );
    expect(nationalBackLink.closest(".summary-inner")).not.toBeNull();
    expect(nationalBackLink.querySelector(".national-back-icon")).not.toBeNull();

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
      screen.getByRole("button", { name: "랭킹 새로고침" }).closest(".topbar")
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
    const activityHeading = screen.getByRole("heading", { name: "활동 피드" });
    const rankingHeading = screen.getByRole("heading", { name: "전체 랭킹" });

    expect(
      activityHeading.compareDocumentPosition(rankingHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  it("비고가 아니라 선수 상태로 부상을 표시하고 필터링한다", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "부상" }));

    expect(
      screen.getByRole("link", { name: "김도훈 상세 전적 보기" })
    ).toBeDefined();
  });

  it("최근 경기 5개와 전체 경기 더보기 링크를 보여준다", async () => {
    const matches = Array.from({ length: 6 }, (_, index) => {
      const day = index + 1;

      return {
        date: `2026. 7. ${day}`,
        challenger: `도전자${day}`,
        challengerRank: day + 1,
        defender: `방어자${day}`,
        defenderRank: day,
        winner: `방어자${day}`,
        score: `6:${day}`,
        defenseResult: "방어 성공",
      };
    });

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
          players: [],
          matches,
          detailsByPlayer: {},
        }),
      })
    );

    render(<ClubRankingClient club={club} />);

    const recentSection = await screen.findByRole("region", {
      name: "최근 경기",
    });

    expect(
      within(recentSection).getByRole("heading", { name: "최근 경기" })
    ).toBeDefined();
    expect(within(recentSection).getAllByRole("listitem")).toHaveLength(5);
    expect(within(recentSection).getByText("도전자6")).toBeDefined();
    expect(within(recentSection).queryByText("도전자1")).toBeNull();
    const matchList = within(recentSection).getByRole("list");
    const moreLink = within(recentSection).getByRole("link", {
      name: "전체 경기 더보기",
    });

    expect(matchList.nextElementSibling).toBe(moreLink);
    expect(moreLink.textContent).toBe("⋯");
    expect(moreLink.getAttribute("href")).toBe("/seoultech/matches");
  });
});
