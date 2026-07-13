import Link from "next/link";

import { getCachedNationalRankingPageData } from "@/lib/nationalRanking/repository";

import NationalRankingTable from "./NationalRankingTable";

const rankingPeriodFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
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
            <p className="national-header-description">
              국토정중앙배(양구), 경인지구 연맹전, 춘천소양강배,
              하늘내린인제, WEMIX OPEN의 성적을 바탕으로 산정합니다.
            </p>
            <Link className="national-methodology-link" href="/methodology">
              랭킹 계산 방식 보기
            </Link>
          </div>
        </header>

        {readFailed ? (
          <section className="national-status" role="alert">
            <p>전국 랭킹을 불러오지 못했습니다.</p>
            <Link href="/">다시 시도</Link>
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
              </div>
              <time
                className="national-ranking-reference-date"
                dateTime={pageData.calculatedAt}
              >
                ※ {rankingPeriodFormatter.format(new Date(pageData.calculatedAt))} 기준
              </time>
            </div>
            <NationalRankingTable rankings={pageData.rankings} />
          </section>
        )}
      </div>
    </main>
  );
}
