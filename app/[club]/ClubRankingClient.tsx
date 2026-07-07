"use client";

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
  organization: string;
  subtitle: string;
  apiPath: string;
};

type RankingApiResponse =
  | {
      ok: true;
      players: Player[];
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

function getPodiumClass(rank: number) {
  if (rank === 1) {
    return "podium-card is-gold";
  }

  if (rank === 2) {
    return "podium-card is-silver";
  }

  return "podium-card is-bronze";
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

function RankingRow({ player }: { player: Player }) {
  const injured = isInjured(player.note);

  return (
    <article className="ranking-row">
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
    </article>
  );
}

export default function ClubRankingClient({ club }: { club: ClubPageConfig }) {
  const [players, setPlayers] = useState<Player[]>([]);
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

  return (
    <main className="ranking-page">
      <section className="summary-band">
        <div className="summary-inner">
          <header className="topbar">
            <div className="brand-lockup">
              <Image
                src="/court-mark.svg"
                width={44}
                height={44}
                alt=""
                priority
              />
              <div>
                <span className="org-label">{club.organization}</span>
                <h1>{club.title}</h1>
              </div>
            </div>

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
              <p className="live-stamp">
                <span />
                {formatLoadedAt(loadedAt)}
              </p>
            </div>

            <div className="podium-grid" aria-label="상위 랭킹">
              {topPlayers.map((player) => (
                <article key={player.name} className={getPodiumClass(player.rank)}>
                  <span className="podium-rank">{player.rank}</span>
                  <strong>{player.name}</strong>
                  <span>{formatRecord(player)}</span>
                </article>
              ))}
            </div>
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
                {hotPlayers.map((player) => (
                  <article key={player.name} className="activity-card">
                    <span>{player.rank}위</span>
                    <strong>{player.name}</strong>
                    <em>{player.matches}경기</em>
                  </article>
                ))}
              </section>
            ) : null}

            <section className="ranking-board" aria-label={`${club.title} 순위표`}>
              <div className="ranking-head">
                <span>순위</span>
                <span>선수</span>
                <span>전적</span>
                <span>최근 5경기</span>
              </div>

              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <RankingRow key={player.name} player={player} />
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
