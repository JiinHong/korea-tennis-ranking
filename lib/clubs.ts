export type ClubSlug = "seoultech";

export type ClubConfig = {
  slug: ClubSlug;
  title: string;
  titleLines: string[];
  organization: string;
  subtitle: string;
  logoPath: string;
  logoAlt: string;
  sheetIdEnv: string;
  apiPath: string;
};

const clubConfigs: Record<ClubSlug, ClubConfig> = {
  seoultech: {
    slug: "seoultech",
    title: "서울과학기술대학교 테니스 단식 랭킹",
    titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
    organization: "서울과학기술대학교 테니스",
    subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
    logoPath: "/seoultech-logo.png",
    logoAlt: "서울과학기술대학교 로고",
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
