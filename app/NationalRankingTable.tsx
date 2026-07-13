"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import Link from "next/link";

import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";
import type { RankingGender } from "@/lib/nationalRanking/types";

import NationalRankingHonor from "./NationalRankingHonor";

type NationalRankingTableProps = {
  rankings: NationalRankingPageData["rankings"];
};

const tabs: Array<{ gender: RankingGender; label: string }> = [
  { gender: "men", label: "남자부" },
  { gender: "women", label: "여자부" },
  { gender: "combined", label: "종합" },
];

const scoreFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

const DISPLAY_HONOR_YEAR = 2025;

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
  const [activeGender, setActiveGender] = useState<RankingGender>("men");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeTab = tabs.find((tab) => tab.gender === activeGender)!;
  const rows = rankings[activeGender];

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let targetIndex: number | null = null;

    if (event.key === "ArrowRight") {
      targetIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex === null) {
      return;
    }

    event.preventDefault();
    setActiveGender(tabs[targetIndex].gender);
    tabRefs.current[targetIndex]?.focus();
  };

  return (
    <section className="national-ranking-surface" aria-label="전국 동아리 랭킹">
      <div className="national-ranking-toolbar">
        <div className="national-ranking-tabs" role="tablist" aria-label="랭킹 부문">
          {tabs.map((tab, index) => (
            <button
              aria-controls="national-ranking-panel"
              aria-selected={activeGender === tab.gender}
              id={`national-ranking-tab-${tab.gender}`}
              key={tab.gender}
              onClick={() => setActiveGender(tab.gender)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              tabIndex={activeGender === tab.gender ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        aria-labelledby={`national-ranking-tab-${activeGender}`}
        id="national-ranking-panel"
        role="tabpanel"
        tabIndex={0}
      >
        <table className="national-ranking-table">
          <caption className="visually-hidden">{activeTab.label} 전국 동아리 랭킹</caption>
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
                  (honor) => honor.year === DISPLAY_HONOR_YEAR
                );

                return (
                  <tr key={row.clubSlug}>
                    <td
                      className="national-ranking-rank"
                      data-rank-tier={getRankTier(row.rank)}
                    >
                      {row.rank}
                    </td>
                    <td className="national-ranking-club-column">
                      <span className="national-ranking-club-cell">
                        <Link
                          aria-label={`${row.displayName} 대회 성적 보기`}
                          className="national-ranking-club-link"
                          href={`/clubs/${row.clubSlug}`}
                        >
                          <span className="national-ranking-club">
                            <strong>{row.universityName}</strong>
                          </span>
                        </Link>
                        <span
                          aria-hidden="true"
                          className="national-ranking-club-name"
                        >
                          {row.clubName}
                        </span>
                        {displayedHonors.length > 0 ? (
                          <span
                            aria-label="2025년 수상 기록"
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
