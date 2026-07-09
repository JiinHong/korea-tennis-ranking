import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubConfig, listClubConfigs } from "@/lib/clubs";
import { getRankingDataForClub } from "@/lib/rankingData";

import MatchListSection from "../MatchListSection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MatchesPageProps = {
  params: Promise<{
    club: string;
  }>;
};

export function generateStaticParams() {
  return listClubConfigs().map((club) => ({
    club: club.slug,
  }));
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  const { club: clubSlug } = await params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    notFound();
  }

  const rankingData = await getRankingDataForClub(club);

  return (
    <main className="ranking-page campus-ranking-page matches-page">
      <section className="summary-band campus-hero-band player-detail-hero">
        <div className="summary-inner">
          <header className="topbar">
            <div className="brand-lockup">
              <div className="brand-title-row">
                <Image
                  src={club.logoPath}
                  alt={club.logoAlt}
                  width={48}
                  height={48}
                  priority
                />
                <div className="brand-title-stack">
                  <h1>전체 경기</h1>
                  <p className="matches-page-subtitle">{club.organization}</p>
                </div>
              </div>
            </div>
          </header>
        </div>
      </section>

      <div className="content-shell">
        <Link className="matches-back-link" href={`/${club.slug}`}>
          랭킹으로 돌아가기
        </Link>

        <MatchListSection
          matches={rankingData.matches}
          title="전체 경기 기록"
          eyebrow="Match log"
          ariaLabel="전체 경기 기록"
        />
      </div>
    </main>
  );
}
