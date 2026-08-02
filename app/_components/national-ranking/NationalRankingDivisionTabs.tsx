"use client";

import { type KeyboardEvent, useRef } from "react";

import type { RankingGender } from "@/lib/nationalRanking/types";

export const rankingDivisionTabs: Array<{
  gender: RankingGender;
  label: string;
}> = [
  { gender: "men", label: "남자부" },
  { gender: "women", label: "여자부" },
  { gender: "combined", label: "종합" },
];

type NationalRankingDivisionTabsProps = {
  activeGender: RankingGender;
  ariaLabel: string;
  idPrefix: string;
  onSelect: (gender: RankingGender) => void;
  panelId: string;
};

export default function NationalRankingDivisionTabs({
  activeGender,
  ariaLabel,
  idPrefix,
  onSelect,
  panelId,
}: NationalRankingDivisionTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    let targetIndex: number | null = null;

    if (event.key === "ArrowRight") {
      targetIndex = (currentIndex + 1) % rankingDivisionTabs.length;
    } else if (event.key === "ArrowLeft") {
      targetIndex =
        (currentIndex - 1 + rankingDivisionTabs.length) %
        rankingDivisionTabs.length;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = rankingDivisionTabs.length - 1;
    }

    if (targetIndex === null) {
      return;
    }

    event.preventDefault();
    onSelect(rankingDivisionTabs[targetIndex].gender);
    tabRefs.current[targetIndex]?.focus();
  };

  return (
    <div className="national-ranking-tabs" role="tablist" aria-label={ariaLabel}>
      {rankingDivisionTabs.map((tab, index) => (
        <button
          aria-controls={panelId}
          aria-selected={activeGender === tab.gender}
          id={`${idPrefix}-${tab.gender}`}
          key={tab.gender}
          onClick={() => onSelect(tab.gender)}
          onKeyDown={(event) => handleKeyDown(event, index)}
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
  );
}
