import { getClubConfig } from "@/lib/clubs";
import { getRankingDataForClub } from "@/lib/rankingData";
import { notFound } from "next/navigation";

import PlayerDetailView from "../../PlayerDetailView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlayerPageProps = {
  params: Promise<{
    club: string;
    player: string;
  }>;
};

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
