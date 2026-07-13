import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getCachedNationalClubResultsPageData,
  type PublicNationalClubResultStage,
} from "@/lib/nationalRanking/clubResults";

type NationalClubResultsPageProps = {
  params: Promise<{
    clubSlug: string;
  }>;
};

const stageLabels: Readonly<Record<PublicNationalClubResultStage, string>> = {
  champion: "우승",
  runner_up: "준우승",
  semifinal: "4강",
  quarterfinal: "8강",
  round_of_16: "16강",
};

export default async function NationalClubResultsPage({
  params,
}: NationalClubResultsPageProps) {
  const { clubSlug } = await params;
  const pageData = await getCachedNationalClubResultsPageData(clubSlug);

  if (!pageData) {
    notFound();
  }

  return (
    <main className="national-page national-club-results-page">
      <div className="national-shell">
        <Link className="national-club-results-back" href="/">
          <span aria-hidden="true">←</span>
          전국 랭킹으로 돌아가기
        </Link>

        <header className="national-club-results-header">
          <span className="national-kicker">CLUB TOURNAMENT RESULTS</span>
          <h1>{pageData.club.displayName}</h1>
          <p>16강 이상 대회 최고 성적</p>
        </header>

        <section
          aria-labelledby="club-results-title"
          className="national-club-results-section"
        >
          <div className="national-club-results-title-row">
            <h2 id="club-results-title">대회 성적</h2>
            <span>{pageData.results.length}개 기록</span>
          </div>

          {pageData.results.length === 0 ? (
            <p className="national-club-results-empty">
              현재 확인된 16강 이상 성적이 없습니다.
            </p>
          ) : (
            <ul aria-label="대회 성적" className="national-club-results-list">
              {pageData.results.map((result) => (
                <li
                  key={`${result.tournamentSlug}-${result.year}-${result.gender}`}
                >
                  <div className="national-club-result-edition">
                    <strong>{result.year}</strong>
                    <span>{result.gender === "men" ? "남자부" : "여자부"}</span>
                  </div>
                  <div className="national-club-result-competition">
                    <strong>{result.tournamentName}</strong>
                    <span>출전명 {result.sourceTeamName}</span>
                  </div>
                  <strong className="national-club-result-stage">
                    {stageLabels[result.stage]}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
