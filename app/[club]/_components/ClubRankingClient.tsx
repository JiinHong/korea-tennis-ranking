"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { trackAmplitudeEvent } from "@/lib/analytics/amplitude";
import { buildRecent30Highlights } from "@/lib/campusRanking/highlights";
import { RANKING_MOVEMENT_WINDOW_DAYS } from "@/lib/campusRanking/movementWindow";
import CampusResultsBackLink, {
  getCampusResultsBackLabel,
  getCampusResultsHref,
} from "./CampusResultsBackLink";
import CampusResultUpdateLink, {
  CAMPUS_RESULT_UPDATE_TITLE,
} from "./CampusResultUpdateLink";
import CampusClubLogo from "./CampusClubLogo";
import { getPlayerDetailPath } from "../_lib/playerPaths";
import MatchEntryDialog from "./MatchEntryDialog";
import MatchOutcomeIcon from "./MatchOutcomeIcon";
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
  recentForm?: RecentFormResult[];
};

type RecentFormResult = {
  result: "W" | "L";
  season: string;
  isHistorical: boolean;
};

type SeasonSummary = {
  name: string;
  matches: number;
  isCurrent: boolean;
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
      seasonSummaries?: SeasonSummary[];
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

function parseMatchDate(dateText: string) {
  const [year, month, day] = dateText.match(/\d+/g)?.map(Number) ?? [];

  if (!year || !month || !day) {
    return null;
  }

  return {
    label: `${month}/${day}`,
    sortKey: year * 10_000 + month * 100 + day,
  };
}

function buildLatestMatchDates(matches: MatchRecord[]) {
  const latestByPlayer = new Map<
    string,
    { label: string; sortKey: number }
  >();

  for (const match of matches) {
    const parsedDate = parseMatchDate(match.date);

    if (!parsedDate) {
      continue;
    }

    for (const playerName of [match.challenger, match.defender]) {
      const previous = latestByPlayer.get(playerName);

      if (!previous || parsedDate.sortKey > previous.sortKey) {
        latestByPlayer.set(playerName, parsedDate);
      }
    }
  }

  return latestByPlayer;
}

function formatPlayerActivity(
  player: Player,
  latestMatchDate: string | null
) {
  if (player.matches === 0) {
    return "경기 기록 없음";
  }

  if (latestMatchDate) {
    return `최근 경기 ${latestMatchDate}`;
  }

  return "최근 경기일 확인 중";
}

function HistoricalFormResult({ entry }: { entry: RecentFormResult }) {
  const tooltipId = useId();
  const resultLabel = entry.result === "W" ? "승리" : "패배";
  const label = `${entry.season} · ${resultLabel}`;

  return (
    <span
      aria-describedby={tooltipId}
      aria-label={label}
      className="historical-form-result"
      role="img"
      tabIndex={0}
    >
      <span aria-hidden="true" className="historical-form-icon">
        <MatchOutcomeIcon className="form-dot" result={entry.result} />
      </span>
      <span className="historical-form-tooltip" id={tooltipId} role="tooltip">
        {label}
      </span>
    </span>
  );
}

function RecentForm({
  recent5,
  recentForm,
}: {
  recent5: string[];
  recentForm?: RecentFormResult[];
}) {
  const form =
    recentForm?.slice(-5) ??
    recent5.slice(-5).map((result) => ({
      result: result === "W" ? ("W" as const) : ("L" as const),
      season: "",
      isHistorical: false,
    }));
  const blanks = Array.from({ length: Math.max(0, 5 - form.length) });

  return (
    <div className="recent-form" aria-label={`최근 ${form.length}경기`}>
      {blanks.map((_, index) => (
        <span key={`blank-${index}`} className="form-dot is-empty" />
      ))}
      {form.map((entry, index) =>
        entry.isHistorical ? (
          <HistoricalFormResult
            entry={entry}
            key={`${entry.season}-${entry.result}-${index}`}
          />
        ) : (
          <MatchOutcomeIcon
            className="form-dot"
            key={`${entry.result}-${index}`}
            result={entry.result}
          />
        )
      )}
    </div>
  );
}

function RankMovement({ rankChange }: { rankChange: number }) {
  if (rankChange > 0) {
    return (
      <small
        className="rank-movement is-up"
        aria-label={`최근 ${RANKING_MOVEMENT_WINDOW_DAYS}일 동안 ${rankChange}계단 상승`}
      >
        ↑ {rankChange}
      </small>
    );
  }

  if (rankChange < 0) {
    const drop = Math.abs(rankChange);

    return (
      <small
        className="rank-movement is-down"
        aria-label={`최근 ${RANKING_MOVEMENT_WINDOW_DAYS}일 동안 ${drop}계단 하락`}
      >
        ↓ {drop}
      </small>
    );
  }

  return null;
}

function RankingRow({
  player,
  latestMatchDate,
  detailHref,
  onOpen,
}: {
  player: Player;
  latestMatchDate: string | null;
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
        {player.matches > 0 ? (
          <RankMovement rankChange={player.rankChange ?? 0} />
        ) : null}
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
          {formatPlayerActivity(player, latestMatchDate)}
        </span>
      </div>
      <div className="record-cell">
        <strong>{formatRecord(player)}</strong>
        <span>{player.matches}경기</span>
      </div>
      <RecentForm recent5={player.recent5} recentForm={player.recentForm} />
      <span aria-hidden="true" className="campus-ranking-row-chevron">
        <ChevronRight />
      </span>
    </Link>
  );
}

export default function ClubRankingClient({ club }: { club: ClubPageConfig }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [summary, setSummary] = useState<RankingSummary | null>(null);
  const [seasonSummaries, setSeasonSummaries] = useState<SeasonSummary[]>([]);
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
      setSeasonSummaries(data.seasonSummaries ?? []);
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
  const latestMatchDates = useMemo(
    () => buildLatestMatchDates(matches),
    [matches]
  );
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
  const currentSeason = seasonSummaries.find((season) => season.isCurrent);
  const historicalSeasons = seasonSummaries
    .filter((season) => !season.isCurrent)
    .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
  const currentMatchesLabel =
    currentSeason && currentSeason.name !== "현재"
      ? `${currentSeason.name} 경기`
      : "경기";
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
                <CampusClubLogo club={club} />
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
                  <div className="campus-subtitle-group">
                    <p className="subtitle">{club.subtitle}</p>
                    {historicalSeasons.length > 0 ? (
                      <p className="campus-season-history">
                        {historicalSeasons
                          .map(
                            (season) => `${season.name} ${season.matches}경기`
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
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
                      <span>{currentMatchesLabel}</span>
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
            <div className="campus-ranking-loading-copy">
              <span
                className="campus-ranking-loading-indicator"
                aria-hidden="true"
              />
              <div>
                <strong>실시간 순위를 불러오고 있어요</strong>
                <p>잠시만 기다려주세요</p>
              </div>
            </div>

            <div className="campus-ranking-loading-list" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div className="campus-ranking-loading-row" key={row}>
                  <span className="campus-ranking-skeleton-rank" />
                  <span className="campus-ranking-skeleton-player">
                    <span />
                    <span />
                  </span>
                  <span className="campus-ranking-skeleton-record">
                    <span />
                    <span />
                  </span>
                </div>
              ))}
            </div>
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
                    {CAMPUS_RESULT_UPDATE_TITLE}
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
                    latestMatchDate={
                      latestMatchDates.get(player.name)?.label ?? null
                    }
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
