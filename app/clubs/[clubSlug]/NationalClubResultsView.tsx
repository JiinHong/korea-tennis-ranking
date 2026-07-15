"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { trackAmplitudeEvent } from "@/lib/amplitudeAnalytics";
import type {
  NationalClubResultsPageData,
  PublicNationalClubResultStage,
} from "@/lib/nationalRanking/clubResults";
import { parseRankingGender } from "@/lib/nationalRanking/genderQuery";
import type { RankingGender } from "@/lib/nationalRanking/types";

import NationalPodiumCrown from "@/app/NationalPodiumCrown";
import NationalRankingDivisionTabs from "@/app/NationalRankingDivisionTabs";

type NationalClubResultsViewProps = {
  pageData: NationalClubResultsPageData;
};

const stageLabels: Readonly<Record<PublicNationalClubResultStage, string>> = {
  champion: "우승",
  runner_up: "준우승",
  semifinal: "4강",
  quarterfinal: "8강",
  round_of_16: "16강",
};

function isPodiumStage(
  stage: PublicNationalClubResultStage
): stage is Extract<
  PublicNationalClubResultStage,
  "champion" | "runner_up" | "semifinal"
> {
  return (
    stage === "champion" ||
    stage === "runner_up" ||
    stage === "semifinal"
  );
}

export default function NationalClubResultsView({
  pageData,
}: NationalClubResultsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGender = parseRankingGender(
    searchParams.get("gender"),
    "combined"
  );
  const [activeGender, setActiveGender] =
    useState<RankingGender>(initialGender);
  const visibleResults =
    activeGender === "combined"
      ? pageData.results
      : pageData.results.filter((result) => result.gender === activeGender);

  const selectGender = (gender: RankingGender) => {
    void trackAmplitudeEvent("National Club Results Division Changed", {
      club_slug: pageData.club.slug,
      division: gender,
    });
    setActiveGender(gender);
    router.replace(`/clubs/${pageData.club.slug}?gender=${gender}`, {
      scroll: false,
    });
  };

  return (
    <>
      <Link
        className="national-club-results-back"
        href={`/?gender=${activeGender}`}
      >
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
        <NationalRankingDivisionTabs
          activeGender={activeGender}
          ariaLabel="대회 성적 부문"
          idPrefix="national-club-results-tab"
          onSelect={selectGender}
          panelId="national-club-results-panel"
        />

        <div
          aria-labelledby={`national-club-results-tab-${activeGender}`}
          id="national-club-results-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <div className="national-club-results-title-row">
            <h2 id="club-results-title">대회 성적</h2>
            <span>{visibleResults.length}개 기록</span>
          </div>

          {visibleResults.length === 0 ? (
            <p className="national-club-results-empty">
              현재 확인된 16강 이상 성적이 없습니다.
            </p>
          ) : (
            <ul aria-label="대회 성적" className="national-club-results-list">
              {visibleResults.map((result) => {
                const crownStage = isPodiumStage(result.stage)
                  ? result.stage
                  : null;

                return (
                  <li
                    key={`${result.tournamentSlug}-${result.year}-${result.gender}-${result.sourceTeamName}`}
                  >
                    <span
                      aria-hidden="true"
                      className="national-club-result-crown"
                    >
                      {crownStage ? (
                        <NationalPodiumCrown decorative stage={crownStage} />
                      ) : null}
                    </span>
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
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
