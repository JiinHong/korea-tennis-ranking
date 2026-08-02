export type ClubSlug = "seoultech" | "petc";

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
  currentSeasonName: string;
  currentSeasonStartsOn: string;
  historicalMatchLogRange?: string;
};

const clubConfigs: Record<ClubSlug, ClubConfig> = {
  seoultech: {
    slug: "seoultech",
    title: "서울과학기술대학교 테니스 단식 랭킹",
    titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
    organization: "서울과학기술대학교 테니스",
    subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
    logoPath: "/seoultech-symbol.png",
    logoAlt: "서울과학기술대학교 로고",
    sheetIdEnv: "GOOGLE_SHEET_ID",
    apiPath: "/api/clubs/seoultech/ranking",
    currentSeasonName: "시즌3",
    currentSeasonStartsOn: "2026-07-01",
    historicalMatchLogRange: "'시즌1~2 기록'!A1:J1000",
  },
  petc: {
    slug: "petc",
    title: "고려대학교 체육교육과 PETC 테니스 단식 랭킹",
    titleLines: ["고려대학교 체육교육과 PETC", "테니스 단식 랭킹"],
    organization: "고려대학교 체육교육과 PETC",
    subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
    logoPath: "/petc-logo.png",
    logoAlt: "고려대학교 체육교육과 PETC 로고",
    sheetIdEnv: "PETC_GOOGLE_SHEET_ID",
    apiPath: "/api/clubs/petc/ranking",
    currentSeasonName: "현재",
    currentSeasonStartsOn: "2026-07-01",
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
