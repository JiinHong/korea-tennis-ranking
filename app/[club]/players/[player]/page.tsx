import type { Metadata } from "next";
import { getClubConfig } from "@/lib/campusRanking/config";
import { getRankingDataForClub } from "@/lib/campusRanking/rankingData";
import { createPlayerProfileMetadata } from "@/lib/analytics/pageMetadata";
import { notFound } from "next/navigation";

import PlayerDetailView from "../../_components/PlayerDetailView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlayerPageProps = {
  params: Promise<{
    club: string;
    player: string;
  }>;
};

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const { club: clubSlug, player } = await params;

  return createPlayerProfileMetadata(clubSlug, decodeURIComponent(player));
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { club: clubSlug, player } = await params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    notFound();
  }

  const playerName = decodeURIComponent(player);
  const rankingData = await getRankingDataForClub(club);
  const detail = rankingData.detailsByPlayer[playerName];

  if (!detail) {
    notFound();
  }

  return <PlayerDetailView club={club} detail={detail} />;
}
