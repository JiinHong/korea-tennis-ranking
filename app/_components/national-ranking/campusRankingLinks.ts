export type CampusRankingLink = {
  campusClubSlug: "seoultech" | "petc";
  href: "/seoultech" | "/petc";
};

const campusRankingLinks = new Map<string, CampusRankingLink>([
  [
    "seoultech-neutinamu",
    { campusClubSlug: "seoultech", href: "/seoultech" },
  ],
  ["korea-petc", { campusClubSlug: "petc", href: "/petc" }],
]);

export function getCampusRankingLink(
  clubSlug: string
): CampusRankingLink | null {
  return campusRankingLinks.get(clubSlug) ?? null;
}
