import type { ClubConfig } from "@/lib/clubs";
import type { PlayerDetail } from "@/lib/playerDetails";
import Image from "next/image";
import Link from "next/link";

function formatSummary(wins: number, losses: number) {
  return `${wins}승 ${losses}패`;
}

export default function PlayerDetailView({
  club,
  detail,
}: {
  club: ClubConfig;
  detail: PlayerDetail;
}) {
  const topOpponents = detail.opponentRecords.slice(0, 5);
  const recentMatches = detail.recentMatches.slice(0, 6);

  return (
    <main className="ranking-page campus-ranking-page player-detail-page">
      <section className="summary-band campus-hero-band player-detail-hero">
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
              <div className="brand-copy">
                <span className="campus-kicker">선수 상세</span>
                <h1 aria-label={club.title}>
                  {club.titleLines.map((line) => (
                    <span key={line} className="club-title-line">
                      {line}
                    </span>
                  ))}
                </h1>
              </div>
            </div>
            <Link
              className="detail-back-link"
              href={`/${club.slug}`}
              aria-label="랭킹으로 돌아가기"
            >
              랭킹으로
            </Link>
          </header>
        </div>
      </section>

      <div className="content-shell">
        <section
          className="player-detail-panel player-detail-panel-page"
          aria-label={`${detail.name} 상세 전적`}
        >
          <header className="player-detail-header">
            <div>
              <span className="detail-rank">{detail.rank}위</span>
              <h2>{detail.name}</h2>
              <p>통산 {formatSummary(detail.wins, detail.losses)}</p>
            </div>
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
                      className={`result-badge ${
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
      </div>
    </main>
  );
}
