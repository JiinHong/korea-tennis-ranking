import { unstable_cache } from "next/cache";

import { getClubConfig, type ClubSlug } from "./config";
import { getRankingDataForClub } from "./rankingData";

export type CampusRankingPromotionStats = Partial<Record<ClubSlug, number>>;

type RankingDataLoader = (
  club: NonNullable<ReturnType<typeof getClubConfig>>
) => Promise<{
  seasonSummaries: Array<{ matches: number }>;
}>;

const promotedClubSlugs: ClubSlug[] = ["petc", "seoultech"];

export async function getCampusRankingPromotionStats(
  loader: RankingDataLoader = getRankingDataForClub
): Promise<CampusRankingPromotionStats> {
  const entries = await Promise.all(
    promotedClubSlugs.map(async (slug) => {
      const club = getClubConfig(slug);

      if (!club) {
        return null;
      }

      try {
        const data = await loader(club);
        const totalMatches = data.seasonSummaries.reduce(
          (sum, season) => sum + season.matches,
          0
        );

        return [slug, totalMatches] as const;
      } catch {
        return null;
      }
    })
  );

  return Object.fromEntries(
    entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  );
}

export const getCachedCampusRankingPromotionStats = unstable_cache(
  getCampusRankingPromotionStats,
  ["campus-ranking-promotion-stats"],
  { revalidate: 300 }
);
