import { notFound } from "next/navigation";

import { getClubConfig, listClubConfigs } from "@/lib/clubs";

import ClubRankingClient from "./ClubRankingClient";

type ClubPageProps = {
  params: Promise<{
    club: string;
  }>;
};

export function generateStaticParams() {
  return listClubConfigs().map((club) => ({
    club: club.slug,
  }));
}

export default async function ClubPage({ params }: ClubPageProps) {
  const { club: clubSlug } = await params;
  const club = getClubConfig(clubSlug);

  if (!club) {
    notFound();
  }

  return <ClubRankingClient club={club} />;
}
