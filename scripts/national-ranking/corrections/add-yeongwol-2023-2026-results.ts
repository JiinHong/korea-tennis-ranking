import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalGender,
  NationalRankingDataset,
  TeamResultInput,
  TournamentEditionInput,
  TournamentStage,
} from "../../../lib/nationalRanking/types";

type ResultDefinition = readonly [
  sourceTeamName: string,
  clubSlug: string,
  teamLabel: string,
  stage: TournamentStage,
];

type EditionDefinition = {
  key: string;
  year: number;
  gender: NationalGender;
  sourceRef: string;
  results: readonly ResultDefinition[];
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const SOURCE_VERSION = "sources-2026-07-28-v18";
const TARGET_VERSION = "sources-2026-08-08-v19";
const TOURNAMENT_SLUG = "yeongwol";

const EDITIONS: readonly EditionDefinition[] = [
  {
    key: "yeongwol-2023-men",
    year: 2023,
    gender: "men",
    sourceRef: "영월/2023/남자/SCR-20260808-khof.jpeg",
    results: [
      ["전북대", "jeonbuk-ace", "", "champion"],
      ["서강대", "sogang-sgtc", "", "runner_up"],
      ["경희대 러비스", "kyunghee-kuta-lovice", "", "semifinal"],
      ["중앙대", "chungang-love4t", "", "semifinal"],
    ],
  },
  {
    key: "yeongwol-2023-women",
    year: 2023,
    gender: "women",
    sourceRef: "영월/2023/여자/SCR-20260808-khnq.jpeg",
    results: [
      ["경희대 국제", "kyunghee-kuta-lovice", "", "champion"],
      ["서강대", "sogang-sgtc", "", "runner_up"],
      ["숭실대", "soongsil-sstc", "", "semifinal"],
      ["서울시립대", "uos-approach", "", "semifinal"],
    ],
  },
  {
    key: "yeongwol-2024-men",
    year: 2024,
    gender: "men",
    sourceRef:
      "영월/2024/남자/Draw 제2회 영월 전국대학동아리 테니스대회 본선 Final.pdf#page=1",
    results: [
      ["충남대 a", "chungnam-goodshot", "A", "champion"],
      ["고려대 KUTC", "korea-kutc", "", "runner_up"],
      ["한밭대 a", "hanbat-masters", "A", "semifinal"],
      ["경희대 러비스", "kyunghee-kuta-lovice", "", "semifinal"],
      ["아주대 a", "ajou-tennis", "A", "quarterfinal"],
      ["전북대 a", "jeonbuk-ace", "A", "quarterfinal"],
      ["충남대 C", "chungnam-goodshot", "C", "quarterfinal"],
      ["고려대 PETC", "korea-petc", "", "quarterfinal"],
      ["충남대 b", "chungnam-goodshot", "B", "round_of_16"],
      ["DKUTC", "dankook-cheonan-dkutc", "", "round_of_16"],
      ["전북대 b", "jeonbuk-ace", "B", "round_of_16"],
      ["가톨릭대 b", "catholic-courtrang", "B", "round_of_16"],
      ["중앙대 푸앙이", "chungang-love4t", "", "round_of_16"],
      ["숭실대", "soongsil-sstc", "", "round_of_16"],
    ],
  },
  {
    key: "yeongwol-2024-women",
    year: 2024,
    gender: "women",
    sourceRef:
      "영월/2024/여자/Draw 제2회 영월 전국대학동아리 테니스대회 본선 Final.pdf#page=1",
    results: [
      ["경희대 러비스", "kyunghee-kuta-lovice", "", "champion"],
      ["가톨릭대 a", "catholic-courtrang", "A", "runner_up"],
      ["한국외대 a", "hufs-ace", "A", "semifinal"],
      ["서울시립대 UOSTC A", "uos-approach", "A", "semifinal"],
      ["충남대 a", "chungnam-goodshot", "A", "quarterfinal"],
      ["고려대 KUTC", "korea-kutc", "", "quarterfinal"],
      ["이화여대 SMASH", "ewha-smash", "", "quarterfinal"],
      ["경희대(서울) KUTA A", "kyunghee-kuta-lovice", "A", "quarterfinal"],
    ],
  },
  {
    key: "yeongwol-2025-men",
    year: 2025,
    gender: "men",
    sourceRef: "영월/2025/남자/남자최종결과.pdf#page=1",
    results: [
      ["경북대 KUTC A", "kyungpook-kutc", "A", "champion"],
      ["세종대 STC A", "sejong-stc", "A", "runner_up"],
      ["아주대 ATC A", "ajou-tennis", "A", "semifinal"],
      ["경희대 러비스 A", "kyunghee-kuta-lovice", "A", "semifinal"],
      ["고려대 KUTC B", "korea-kutc", "B", "quarterfinal"],
      ["충남대 굿샷 A", "chungnam-goodshot", "A", "quarterfinal"],
      ["고려대 KUTC A", "korea-kutc", "A", "quarterfinal"],
      ["서울과기대 느티나무 A", "seoultech-neutinamu", "A", "quarterfinal"],
      ["서울과기대 느티나무 B", "seoultech-neutinamu", "B", "round_of_16"],
      ["충남대 굿샷 B", "chungnam-goodshot", "B", "round_of_16"],
      ["카이스트 스트로크 A", "kaist-stroke", "A", "round_of_16"],
      ["경기대 KTF A", "gyeonggi-ktf", "A", "round_of_16"],
      ["전북대 ACE A", "jeonbuk-ace", "A", "round_of_16"],
      ["가천대 타이브레이크 A", "gachon-tiebreak", "A", "round_of_16"],
      ["단국대 DKUTC A", "dankook-cheonan-dkutc", "A", "round_of_16"],
      ["가톨릭대 코트랑 A", "catholic-courtrang", "A", "round_of_16"],
    ],
  },
  {
    key: "yeongwol-2025-women",
    year: 2025,
    gender: "women",
    sourceRef: "영월/2025/여자/여자최종결과.pdf#page=1",
    results: [
      ["경희대 러비스 A", "kyunghee-kuta-lovice", "A", "champion"],
      ["고려대 KUTC A", "korea-kutc", "A", "runner_up"],
      ["서울시립대 UOSTC A", "uos-approach", "A", "semifinal"],
      ["충남대 굿샷 A", "chungnam-goodshot", "A", "semifinal"],
      ["고려대 PETC A", "korea-petc", "A", "quarterfinal"],
      ["충남대 굿샷 B", "chungnam-goodshot", "B", "quarterfinal"],
      ["한밭대 마스터즈 딸기시루", "hanbat-masters", "", "quarterfinal"],
      ["이화여대 SMASH A", "ewha-smash", "A", "quarterfinal"],
      ["고려대 KUTC B", "korea-kutc", "B", "round_of_16"],
      ["경북대 KUTC A", "kyungpook-kutc", "A", "round_of_16"],
    ],
  },
  {
    key: "yeongwol-2026-men",
    year: 2026,
    gender: "men",
    sourceRef:
      "영월/2026/남자/Draw 제4회 영월 전국대학 동아리 테니스 대회 결과.pdf#page=1",
    results: [
      ["서강대", "sogang-sgtc", "", "champion"],
      ["서울과학기술대 느티나무 A", "seoultech-neutinamu", "A", "runner_up"],
      ["전북대학교", "jeonbuk-ace", "", "semifinal"],
      ["충남대 굿샷 A", "chungnam-goodshot", "A", "semifinal"],
      ["세종대 STC A", "sejong-stc", "A", "quarterfinal"],
      ["동국대 DUTC", "dongguk-dutc", "", "quarterfinal"],
      ["성균관대 STC A", "sungkyunkwan-stc", "A", "quarterfinal"],
      ["한남대 강동호와아이들 A", "hannam-winners", "A", "quarterfinal"],
      ["한국외대 ACE", "hufs-ace", "", "round_of_16"],
      ["아주대 ATC A", "ajou-tennis", "A", "round_of_16"],
      ["경북대 KUTC A", "kyungpook-kutc", "A", "round_of_16"],
      ["서울대 A", "seoul-university", "A", "round_of_16"],
      ["고려대 PETC A", "korea-petc", "A", "round_of_16"],
      ["한양대 A", "hanyang-hytc", "A", "round_of_16"],
      ["고려대 KUTC A", "korea-kutc", "A", "round_of_16"],
      ["가천대 타이브레이크 A", "gachon-tiebreak", "A", "round_of_16"],
      ["한양대 ERICA HiTEC A", "hanyang-erica-hitec", "A", "round_of_32"],
      ["경희대 KUTA A", "kyunghee-kuta-lovice", "A", "round_of_32"],
      ["중앙대 LOVE4T B", "chungang-love4t", "B", "round_of_32"],
      ["경북대 KUTC B", "kyungpook-kutc", "B", "round_of_32"],
      ["경희대 러비스 A", "kyunghee-kuta-lovice", "A", "round_of_32"],
      ["한밭대 마스터즈 A", "hanbat-masters", "A", "round_of_32"],
      ["한양대 B", "hanyang-hytc", "B", "round_of_32"],
      ["충남대 굿샷 B", "chungnam-goodshot", "B", "round_of_32"],
      ["단국대 천안 호두과자", "dankook-cheonan-dkutc", "", "round_of_32"],
      ["상지대 ACE A", "sangji-ace", "A", "round_of_32"],
      ["서울시립대 A", "uos-approach", "A", "round_of_32"],
      ["한밭대 마스터즈 B", "hanbat-masters", "B", "round_of_32"],
    ],
  },
  {
    key: "yeongwol-2026-women",
    year: 2026,
    gender: "women",
    sourceRef:
      "영월/2026/여자/Draw 제4회 영월 전국대학 동아리 테니스 대회 결과.pdf#page=1",
    results: [
      ["서울과학기술대 과기대 A", "seoultech-neutinamu", "A", "champion"],
      ["이화여대 SMASH A", "ewha-smash", "A", "runner_up"],
      ["서울시립대", "uos-approach", "", "semifinal"],
      ["한양대 ERICA HiTEC", "hanyang-erica-hitec", "", "semifinal"],
      ["전북대 A", "jeonbuk-ace", "A", "quarterfinal"],
      ["충남대 굿샷 A", "chungnam-goodshot", "A", "quarterfinal"],
      ["경희대 러비스 A", "kyunghee-kuta-lovice", "A", "quarterfinal"],
      ["고려대 KUTC A", "korea-kutc", "A", "quarterfinal"],
      ["이화여대 SMASH B", "ewha-smash", "B", "round_of_16"],
      ["경희대 KUTA A", "kyunghee-kuta-lovice", "A", "round_of_16"],
      ["홍익대 HITC A", "hongik-hitc", "A", "round_of_16"],
      ["한국외대", "hufs-ace", "", "round_of_16"],
      ["고려대 PETC", "korea-petc", "", "round_of_16"],
      ["한밭대 마스터즈 A", "hanbat-masters", "A", "round_of_16"],
      ["고려대 KUTC B", "korea-kutc", "B", "round_of_16"],
      ["동국대 DUTC", "dongguk-dutc", "", "round_of_16"],
    ],
  },
];

function createEdition(definition: EditionDefinition): TournamentEditionInput {
  return {
    key: definition.key,
    tournamentSlug: TOURNAMENT_SLUG,
    year: definition.year,
    gender: definition.gender,
    actualEntrants: definition.results.length,
    sourceStatus: "verified",
    sourceRefs: [definition.sourceRef],
  };
}

function createResult(
  edition: EditionDefinition,
  definition: ResultDefinition
): TeamResultInput {
  const [sourceTeamName, clubSlug, teamLabel, stage] = definition;
  const note =
    edition.year === 2023
      ? "영월 원자료가 제공하는 4강 이상 네 팀만 기록했습니다. 최신 세 시즌 점수에서는 제외하고 통산 성적과 입상 기록에만 사용합니다."
      : "영월 최종 결과표에서 확인한 마지막 진출 단계입니다.";

  return {
    editionKey: edition.key,
    clubSlug,
    sourceTeamName,
    teamLabel,
    stage,
    qualityStatus: "verified",
    sourceRef: edition.sourceRef,
    note,
  };
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;

  if (![SOURCE_VERSION, TARGET_VERSION].includes(dataset.version)) {
    throw new Error(
      `Expected ${SOURCE_VERSION} or ${TARGET_VERSION}, received ${dataset.version}`
    );
  }

  const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
  for (const edition of EDITIONS) {
    for (const [, clubSlug] of edition.results) {
      if (!clubSlugs.has(clubSlug)) {
        throw new Error(`Unknown club slug: ${clubSlug}`);
      }
    }
  }

  const editionKeys = new Set(EDITIONS.map((edition) => edition.key));
  dataset.tournaments = dataset.tournaments.filter(
    (tournament) => tournament.slug !== TOURNAMENT_SLUG
  );
  dataset.editions = dataset.editions.filter(
    (edition) => edition.tournamentSlug !== TOURNAMENT_SLUG
  );
  dataset.results = dataset.results.filter(
    (result) => !editionKeys.has(result.editionKey)
  );

  dataset.tournaments.push({
    slug: TOURNAMENT_SLUG,
    name: "영월 전국대학 동아리 테니스 대회",
    scope: "national",
    scopeFactor: 1,
  });
  dataset.editions.push(...EDITIONS.map(createEdition));
  dataset.results.push(
    ...EDITIONS.flatMap((edition) =>
      edition.results.map((result) => createResult(edition, result))
    )
  );
  dataset.version = TARGET_VERSION;

  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        version: dataset.version,
        tournament: TOURNAMENT_SLUG,
        editions: EDITIONS.length,
        results: EDITIONS.reduce(
          (total, edition) => total + edition.results.length,
          0
        ),
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
