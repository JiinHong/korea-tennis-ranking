import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalClubInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

type ReviewResolution = {
  clubSlug: string;
  reviewMemo: string;
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const SOURCE_VERSION = "sources-2026-07-26-v13";
const TARGET_VERSION = "sources-2026-07-26-v14";
const MYONGJI_SLUG = "myongji-mjta-mtc";
const RETIRED_MYONGJI_SLUGS = new Set([
  "myongji-rushand",
  "myongji-tesarang",
  "myongji-tshot",
]);

const MYONGJI_CLUB: NationalClubInput = {
  slug: MYONGJI_SLUG,
  universityName: "명지대학교",
  clubName: "MJTA·MTC",
  displayName: "명지대학교 MJTA·MTC",
};
const KOREATECH_CLUB: NationalClubInput = {
  slug: "koreatech-tennis",
  universityName: "한국기술교육대학교",
  clubName: "테니스부",
  displayName: "한국기술교육대학교 테니스부",
};

function resultKey(editionKey: string, sourceTeamName: string): string {
  return `${editionKey}::${sourceTeamName}`;
}

const REVIEW_RESOLUTIONS = new Map<string, ReviewResolution>([
  [resultKey("inje-2023-men", "고려대 C"), {
    clubSlug: "korea-kutc",
    reviewMemo: "고려대 KUTC",
  }],
  [resultKey("inje-2023-men", "고려대"), {
    clubSlug: "korea-kutc",
    reviewMemo: "고려대 KUTC",
  }],
  [resultKey("inje-2025-women", "이화여대 A"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("gyeongin-2023-men", "STC"), {
    clubSlug: "sungkyunkwan-stc",
    reviewMemo: "성균관대",
  }],
  [resultKey("gyeongin-2023-men", "UITC B"), {
    clubSlug: "inu-uitc",
    reviewMemo: "인천대학교 UITC",
  }],
  [resultKey("gyeongin-2023-men", "Uitc 남 A"), {
    clubSlug: "inu-uitc",
    reviewMemo: "인천대학교 UITC",
  }],
  [resultKey("gyeongin-2023-men", "한양대 블루"), {
    clubSlug: "hanyang-hytc",
    reviewMemo: "한양대 HYTC",
  }],
  [resultKey("gyeongin-2023-men", "UOSTC A"), {
    clubSlug: "uos-approach",
    reviewMemo: "서울시립대",
  }],
  [resultKey("gyeongin-2023-women", "이화여대 B"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("gyeongin-2023-women", "이화여대 A"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("gyeongin-2023-women", "A"), {
    clubSlug: "uos-approach",
    reviewMemo: "서울시립대",
  }],
  [resultKey("gyeongin-2024-men", "명지대A"), {
    clubSlug: MYONGJI_SLUG,
    reviewMemo: "명지대",
  }],
  [resultKey("gyeongin-2024-women", "이화여대B"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("gyeongin-2024-women", "단국대 A"), {
    clubSlug: "dankook-cheonan-dkutc",
    reviewMemo: "단국대 천안캠",
  }],
  [resultKey("gyeongin-2024-women", "UITC A"), {
    clubSlug: "inu-uitc",
    reviewMemo: "인천대학교 UITC",
  }],
  [resultKey("gyeongin-2025-women", "단국대"), {
    clubSlug: "dankook-cheonan-dkutc",
    reviewMemo: "단국대 천안캠",
  }],
  [resultKey("gyeongin-2025-women", "한양대학교 A"), {
    clubSlug: "hanyang-hytc",
    reviewMemo: "한양대 서울캠",
  }],
  [resultKey("gyeongin-2025-women", "이화여대A"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("chuncheon-2023-men", "강원대학교 A"), {
    clubSlug: "gangneung-wonju-love",
    reviewMemo: "강원대 LOVE",
  }],
  [resultKey("chuncheon-2023-men", "강원대학교B"), {
    clubSlug: "gangneung-wonju-love",
    reviewMemo: "강원대 LOVE",
  }],
  [resultKey("chuncheon-2024-men", "명지대A"), {
    clubSlug: MYONGJI_SLUG,
    reviewMemo: "명지대",
  }],
  [resultKey("chuncheon-2024-women", "단국대A"), {
    clubSlug: "dankook-cheonan-dkutc",
    reviewMemo: "단국대 천안캠",
  }],
  [resultKey("chuncheon-2024-women", "이화여대A"), {
    clubSlug: "ewha-tennis",
    reviewMemo: "이화테니스",
  }],
  [resultKey("chuncheon-2024-women", "한양대A"), {
    clubSlug: "hanyang-hytc",
    reviewMemo: "한양대 서울캠",
  }],
  [resultKey("chuncheon-2025-men", "한기대 A"), {
    clubSlug: "koreatech-tennis",
    reviewMemo: "한국기술교육대학교",
  }],
]);

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function appendNote(note: string, addition: string): string {
  return note ? `${note} ${addition}` : addition;
}

function isMyongjiResult(result: TeamResultInput): boolean {
  return (
    result.sourceTeamName.includes("명지") ||
    result.clubSlug === MYONGJI_SLUG ||
    (result.clubSlug !== null &&
      RETIRED_MYONGJI_SLUGS.has(result.clubSlug))
  );
}

function addAlias(
  aliases: NationalClubAliasInput[],
  aliasesByNormalizedAlias: Map<string, NationalClubAliasInput>,
  club: NationalClubInput,
  sourceLabel: string
): void {
  const normalizedAlias = normalizeAlias(
    `${club.universityName} ${sourceLabel}`
  );
  const existing = aliasesByNormalizedAlias.get(normalizedAlias);

  if (existing) {
    if (existing.clubSlug !== club.slug) {
      throw new Error(
        `Alias conflict for ${normalizedAlias}: ` +
          `${existing.clubSlug} versus ${club.slug}`
      );
    }
    return;
  }

  const alias = {
    clubSlug: club.slug,
    normalizedAlias,
    sourceLabel,
  };
  aliases.push(alias);
  aliasesByNormalizedAlias.set(normalizedAlias, alias);
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;

  if (dataset.version !== SOURCE_VERSION) {
    throw new Error(
      `Expected ${SOURCE_VERSION}, received ${dataset.version}`
    );
  }

  const oldMyongjiClubs = dataset.clubs.filter((club) =>
    RETIRED_MYONGJI_SLUGS.has(club.slug)
  );
  if (oldMyongjiClubs.length !== RETIRED_MYONGJI_SLUGS.size) {
    throw new Error("Unexpected current Myongji club structure");
  }

  const firstMyongjiIndex = dataset.clubs.findIndex((club) =>
    RETIRED_MYONGJI_SLUGS.has(club.slug)
  );
  dataset.clubs = dataset.clubs.filter(
    (club) => !RETIRED_MYONGJI_SLUGS.has(club.slug)
  );
  dataset.clubs.splice(firstMyongjiIndex, 0, MYONGJI_CLUB);
  dataset.clubs.push(KOREATECH_CLUB);

  const clubsBySlug = new Map(dataset.clubs.map((club) => [club.slug, club]));
  for (const resolution of REVIEW_RESOLUTIONS.values()) {
    if (!clubsBySlug.has(resolution.clubSlug)) {
      throw new Error(`Unknown reviewed club: ${resolution.clubSlug}`);
    }
  }

  const matchedReviewKeys = new Set<string>();
  let consolidatedMyongjiResults = 0;

  dataset.results = dataset.results.map((result) => {
    const key = resultKey(result.editionKey, result.sourceTeamName);
    const reviewResolution = REVIEW_RESOLUTIONS.get(key);
    const targetClubSlug = reviewResolution?.clubSlug ??
      (isMyongjiResult(result) ? MYONGJI_SLUG : null);

    if (!targetClubSlug) return result;
    if (result.stage === null) {
      throw new Error(`Cannot verify result without stage: ${key}`);
    }

    if (reviewResolution) {
      if (matchedReviewKeys.has(key)) {
        throw new Error(`Duplicate reviewed result: ${key}`);
      }
      matchedReviewKeys.add(key);
    }
    if (targetClubSlug === MYONGJI_SLUG) {
      consolidatedMyongjiResults += 1;
    }

    const targetClub = clubsBySlug.get(targetClubSlug);
    if (!targetClub) {
      throw new Error(`Unknown target club: ${targetClubSlug}`);
    }

    const reason = reviewResolution
      ? `Assigned to ${targetClub.displayName} from the administrator's ` +
        `review memo (“${reviewResolution.reviewMemo}”).`
      : `Consolidated into ${MYONGJI_CLUB.displayName} by administrator ` +
        "instruction. MJTA and MTC remain distinct clubs in reality, but all " +
        "stored Myongji tournament results are combined for this ranking.";

    return {
      ...result,
      clubSlug: targetClubSlug,
      qualityStatus: "verified" as const,
      note: appendNote(result.note, reason),
    };
  });

  const missingReviewKeys = [...REVIEW_RESOLUTIONS.keys()].filter(
    (key) => !matchedReviewKeys.has(key)
  );
  if (missingReviewKeys.length > 0) {
    throw new Error(`Missing reviewed results: ${missingReviewKeys.join(", ")}`);
  }
  if (matchedReviewKeys.size !== 25) {
    throw new Error(`Expected 25 review rows, found ${matchedReviewKeys.size}`);
  }
  if (consolidatedMyongjiResults !== 10) {
    throw new Error(
      `Expected 10 Myongji results, found ${consolidatedMyongjiResults}`
    );
  }

  dataset.aliases = dataset.aliases.map((alias) =>
    RETIRED_MYONGJI_SLUGS.has(alias.clubSlug)
      ? { ...alias, clubSlug: MYONGJI_SLUG }
      : alias
  );
  const aliasesByNormalizedAlias = new Map(
    dataset.aliases.map((alias) => [alias.normalizedAlias, alias])
  );

  addAlias(dataset.aliases, aliasesByNormalizedAlias, MYONGJI_CLUB, "MJTA");
  addAlias(dataset.aliases, aliasesByNormalizedAlias, MYONGJI_CLUB, "MTC");
  addAlias(
    dataset.aliases,
    aliasesByNormalizedAlias,
    MYONGJI_CLUB,
    MYONGJI_CLUB.clubName
  );
  addAlias(
    dataset.aliases,
    aliasesByNormalizedAlias,
    KOREATECH_CLUB,
    KOREATECH_CLUB.clubName
  );

  for (const result of dataset.results) {
    if (result.clubSlug === MYONGJI_SLUG) {
      addAlias(
        dataset.aliases,
        aliasesByNormalizedAlias,
        MYONGJI_CLUB,
        result.sourceTeamName
      );
      continue;
    }

    const reviewResolution = REVIEW_RESOLUTIONS.get(
      resultKey(result.editionKey, result.sourceTeamName)
    );
    if (!reviewResolution) continue;

    const club = clubsBySlug.get(reviewResolution.clubSlug);
    if (!club) {
      throw new Error(`Unknown reviewed club: ${reviewResolution.clubSlug}`);
    }
    addAlias(
      dataset.aliases,
      aliasesByNormalizedAlias,
      club,
      result.sourceTeamName
    );
  }

  if (
    dataset.clubs.some((club) => RETIRED_MYONGJI_SLUGS.has(club.slug)) ||
    dataset.aliases.some((alias) =>
      RETIRED_MYONGJI_SLUGS.has(alias.clubSlug)
    ) ||
    dataset.results.some(
      (result) =>
        result.clubSlug !== null &&
        RETIRED_MYONGJI_SLUGS.has(result.clubSlug)
    )
  ) {
    throw new Error("Retired Myongji references remain");
  }

  dataset.version = TARGET_VERSION;
  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        reviewRowsResolved: matchedReviewKeys.size,
        consolidatedMyongjiResults,
        clubs: dataset.clubs.length,
        aliases: dataset.aliases.length,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
      },
      null,
      2
    )}\n`
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
