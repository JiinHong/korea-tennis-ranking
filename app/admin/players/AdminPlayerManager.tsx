"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { buildAdminRankAdjustmentPreview } from "@/lib/adminRankAdjustment";
import type {
  AdminPlayerClub,
  AdminSeasonPlayer,
} from "@/lib/supabaseAdminPlayers";
import type { PlayerStatus } from "@/lib/rankingRules";

type AdminPlayerManagerProps = {
  clubs: AdminPlayerClub[];
};

type MutationDialog =
  | { kind: "add" }
  | { kind: "rename"; player: AdminSeasonPlayer }
  | { kind: "status"; player: AdminSeasonPlayer }
  | { kind: "rank"; player: AdminSeasonPlayer };

type MutationResponse =
  | { ok: true; player: { name: string } }
  | { ok: false; message: string };

const statusLabels: Record<PlayerStatus, string> = {
  active: "활동",
  injured: "부상",
  inactive: "비활동",
  left: "탈퇴",
};

const statuses = Object.keys(statusLabels) as PlayerStatus[];

export default function AdminPlayerManager({ clubs }: AdminPlayerManagerProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(
    clubs.find((club) => club.season)?.slug ?? clubs[0]?.slug ?? ""
  );
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<MutationDialog | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PlayerStatus>("active");
  const [targetRank, setTargetRank] = useState(1);
  const [adminSecret, setAdminSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedClub =
    clubs.find((club) => club.slug === selectedSlug) ?? clubs[0] ?? null;
  const rankedPlayers = useMemo(
    () =>
      (selectedClub?.players ?? [])
        .filter((player) => player.status !== "left")
        .toSorted((a, b) => a.currentRank - b.currentRank),
    [selectedClub]
  );
  const rankPreview = useMemo(
    () =>
      dialog?.kind === "rank" && selectedClub
        ? buildAdminRankAdjustmentPreview(
            selectedClub.players,
            dialog.player.seasonPlayerId,
            targetRank
          )
        : null,
    [dialog, selectedClub, targetRank]
  );
  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko");

    if (!selectedClub || !needle) return selectedClub?.players ?? [];

    return selectedClub.players.filter((player) =>
      `${player.name} ${player.note}`.toLocaleLowerCase("ko").includes(needle)
    );
  }, [query, selectedClub]);

  function resetDialog() {
    setDialog(null);
    setName("");
    setStatus("active");
    setTargetRank(1);
    setAdminSecret("");
    setErrorMessage("");
    setSubmitting(false);
  }

  function openAddDialog() {
    setDialog({ kind: "add" });
    setName("");
    setStatus("active");
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openRenameDialog(player: AdminSeasonPlayer) {
    setDialog({ kind: "rename", player });
    setName(player.name);
    setStatus(player.status);
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openStatusDialog(player: AdminSeasonPlayer) {
    setDialog({ kind: "status", player });
    setName(player.name);
    setStatus(player.status);
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openRankDialog(player: AdminSeasonPlayer) {
    setDialog({ kind: "rank", player });
    setName(player.name);
    setStatus(player.status);
    setTargetRank(player.currentRank);
    setAdminSecret("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dialog || !selectedClub || submitting || !adminSecret.trim()) return;

    const isAdd = dialog.kind === "add";
    const body = isAdd
      ? { name: name.trim(), adminSecret }
      : dialog.kind === "rename"
        ? {
            operation: "rename",
            seasonPlayerId: dialog.player.seasonPlayerId,
            name: name.trim(),
            adminSecret,
          }
        : dialog.kind === "status"
          ? {
            operation: "status",
            seasonPlayerId: dialog.player.seasonPlayerId,
            status,
            adminSecret,
            }
          : {
              operation: "rank",
              seasonPlayerId: dialog.player.seasonPlayerId,
              targetRank,
              adminSecret,
            };

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/clubs/${selectedClub.slug}/players`,
        {
          method: isAdd ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = (await response.json()) as MutationResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "선수 정보를 반영하지 못했습니다." : data.message);
      }

      router.refresh();
      resetDialog();
      setSuccessMessage("선수 정보를 반영했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setAdminSecret("");
      setSubmitting(false);
    }
  }

  const dialogTitle =
    dialog?.kind === "add"
      ? "선수 추가"
      : dialog?.kind === "rename"
        ? "이름 수정"
        : dialog?.kind === "status"
          ? "상태 변경"
          : "순위 변경";
  const submitLabel =
    dialog?.kind === "add"
      ? "추가"
      : dialog?.kind === "rename"
        ? "저장"
        : dialog?.kind === "status"
          ? "변경"
          : "순위 적용";

  return (
    <section className="admin-section admin-player-section" aria-labelledby="player-roster-title">
      <div className="admin-section-heading admin-player-heading">
        <div>
          <span>ROSTER</span>
          <h2 id="player-roster-title">현재 시즌 선수</h2>
        </div>
        <p>조회는 자유롭게, 변경할 때만 비밀키를 확인합니다.</p>
      </div>

      <div className="admin-player-controls">
        <div className="admin-club-tabs" aria-label="동아리 선택">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              aria-pressed={club.slug === selectedClub?.slug}
              onClick={() => {
                setSelectedSlug(club.slug);
                setQuery("");
                setSuccessMessage("");
              }}
            >
              {club.name}
            </button>
          ))}
        </div>

        <div className="admin-player-control-actions">
          <label className="admin-player-search">
            <span>선수 검색</span>
            <input
              type="search"
              aria-label="선수 검색"
              placeholder="이름 또는 메모"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="admin-primary-button"
            type="button"
            onClick={openAddDialog}
            disabled={!selectedClub?.season}
          >
            <span aria-hidden="true">+</span>
            선수 추가
          </button>
        </div>
      </div>

      {successMessage ? (
        <p className="admin-player-notice is-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="admin-player-summary">
        <strong>{selectedClub?.name ?? "등록된 동아리 없음"}</strong>
        <span>
          {selectedClub?.season?.name ?? "현재 시즌 없음"} · {filteredPlayers.length}명 표시
        </span>
      </div>

      <div className="admin-player-table" role="table" aria-label="현재 시즌 선수 목록">
        <div className="admin-player-table-head" role="row">
          <span role="columnheader">순위</span>
          <span role="columnheader">선수</span>
          <span role="columnheader">상태</span>
          <span role="columnheader">작업</span>
        </div>

        {filteredPlayers.length > 0 ? (
          filteredPlayers.map((player) => (
            <div
              className={`admin-player-row${player.status === "left" ? " is-left" : ""}`}
              role="row"
              key={player.seasonPlayerId}
            >
              <strong className="admin-player-rank" role="cell">
                {player.currentRank}
              </strong>
              <div className="admin-player-identity" role="cell">
                <strong>{player.name}</strong>
                <span>{player.note || `초기 ${player.initialRank}위`}</span>
              </div>
              <div className="admin-player-status" role="cell">
                <button
                  type="button"
                  className={`is-${player.status}`}
                  onClick={() => openStatusDialog(player)}
                  aria-label={`${player.name} 상태 변경`}
                >
                  {statusLabels[player.status]}
                </button>
              </div>
              <div className="admin-player-actions" role="cell">
                {player.status !== "left" ? (
                  <button
                    type="button"
                    onClick={() => openRankDialog(player)}
                    aria-label={`${player.name} 순위 변경`}
                  >
                    순위 변경
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openRenameDialog(player)}
                  aria-label={`${player.name} 이름 수정`}
                >
                  이름 수정
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="admin-player-empty">
            {selectedClub?.season
              ? "조건에 맞는 선수가 없습니다."
              : "현재 진행 중인 시즌이 없습니다."}
          </p>
        )}
      </div>

      {dialog ? (
        <div
          className="admin-player-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resetDialog();
          }}
        >
          <section
            className="admin-player-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-player-dialog-title"
          >
            <header>
              <div>
                <span>SENSITIVE ACTION</span>
                <h2 id="admin-player-dialog-title">{dialogTitle}</h2>
              </div>
              <button type="button" onClick={resetDialog} aria-label="선수 관리 닫기">
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              {dialog.kind === "add" || dialog.kind === "rename" ? (
                <label className="admin-dialog-field">
                  <span>선수 이름</span>
                  <input
                    aria-label="선수 이름"
                    value={name}
                    maxLength={50}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                    required
                  />
                </label>
              ) : dialog.kind === "status" ? (
                <label className="admin-dialog-field">
                  <span>선수 상태</span>
                  <select
                    aria-label="선수 상태"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as PlayerStatus)}
                  >
                    {statuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <div className="admin-rank-player">
                    <span>선수</span>
                    <strong>
                      {dialog.player.name} · 현재 {dialog.player.currentRank}위
                    </strong>
                  </div>

                  <label className="admin-dialog-field">
                    <span>목표 순위</span>
                    <select
                      aria-label="목표 순위"
                      value={targetRank}
                      onChange={(event) =>
                        setTargetRank(Number(event.target.value))
                      }
                      autoFocus
                    >
                      {rankedPlayers.map((player) => (
                        <option
                          key={player.seasonPlayerId}
                          value={player.currentRank}
                        >
                          {player.currentRank}위 · {player.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {rankPreview ? (
                    <section
                      className="admin-rank-preview"
                      role="region"
                      aria-label="순위 변경 미리보기"
                    >
                      <header>
                        <strong>변경 미리보기</strong>
                        <span>{rankPreview.changes.length}명 영향</span>
                      </header>
                      <ul>
                        {rankPreview.changes.map((change) => (
                          <li key={change.seasonPlayerId}>
                            <span>{change.name}</span>
                            <strong>
                              {change.oldRank}위 → {change.newRank}위
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : (
                    <p className="admin-rank-preview-empty">
                      현재 순위와 다른 목표 순위를 선택해주세요.
                    </p>
                  )}
                </>
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
                변경 내용은 감사 로그에 기록됩니다. 비밀키는 저장하지 않습니다.
              </p>

              {errorMessage ? (
                <p className="admin-player-notice is-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="admin-dialog-actions">
                <button type="button" onClick={resetDialog}>
                  취소
                </button>
                <button
                  className="is-primary"
                  type="submit"
                  disabled={
                    submitting ||
                    !adminSecret.trim() ||
                    ((dialog.kind === "add" || dialog.kind === "rename") &&
                      !name.trim()) ||
                    (dialog.kind === "status" &&
                      status === dialog.player.status) ||
                    (dialog.kind === "rank" && !rankPreview)
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
