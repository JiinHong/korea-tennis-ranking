import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const SOURCE_VERSION = "sources-2026-07-26-v17";
const TARGET_VERSION = "sources-2026-07-28-v18";
const GENERAL_KYUNGHEE_SLUG = "kyunghee-kuta-lovice";

const RESULT_KEYS = new Set([
  "inje-2023-men::경희대",
  "gyeongin-2023-men::경희대 B",
  "gyeongin-2023-men::경희대 D",
  "gyeongin-2023-women::경희대 쿠웅이",
  "gyeongin-2024-men::경희대학교 B",
  "gyeongin-2024-men::경희대학교 C",
  "gyeongin-2024-women::경희대 s",
  "chuncheon-2023-men::경희대 국제 C",
  "chuncheon-2023-men::경희대 국제 B",
  "chuncheon-2023-men::경희대 국제 A",
  "chuncheon-2023-women::경희대 국제 C",
  "chuncheon-2023-women::경희대서울2팀",
  "chuncheon-2023-women::경희대 국제 B",
  "chuncheon-2023-women::경희대 서울1팀",
  "chuncheon-2024-men::경희대A",
  "chuncheon-2024-women::경희대 국제B",
  "chuncheon-2025-women::경희대 국제A",
]);

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function resultKey(result: TeamResultInput): string {
  return `${result.editionKey}::${result.sourceTeamName}`;
}

function appendNote(note: string, addition: string): string {
  return note ? `${note} ${addition}` : addition;
}

function addAlias(
  aliases: NationalClubAliasInput[],
  sourceLabel: string,
  universityName: string
): void {
  const normalizedAlias = normalizeAlias(`${universityName} ${sourceLabel}`);
  const existing = aliases.find(
    (alias) => alias.normalizedAlias === normalizedAlias
  );

  if (existing) {
    if (existing.clubSlug !== GENERAL_KYUNGHEE_SLUG) {
      throw new Error(
        `Alias conflict for ${normalizedAlias}: ${existing.clubSlug}`
      );
    }
    return;
  }

  aliases.push({
    clubSlug: GENERAL_KYUNGHEE_SLUG,
    normalizedAlias,
    sourceLabel,
  });
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

  const club = dataset.clubs.find(
    (candidate) => candidate.slug === GENERAL_KYUNGHEE_SLUG
  );
  if (!club) {
    throw new Error(`Unknown club slug: ${GENERAL_KYUNGHEE_SLUG}`);
  }

  const matchedKeys = new Set<string>();
  dataset.results = dataset.results.map((result) => {
    const key = resultKey(result);
    if (!RESULT_KEYS.has(key)) return result;

    if (
      result.clubSlug !== null ||
      result.qualityStatus !== "unresolved" ||
      result.stage === null
    ) {
      throw new Error(`Mapping target is not safely unresolved: ${key}`);
    }

    matchedKeys.add(key);
    addAlias(dataset.aliases, result.sourceTeamName, club.universityName);

    return {
      ...result,
      clubSlug: GENERAL_KYUNGHEE_SLUG,
      qualityStatus: "verified" as const,
      note: appendNote(
        result.note,
        "Assigned to 경희대학교 KUTA·LOVICE under the administrator-confirmed " +
          "rule that generic 경희대, 서울, 국제, KUTA, and LOVICE labels belong " +
          "to the general Kyunghee club group; only explicit 공과대학 or IMPACT " +
          "labels belong to 경희대학교 공과대학 IMPACT."
      ),
    };
  });

  const missingKeys = [...RESULT_KEYS].filter((key) => !matchedKeys.has(key));
  if (missingKeys.length > 0) {
    throw new Error(`Mapping targets were not found:\n${missingKeys.join("\n")}`);
  }

  const remainingKyunghee = dataset.results.filter(
    (result) =>
      result.qualityStatus === "unresolved" &&
      result.sourceTeamName.includes("경희")
  );
  if (remainingKyunghee.length > 0) {
    throw new Error(
      `Kyunghee rows remain unresolved: ${JSON.stringify(remainingKyunghee)}`
    );
  }

  dataset.version = TARGET_VERSION;
  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        version: dataset.version,
        resolvedResults: matchedKeys.size,
        aliases: dataset.aliases.length,
        verifiedResults: dataset.results.filter(
          (result) => result.qualityStatus === "verified"
        ).length,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
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
