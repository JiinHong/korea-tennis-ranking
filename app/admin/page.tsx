import type { Metadata } from "next";
import Link from "next/link";

import {
  ADMIN_ACTIONS,
  type AdminActionGroup,
} from "@/lib/adminActionPolicy";
import { getAdminClubOverviews } from "@/lib/supabaseAdminRepository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "랭킹 운영 관리 | Korea Tennis Ranking",
  robots: { index: false, follow: false },
};

const actionGroups: AdminActionGroup[] = [
  "조회 및 미리보기",
  "데이터 변경",
  "일반 입력",
  "시즌 및 일괄 작업",
];

function formatDate(value: string | null): string {
  if (!value) return "기록 없음";

  const [year, month, day] = value.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}

export default async function AdminPage() {
  const clubs = await getAdminClubOverviews();

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <Link className="admin-root-link" href="/">
            <span aria-hidden="true">‹</span>
            전국 랭킹
          </Link>
          <div className="admin-title-row">
            <div>
              <span className="admin-kicker">ADMIN</span>
              <h1>랭킹 운영 관리</h1>
            </div>
            <div className="admin-title-actions">
              <p className="admin-access-state">
                <span aria-hidden="true" />
                조회 전용
              </p>
              <Link className="admin-nav-action is-secondary" href="/admin/monthly">
                월간 정산 <span aria-hidden="true">›</span>
              </Link>
              <Link className="admin-nav-action is-secondary" href="/admin/matches">
                경기 관리 <span aria-hidden="true">›</span>
              </Link>
              <Link className="admin-nav-action" href="/admin/players">
                선수 관리 <span aria-hidden="true">›</span>
              </Link>
            </div>
          </div>
        </header>

        <section className="admin-section" aria-labelledby="admin-clubs-title">
          <div className="admin-section-heading">
            <div>
              <span>OVERVIEW</span>
              <h2 id="admin-clubs-title">동아리 현황</h2>
            </div>
            <p>{clubs.length}개 운영 중</p>
          </div>

          <div className="admin-club-grid">
            {clubs.map((club) => (
              <article
                className="admin-club-card"
                key={club.id}
                aria-label={`${club.name} 운영 현황`}
              >
                <header className="admin-club-header">
                  <div>
                    <span className="admin-season-label">
                      {club.season?.name ?? "현재 시즌 없음"}
                    </span>
                    <h3>{club.name}</h3>
                  </div>
                  <Link href={`/${club.slug}`}>
                    공개 랭킹 보기 <span aria-hidden="true">↗</span>
                  </Link>
                </header>

                <dl className="admin-metric-grid">
                  <div>
                    <dt>등록 선수</dt>
                    <dd>{club.roster.total}</dd>
                  </div>
                  <div>
                    <dt>확정 경기</dt>
                    <dd>{club.matches.confirmed}</dd>
                  </div>
                  <div>
                    <dt>부상 선수</dt>
                    <dd>{club.roster.injured}</dd>
                  </div>
                  <div>
                    <dt>최근 경기</dt>
                    <dd className="is-date">
                      {formatDate(club.matches.latestPlayedOn)}
                    </dd>
                  </div>
                </dl>

                <div className="admin-roster-status" aria-label="선수 상태">
                  <span>활동 {club.roster.active}</span>
                  <span>부상 {club.roster.injured}</span>
                  <span>비활동 {club.roster.inactive}</span>
                  <span>탈퇴 {club.roster.left}</span>
                </div>

                <div className="admin-rule-summary" aria-label="현재 운영 규칙">
                  {club.rules ? (
                    <>
                      <span>
                        도전 범위 <strong>{club.rules.challengeRange}계단</strong>
                      </span>
                      <span>
                        재도전 제한 <strong>{club.rules.rematchCooldownDays}일</strong>
                      </span>
                      <span>
                        미참여 강등 <strong>{club.rules.inactivityPenaltyDrop}계단</strong>
                      </span>
                    </>
                  ) : (
                    <span className="admin-empty-rule">등록된 운영 규칙 없음</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section" aria-labelledby="admin-policy-title">
          <div className="admin-section-heading">
            <div>
              <span>ACCESS POLICY</span>
              <h2 id="admin-policy-title">작업 권한</h2>
            </div>
            <p>변경 작업에서만 비밀키 확인</p>
          </div>

          <div className="admin-policy-grid">
            {actionGroups.map((group) => (
              <section className="admin-policy-group" key={group}>
                <h3>{group}</h3>
                <ul>
                  {ADMIN_ACTIONS.filter((action) => action.group === group).map(
                    (action) => (
                      <li key={action.id}>
                        <span>{action.label}</span>
                        <strong
                          className={
                            action.secretRequired ? "is-sensitive" : "is-open"
                          }
                        >
                          {action.secretRequired ? "비밀키 필요" : "비밀키 없음"}
                        </strong>
                      </li>
                    )
                  )}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
