import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createCampusMatchHistoryMetadata } from "@/lib/analytics/pageMetadata";
import { getClubConfig, listClubConfigs } from "@/lib/campusRanking/config";
import { getRankingDataForClub } from "@/lib/campusRanking/rankingData";

import CampusClubLogo from "../_components/CampusClubLogo";
import MatchListSection from "../_components/MatchListSection";
import NationalRankingBackLink from "../_components/NationalRankingBackLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MatchesPageProps = {
  params: Promise<{
    club: string;
  }>;
};

export async function generateMetadata({
  params,
}: MatchesPageProps): Promise<Metadata> {
  const { club: clubSlug } = await params;

  return createCampusMatchHistoryMetadata(clubSlug);
}

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
          <NationalRankingBackLink
            href={`/${club.slug}`}
            label={`${club.title}으로 돌아가기`}
          />
          <header className="topbar">
            <div className="brand-lockup">
              <div className="brand-title-row">
                <CampusClubLogo club={club} />
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
