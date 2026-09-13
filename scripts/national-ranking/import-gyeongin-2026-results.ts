import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  NationalRankingDataset,
  TeamResultInput,
  TournamentStage,
} from "../../lib/nationalRanking/types";

const DATASET_PATH = resolve("data/national-ranking/v1/dataset.json");
const INPUT_VERSION = "sources-2026-08-20-v20";
const OUTPUT_VERSION = "sources-2026-09-13-v21";
const MEN_EDITION_KEY = "gyeongin-2026-men";
const WOMEN_EDITION_KEY = "gyeongin-2026-women";
const MEN_SOURCES = [1, 2, 3, 4, 5].map(
  (number) => `경인지구/2026/남자/IMG_${4783 + number}.PNG`
);
const WOMEN_SOURCES = [1, 2, 3, 4, 5].map(
  (number) => `경인지구/2026/여자/IMG_${4788 + number}.PNG`
);

type Entrant = {
  sourceTeamName: string;
  teamLabel: string;
  clubSlug: string;
  stage: TournamentStage;
  sourceImage: number;
  note?: string;
};

const men: Entrant[] = [
  { sourceTeamName: "서울대학교 A", teamLabel: "A", clubSlug: "seoul-university", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "건국대학교 KTC A", teamLabel: "A", clubSlug: "konkuk-ktc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "서울과기대 A", teamLabel: "A", clubSlug: "seoultech-neutinamu", stage: "semifinal", sourceImage: 5 },
  { sourceTeamName: "서울대학교 D", teamLabel: "D", clubSlug: "seoul-university", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "가천대 타이브레이크 A", teamLabel: "A", clubSlug: "gachon-tiebreak", stage: "quarterfinal", sourceImage: 3 },
  { sourceTeamName: "인천대학교 UITC", teamLabel: "", clubSlug: "inu-uitc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "서울대학교 B", teamLabel: "B", clubSlug: "seoul-university", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "한양대 HYTC A", teamLabel: "A", clubSlug: "hanyang-hytc", stage: "quarterfinal", sourceImage: 3 },
  { sourceTeamName: "고려대학교 PETC A", teamLabel: "A", clubSlug: "korea-petc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "한국외대 A", teamLabel: "A", clubSlug: "hufs-ace", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "아주대 A", teamLabel: "A", clubSlug: "ajou-tennis", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "고려대학교 KUTC A", teamLabel: "A", clubSlug: "korea-kutc", stage: "champion", sourceImage: 5 },
  { sourceTeamName: "중앙대 A", teamLabel: "A", clubSlug: "chungang-love4t", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "연세대 진리", teamLabel: "진리", clubSlug: "yonsei-yutt", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "숭실대학교 A", teamLabel: "A", clubSlug: "soongsil-sstc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "경기대학교 A", teamLabel: "A", clubSlug: "gyeonggi-ktf", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "경희대 KUTA A", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "세종대 STC", teamLabel: "", clubSlug: "sejong-stc", stage: "semifinal", sourceImage: 5 },
  { sourceTeamName: "고려대학교 KUTC B", teamLabel: "B", clubSlug: "korea-kutc", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "성균관대 B", teamLabel: "B", clubSlug: "sungkyunkwan-stc", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "동국대학교 정진", teamLabel: "정진", clubSlug: "dongguk-dutc", stage: "quarterfinal", sourceImage: 4 },
  { sourceTeamName: "아주대 B", teamLabel: "B", clubSlug: "ajou-tennis", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "서울시립대학교 A", teamLabel: "A", clubSlug: "uos-approach", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "인하대학교 라폼 A", teamLabel: "A", clubSlug: "inha-rapum", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "성균관대 A", teamLabel: "A", clubSlug: "sungkyunkwan-stc", stage: "quarterfinal", sourceImage: 4 },
  { sourceTeamName: "한양대 에리카 A", teamLabel: "A", clubSlug: "hanyang-erica-hitec", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "경희대 러비스 A", teamLabel: "A", clubSlug: "kyunghee-kuta-lovice", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "서강대학교 B", teamLabel: "B", clubSlug: "sogang-sgtc", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "서강대 A", teamLabel: "A", clubSlug: "sogang-sgtc", stage: "runner_up", sourceImage: 5 },
  { sourceTeamName: "항공대 ACE", teamLabel: "", clubSlug: "kau-ace", stage: "first_match_loss", sourceImage: 2 },
];

const women: Entrant[] = [
  { sourceTeamName: "서울과기대 느티나무 A", teamLabel: "A", clubSlug: "seoultech-neutinamu", stage: "champion", sourceImage: 5 },
  { sourceTeamName: "경희대 KUTA", teamLabel: "", clubSlug: "kyunghee-kuta-lovice", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "홍익대학교 HITC", teamLabel: "", clubSlug: "hongik-hitc", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "아주대 ams", teamLabel: "ams", clubSlug: "ajou-tennis", stage: "first_match_loss", sourceImage: 1, note: "관리자 확인에 따라 Ajou Medi Serve(AMS)를 아주대학교 ATC 랭킹에 포함했습니다." },
  { sourceTeamName: "동국대 DUTC", teamLabel: "", clubSlug: "dongguk-dutc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "고려대 PETC B", teamLabel: "B", clubSlug: "korea-petc", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "이화여대 스매시 A", teamLabel: "A", clubSlug: "ewha-smash", stage: "quarterfinal", sourceImage: 3 },
  { sourceTeamName: "한국외대 A", teamLabel: "A", clubSlug: "hufs-ace", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "연세대 진리", teamLabel: "진리", clubSlug: "yonsei-yutt", stage: "quarterfinal", sourceImage: 3 },
  { sourceTeamName: "고려대 KUTC B", teamLabel: "B", clubSlug: "korea-kutc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "고려대 PETC A", teamLabel: "A", clubSlug: "korea-petc", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "인하대 라폼 A", teamLabel: "A", clubSlug: "inha-rapum", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "성균관대 A", teamLabel: "A", clubSlug: "sungkyunkwan-stc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "느티나무 B", teamLabel: "B", clubSlug: "seoultech-neutinamu", stage: "round_of_16", sourceImage: 1 },
  { sourceTeamName: "가천대 타이브레이크", teamLabel: "", clubSlug: "gachon-tiebreak", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "에리카 A", teamLabel: "A", clubSlug: "hanyang-erica-hitec", stage: "semifinal", sourceImage: 5 },
  { sourceTeamName: "중앙대학교", teamLabel: "", clubSlug: "chungang-love4t", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "연세대 치대 테니스부", teamLabel: "치대", clubSlug: "yonsei-yutt", stage: "first_match_loss", sourceImage: 1, note: "관리자 확인에 따라 연세대학교 치과대학 테니스부 성적을 연세대학교 YUTT 랭킹에 포함했습니다." },
  { sourceTeamName: "고려대 KUTC A", teamLabel: "A", clubSlug: "korea-kutc", stage: "quarterfinal", sourceImage: 4 },
  { sourceTeamName: "한양대 HYTC B", teamLabel: "B", clubSlug: "hanyang-hytc", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "서울대학교 A", teamLabel: "A", clubSlug: "seoul-university", stage: "semifinal", sourceImage: 5 },
  { sourceTeamName: "에리카 B", teamLabel: "B", clubSlug: "hanyang-erica-hitec", stage: "first_match_loss", sourceImage: 1 },
  { sourceTeamName: "광운대 KWTC A", teamLabel: "A", clubSlug: "kwangwoon-kwtc", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "인하대 라폼 B", teamLabel: "B", clubSlug: "inha-rapum", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "서울대학교 C", teamLabel: "C", clubSlug: "seoul-university", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "이화여대 스매시 B", teamLabel: "B", clubSlug: "ewha-smash", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "서강대학교 SGTC", teamLabel: "", clubSlug: "sogang-sgtc", stage: "runner_up", sourceImage: 5 },
  { sourceTeamName: "서울대학교 D", teamLabel: "D", clubSlug: "seoul-university", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "한양대 HYTC A", teamLabel: "A", clubSlug: "hanyang-hytc", stage: "first_match_loss", sourceImage: 2 },
  { sourceTeamName: "서울대학교 B", teamLabel: "B", clubSlug: "seoul-university", stage: "quarterfinal", sourceImage: 4 },
  { sourceTeamName: "서울시립대 A", teamLabel: "A", clubSlug: "uos-approach", stage: "round_of_16", sourceImage: 2 },
  { sourceTeamName: "경기대 KTF A", teamLabel: "A", clubSlug: "gyeonggi-ktf", stage: "first_match_loss", sourceImage: 2 },
];

function toResult(
  editionKey: string,
  sources: string[],
  entrant: Entrant
): TeamResultInput {
  const sourceRef = sources[entrant.sourceImage - 1];
  if (!sourceRef) {
    throw new Error(`Missing source image ${entrant.sourceImage}.`);
  }

  const baseNote = `2026 경인지구 연맹전 모바일 최종 대진표의 연속 화면을 이어 ${entrant.sourceTeamName}의 마지막 진출 단계까지 추적했습니다.`;

  return {
    editionKey,
    clubSlug: entrant.clubSlug,
    sourceTeamName: entrant.sourceTeamName,
    teamLabel: entrant.teamLabel,
    stage: entrant.stage,
    qualityStatus: "verified",
    sourceRef,
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
  throw new Error("2026 Gyeongin editions already exist.");
}
if (men.length !== 30 || women.length !== 32) {
  throw new Error(
    `Entrant count mismatch: expected 30 men and 32 women, received ${men.length} and ${women.length}.`
  );
}

dataset.version = OUTPUT_VERSION;
dataset.aliases.push(
  {
    clubSlug: "ajou-tennis",
    normalizedAlias: "아주대학교 아주대 ams",
    sourceLabel: "아주대 ams",
  },
  {
    clubSlug: "yonsei-yutt",
    normalizedAlias: "연세대학교 연세대 치대 테니스부",
    sourceLabel: "연세대 치대 테니스부",
  }
);

const lastGyeonginIndex = dataset.editions.reduce(
  (lastIndex, edition, index) =>
    edition.tournamentSlug === "gyeongin" ? index : lastIndex,
  -1
);
dataset.editions.splice(
  lastGyeonginIndex + 1,
  0,
  {
    key: MEN_EDITION_KEY,
    tournamentSlug: "gyeongin",
    year: 2026,
    gender: "men",
    actualEntrants: men.length,
    sourceStatus: "verified",
    sourceRefs: MEN_SOURCES,
  },
  {
    key: WOMEN_EDITION_KEY,
    tournamentSlug: "gyeongin",
    year: 2026,
    gender: "women",
    actualEntrants: women.length,
    sourceStatus: "verified",
    sourceRefs: WOMEN_SOURCES,
  }
);
dataset.results.push(
  ...men.map((entrant) => toResult(MEN_EDITION_KEY, MEN_SOURCES, entrant)),
  ...women.map((entrant) =>
    toResult(WOMEN_EDITION_KEY, WOMEN_SOURCES, entrant)
  )
);

writeFileSync(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(
  `Imported ${men.length + women.length} verified 2026 Gyeongin entrants into ${OUTPUT_VERSION}.`
);
