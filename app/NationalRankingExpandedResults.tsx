"use client";

import Link from "next/link";

import { trackAmplitudeEvent } from "@/lib/amplitudeAnalytics";
import type {
  NationalRankingBestResult,
  PublicTournamentResultStage,
  RankingGender,
} from "@/lib/nationalRanking/types";

import NationalPodiumCrown from "./NationalPodiumCrown";

type NationalRankingExpandedResultsProps = {
  activeGender: RankingGender;
  bestResults: NationalRankingBestResult[];
  clubSlug: string;
  displayName: string;
  isOpen: boolean;
  regionId: string;
};

const stageLabels: Record<PublicTournamentResultStage, string> = {
  champion: "우승",
  runner_up: "준우승",
  semifinal: "4강",
  quarterfinal: "8강",
  round_of_16: "16강",
};

const genderLabels = {
  men: "남자부",
  women: "여자부",
} as const;

function isPodiumStage(
  stage: PublicTournamentResultStage
): stage is Extract<
  PublicTournamentResultStage,
  "champion" | "runner_up" | "semifinal"
> {
  return (
    stage === "champion" ||
    stage === "runner_up" ||
    stage === "semifinal"
  );
}

export default function NationalRankingExpandedResults({
  activeGender,
  bestResults,
  clubSlug,
  displayName,
  isOpen,
  regionId,
}: NationalRankingExpandedResultsProps) {
  const visibleResults = bestResults.slice(0, 3);

  return (
    <div className="national-ranking-expansion">
      <div className="national-ranking-expansion-clip">
        <div
          aria-hidden={!isOpen}
          aria-label={`${displayName} 최고 성적`}
          className="national-ranking-expanded-results"
          id={regionId}
          role="region"
        >
          {visibleResults.length > 0 ? (
            <ol className="national-ranking-best-results">
              {visibleResults.map((result) => {
                const crownStage =
                  result.year === 2025 && isPodiumStage(result.stage)
                    ? result.stage
                    : null;

                return (
                  <li key={result.editionKey}>
                    <span
                      aria-hidden="true"
                      className="national-ranking-best-result-crown"
                    >
                      {crownStage ? (
                        <NationalPodiumCrown decorative stage={crownStage} />
                      ) : null}
                    </span>
                    <span className="national-ranking-best-result-main">
                      <strong>
                        {result.year} {result.tournamentName}
                      </strong>
                      <span>
                        {genderLabels[result.gender]} · {stageLabels[result.stage]}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="national-ranking-best-results-empty">
              기록된 16강 이상 성적이 없습니다.
            </p>
          )}

          <Link
            className="national-ranking-results-link"
            href={`/clubs/${clubSlug}?gender=${activeGender}`}
            onClick={() => {
              void trackAmplitudeEvent("National Club Results Opened", {
                club_slug: clubSlug,
                division: activeGender,
              });
            }}
            tabIndex={isOpen ? 0 : -1}
          >
            전체 성적 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
