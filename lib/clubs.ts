export type ClubSlug = "seoultech";

export type ClubConfig = {
  slug: ClubSlug;
  title: string;
  organization: string;
  subtitle: string;
  sheetIdEnv: string;
  apiPath: string;
};

const clubConfigs: Record<ClubSlug, ClubConfig> = {
  seoultech: {
    slug: "seoultech",
    title: "단테랭",
    organization: "서울과학기술대학교 테니스",
    subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
    sheetIdEnv: "GOOGLE_SHEET_ID",
    apiPath: "/api/clubs/seoultech/ranking",
  },
};

export function getClubConfig(slug: string): ClubConfig | null {
  if (slug in clubConfigs) {
    return clubConfigs[slug as ClubSlug];
  }

  return null;
}

export function listClubConfigs(): ClubConfig[] {
  return Object.values(clubConfigs);
}
