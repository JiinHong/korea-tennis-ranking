"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type {
  AdminMatchClub,
  AdminMatchRecord,
} from "@/lib/supabaseAdminMatches";

type AdminMatchManagerProps = {
  clubs: AdminMatchClub[];
};

type MatchFilter = "all" | "confirmed" | "voided";
type MatchDialog =
  | { kind: "edit"; match: AdminMatchRecord }
  | { kind: "void" | "restore"; match: AdminMatchRecord };

type MutationResponse =
  | { ok: true; match: { action: string } }
  | { ok: false; message: string };

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}

function playerScore(match: AdminMatchRecord, playerId: string): number {
  return playerId === match.winnerPlayerId ? match.winnerScore : match.loserScore;
}

function sourceLabel(source: string): string {
  if (source === "public_form") return "사용자 입력";
  if (source === "admin") return "관리자 입력";
  return "이전 데이터";
}

export default function AdminMatchManager({ clubs }: AdminMatchManagerProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(
    clubs.find((club) => club.season)?.slug ?? clubs[0]?.slug ?? ""
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [dialog, setDialog] = useState<MatchDialog | null>(null);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [player1Score, setPlayer1Score] = useState(6);
  const [player2Score, setPlayer2Score] = useState(4);
  const [playedOn, setPlayedOn] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedClub =
    clubs.find((club) => club.slug === selectedSlug) ?? clubs[0] ?? null;
  const filteredMatches = useMemo(() => {
    if (!selectedClub) return [];
    const needle = query.trim().toLocaleLowerCase("ko");

    return selectedClub.matches.filter((match) => {
      const matchesStatus = filter === "all" || match.status === filter;
      const matchesQuery =
        !needle ||
        `${match.challengerName} ${match.defenderName} ${match.winnerName}`
          .toLocaleLowerCase("ko")
          .includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [filter, query, selectedClub]);

  function closeDialog() {
    setDialog(null);
    setAdminSecret("");
    setErrorMessage("");
    setSubmitting(false);
  }

  function openEdit(match: AdminMatchRecord) {
    setDialog({ kind: "edit", match });
    setPlayer1Id(match.challengerPlayerId);
    setPlayer2Id(match.defenderPlayerId);
    setPlayer1Score(playerScore(match, match.challengerPlayerId));
    setPlayer2Score(playerScore(match, match.defenderPlayerId));
    setPlayedOn(match.playedOn);
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openStatus(match: AdminMatchRecord) {
    setDialog({ kind: match.status === "confirmed" ? "void" : "restore", match });
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dialog || !selectedClub || !adminSecret.trim() || submitting) return;

    const body =
      dialog.kind === "edit"
        ? {
            operation: "edit",
            matchId: dialog.match.id,
            player1Id,
            player2Id,
            player1Score,
            player2Score,
            playedOn,
            adminSecret,
          }
        : {
            operation: dialog.kind,
            matchId: dialog.match.id,
            adminSecret,
          };

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/clubs/${selectedClub.slug}/matches`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = (await response.json()) as MutationResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "경기 정보를 반영하지 못했습니다." : data.message);
      }

      router.refresh();
      closeDialog();
      setSuccessMessage("경기 정보와 현재 순위를 다시 계산했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setAdminSecret("");
      setSubmitting(false);
    }
  }

  const dialogTitle =
    dialog?.kind === "edit"
      ? "경기 수정"
      : dialog?.kind === "void"
        ? "경기 무효 처리"
        : "경기 복구";
  const submitLabel =
    dialog?.kind === "edit"
      ? "저장"
      : dialog?.kind === "void"
        ? "무효 처리"
        : "복구";

  return (
    <section className="admin-section admin-match-section" aria-labelledby="match-list-title">
      <div className="admin-section-heading admin-match-heading">
        <div>
          <span>MATCHES</span>
          <h2 id="match-list-title">현재 시즌 경기</h2>
        </div>
        <p>수정하면 해당 시즌의 순위를 경기 순서대로 다시 계산합니다.</p>
      </div>

      <div className="admin-match-controls">
        <div className="admin-club-tabs" aria-label="동아리 선택">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              aria-pressed={club.slug === selectedClub?.slug}
              onClick={() => {
                setSelectedSlug(club.slug);
                setQuery("");
                setFilter("all");
                setSuccessMessage("");
              }}
            >
              {club.name}
            </button>
          ))}
        </div>

        <label className="admin-player-search">
          <span>경기 검색</span>
          <input
            type="search"
            aria-label="경기 검색"
            placeholder="선수 이름"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="admin-match-filter" aria-label="경기 상태 필터">
        {([
          ["all", "전체 경기"],
          ["confirmed", "확정 경기"],
          ["voided", "무효 경기"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {successMessage ? (
        <p className="admin-player-notice is-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="admin-player-summary admin-match-summary">
        <strong>{selectedClub?.name ?? "등록된 동아리 없음"}</strong>
        <span>
          {selectedClub?.season?.name ?? "현재 시즌 없음"} · {filteredMatches.length}경기 표시
        </span>
      </div>

      <div className="admin-match-table" role="table" aria-label="현재 시즌 경기 목록">
        <div className="admin-match-table-head" role="row">
          <span role="columnheader">날짜</span>
          <span role="columnheader">경기</span>
          <span role="columnheader">결과</span>
          <span role="columnheader">상태</span>
          <span role="columnheader">작업</span>
        </div>

        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => {
            const dateLabel = formatDate(match.playedOn);
            const matchLabel = `${match.challengerName} 대 ${match.defenderName}`;

            return (
              <div
                className={`admin-match-row${match.status === "voided" ? " is-voided" : ""}`}
                role="row"
                key={match.id}
              >
                <div className="admin-match-date" role="cell">
                  <strong>{dateLabel}</strong>
                  <span>#{match.sequenceNo}</span>
                </div>
                <div className="admin-match-players" role="cell">
                  <strong>{match.challengerName}</strong>
                  <span>
                    도전자 · {match.challengerRankBefore ? `${match.challengerRankBefore}위` : "순위 없음"}
                  </span>
                  <strong>{match.defenderName}</strong>
                  <span>
                    방어자 · {match.defenderRankBefore ? `${match.defenderRankBefore}위` : "순위 없음"}
                  </span>
                </div>
                <div className="admin-match-result" role="cell">
                  <strong>{match.winnerScore}:{match.loserScore}</strong>
                  <span>{match.winnerName} 승 · {match.defenseResult}</span>
                </div>
                <div className="admin-match-state" role="cell">
                  <strong className={`is-${match.status}`}>
                    {match.status === "confirmed" ? "확정" : "무효"}
                  </strong>
                  <span>{sourceLabel(match.source)}</span>
                </div>
                <div className="admin-match-actions" role="cell">
                  <button
                    type="button"
                    onClick={() => openEdit(match)}
                    aria-label={`${dateLabel} ${matchLabel} 경기 수정`}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className={match.status === "confirmed" ? "is-danger" : "is-restore"}
                    onClick={() => openStatus(match)}
                    aria-label={
                      match.status === "confirmed"
                        ? `${dateLabel} ${matchLabel} 경기 무효`
                        : `${matchLabel} 경기 복구`
                    }
                  >
                    {match.status === "confirmed" ? "무효" : "복구"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="admin-player-empty">
            {selectedClub?.season
              ? "조건에 맞는 경기가 없습니다."
              : "현재 진행 중인 시즌이 없습니다."}
          </p>
        )}
      </div>

      {dialog ? (
        <div
          className="admin-player-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="admin-player-dialog admin-match-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-match-dialog-title"
          >
            <header>
              <div>
                <span>SENSITIVE ACTION</span>
                <h2 id="admin-match-dialog-title">{dialogTitle}</h2>
              </div>
              <button type="button" onClick={closeDialog} aria-label="경기 관리 닫기">
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              {dialog.kind === "edit" ? (
                <>
                  <label className="admin-dialog-field">
                    <span>경기 날짜</span>
                    <input
                      type="date"
                      aria-label="경기 날짜"
                      value={playedOn}
                      onChange={(event) => setPlayedOn(event.target.value)}
                      required
                    />
                  </label>
                  <div className="admin-match-edit-grid">
                    <label className="admin-dialog-field">
                      <span>선수 1</span>
                      <select
                        aria-label="선수 1"
                        value={player1Id}
                        onChange={(event) => setPlayer1Id(event.target.value)}
                      >
                        {selectedClub?.players.map((player) => (
                          <option key={player.playerId} value={player.playerId}>
                            {player.currentRank}위 · {player.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-dialog-field">
                      <span>선수 1 점수</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        aria-label="선수 1 점수"
                        value={player1Score}
                        onChange={(event) => setPlayer1Score(Number(event.target.value))}
                      />
                    </label>
                    <label className="admin-dialog-field">
                      <span>선수 2</span>
                      <select
                        aria-label="선수 2"
                        value={player2Id}
                        onChange={(event) => setPlayer2Id(event.target.value)}
                      >
                        {selectedClub?.players.map((player) => (
                          <option key={player.playerId} value={player.playerId}>
                            {player.currentRank}위 · {player.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-dialog-field">
                      <span>선수 2 점수</span>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        aria-label="선수 2 점수"
                        value={player2Score}
                        onChange={(event) => setPlayer2Score(Number(event.target.value))}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <p className="admin-match-confirmation">
                  {dialog.kind === "void"
                    ? "이 경기를 순위 계산에서 제외합니다."
                    : "이 경기를 다시 순위 계산에 포함합니다."}
                  <strong>
                    {formatDate(dialog.match.playedOn)} · {dialog.match.challengerName} 대 {dialog.match.defenderName}
                  </strong>
                </p>
              )}

              <label className="admin-dialog-field">
                <span>관리자 비밀키</span>
                <input
                  aria-label="관리자 비밀키"
                  type="password"
                  value={adminSecret}
                  maxLength={200}
                  autoComplete="current-password"
                  onChange={(event) => setAdminSecret(event.target.value)}
                  required
                />
              </label>

              <p className="admin-dialog-help">
                현재 시즌의 모든 확정 경기를 다시 계산하며 변경 내용은 감사 로그에 기록됩니다.
              </p>

              {errorMessage ? (
                <p className="admin-player-notice is-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="admin-dialog-actions">
                <button type="button" onClick={closeDialog}>취소</button>
                <button
                  className="is-primary"
                  type="submit"
                  disabled={
                    submitting ||
                    !adminSecret.trim() ||
                    (dialog.kind === "edit" &&
                      (!playedOn || player1Id === player2Id || player1Score === player2Score))
                  }
                >
                  {submitting ? "반영 중" : submitLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
