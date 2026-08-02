"use client";

import { useSearchParams } from "next/navigation";

import { parseRankingGender } from "@/lib/nationalRanking/genderQuery";
import type { RankingGender } from "@/lib/nationalRanking/types";
import NationalRankingBackLink from "./NationalRankingBackLink";

const nationalClubPaths: Readonly<Record<string, string>> = {
  seoultech: "/clubs/seoultech-neutinamu",
  petc: "/clubs/korea-petc",
};

const campusResultsLabels: Readonly<Record<string, string>> = {
  seoultech: "느티나무 대회 성적 보러가기",
  petc: "PETC 대회 성적 보러가기",
};

export function getCampusResultsBackLabel(clubSlug: string) {
  return campusResultsLabels[clubSlug] ?? "대회 성적 보러가기";
}

export function getCampusResultsHref(
  clubSlug: string,
  gender: RankingGender
) {
  const clubPath = nationalClubPaths[clubSlug];

  if (!clubPath) {
    return "https://koreatennisranking.com/";
  }

  return `${clubPath}?gender=${gender}`;
}

export default function CampusResultsBackLink({
  clubSlug,
}: {
  clubSlug: string;
}) {
  const searchParams = useSearchParams();
  const gender = parseRankingGender(searchParams.get("fromGender"), "combined");

  return (
    <NationalRankingBackLink
      className="campus-results-link"
      href={getCampusResultsHref(clubSlug, gender)}
      label={getCampusResultsBackLabel(clubSlug)}
      showLabel
    />
  );
}
