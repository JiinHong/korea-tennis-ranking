import Link from "next/link";

import { getCachedNationalRankingPageData } from "@/lib/nationalRanking/repository";

import NationalRankingTable from "./NationalRankingTable";
import RankingMethodologyInfo from "./RankingMethodologyInfo";

const calculatedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function Home() {
  let pageData: Awaited<ReturnType<typeof getCachedNationalRankingPageData>> =
    null;
  let readFailed = false;

  try {
    pageData = await getCachedNationalRankingPageData();
  } catch {
    readFailed = true;
  }

  return (
    <main className="national-page">
      <div className="national-shell">
        <header className="national-header">
          <div>
            <span className="national-kicker">NATIONAL CLUB RANKING</span>
            <h1>전국 대학 테니스 동아리 랭킹</h1>
          </div>
          <Link className="national-campus-link" href="/seoultech">
            서울과기대 단식 랭킹
          </Link>
        </header>

        {readFailed ? (
          <section className="national-status" role="alert">
            전국 랭킹을 불러오지 못했습니다.
          </section>
        ) : pageData === null ? (
          <section className="national-status" role="status">
            검증된 전국 랭킹을 준비하고 있습니다.
          </section>
        ) : (
          <section className="national-ranking-section" aria-labelledby="ranking-title">
            <div className="national-ranking-header">
              <div className="national-ranking-title-row">
                <h2 id="ranking-title">전국 랭킹</h2>
                <span>랭킹 산정 방식</span>
                <RankingMethodologyInfo />
              </div>
              <dl className="national-ranking-meta">
                <div>
                  <dt>계산식</dt>
                  <dd>{pageData.formulaVersion}</dd>
                </div>
                <div>
                  <dt>산정 시각</dt>
                  <dd>
                    <time dateTime={pageData.calculatedAt}>
                      {calculatedAtFormatter.format(new Date(pageData.calculatedAt))}
                    </time>
                  </dd>
                </div>
              </dl>
            </div>
            <NationalRankingTable rankings={pageData.rankings} />
          </section>
        )}
      </div>
    </main>
  );
}
