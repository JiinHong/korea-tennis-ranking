"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import type { NationalRankingHonor as NationalRankingHonorRecord } from "@/lib/nationalRanking/types";

type NationalRankingHonorProps = {
  honor: NationalRankingHonorRecord;
};

const tournamentShortNames: Readonly<Record<string, string>> = {
  yanggu: "양구",
  gyeongin: "경인지구",
  inje: "인제",
  chuncheon: "춘천",
  wemix: "위믹스",
};

function getHonorLabel(honor: NationalRankingHonorRecord): string {
  const tournamentName =
    tournamentShortNames[honor.tournamentSlug] ?? honor.tournamentName;
  const gender = honor.gender === "men" ? "남자부" : "여자부";
  const result = honor.stage === "champion" ? "우승" : "준우승";

  return `${honor.year} ${tournamentName} ${gender} ${result}`;
}

export default function NationalRankingHonor({
  honor,
}: NationalRankingHonorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = getHonorLabel(honor);
  const isChampion = honor.stage === "champion";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeWhenPressingOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const closeWhenPressingEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeWhenPressingOutside);
    document.addEventListener("keydown", closeWhenPressingEscape);

    return () => {
      document.removeEventListener("pointerdown", closeWhenPressingOutside);
      document.removeEventListener("keydown", closeWhenPressingEscape);
    };
  }, [isOpen]);

  return (
    <span
      className="national-ranking-honor"
      data-open={isOpen ? "true" : "false"}
      ref={containerRef}
    >
      <button
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        aria-label={label}
        className="national-ranking-honor-trigger"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
        type="button"
      >
        <Image
          alt={isChampion ? "우승" : "준우승"}
          height={18}
          src={
            isChampion
              ? "/national-ranking/gold-crown.png"
              : "/national-ranking/silver-crown.png"
          }
          width={23}
        />
      </button>

      <span
        className="national-ranking-honor-tooltip"
        data-open={isOpen ? "true" : "false"}
        id={tooltipId}
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}
