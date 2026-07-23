"use client";

import { Fragment, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { trackAmplitudeEvent } from "@/lib/amplitudeAnalytics";
import { parseRankingGender } from "@/lib/nationalRanking/genderQuery";
import {
  getCurrentKoreanYear,
  isRecentHonor,
} from "@/lib/nationalRanking/recentHonors";
import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";
import type { RankingGender } from "@/lib/nationalRanking/types";

import NationalRankingExpandedResults from "./NationalRankingExpandedResults";
import NationalRankingDivisionTabs, {
  rankingDivisionTabs,
} from "./NationalRankingDivisionTabs";
import NationalRankingHonor from "./NationalRankingHonor";

type NationalRankingTableProps = {
  rankings: NationalRankingPageData["rankings"];
};

const scoreFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

type RankTier = "gold" | "silver" | "bronze";

function getRankTier(rank: number): RankTier {
  if (rank === 1) {
    return "gold";
  }

  if (rank >= 2 && rank <= 10) {
    return "silver";
  }

  return "bronze";
}

export default function NationalRankingTable({
  rankings,
}: NationalRankingTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGender = parseRankingGender(searchParams.get("gender"), "men");
  const [activeGender, setActiveGender] = useState<RankingGender>(urlGender);
  const [expandedClubSlug, setExpandedClubSlug] = useState<string | null>(null);
  const recentHonorReferenceYear = getCurrentKoreanYear();
  const activeTab = rankingDivisionTabs.find(
    (tab) => tab.gender === activeGender
  )!;
  const rows = rankings[activeGender];

  const selectGender = (gender: RankingGender) => {
    void trackAmplitudeEvent("National Ranking Division Changed", {
      division: gender,
    });
    setActiveGender(gender);
    setExpandedClubSlug(null);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("gender", gender);
    router.replace(`/?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <section className="national-ranking-surface" aria-label="전국 동아리 랭킹">
      <div className="national-ranking-toolbar">
        <NationalRankingDivisionTabs
          activeGender={activeGender}
          ariaLabel="랭킹 부문"
          idPrefix="national-ranking-tab"
          onSelect={selectGender}
          panelId="national-ranking-panel"
        />
      </div>

      <div
        aria-labelledby={`national-ranking-tab-${activeGender}`}
        id="national-ranking-panel"
        role="tabpanel"
        tabIndex={0}
      >
        <table className="national-ranking-table">
          <caption className="visually-hidden">
            {activeTab.label} 전국 동아리 랭킹
          </caption>
          <colgroup>
            <col className="national-ranking-rank-column" />
            <col />
            <col className="national-ranking-score-column" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">순위</th>
              <th scope="col">동아리</th>
              <th scope="col">점수</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="national-ranking-empty" colSpan={3}>
                  공개된 랭킹이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const displayedHonors = row.honors.filter(
                  (honor) => isRecentHonor(honor, recentHonorReferenceYear)
                );
                const isExpanded = expandedClubSlug === row.clubSlug;
                const regionId = `national-ranking-${activeGender}-${row.clubSlug}-results`;
                const toggleClubResults = () => {
                  if (!isExpanded) {
                    void trackAmplitudeEvent("National Club Preview Opened", {
                      club_slug: row.clubSlug,
                      division: activeGender,
                      rank: row.rank,
                    });
                  }

                  setExpandedClubSlug((current) =>
                    current === row.clubSlug ? null : row.clubSlug
                  );
                };

                return (
                  <Fragment key={row.clubSlug}>
                    <tr
                      className="national-ranking-main-row"
                      data-expanded={isExpanded ? "true" : "false"}
                      onClick={(event) => {
                        if (
                          event.target instanceof Element &&
                          event.target.closest(".national-ranking-honor")
                        ) {
                          return;
                        }

                        toggleClubResults();
                      }}
                    >
                      <td
                        className="national-ranking-rank"
                        data-rank-tier={getRankTier(row.rank)}
                      >
                        {row.rank}
                      </td>
                      <td className="national-ranking-club-column">
                        <button
                          aria-controls={regionId}
                          aria-expanded={isExpanded}
                          aria-label={`${row.displayName} 최고 성적 ${
                            isExpanded ? "접기" : "펼치기"
                          }`}
                          className="national-ranking-club-disclosure"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleClubResults();
                          }}
                          type="button"
                        />
                        <span className="national-ranking-club-cell">
                          <span className="national-ranking-club">
                            <strong>{row.universityName}</strong>
                          </span>
                          <span
                            aria-hidden="true"
                            className="national-ranking-club-name"
                          >
                            {row.clubName}
                          </span>
                          {displayedHonors.length > 0 ? (
                            <span
                              aria-label="최근 1년 수상 기록"
                              className="national-ranking-honors"
                            >
                              {displayedHonors.map((honor) => (
                                <NationalRankingHonor
                                  honor={honor}
                                  key={`${honor.editionKey}-${honor.stage}`}
                                />
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="national-ranking-score">
                        {scoreFormatter.format(row.points)}
                      </td>
                    </tr>
                    <tr
                      className="national-ranking-detail-row"
                      data-open={isExpanded ? "true" : "false"}
                    >
                      <td colSpan={3}>
                        <NationalRankingExpandedResults
                          activeGender={activeGender}
                          bestResults={row.bestResults}
                          clubSlug={row.clubSlug}
                          displayName={row.displayName}
                          isOpen={isExpanded}
                          recentHonorReferenceYear={recentHonorReferenceYear}
                          regionId={regionId}
                        />
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
