"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { trackAmplitudeEvent } from "@/lib/amplitudeAnalytics";
import { parseRankingGender } from "@/lib/nationalRanking/genderQuery";
import { getCampusResultsHref } from "./CampusResultsBackLink";

const resultLinkLabels: Readonly<Record<string, string>> = {
  seoultech: "느티나무 대회 기록 확인하기",
  petc: "PETC 대회 기록 확인하기",
};

export default function CampusResultUpdateLink({
  clubSlug,
}: {
  clubSlug: string;
}) {
  const searchParams = useSearchParams();
  const gender = parseRankingGender(searchParams.get("fromGender"), "combined");
  const label = resultLinkLabels[clubSlug] ?? "대회 기록 확인하기";

  return (
    <aside className="campus-result-update" aria-label="대회 결과 업데이트">
      <span className="campus-result-update-kicker">Tournament update</span>
      <strong className="campus-result-update-title">
        2026 하늘내린인제 결과가 반영됐어요
      </strong>
      <Link
        className="campus-result-update-link"
        href={getCampusResultsHref(clubSlug, gender)}
        onClick={() => {
          void trackAmplitudeEvent("Campus Tournament Results Opened", {
            club_slug: clubSlug,
            source: "ranking_result_update",
            division: gender,
          });
        }}
      >
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
}
