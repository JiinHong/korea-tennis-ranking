import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalClubInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const SOURCE_VERSION = "sources-2026-07-26-v14";
const TARGET_VERSION = "sources-2026-07-26-v15";
const KYUNGHEE_SLUG = "kyunghee-kuta-lovice";
const KYUNGHEE_ENGINEERING_SLUG = "kyunghee-engineering-impact";

const GENERAL_KYUNGHEE_SLUGS = new Set([
  "kyunghee-global-kuta",
  "kyunghee-global-luvis",
  "kyunghee-seoul-kuta",
  "kyunghee-kuta",
  "kyunghee-luvis",
  "kyunghee-shuttle",
]);
const IMPACT_SLUGS = new Set([
  "kyunghee-global-impact",
  "kyunghee-impact",
]);
const RETIRED_KYUNGHEE_SLUGS = new Set([
  ...GENERAL_KYUNGHEE_SLUGS,
  ...IMPACT_SLUGS,
]);

const KYUNGHEE_CLUB: NationalClubInput = {
  slug: KYUNGHEE_SLUG,
  universityName: "경희대학교",
  clubName: "KUTA·LOVICE",
  displayName: "경희대학교 KUTA·LOVICE",
};
const KYUNGHEE_ENGINEERING_CLUB: NationalClubInput = {
  slug: KYUNGHEE_ENGINEERING_SLUG,
  universityName: "경희대학교 공과대학",
  clubName: "IMPACT",
  displayName: "경희대학교 공과대학 IMPACT",
};

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function appendNote(note: string, addition: string): string {
  return note ? `${note} ${addition}` : addition;
}

function targetSlugForResult(result: TeamResultInput): string | null {
  if (
    result.clubSlug === null &&
    result.editionKey === "gyeongin-2023-men" &&
    result.sourceTeamName === "러비스 A"
  ) {
    return KYUNGHEE_SLUG;
  }
  if (result.clubSlug && GENERAL_KYUNGHEE_SLUGS.has(result.clubSlug)) {
    return KYUNGHEE_SLUG;
  }
  if (result.clubSlug && IMPACT_SLUGS.has(result.clubSlug)) {
    return KYUNGHEE_ENGINEERING_SLUG;
  }
  return null;
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

  const retiredClubs = dataset.clubs.filter((club) =>
    RETIRED_KYUNGHEE_SLUGS.has(club.slug)
  );
  if (retiredClubs.length !== RETIRED_KYUNGHEE_SLUGS.size) {
    throw new Error(
      `Expected ${RETIRED_KYUNGHEE_SLUGS.size} Kyunghee clubs, ` +
        `found ${retiredClubs.length}`
    );
  }

  const firstKyungheeIndex = dataset.clubs.findIndex((club) =>
    RETIRED_KYUNGHEE_SLUGS.has(club.slug)
  );
  dataset.clubs = dataset.clubs.filter(
    (club) => !RETIRED_KYUNGHEE_SLUGS.has(club.slug)
  );
  dataset.clubs.splice(
    firstKyungheeIndex,
    0,
    KYUNGHEE_CLUB,
    KYUNGHEE_ENGINEERING_CLUB
  );

  let generalResultCount = 0;
  let impactResultCount = 0;

  dataset.results = dataset.results.map((result) => {
    const targetClubSlug = targetSlugForResult(result);
    if (!targetClubSlug) return result;

    if (targetClubSlug === KYUNGHEE_SLUG) {
      generalResultCount += 1;
    } else {
      impactResultCount += 1;
    }

    const targetClub =
      targetClubSlug === KYUNGHEE_SLUG
        ? KYUNGHEE_CLUB
        : KYUNGHEE_ENGINEERING_CLUB;

    return {
      ...result,
      clubSlug: targetClubSlug,
      qualityStatus: "verified" as const,
      note: appendNote(
        result.note,
        `Consolidated into ${targetClub.displayName} by administrator ` +
          "instruction while preserving the original source team name."
      ),
    };
  });

  if (generalResultCount !== 47 || impactResultCount !== 10) {
    throw new Error(
      `Unexpected Kyunghee result counts: general=${generalResultCount}, ` +
        `impact=${impactResultCount}`
    );
  }

  dataset.aliases = dataset.aliases.map((alias) => {
    if (GENERAL_KYUNGHEE_SLUGS.has(alias.clubSlug)) {
      return { ...alias, clubSlug: KYUNGHEE_SLUG };
    }
    if (IMPACT_SLUGS.has(alias.clubSlug)) {
      return { ...alias, clubSlug: KYUNGHEE_ENGINEERING_SLUG };
    }
    return alias;
  });

  const aliasesByNormalizedAlias = new Map(
    dataset.aliases.map((alias) => [alias.normalizedAlias, alias])
  );
  for (const sourceLabel of [
    "KUTA",
    "LOVICE",
    "러비스",
    "러비스 A",
    "KUTA·LOVICE",
    "경희대 셔틀",
  ]) {
    addAlias(
      dataset.aliases,
      aliasesByNormalizedAlias,
      KYUNGHEE_CLUB,
      sourceLabel
    );
  }
  for (const sourceLabel of [
    "IMPACT",
    "임팩트",
    "경희대 국제 임팩트",
  ]) {
    addAlias(
      dataset.aliases,
      aliasesByNormalizedAlias,
      KYUNGHEE_ENGINEERING_CLUB,
      sourceLabel
    );
  }

  dataset.version = TARGET_VERSION;
  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        version: dataset.version,
        clubs: dataset.clubs.length,
        aliases: dataset.aliases.length,
        results: dataset.results.length,
        kyungheeGeneralResults: generalResultCount,
        kyungheeImpactResults: impactResultCount,
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
