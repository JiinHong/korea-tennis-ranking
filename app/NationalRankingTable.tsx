"use client";

import { type KeyboardEvent, useRef, useState } from "react";

import type { NationalRankingPageData } from "@/lib/nationalRanking/repository";
import type { RankingGender } from "@/lib/nationalRanking/types";

type NationalRankingTableProps = {
  rankings: NationalRankingPageData["rankings"];
};

const tabs: Array<{ gender: RankingGender; label: string }> = [
  { gender: "men", label: "남자부" },
  { gender: "women", label: "여자부" },
  { gender: "combined", label: "종합" },
];

const scoreFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
});

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
              className={tab.gender === "combined" ? "is-secondary" : undefined}
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
        {activeGender === "combined" ? (
          <span className="national-ranking-secondary-label">보조 랭킹</span>
        ) : null}
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
              rows.map((row) => (
                <tr key={row.clubSlug}>
                  <td className="national-ranking-rank">{row.rank}</td>
                  <td>
                    <span className="national-ranking-club">
                      <strong>{row.universityName}</strong>
                      <span>{row.clubName}</span>
                    </span>
                  </td>
                  <td className="national-ranking-score">
                    {scoreFormatter.format(row.points)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
