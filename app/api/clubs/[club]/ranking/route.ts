import { getClubConfig } from "@/lib/clubs";
import { getRankingDataForClub } from "@/lib/rankingData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankingRouteContext = {
  params: Promise<{
    club: string;
  }>;
};

export async function GET(_request: Request, context: RankingRouteContext) {
  const { club: clubSlug } = await context.params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    return Response.json(
      {
        ok: false,
        message: "등록되지 않은 동아리입니다.",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const data = await getRankingDataForClub(club);

    return Response.json({
      ok: true,
      club: {
        slug: club.slug,
        title: club.title,
        organization: club.organization,
        subtitle: club.subtitle,
      },
      players: data.players,
      matches: data.matches,
      summary: data.summary,
      detailsByPlayer: data.detailsByPlayer,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        ok: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}
