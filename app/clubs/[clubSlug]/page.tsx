import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getCachedNationalClubResultsPageData } from "@/lib/nationalRanking/clubResults";

import NationalClubResultsView from "./NationalClubResultsView";

type NationalClubResultsPageProps = {
  params: Promise<{
    clubSlug: string;
  }>;
};

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
