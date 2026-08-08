import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createNationalClubResultsMetadata } from "@/lib/analytics/pageMetadata";
import { getCachedNationalClubResultsPageData } from "@/lib/nationalRanking/clubResults";

import NationalClubResultsView from "./_components/NationalClubResultsView";

type NationalClubResultsPageProps = {
  params: Promise<{
    clubSlug: string;
  }>;
};

export async function generateMetadata({
  params,
}: NationalClubResultsPageProps): Promise<Metadata> {
  const { clubSlug } = await params;
  const pageData = await getCachedNationalClubResultsPageData(clubSlug);

  return createNationalClubResultsMetadata(
    clubSlug,
    pageData?.club.displayName,
  );
}

export default async function NationalClubResultsPage({
  params,
}: NationalClubResultsPageProps) {
  const { clubSlug } = await params;
  const pageData = await getCachedNationalClubResultsPageData(clubSlug);

  if (!pageData) {
    notFound();
  }

  return (
    <main className="national-page national-club-results-page">
      <div className="national-shell">
        <Suspense
          fallback={
            <div className="national-ranking-loading" role="status">
              대회 성적을 정리하고 있습니다.
            </div>
          }
        >
          <NationalClubResultsView pageData={pageData} />
        </Suspense>
      </div>
    </main>
  );
}
