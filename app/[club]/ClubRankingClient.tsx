"use client";

import type { PlayerDetail } from "@/lib/playerDetails";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Player = {
  rank: number;
  name: string;
  note: string;
  wins: number;
  losses: number;
  matches: number;
  recent5: string[];
};

type ClubPageConfig = {
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
      detailsByPlayer: Record<string, PlayerDetail>;
    }
  | {
      ok: false;
      message: string;
    };

type LoadStatus = "idle" | "loading" | "success" | "error";

const filters = [
  { id: "all", label: "전체" },
  { id: "active", label: "경기 있음" },
  { id: "injured", label: "부상" },
] as const;

type RankingFilter = (typeof filters)[number]["id"];

function isInjured(note: string) {
  return note.includes("부상") || note.toLowerCase().includes("injury");
}

function formatLoadedAt(date: Date | null) {
  if (!date) {
    return "업데이트 대기";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRecord(player: Player) {
  if (player.matches === 0) {
    return "0승 0패";
  }

  return `${player.wins}승 ${player.losses}패`;
}

function formatSummary(wins: number, losses: number) {
  return `${wins}승 ${losses}패`;
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

function RankingRow({
  player,
  selected,
  onSelect,
}: {
  player: Player;
  selected: boolean;
  onSelect: (playerName: string) => void;
}) {
  const injured = isInjured(player.note);
  const densityClass = player.rank <= 10 ? "is-featured" : "is-compact";

  return (
    <button
      className={`ranking-row ${densityClass} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-label={`${player.name} 상세 전적 보기`}
      onClick={() => onSelect(player.name)}
    >
      <div className="rank-cell">
        <span>{player.rank}</span>
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
    </button>
  );
}

function PlayerDetailPanel({
  detail,
  onClose,
}: {
  detail: PlayerDetail;
  onClose: () => void;
}) {
  const topOpponents = detail.opponentRecords.slice(0, 5);
  const recentMatches = detail.recentMatches.slice(0, 6);

  return (
    <section
      className="player-detail-panel"
      aria-label={`${detail.name} 상세 전적`}
    >
      <header className="player-detail-header">
        <div>
          <span className="detail-rank">{detail.rank}위</span>
          <h2>{detail.name}</h2>
          <p>통산 {formatSummary(detail.wins, detail.losses)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="선수 상세 닫기">
          ×
        </button>
      </header>

      <div className="detail-metrics" aria-label="선수 통산 요약">
        <div>
          <strong>{detail.matches}</strong>
          <span>통산 경기</span>
        </div>
        <div>
          <strong>{detail.winRate}%</strong>
          <span>승률</span>
        </div>
        <div>
          <strong>
            {detail.defenderRecord.wins}/{detail.defenderRecord.matches}
          </strong>
          <span>방어 성공</span>
        </div>
        <div>
          <strong>
            {detail.challengerRecord.wins}/{detail.challengerRecord.matches}
          </strong>
          <span>도전 성공</span>
        </div>
      </div>

      <div className="detail-grid">
        <section className="detail-section" aria-label="시즌별 전적">
          <div className="detail-section-title">
            <span>Season</span>
            <h3>시즌별 전적</h3>
          </div>
          {detail.seasonRecords.length > 0 ? (
            <div className="season-record-list">
              {detail.seasonRecords.map((record) => (
                <div key={record.season} className="season-record-item">
                  <strong>{record.season}</strong>
                  <span>
                    {formatSummary(record.wins, record.losses)} ·{" "}
                    {record.winRate}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-empty">아직 기록된 경기가 없습니다.</p>
          )}
        </section>

        <section className="detail-section" aria-label="상대별 전적">
          <div className="detail-section-title">
            <span>Head to head</span>
            <h3>상대별 전적</h3>
          </div>
          {topOpponents.length > 0 ? (
            <div className="opponent-record-list">
              {topOpponents.map((record) => (
                <div key={record.opponent} className="opponent-record-item">
                  <div>
                    <strong>{record.opponent}</strong>
                    <span>
                      최근 {record.latestDate} · {record.latestScore}
                    </span>
                  </div>
                  <em>
                    {formatSummary(record.wins, record.losses)} ·{" "}
                    {record.winRate}%
                  </em>
                </div>
              ))}
            </div>
          ) : (
            <p className="detail-empty">상대별 전적이 없습니다.</p>
          )}
        </section>
      </div>

      <section className="detail-section recent-detail-section">
        <div className="detail-section-title">
          <span>Recent</span>
          <h3>최근 경기</h3>
        </div>
        {recentMatches.length > 0 ? (
          <div className="recent-match-list">
            {recentMatches.map((match, index) => (
              <div
                key={`${match.date}-${match.opponent}-${index}`}
                className="recent-match-item"
              >
                <span
                  className={`result-pill ${
                    match.result === "W" ? "is-win" : "is-loss"
                  }`}
                >
                  {match.result === "W" ? "승" : "패"}
                </span>
                <div>
                  <strong>{match.opponent}</strong>
                  <span>
                    {match.season} · {match.date} · {match.role} ·{" "}
                    {match.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-empty">최근 경기 기록이 없습니다.</p>
        )}
      </section>
    </section>
  );
}

export default function ClubRankingClient({ club }: { club: ClubPageConfig }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [detailsByPlayer, setDetailsByPlayer] = useState<
    Record<string, PlayerDetail>
  >({});
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RankingFilter>("all");
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

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
      setDetailsByPlayer(data.detailsByPlayer);
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

  const rankedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.rank - b.rank);
  }, [players]);

  const topPlayers = rankedPlayers.slice(0, 3);

  const totalMatches = Math.floor(
    players.reduce((sum, player) => sum + player.matches, 0) / 2
  );

  const activePlayers = players.filter((player) => player.matches > 0).length;

  const filteredPlayers = useMemo(() => {
    const trimmedQuery = query.trim();

    return rankedPlayers.filter((player) => {
      const matchesQuery =
        trimmedQuery.length === 0 ||
        player.name.includes(trimmedQuery) ||
        player.note.includes(trimmedQuery);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && player.matches > 0) ||
        (filter === "injured" && isInjured(player.note));

      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rankedPlayers]);

  const hotPlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.matches > 0)
      .sort((a, b) => b.matches - a.matches || a.rank - b.rank)
      .slice(0, 4);
  }, [players]);

  const selectedDetail = selectedPlayerName
    ? detailsByPlayer[selectedPlayerName]
    : null;

  return (
    <main className="ranking-page campus-ranking-page">
      <section className="summary-band campus-hero-band">
        <div className="summary-inner">
          <header className="topbar">
            <div className="brand-lockup">
              <Image
                src={club.logoPath}
                alt={club.logoAlt}
                width={48}
                height={48}
                priority
              />
              <div>
                <span className="campus-kicker">캠퍼스 랭킹</span>
                <h1 aria-label={club.title}>
                  {club.titleLines.map((line) => (
                    <span key={line} className="club-title-line">
                      {line}
                    </span>
                  ))}
                </h1>
              </div>
            </div>
          </header>

          <div className="hero-grid">
            <div className="hero-copy">
              <p className="subtitle">{club.subtitle}</p>
              <div className="hero-stats" aria-label="랭킹 요약">
                <div>
                  <strong>{players.length}</strong>
                  <span>선수</span>
                </div>
                <div>
                  <strong>{totalMatches}</strong>
                  <span>경기</span>
                </div>
                <div>
                  <strong>{activePlayers}</strong>
                  <span>출전 선수</span>
                </div>
              </div>
              <div className="update-row">
                <p className="live-stamp">
                  <span />
                  마지막 업데이트 {formatLoadedAt(loadedAt)}
                </p>
                <button
                  className="refresh-button"
                  type="button"
                  onClick={loadRanking}
                  disabled={status === "loading"}
                  aria-label="랭킹 새로고침"
                >
                  <span aria-hidden="true">↻</span>
                  {status === "loading" ? "불러오는 중" : "새로고침"}
                </button>
              </div>
            </div>

            <section className="campus-top-feed" aria-label="상위 랭킹">
              <div className="campus-feed-heading">
                <span>Top board</span>
                <h2>오늘의 랭킹</h2>
              </div>
              {topPlayers.map((player) => (
                <button
                  key={player.name}
                  className="campus-top-card"
                  type="button"
                  aria-label={`상위 랭킹 ${player.name} 상세 전적 보기`}
                  onClick={() => setSelectedPlayerName(player.name)}
                >
                  <span className="podium-rank">{player.rank}위</span>
                  <div>
                    <strong>{player.name}</strong>
                    <span>{formatRecord(player)}</span>
                  </div>
                </button>
              ))}
            </section>
          </div>
        </div>
      </section>

      <div className="content-shell">
        {status === "error" ? (
          <section className="state-panel" role="alert">
            <strong>랭킹을 불러오지 못했습니다.</strong>
            <p>{errorMessage}</p>
            <button type="button" onClick={loadRanking}>
              다시 시도
            </button>
          </section>
        ) : null}

        {status === "loading" && players.length === 0 ? (
          <section className="state-panel">
            <strong>랭킹 불러오는 중</strong>
            <p>구글 시트에서 최신 순위를 가져오고 있습니다.</p>
          </section>
        ) : null}

        {status !== "error" ? (
          <>
            <section className="toolbar-section" aria-label="랭킹 필터">
              <div>
                <h2>전체 랭킹</h2>
                <p>{filteredPlayers.length}명이 표시되고 있습니다.</p>
              </div>

              <div className="toolbar-controls">
                <label className="search-field">
                  <span>선수 검색</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="이름 또는 비고"
                  />
                </label>

                <div className="segment-control" aria-label="랭킹 보기 방식">
                  {filters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {hotPlayers.length > 0 ? (
              <section className="activity-strip" aria-label="활동 선수">
                <div className="activity-heading">
                  <span>Campus feed</span>
                  <h2>활동 피드</h2>
                </div>
                {hotPlayers.map((player) => (
                  <button
                    key={player.name}
                    className="activity-card"
                    type="button"
                    aria-label={`활동 선수 ${player.name} 상세 전적 보기`}
                    onClick={() => setSelectedPlayerName(player.name)}
                  >
                    <span>{player.rank}위</span>
                    <strong>{player.name}</strong>
                    <em>{player.matches}경기</em>
                  </button>
                ))}
              </section>
            ) : null}

            {selectedDetail ? (
              <PlayerDetailPanel
                detail={selectedDetail}
                onClose={() => setSelectedPlayerName("")}
              />
            ) : null}

            <section className="ranking-board" aria-label="캠퍼스 랭킹 피드">
              <div className="ranking-head">
                <span>순위</span>
                <span>선수</span>
                <span>전적</span>
                <span>최근 5경기</span>
              </div>

              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <RankingRow
                    key={player.name}
                    player={player}
                    selected={selectedPlayerName === player.name}
                    onSelect={setSelectedPlayerName}
                  />
                ))
              ) : (
                <div className="empty-row">조건에 맞는 선수가 없습니다.</div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
