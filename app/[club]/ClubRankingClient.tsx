"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { trackAmplitudeEvent } from "@/lib/amplitudeAnalytics";
import { buildRecent30Highlights } from "@/lib/campusRankingHighlights";
import CampusResultsBackLink, {
  getCampusResultsBackLabel,
  getCampusResultsHref,
} from "./CampusResultsBackLink";
import CampusResultUpdateLink from "./CampusResultUpdateLink";
import { getPlayerDetailPath } from "./playerPaths";
import MatchEntryDialog from "./MatchEntryDialog";
import NationalRankingBackLink from "./NationalRankingBackLink";

type Player = {
  rank: number;
  name: string;
  note: string;
  rankChange: number;
  status?: "active" | "injured" | "inactive" | "left";
  wins: number;
  losses: number;
  matches: number;
  recent5: string[];
};

type RankingSummary = {
  totalMatches: number;
  recent30Matches: number;
};

type MatchRecord = {
  date: string;
  challenger: string;
  challengerRank: number | null;
  defender: string;
  defenderRank: number | null;
  winner: string;
  score: string;
  defenseResult: string;
};

type ClubPageConfig = {
  slug: string;
  title: string;
  titleLines: string[];
  organization: string;
  subtitle: string;
  logoPath: string;
  logoAlt: string;
  apiPath: string;
};

type RankingApiResponse =
  | {
      ok: true;
      players: Player[];
      matches?: MatchRecord[];
      summary?: RankingSummary;
      detailsByPlayer: unknown;
    }
  | {
      ok: false;
      message: string;
    };

type LoadStatus = "idle" | "loading" | "success" | "error";

function isInjured(player: Player) {
  return player.status === "injured";
}

function formatLiveTime(date: Date | null) {
  if (!date) {
    return "업데이트 대기";
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}. ${month}. ${day} ${hour}:${minute}`;
}

function formatRecord(player: Player) {
  if (player.matches === 0) {
    return "0승 0패";
  }

  return `${player.wins}승 ${player.losses}패`;
}

function RecentForm({ recent5 }: { recent5: string[] }) {
  const form = recent5.slice(-5);
  const blanks = Array.from({ length: Math.max(0, 5 - form.length) });

  return (
    <div className="recent-form" aria-label={`최근 ${form.length}경기`}>
      {blanks.map((_, index) => (
        <span key={`blank-${index}`} className="form-dot is-empty" />
      ))}
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`form-dot ${result === "W" ? "is-win" : "is-loss"}`}
          title={result === "W" ? "승" : "패"}
        >
          {result}
        </span>
      ))}
    </div>
  );
}

function RankMovement({ rankChange }: { rankChange: number }) {
  if (rankChange > 0) {
    return (
      <small
        className="rank-movement is-up"
        aria-label={`지난주보다 ${rankChange}계단 상승`}
      >
        ▲ {rankChange}
      </small>
    );
  }

  if (rankChange < 0) {
    const drop = Math.abs(rankChange);

    return (
      <small
        className="rank-movement is-down"
        aria-label={`지난주보다 ${drop}계단 하락`}
      >
        ▼ {drop}
      </small>
    );
  }

  return (
    <small className="rank-movement is-steady" aria-label="지난주와 같은 순위">
      –
    </small>
  );
}

function RankingRow({
  player,
  detailHref,
  onOpen,
}: {
  player: Player;
  detailHref: string;
  onOpen: () => void;
}) {
  const injured = isInjured(player);
  const densityClass = player.rank <= 10 ? "is-featured" : "is-compact";

  return (
    <Link
      className={`ranking-row ${densityClass}`}
      href={detailHref}
      aria-label={`${player.name} 상세 전적 보기`}
      onClick={onOpen}
    >
      <div className="rank-cell">
        <span>{player.rank}</span>
        <RankMovement rankChange={player.rankChange ?? 0} />
      </div>
      <div className="player-cell">
        <div className="player-name-line">
          <strong>{player.name}</strong>
          {injured ? <span className="status-chip is-injured">부상</span> : null}
          {!injured && player.note ? (
            <span className="status-chip">{player.note}</span>
          ) : null}
        </div>
        <span className="player-sub">
          {player.matches > 0 ? `${player.matches}경기 출전` : "경기 기록 없음"}
        </span>
      </div>
      <div className="record-cell">
        <strong>{formatRecord(player)}</strong>
        <span>{player.matches}경기</span>
      </div>
      <RecentForm recent5={player.recent5} />
    </Link>
  );
}

export default function ClubRankingClient({ club }: { club: ClubPageConfig }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [summary, setSummary] = useState<RankingSummary | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [matchEntryOpen, setMatchEntryOpen] = useState(false);

  const loadRanking = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(club.apiPath, {
        cache: "no-store",
      });
      const data = (await response.json()) as RankingApiResponse;

      if (!response.ok) {
        throw new Error("랭킹 데이터를 불러오지 못했습니다.");
      }

      if (!data.ok) {
        throw new Error(data.message);
      }

      setPlayers(data.players);
      setMatches(data.matches ?? []);
      setSummary(data.summary ?? null);
      setLoadedAt(new Date());
      setStatus("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message);
      setStatus("error");
    }
  }, [club.apiPath]);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const openMatchEntry = () => {
    void trackAmplitudeEvent("Campus Match Entry Opened", {
      club_slug: club.slug,
    });
    setMatchEntryOpen(true);
  };

  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.rank - b.rank);
  }, [players]);
  const topThree = rankedPlayers.slice(0, 3);
  const podiumPlayers = [topThree[1], topThree[0], topThree[2]].filter(
    (player): player is Player => player !== undefined
  );
  const recentHighlights = useMemo(
    () => buildRecent30Highlights(players, matches),
    [matches, players]
  );

  const totalMatches = Math.floor(
    players.reduce((sum, player) => sum + player.matches, 0) / 2
  );

  const displayTotalMatches = summary?.totalMatches ?? totalMatches;
  const recent30Matches = summary?.recent30Matches ?? totalMatches;
  const isInitialLoading =
    players.length === 0 && (status === "idle" || status === "loading");

  return (
    <main className="ranking-page campus-ranking-page">
      <section className="summary-band campus-hero-band">
        <div className="summary-inner">
          <Suspense
            fallback={
              <NationalRankingBackLink
                className="campus-results-link"
                href={getCampusResultsHref(club.slug, "combined")}
                label={getCampusResultsBackLabel(club.slug)}
                showLabel
              />
            }
          >
            <CampusResultsBackLink clubSlug={club.slug} />
          </Suspense>
          <header className="topbar">
            <div className="brand-lockup">
              <span className="campus-kicker">캠퍼스 랭킹</span>
              <div className="brand-title-row">
                <Image
                  src={club.logoPath}
                  alt={club.logoAlt}
                  width={48}
                  height={48}
                  priority
                />
                <div className="brand-title-stack">
                  <h1 aria-label={club.title}>
                    {club.titleLines.map((line) => (
                      <span key={line} className="club-title-line">
                        {line}
                      </span>
                    ))}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          {!isInitialLoading && status !== "error" ? (
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="hero-copy-heading">
                  <p className="subtitle">{club.subtitle}</p>
                  <Link
                    className="campus-rules-link"
                    href={`/${club.slug}/rules`}
                    onClick={() => {
                      void trackAmplitudeEvent("Campus Rules Opened", {
                        club_slug: club.slug,
                      });
                    }}
                  >
                    운영 규칙 보기
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <div className="hero-meta-row">
                  <div className="hero-stats" aria-label="랭킹 요약">
                    <div>
                      <strong>{players.length}</strong>
                      <span>선수</span>
                    </div>
                    <div>
                      <strong>{displayTotalMatches}</strong>
                      <span>경기</span>
                    </div>
                    <div>
                      <strong>{recent30Matches}</strong>
                      <span>최근 30일</span>
                    </div>
                  </div>

                  <div className="hero-live-actions">
                    <button
                      className="match-entry-button"
                      type="button"
                      onClick={openMatchEntry}
                    >
                      경기 결과 입력
                    </button>
                    <div className="live-status-group">
                      <p
                        className="live-stamp"
                        aria-label="실시간 업데이트 시간"
                      >
                        <span className="live-indicator" aria-hidden="true" />
                        {formatLiveTime(loadedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="content-shell">
        {status === "error" ? (
          <section className="state-panel" role="alert">
            <strong>랭킹을 불러오지 못했습니다.</strong>
            <p>{errorMessage}</p>
            <button type="button" onClick={() => void loadRanking()}>
              다시 시도
            </button>
          </section>
        ) : null}

        {isInitialLoading ? (
          <section
            className="campus-ranking-loading-state"
            role="status"
            aria-live="polite"
          >
            <span className="campus-ranking-loading-indicator" aria-hidden="true" />
            <strong>랭킹 불러오는 중</strong>
          </section>
        ) : null}

        {!isInitialLoading && status !== "error" ? (
          <>
            {podiumPlayers.length > 0 ? (
              <section
                className="campus-highlight-section campus-podium-section"
                aria-label="현재 TOP 3"
              >
                <div className="campus-section-heading">
                  <div>
                    <span className="campus-section-eyebrow">
                      Current ranking
                    </span>
                    <h2>현재 TOP 3</h2>
                  </div>
                  <span className="campus-section-scope">실시간 순위</span>
                </div>

                <div
                  className={`campus-podium-grid has-${podiumPlayers.length}`}
                >
                  {podiumPlayers.map((player) => {
                    const medal =
                      player.rank === 1
                        ? "gold"
                        : player.rank === 2
                          ? "silver"
                          : "bronze";

                    return (
                      <Link
                        key={player.name}
                        className={`campus-podium-player is-${medal}`}
                        href={getPlayerDetailPath(club.slug, player.name)}
                        aria-label={`TOP 3 ${player.name} 상세 전적 보기`}
                        onClick={() => {
                          void trackAmplitudeEvent("Player Profile Opened", {
                            club_slug: club.slug,
                            rank: player.rank,
                            source: "top_three",
                          });
                        }}
                      >
                        <strong className="campus-podium-rank">
                          {player.rank}
                        </strong>
                        <b className="campus-podium-name">{player.name}</b>
                        <span className="campus-podium-record">
                          {formatRecord(player)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {recentHighlights.length > 0 ? (
              <section
                className="campus-highlight-section campus-recent-section"
                aria-label="최근 30일 기록"
              >
                <div className="campus-section-heading">
                  <div>
                    <span className="campus-section-eyebrow">
                      Recent 30 days
                    </span>
                    <h2>최근 30일 기록</h2>
                  </div>
                  <span className="campus-section-scope">오늘 기준</span>
                </div>

                <div className="campus-recent-records">
                  {recentHighlights.map((highlight) => (
                    <Link
                      key={highlight.key}
                      className="campus-recent-record-row"
                      href={getPlayerDetailPath(
                        club.slug,
                        highlight.playerName
                      )}
                      aria-label={`${highlight.label} ${highlight.playerName} 상세 전적 보기`}
                      onClick={() => {
                        void trackAmplitudeEvent("Player Profile Opened", {
                          club_slug: club.slug,
                          rank: highlight.playerRank,
                          source: "recent_30_days",
                        });
                      }}
                    >
                      <span className="campus-recent-record-label">
                        {highlight.label}
                      </span>
                      <b>{highlight.playerName}</b>
                      <strong>{highlight.valueLabel}</strong>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <Suspense
              fallback={
                <aside
                  className="campus-result-update"
                  aria-label="대회 결과 업데이트"
                >
                  <span className="campus-result-update-kicker">
                    Tournament update
                  </span>
                  <strong className="campus-result-update-title">
                    2026 하늘내린인제 결과가 반영됐어요
                  </strong>
                </aside>
              }
            >
              <CampusResultUpdateLink clubSlug={club.slug} />
            </Suspense>

            <div className="campus-ranking-heading">
              <h2 className="campus-ranking-list-title">전체 랭킹</h2>
              <Link
                className="campus-ranking-history-link"
                href={`/${club.slug}/matches`}
                aria-label="최근 경기 보기"
                onClick={() => {
                  void trackAmplitudeEvent("Campus Match History Opened", {
                    club_slug: club.slug,
                    source: "ranking_header",
                  });
                }}
              >
                최근 경기 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <section className="ranking-board" aria-label="캠퍼스 랭킹 피드">
              <div className="ranking-head">
                <span>순위</span>
                <span>선수</span>
                <span>전적</span>
                <span>최근 5경기</span>
              </div>

              {rankedPlayers.length > 0 ? (
                rankedPlayers.map((player) => (
                  <RankingRow
                    key={player.name}
                    player={player}
                    detailHref={getPlayerDetailPath(club.slug, player.name)}
                    onOpen={() => {
                      void trackAmplitudeEvent("Player Profile Opened", {
                        club_slug: club.slug,
                        rank: player.rank,
                        source: "ranking",
                      });
                    }}
                  />
                ))
              ) : (
                <div className="empty-row">등록된 선수가 없습니다.</div>
              )}
            </section>
          </>
        ) : null}
      </div>
      <MatchEntryDialog
        clubSlug={club.slug}
        open={matchEntryOpen}
        onClose={() => setMatchEntryOpen(false)}
        onRecorded={loadRanking}
      />
    </main>
  );
}
