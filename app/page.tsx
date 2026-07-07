import Link from "next/link";

const tournaments = [
  "국토정중앙배(양구)",
  "경인지구 연맹전",
  "하늘내린인제",
  "춘천소양강배",
  "영월",
  "WEMIX OPEN",
];

export default function Home() {
  return (
    <main className="national-page">
      <section className="national-hero">
        <div className="national-hero-inner">
          <p className="org-label">Korea Tennis Ranking</p>
          <h1>전국 대학 동아리 랭킹</h1>
          <p>
            주요 전국 대학 동아리 테니스 대회 성과를 바탕으로 동아리별
            랭킹을 구축할 예정입니다.
          </p>

          <div className="national-actions">
            <Link href="/seoultech">서울과기대 단테랭 보기</Link>
          </div>
        </div>
      </section>

      <section className="national-section" aria-label="반영 예정 대회">
        <div>
          <span className="section-kicker">Ranking Inputs</span>
          <h2>반영 예정 대회</h2>
        </div>

        <div className="tournament-grid">
          {tournaments.map((tournament) => (
            <article key={tournament} className="tournament-card">
              <span>{tournament}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
