import type { Metadata } from "next";

import { getClubConfig } from "@/lib/campusRanking/config";

const SITE_TITLE = "전국 대학 테니스 동아리 랭킹";
const SITE_NAME = "Korea Tennis Club Ranking";
const SOCIAL_IMAGE = {
  url: "/og-image-v2.png",
  width: 1540,
  height: 866,
  alt: SITE_NAME,
};

function createRouteMetadata(
  title: string,
  description: string,
  canonical: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "website",
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

function getCampusMetadataSource(clubSlug: string) {
  const club = getClubConfig(clubSlug);

  if (!club) {
    return {
      title: "캠퍼스 단식 랭킹",
      organization: "대학 테니스 동아리",
    };
  }

  return club;
}

export function createMethodologyMetadata(): Metadata {
  return createRouteMetadata(
    `랭킹 계산 방식 | ${SITE_TITLE}`,
    "전국 대학 테니스 동아리 랭킹의 대회별·연도별 점수 산정 기준을 확인하세요.",
    "/methodology",
  );
}

export function createCampusRankingMetadata(clubSlug: string): Metadata {
  const club = getCampusMetadataSource(clubSlug);

  return createRouteMetadata(
    club.title,
    `${club.organization}의 실시간 단식 랭킹과 경기 기록을 확인하세요.`,
    `/${clubSlug}`,
  );
}

export function createCampusMatchHistoryMetadata(clubSlug: string): Metadata {
  const club = getCampusMetadataSource(clubSlug);

  return createRouteMetadata(
    `전체 경기 | ${club.title}`,
    `${club.organization}의 전체 단식 경기 기록입니다.`,
    `/${clubSlug}/matches`,
  );
}

export function createCampusRulesMetadata(clubSlug: string): Metadata {
  const club = getCampusMetadataSource(clubSlug);

  return createRouteMetadata(
    `운영 규칙 | ${club.title}`,
    `${club.organization} 단식 랭킹의 도전, 순위 변동, 재경기와 월간 정산 규칙을 확인하세요.`,
    `/${clubSlug}/rules`,
  );
}

export function createPlayerProfileMetadata(
  clubSlug: string,
  playerName: string,
): Metadata {
  const club = getCampusMetadataSource(clubSlug);

  return createRouteMetadata(
    `${playerName} 선수 상세 | ${club.title}`,
    `${playerName} 선수의 통산 전적, 상대별 전적과 최근 경기 기록을 확인하세요.`,
    `/${clubSlug}/players/${encodeURIComponent(playerName)}`,
  );
}

export function createNationalClubResultsMetadata(
  clubSlug: string,
  clubDisplayName?: string,
): Metadata {
  const displayName = clubDisplayName ?? "동아리";

  return createRouteMetadata(
    `${displayName} 대회 성적 | ${SITE_TITLE}`,
    `${displayName}의 전국 대학 테니스 동아리 대회 성적을 확인하세요.`,
    `/clubs/${clubSlug}`,
  );
}
