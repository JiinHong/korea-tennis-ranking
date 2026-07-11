"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { PlayerStatus } from "@/lib/rankingRules";
import type { AdminMonthlyClub } from "@/lib/supabaseMonthlySettlements";

type AdminMonthlyManagerProps = {
  clubs: AdminMonthlyClub[];
};

type MutationResponse =
  | { ok: true; settlement: { targetMonth: string } }
  | { ok: false; message: string };

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function statusLabel(status: PlayerStatus): string {
  if (status === "injured") return "부상";
  if (status === "inactive") return "비활동";
  if (status === "left") return "탈퇴";
  return "활동";
}

export default function AdminMonthlyManager({ clubs }: AdminMonthlyManagerProps) {
  const router = useRouter();
  const initialClub = clubs.find((club) => club.season) ?? clubs[0] ?? null;
  const [selectedSlug, setSelectedSlug] = useState(initialClub?.slug ?? "");
  const [selectedMonth, setSelectedMonth] = useState(
    initialClub?.previews[0]?.targetMonth ?? ""
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedClub =
    clubs.find((club) => club.slug === selectedSlug) ?? clubs[0] ?? null;
  const selectedPreview =
    selectedClub?.previews.find(
      (preview) => preview.targetMonth === selectedMonth
    ) ?? selectedClub?.previews[0] ?? null;
  const eligiblePlayers =
    selectedPreview?.players.filter((player) => player.eligible) ?? [];
  const participantCount = Math.max(
    eligiblePlayers.length - (selectedPreview?.targets.length ?? 0),
    0
  );

  function selectClub(slug: string) {
    const club = clubs.find((candidate) => candidate.slug === slug) ?? null;
    setSelectedSlug(slug);
    setSelectedMonth(club?.previews[0]?.targetMonth ?? "");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function closeDialog() {
    setDialogOpen(false);
    setAdminSecret("");
    setErrorMessage("");
    setSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedClub ||
      !selectedPreview ||
      !adminSecret.trim() ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/clubs/${selectedClub.slug}/monthly-settlements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetMonth: selectedPreview.targetMonth,
            adminSecret,
          }),
        }
      );
      const data = (await response.json()) as MutationResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? "월간 정산을 적용하지 못했습니다." : data.message);
      }

      closeDialog();
      setSuccessMessage(`${monthLabel(data.settlement.targetMonth)} 정산을 적용했습니다.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setAdminSecret("");
      setSubmitting(false);
    }
  }

  return (
    <section
      className="admin-section admin-monthly-section"
      aria-labelledby="monthly-preview-title"
    >
      <div className="admin-section-heading admin-monthly-heading">
        <div>
          <span>PREVIEW</span>
          <h2 id="monthly-preview-title">정산 미리보기</h2>
        </div>
        <p>경기 0회인 선수는 부상 여부와 관계없이 순위가 2계단 내려갑니다.</p>
      </div>

      <div className="admin-monthly-controls">
        <div className="admin-club-tabs" aria-label="동아리 선택">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              aria-pressed={club.slug === selectedClub?.slug}
              onClick={() => selectClub(club.slug)}
            >
              {club.name}
            </button>
          ))}
        </div>

        {selectedClub && selectedClub.previews.length > 0 ? (
          <label className="admin-monthly-month-select">
            <span>정산 월</span>
            <select
              aria-label="정산 월"
              value={selectedPreview?.targetMonth ?? ""}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setSuccessMessage("");
              }}
            >
              {selectedClub.previews.map((preview) => (
                <option key={preview.targetMonth} value={preview.targetMonth}>
                  {monthLabel(preview.targetMonth)}
                  {preview.alreadyApplied ? " · 완료" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {successMessage ? (
        <p className="admin-player-notice is-success" role="status">
          {successMessage}
        </p>
      ) : null}

      {!selectedClub?.season ? (
        <div className="admin-monthly-empty">
          <strong>현재 진행 중인 시즌이 없습니다.</strong>
          <p>시즌을 시작한 뒤 월간 정산을 사용할 수 있습니다.</p>
        </div>
      ) : !selectedPreview ? (
        <div className="admin-monthly-empty">
          <strong>아직 정산할 수 있는 완료 월이 없습니다.</strong>
          <p>현재 달이 끝난 다음 달 1일부터 미참여 정산을 미리볼 수 있습니다.</p>
        </div>
      ) : (
        <>
          <div className="admin-monthly-summary">
            <div>
              <span>정산 월</span>
              <strong>{monthLabel(selectedPreview.targetMonth)}</strong>
            </div>
            <div>
              <span>참여</span>
              <strong>참여 {participantCount}명</strong>
            </div>
            <div>
              <span>미참여</span>
              <strong>미참여 {selectedPreview.targets.length}명</strong>
            </div>
            <div>
              <span>규칙</span>
              <strong>{selectedPreview.penaltyDrop}계단 강등</strong>
            </div>
            <button
              type="button"
              disabled={selectedPreview.alreadyApplied}
              aria-label={`${monthLabel(selectedPreview.targetMonth)} 정산 적용`}
              onClick={() => {
                setDialogOpen(true);
                setErrorMessage("");
                setAdminSecret("");
              }}
            >
              {selectedPreview.alreadyApplied ? "정산 완료" : "정산 적용"}
            </button>
          </div>

          <div className="admin-monthly-table" role="table" aria-label="월간 정산 예상 순위">
            <div className="admin-monthly-table-head" role="row">
              <span role="columnheader">현재</span>
              <span role="columnheader">선수</span>
              <span role="columnheader">경기</span>
              <span role="columnheader">예상 순위</span>
            </div>

            {eligiblePlayers.map((player) => (
              <div
                className={`admin-monthly-row${player.penalized ? " is-penalized" : ""}`}
                role="row"
                key={player.playerId}
              >
                <strong className="admin-monthly-rank" role="cell">
                  {player.currentRank}위
                </strong>
                <div className="admin-monthly-player" role="cell">
                  <strong>{player.name}</strong>
                  <span className={`is-${player.status}`}>
                    {statusLabel(player.status)}
                  </span>
                </div>
                <span className="admin-monthly-matches" role="cell">
                  {player.matchCount}경기
                </span>
                <strong className="admin-monthly-expected" role="cell">
                  {player.currentRank}위 → {player.expectedRank}위
                </strong>
              </div>
            ))}
          </div>
        </>
      )}

      {dialogOpen && selectedPreview ? (
        <div
          className="admin-player-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            className="admin-player-dialog admin-monthly-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-monthly-dialog-title"
          >
            <header>
              <div>
                <span>SENSITIVE ACTION</span>
                <h2 id="admin-monthly-dialog-title">
                  {monthLabel(selectedPreview.targetMonth)} 정산 적용
                </h2>
              </div>
              <button type="button" onClick={closeDialog} aria-label="월간 정산 닫기">
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <p className="admin-match-confirmation">
                <strong>{selectedPreview.targets.length}명의 순위를 다시 계산합니다.</strong>
                적용 후에는 경기와 정산 이력을 시간순으로 재생해 현재 순위를 갱신합니다.
              </p>

              <label className="admin-dialog-field">
                <span>관리자 비밀키</span>
                <input
                  type="password"
                  aria-label="관리자 비밀키"
                  value={adminSecret}
                  onChange={(event) => setAdminSecret(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {errorMessage ? (
                <p className="admin-player-notice is-error" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="admin-dialog-actions">
                <button type="button" onClick={closeDialog}>
                  취소
                </button>
                <button type="submit" disabled={!adminSecret.trim() || submitting}>
                  {submitting ? "적용 중" : "적용"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
