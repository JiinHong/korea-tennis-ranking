import { getClubConfig } from "@/lib/campusRanking/config";

export type AnalyticsPageContext = {
  pageName: string;
  pagePath: string;
  pageType:
    | "national_ranking"
    | "ranking_methodology"
    | "national_club_results"
    | "campus_ranking"
    | "campus_match_history"
    | "campus_rules"
    | "player_profile";
  clubSlug?: string;
  nationalClubSlug?: string;
  playerName?: string;
};

function normalizePathname(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/";

  if (pathOnly === "/") {
    return pathOnly;
  }

  return pathOnly.replace(/\/+$/, "") || "/";
}

function safelyDecodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function getAnalyticsPageContext(
  pathname: string
): AnalyticsPageContext | null {
  const pagePath = normalizePathname(pathname);

  if (pagePath === "/") {
    return {
      pageName: "전국 대학 테니스 동아리 랭킹",
      pagePath,
      pageType: "national_ranking",
    };
  }

  if (pagePath === "/methodology") {
    return {
      pageName: "랭킹 계산 방식",
      pagePath,
      pageType: "ranking_methodology",
    };
  }

  const segments = pagePath.split("/").filter(Boolean);

  if (segments.length === 2 && segments[0] === "clubs") {
    return {
      nationalClubSlug: segments[1],
      pageName: "동아리 대회 성적",
      pagePath,
      pageType: "national_club_results",
    };
  }

  const club = getClubConfig(segments[0] ?? "");

  if (!club) {
    return null;
  }

  if (segments.length === 1) {
    return {
      clubSlug: club.slug,
      pageName: club.title,
      pagePath,
      pageType: "campus_ranking",
    };
  }

  if (segments.length === 2 && segments[1] === "matches") {
    return {
      clubSlug: club.slug,
      pageName: `${club.organization} 전체 경기`,
      pagePath,
      pageType: "campus_match_history",
    };
  }

  if (segments.length === 2 && segments[1] === "rules") {
    return {
      clubSlug: club.slug,
      pageName: `${club.organization} 운영 규칙`,
      pagePath,
      pageType: "campus_rules",
    };
  }

  if (
    segments.length === 3 &&
    segments[1] === "players" &&
    segments[2]
  ) {
    return {
      clubSlug: club.slug,
      pageName: `${club.organization} 선수 상세`,
      pagePath,
      pageType: "player_profile",
      playerName: safelyDecodePathSegment(segments[2]),
    };
  }

  return null;
}
