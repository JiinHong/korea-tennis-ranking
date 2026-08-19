import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  NationalRankingDataset,
  ResultQualityStatus,
  TeamResultInput,
  TournamentStage,
} from "../../lib/nationalRanking/types";

const DATASET_PATH = resolve("data/national-ranking/v1/dataset.json");
const INPUT_VERSION = "sources-2026-08-08-v19";
const OUTPUT_VERSION = "sources-2026-08-20-v20";
const MEN_EDITION_KEY = "yanggu-2026-men";
const WOMEN_EDITION_KEY = "yanggu-2026-women";
const MEN_SOURCE =
  "양구/2026/남자/Draw 제40회 국토정중앙배 전국대학동아리 테니스대회 Final.pdf";
const WOMEN_SOURCE =
  "양구/2026/여자/Draw 제40회 국토정중앙배 전국대학동아리 테니스대회 Final.pdf";

type Entrant = {
  slot: number;
  sourceTeamName: string;
  teamLabel: string;
  clubSlug: string | null;
  stage: TournamentStage;
  qualityStatus?: ResultQualityStatus;
  sourceEntryId?: string;
  note?: string;
};

const men: Entrant[] = [
  { slot: 1, sourceTeamName: "전북대 Ace A [1]", teamLabel: "A", clubSlug: "jeonbuk-ace", stage: "quarterfinal" },
  { slot: 3, sourceTeamName: "중앙대 A", teamLabel: "A", clubSlug: "chungang-love4t", stage: "first_match_loss" },
  { slot: 5, sourceTeamName: "타이브레이크 A", teamLabel: "A", clubSlug: "gachon-tiebreak", stage: "first_match_loss" },
  { slot: 7, sourceTeamName: "Kuta A", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "round_of_32" },
  { slot: 9, sourceTeamName: "수원대 A", teamLabel: "A", clubSlug: "suwon-ace", stage: "round_of_32" },
  { slot: 11, sourceTeamName: "피트", teamLabel: "", clubSlug: "kau-ace", stage: "round_of_64" },
  { slot: 12, sourceTeamName: "한밭대 B", teamLabel: "B", clubSlug: "hanbat-masters", stage: "first_match_loss" },
  { slot: 13, sourceTeamName: "경기대 B", teamLabel: "B", clubSlug: "gyeonggi-ktf", stage: "first_match_loss" },
  { slot: 15, sourceTeamName: "Dkutc B", teamLabel: "B", clubSlug: "dankook-jukjeon-dkutc", stage: "round_of_16" },
  { slot: 17, sourceTeamName: "임팩트 A", teamLabel: "A", clubSlug: "kyunghee-engineering-impact", stage: "first_match_loss" },
  { slot: 19, sourceTeamName: "러비스 A", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "round_of_32" },
  { slot: 21, sourceTeamName: "서강대a", teamLabel: "A", clubSlug: "sogang-sgtc", stage: "semifinal" },
  { slot: 23, sourceTeamName: "국민대 A", teamLabel: "A", clubSlug: "kookmin-kmtc", stage: "first_match_loss" },
  { slot: 25, sourceTeamName: "성균관대 A", teamLabel: "A", clubSlug: "sungkyunkwan-stc", stage: "round_of_16" },
  { slot: 27, sourceTeamName: "전북대 Topspin A", teamLabel: "A", clubSlug: "jeonbuk-topspin", stage: "round_of_64" },
  { slot: 28, sourceTeamName: "국민대 B", teamLabel: "B", clubSlug: "kookmin-kmtc", stage: "first_match_loss" },
  { slot: 29, sourceTeamName: "서강대b", teamLabel: "B", clubSlug: "sogang-sgtc", stage: "first_match_loss" },
  { slot: 31, sourceTeamName: "Dutc", teamLabel: "", clubSlug: "dongguk-dutc", stage: "round_of_32" },
  { slot: 33, sourceTeamName: "느티나무 A [3]", teamLabel: "A", clubSlug: "seoultech-neutinamu", stage: "champion" },
  { slot: 35, sourceTeamName: "임팩트 B", teamLabel: "B", clubSlug: "kyunghee-engineering-impact", stage: "first_match_loss" },
  { slot: 37, sourceTeamName: "자유", teamLabel: "자유", clubSlug: "yonsei-yutt", stage: "first_match_loss" },
  { slot: 39, sourceTeamName: "위너술 A", teamLabel: "A", clubSlug: "hannam-winners", stage: "round_of_32" },
  { slot: 41, sourceTeamName: "인천대 A", teamLabel: "A", clubSlug: "inu-uitc", stage: "round_of_32" },
  { slot: 43, sourceTeamName: "어프로치 A", teamLabel: "A", clubSlug: "uos-approach", stage: "round_of_64" },
  { slot: 44, sourceTeamName: "어프로치 B", teamLabel: "B", clubSlug: "uos-approach", stage: "first_match_loss" },
  { slot: 45, sourceTeamName: "Petc A", teamLabel: "A", clubSlug: "korea-petc", stage: "first_match_loss" },
  { slot: 47, sourceTeamName: "백령", teamLabel: "", clubSlug: "kangwon-baekryeong", stage: "round_of_16", note: "강원대학교 공식 2026년 중앙동아리 목록의 백령테니스로 확인했습니다." },
  { slot: 49, sourceTeamName: "Hitc B", teamLabel: "B", clubSlug: "hongik-hitc", stage: "first_match_loss" },
  { slot: 51, sourceTeamName: "Uostc B", teamLabel: "B", clubSlug: "uos-approach", stage: "round_of_32" },
  { slot: 53, sourceTeamName: "한밭대 A", teamLabel: "A", clubSlug: "hanbat-masters", stage: "round_of_16" },
  { slot: 55, sourceTeamName: "인천대 B", teamLabel: "B", clubSlug: "inu-uitc", stage: "first_match_loss" },
  { slot: 57, sourceTeamName: "서울대 A", teamLabel: "A", clubSlug: "seoul-university", stage: "quarterfinal" },
  { slot: 59, sourceTeamName: "Petc B", teamLabel: "B", clubSlug: "korea-petc", stage: "round_of_64" },
  { slot: 60, sourceTeamName: "인하대 B", teamLabel: "B", clubSlug: "inha-rapum", stage: "first_match_loss" },
  { slot: 61, sourceTeamName: "굿샷 A", teamLabel: "A", clubSlug: "chungnam-goodshot", stage: "round_of_32" },
  { slot: 63, sourceTeamName: "Mtc A", teamLabel: "A", clubSlug: "myongji-mjta-mtc", stage: "first_match_loss" },
  { slot: 66, sourceTeamName: "카이스트 B", teamLabel: "B", clubSlug: "kaist-stroke", stage: "first_match_loss" },
  { slot: 68, sourceTeamName: "한국교원대 테니스부", teamLabel: "", clubSlug: "knue-tennis", stage: "quarterfinal" },
  { slot: 69, sourceTeamName: "느티나무 B", teamLabel: "B", clubSlug: "seoultech-neutinamu", stage: "first_match_loss" },
  { slot: 70, sourceTeamName: "세종대 Stc A", teamLabel: "A", clubSlug: "sejong-stc", stage: "round_of_32" },
  { slot: 72, sourceTeamName: "타이브레이크 B", teamLabel: "B", clubSlug: "gachon-tiebreak", stage: "first_match_loss" },
  { slot: 74, sourceTeamName: "가톨릭대 B", teamLabel: "B", clubSlug: "catholic-courtrang", stage: "first_match_loss" },
  { slot: 76, sourceTeamName: "카이스트 A", teamLabel: "A", clubSlug: "kaist-stroke", stage: "round_of_32" },
  { slot: 77, sourceTeamName: "Ace", teamLabel: "", clubSlug: "chungbuk-ace", stage: "round_of_64" },
  { slot: 78, sourceTeamName: "러비스 B", teamLabel: "B", clubSlug: "kyunghee-kuta-lovice", stage: "first_match_loss" },
  { slot: 80, sourceTeamName: "건덕이", teamLabel: "", clubSlug: "konkuk-ktc", stage: "round_of_16" },
  { slot: 82, sourceTeamName: "가톨릭대 A", teamLabel: "A", clubSlug: "catholic-courtrang", stage: "first_match_loss" },
  { slot: 84, sourceTeamName: "Hytc B", teamLabel: "B", clubSlug: "hanyang-hytc", stage: "round_of_16" },
  { slot: 85, sourceTeamName: "건구스", teamLabel: "", clubSlug: "konkuk-ktc", stage: "first_match_loss" },
  { slot: 86, sourceTeamName: "한양대 에리카 A", teamLabel: "A", clubSlug: "hanyang-erica-hitec", stage: "round_of_32" },
  { slot: 88, sourceTeamName: "Uostc A", teamLabel: "A", clubSlug: "uos-approach", stage: "first_match_loss" },
  { slot: 90, sourceTeamName: "한양대 에리카 B", teamLabel: "B", clubSlug: "hanyang-erica-hitec", stage: "first_match_loss" },
  { slot: 92, sourceTeamName: "Dkutc A", teamLabel: "A", clubSlug: "dankook-jukjeon-dkutc", stage: "round_of_32" },
  { slot: 94, sourceTeamName: "중앙대 B", teamLabel: "B", clubSlug: "chungang-love4t", stage: "first_match_loss" },
  { slot: 96, sourceTeamName: "진리 [3]", teamLabel: "진리", clubSlug: "yonsei-yutt", stage: "semifinal" },
  { slot: 98, sourceTeamName: "한국외대 B", teamLabel: "B", clubSlug: "hufs-ace", stage: "first_match_loss" },
  { slot: 100, sourceTeamName: "Hytc A", teamLabel: "A", clubSlug: "hanyang-hytc", stage: "quarterfinal" },
  { slot: 101, sourceTeamName: "성균관대 B", teamLabel: "B", clubSlug: "sungkyunkwan-stc", stage: "first_match_loss" },
  { slot: 102, sourceTeamName: "Hitc A", teamLabel: "A", clubSlug: "hongik-hitc", stage: "round_of_32" },
  { slot: 104, sourceTeamName: "Yuta", teamLabel: "", clubSlug: "yeungnam-yuta", stage: "first_match_loss" },
  { slot: 106, sourceTeamName: "아주대 A", teamLabel: "A", clubSlug: "ajou-tennis", stage: "round_of_16" },
  { slot: 108, sourceTeamName: "경기대 A", teamLabel: "A", clubSlug: "gyeonggi-ktf", stage: "first_match_loss" },
  { slot: 110, sourceTeamName: "Kuta B", teamLabel: "B", clubSlug: "kyunghee-kuta-lovice", stage: "first_match_loss" },
  { slot: 112, sourceTeamName: "서울대 B", teamLabel: "B", clubSlug: "seoul-university", stage: "round_of_32" },
  { slot: 114, sourceTeamName: "한림대", teamLabel: "", clubSlug: "hallym-tiebreak", stage: "round_of_32", note: "한림대학교 공식 동아리 목록의 테니스 동아리 Tie-break로 확인했습니다." },
  { slot: 116, sourceTeamName: "Kutc B", teamLabel: "B", clubSlug: "korea-kutc", stage: "first_match_loss" },
  { slot: 117, sourceTeamName: "한국외대 A", teamLabel: "A", clubSlug: "hufs-ace", stage: "round_of_64" },
  { slot: 118, sourceTeamName: "광운대 A", teamLabel: "A", clubSlug: "kwangwoon-kwtc", stage: "first_match_loss" },
  { slot: 120, sourceTeamName: "경북대 A", teamLabel: "A", clubSlug: "kyungpook-kutc", stage: "round_of_16" },
  { slot: 122, sourceTeamName: "마하", teamLabel: "", clubSlug: "kau-ace", stage: "round_of_32" },
  { slot: 124, sourceTeamName: "인하대 A", teamLabel: "A", clubSlug: "inha-rapum", stage: "first_match_loss" },
  { slot: 126, sourceTeamName: "아주대 B", teamLabel: "B", clubSlug: "ajou-tennis", stage: "first_match_loss" },
  { slot: 128, sourceTeamName: "Kutc A [2]", teamLabel: "A", clubSlug: "korea-kutc", stage: "runner_up" },
];

const women: Entrant[] = [
  { slot: 1, sourceTeamName: "느티나무 A [1]", teamLabel: "A", clubSlug: "seoultech-neutinamu", stage: "runner_up" },
  { slot: 3, sourceTeamName: "한국교원대 테니스부", teamLabel: "", clubSlug: "knue-tennis", stage: "first_match_loss" },
  { slot: 4, sourceTeamName: "국민대", teamLabel: "", clubSlug: "kookmin-kmtc", stage: "round_of_32" },
  { slot: 5, sourceTeamName: "자유", teamLabel: "자유", clubSlug: "yonsei-yutt", stage: "round_of_32" },
  { slot: 6, sourceTeamName: "Uostc B", teamLabel: "B", clubSlug: "uos-approach", stage: "first_match_loss" },
  { slot: 7, sourceTeamName: "중앙대", teamLabel: "", clubSlug: "chungang-love4t", stage: "round_of_16" },
  { slot: 8, sourceTeamName: "Approach B", teamLabel: "B", clubSlug: "uos-approach", stage: "first_match_loss" },
  { slot: 9, sourceTeamName: "아주대 A", teamLabel: "A", clubSlug: "ajou-tennis", stage: "round_of_32" },
  { slot: 10, sourceTeamName: "건덕이", teamLabel: "", clubSlug: "konkuk-ktc", stage: "first_match_loss" },
  { slot: 11, sourceTeamName: "Petc A", teamLabel: "A", clubSlug: "korea-petc", stage: "round_of_16" },
  { slot: 12, sourceTeamName: "동국대 B", teamLabel: "B", clubSlug: "dongguk-dutc", stage: "first_match_loss" },
  { slot: 13, sourceTeamName: "서울대 A", teamLabel: "A", clubSlug: "seoul-university", stage: "quarterfinal" },
  { slot: 14, sourceTeamName: "서울대 B", teamLabel: "B", clubSlug: "seoul-university", stage: "first_match_loss" },
  { slot: 15, sourceTeamName: "러비스 B", teamLabel: "B", clubSlug: "kyunghee-kuta-lovice", stage: "first_match_loss" },
  { slot: 16, sourceTeamName: "카이스트 A", teamLabel: "A", clubSlug: "kaist-stroke", stage: "round_of_32" },
  { slot: 17, sourceTeamName: "Ktf A", teamLabel: "A", clubSlug: "gyeonggi-ktf", stage: "quarterfinal" },
  { slot: 18, sourceTeamName: "수원대 A", teamLabel: "A", clubSlug: "suwon-ace", stage: "first_match_loss" },
  { slot: 19, sourceTeamName: "성균관대 A", teamLabel: "A", clubSlug: "sungkyunkwan-stc", stage: "round_of_32" },
  { slot: 20, sourceTeamName: "Ktf B", teamLabel: "B", clubSlug: "gyeonggi-ktf", stage: "first_match_loss" },
  { slot: 21, sourceTeamName: "Kuta A", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "round_of_16" },
  { slot: 22, sourceTeamName: "인하대 A", teamLabel: "A", clubSlug: "inha-rapum", stage: "first_match_loss" },
  { slot: 23, sourceTeamName: "Approach A", teamLabel: "A", clubSlug: "uos-approach", stage: "round_of_32" },
  { slot: 24, sourceTeamName: "하이텍 B", teamLabel: "B", clubSlug: "hanyang-erica-hitec", stage: "first_match_loss" },
  { slot: 25, sourceTeamName: "서강대 B", teamLabel: "B", clubSlug: "sogang-sgtc", stage: "first_match_loss" },
  { slot: 26, sourceTeamName: "서강대 A", teamLabel: "A", clubSlug: "sogang-sgtc", stage: "round_of_32" },
  { slot: 27, sourceTeamName: "홍익대 Hitc A", teamLabel: "A", clubSlug: "hongik-hitc", stage: "semifinal" },
  { slot: 28, sourceTeamName: "이화테니스", teamLabel: "", clubSlug: "ewha-tennis", stage: "first_match_loss" },
  { slot: 29, sourceTeamName: "타이브레이크 B", teamLabel: "B", clubSlug: "gachon-tiebreak", stage: "first_match_loss" },
  { slot: 30, sourceTeamName: "카이스트 B", teamLabel: "B", clubSlug: "kaist-stroke", stage: "round_of_32" },
  { slot: 31, sourceTeamName: "인천대 B", teamLabel: "B", clubSlug: "inu-uitc", stage: "first_match_loss" },
  { slot: 32, sourceTeamName: "동국대 A", teamLabel: "A", clubSlug: "dongguk-dutc", stage: "round_of_16" },
  { slot: 33, sourceTeamName: "굿샷 A", teamLabel: "A", clubSlug: "chungnam-goodshot", stage: "round_of_16" },
  { slot: 34, sourceTeamName: "타이브레이크 A", teamLabel: "A", clubSlug: "gachon-tiebreak", stage: "first_match_loss" },
  { slot: 35, sourceTeamName: "복숭아시루", teamLabel: "", clubSlug: "hanbat-masters", stage: "first_match_loss" },
  { slot: 36, sourceTeamName: "건구스", teamLabel: "", clubSlug: "konkuk-ktc", stage: "round_of_32" },
  { slot: 37, sourceTeamName: "홍익대 Hitc B", teamLabel: "B", clubSlug: "hongik-hitc", stage: "first_match_loss" },
  { slot: 38, sourceTeamName: "인천대 A", teamLabel: "A", clubSlug: "inu-uitc", stage: "round_of_32" },
  { slot: 39, sourceTeamName: "느티나무 B", teamLabel: "B", clubSlug: "seoultech-neutinamu", stage: "first_match_loss" },
  { slot: 40, sourceTeamName: "진리", teamLabel: "진리", clubSlug: "yonsei-yutt", stage: "quarterfinal" },
  { slot: 41, sourceTeamName: "Dkutc A", teamLabel: "A", clubSlug: "dankook-cheonan-dkutc", stage: "round_of_16" },
  { slot: 42, sourceTeamName: "임팩트 B", teamLabel: "B", clubSlug: "kyunghee-engineering-impact", stage: "first_match_loss" },
  { slot: 43, sourceTeamName: "고려대 B", teamLabel: "B", clubSlug: null, stage: "round_of_32", qualityStatus: "unresolved", note: "고려대학교의 KUTC, PETC, KMTC 중 어느 동아리인지 대진표만으로 확인할 수 없습니다." },
  { slot: 44, sourceTeamName: "할렐야루", teamLabel: "", clubSlug: "catholic-courtrang", stage: "first_match_loss" },
  { slot: 45, sourceTeamName: "Petc B", teamLabel: "B", clubSlug: "korea-petc", stage: "first_match_loss" },
  { slot: 46, sourceTeamName: "전북대 Ace", teamLabel: "", clubSlug: "jeonbuk-ace", stage: "round_of_32" },
  { slot: 47, sourceTeamName: "Kuta B", teamLabel: "B", clubSlug: "kyunghee-kuta-lovice", stage: "first_match_loss" },
  { slot: 48, sourceTeamName: "러비스 A [3]", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "champion" },
  { slot: 49, sourceTeamName: "Hytc A", teamLabel: "A", clubSlug: "hanyang-hytc", stage: "first_match_loss", sourceEntryId: "slot-49" },
  { slot: 50, sourceTeamName: "Uostc A", teamLabel: "A", clubSlug: "uos-approach", stage: "semifinal" },
  { slot: 51, sourceTeamName: "마일", teamLabel: "", clubSlug: "kau-ace", stage: "round_of_32" },
  { slot: 52, sourceTeamName: "임팩트 A", teamLabel: "A", clubSlug: "kyunghee-engineering-impact", stage: "first_match_loss" },
  { slot: 53, sourceTeamName: "Hytc B", teamLabel: "B", clubSlug: "hanyang-hytc", stage: "first_match_loss" },
  { slot: 54, sourceTeamName: "고려대 A", teamLabel: "A", clubSlug: null, stage: "round_of_16", qualityStatus: "unresolved", note: "고려대학교의 KUTC, PETC, KMTC 중 어느 동아리인지 대진표만으로 확인할 수 없습니다." },
  { slot: 55, sourceTeamName: "Hytc A", teamLabel: "A", clubSlug: "hanyang-women-hytc", stage: "first_match_loss", sourceEntryId: "slot-55" },
  { slot: 56, sourceTeamName: "위너스 F5", teamLabel: "F5", clubSlug: "hannam-winners", stage: "round_of_32" },
  { slot: 57, sourceTeamName: "마리아", teamLabel: "", clubSlug: "catholic-courtrang", stage: "first_match_loss" },
  { slot: 58, sourceTeamName: "스매시 A", teamLabel: "A", clubSlug: "ewha-smash", stage: "round_of_16" },
  { slot: 59, sourceTeamName: "전북대 Topspin A", teamLabel: "A", clubSlug: "jeonbuk-topspin", stage: "first_match_loss" },
  { slot: 60, sourceTeamName: "스매시 B", teamLabel: "B", clubSlug: "ewha-smash", stage: "round_of_32" },
  { slot: 61, sourceTeamName: "인하대 B", teamLabel: "B", clubSlug: "inha-rapum", stage: "first_match_loss" },
  { slot: 62, sourceTeamName: "하이텍 A", teamLabel: "A", clubSlug: "hanyang-erica-hitec", stage: "round_of_32" },
  { slot: 64, sourceTeamName: "한국외대 A [2]", teamLabel: "A", clubSlug: "hufs-ace", stage: "quarterfinal" },
];

function sourceRef(gender: "men" | "women", entrant: Entrant): string {
  if (gender === "women") return `${WOMEN_SOURCE}#page=1`;

  const finalPageStages = new Set<TournamentStage>([
    "champion",
    "runner_up",
    "semifinal",
    "quarterfinal",
  ]);
  if (finalPageStages.has(entrant.stage)) return `${MEN_SOURCE}#page=3`;
  return `${MEN_SOURCE}#page=${entrant.slot <= 64 ? 1 : 2}`;
}

function toResult(
  editionKey: string,
  gender: "men" | "women",
  entrant: Entrant
): TeamResultInput {
  const baseNote = `2026 국토정중앙배 최종 대진표의 ${entrant.slot}번 엔트리를 마지막 진출 단계까지 추적했습니다.`;

  return {
    editionKey,
    clubSlug: entrant.clubSlug,
    sourceTeamName: entrant.sourceTeamName,
    teamLabel: entrant.teamLabel,
    ...(entrant.sourceEntryId === undefined
      ? {}
      : { sourceEntryId: entrant.sourceEntryId }),
    stage: entrant.stage,
    qualityStatus: entrant.qualityStatus ?? "verified",
    sourceRef: sourceRef(gender, entrant),
    note: entrant.note ? `${baseNote} ${entrant.note}` : baseNote,
  };
}

const dataset = JSON.parse(
  readFileSync(DATASET_PATH, "utf8")
) as NationalRankingDataset;

if (dataset.version !== INPUT_VERSION) {
  throw new Error(
    `Expected dataset ${INPUT_VERSION}, received ${dataset.version}. Refusing to reapply the one-time import.`
  );
}
if (
  dataset.editions.some(
    (edition) =>
      edition.key === MEN_EDITION_KEY || edition.key === WOMEN_EDITION_KEY
  )
) {
  throw new Error("2026 Yanggu editions already exist.");
}
if (men.length !== 73 || women.length !== 62) {
  throw new Error(
    `Entrant count mismatch: expected 73 men and 62 women, received ${men.length} and ${women.length}.`
  );
}

dataset.version = OUTPUT_VERSION;
dataset.clubs.push(
  {
    slug: "kangwon-baekryeong",
    universityName: "강원대학교",
    clubName: "백령테니스",
    displayName: "강원대학교 백령테니스",
  },
  {
    slug: "hallym-tiebreak",
    universityName: "한림대학교",
    clubName: "Tie-break",
    displayName: "한림대학교 Tie-break",
  }
);
dataset.aliases.push(
  {
    clubSlug: "kangwon-baekryeong",
    normalizedAlias: "강원대학교 백령테니스",
    sourceLabel: "강원대 백령테니스",
  },
  {
    clubSlug: "kangwon-baekryeong",
    normalizedAlias: "강원대학교 백령",
    sourceLabel: "백령",
  },
  {
    clubSlug: "hallym-tiebreak",
    normalizedAlias: "한림대학교 tie-break",
    sourceLabel: "한림대 Tie-break",
  },
  {
    clubSlug: "hallym-tiebreak",
    normalizedAlias: "한림대학교 한림대",
    sourceLabel: "한림대",
  }
);

const lastYangguIndex = dataset.editions.reduce(
  (lastIndex, edition, index) =>
    edition.tournamentSlug === "yanggu" ? index : lastIndex,
  -1
);
dataset.editions.splice(
  lastYangguIndex + 1,
  0,
  {
    key: MEN_EDITION_KEY,
    tournamentSlug: "yanggu",
    year: 2026,
    gender: "men",
    actualEntrants: men.length,
    sourceStatus: "verified",
    sourceRefs: [1, 2, 3].map((page) => `${MEN_SOURCE}#page=${page}`),
  },
  {
    key: WOMEN_EDITION_KEY,
    tournamentSlug: "yanggu",
    year: 2026,
    gender: "women",
    actualEntrants: women.length,
    sourceStatus: "verified",
    sourceRefs: [`${WOMEN_SOURCE}#page=1`],
  }
);
dataset.results.push(
  ...men.map((entrant) => toResult(MEN_EDITION_KEY, "men", entrant)),
  ...women.map((entrant) => toResult(WOMEN_EDITION_KEY, "women", entrant))
);

writeFileSync(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(
  `Imported ${men.length + women.length} visually verified 2026 Yanggu entrants into ${OUTPUT_VERSION}.`
);
