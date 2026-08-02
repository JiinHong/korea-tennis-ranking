import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../../../lib/nationalRanking/types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

const SOURCE_VERSION = "sources-2026-07-24-v10";
const TARGET_VERSION = "sources-2026-07-26-v11";

const CONFIRMED_ALIASES: NationalClubAliasInput[] = [
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대",
    sourceLabel: "전북대",
  },
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대 a",
    sourceLabel: "전북대 A",
  },
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대 b",
    sourceLabel: "전북대 B",
  },
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대 c",
    sourceLabel: "전북대 C",
  },
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대학교",
    sourceLabel: "전북대학교",
  },
  {
    clubSlug: "jeonbuk-ace",
    normalizedAlias: "전북대학교 전북대학교 a",
    sourceLabel: "전북대학교 A",
  },
];

function isJeonbukResult(result: TeamResultInput): boolean {
  return result.sourceTeamName.includes("전북");
}

function confirmedClubSlug(result: TeamResultInput): string {
  return result.sourceTeamName.includes("탑스핀")
    ? "jeonbuk-topspin"
    : "jeonbuk-ace";
}

function resolutionNote(clubSlug: string): string {
  return clubSlug === "jeonbuk-topspin"
    ? "Assigned to 전북대학교 탑스핀 from the 2026-07-24 direct Instagram DM confirmation because the source explicitly names 탑스핀."
    : "Assigned to 전북대학교 ACE from the 2026-07-24 direct Instagram DM confirmation: generic Jeonbuk labels normally refer to ACE, while Topspin is explicitly labeled.";
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

  const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
  for (const clubSlug of ["jeonbuk-ace", "jeonbuk-topspin"]) {
    if (!clubSlugs.has(clubSlug)) {
      throw new Error(`Missing confirmed Jeonbuk club: ${clubSlug}`);
    }
  }

  const normalizedAliases = new Set(
    dataset.aliases.map((alias) => alias.normalizedAlias)
  );
  for (const alias of CONFIRMED_ALIASES) {
    if (normalizedAliases.has(alias.normalizedAlias)) {
      throw new Error(`Alias already exists: ${alias.normalizedAlias}`);
    }
    dataset.aliases.push(alias);
    normalizedAliases.add(alias.normalizedAlias);
  }

  let newlyResolved = 0;
  const resolvedByClub = new Map<string, number>();

  dataset.results = dataset.results.map((result) => {
    if (!isJeonbukResult(result)) return result;

    const clubSlug = confirmedClubSlug(result);
    if (
      result.clubSlug === clubSlug &&
      result.qualityStatus === "verified"
    ) {
      return result;
    }

    if (result.stage === null) {
      throw new Error(
        `Cannot verify a Jeonbuk result without a terminal stage: ` +
          `${result.editionKey}::${result.sourceTeamName}`
      );
    }

    newlyResolved += 1;
    resolvedByClub.set(
      clubSlug,
      (resolvedByClub.get(clubSlug) ?? 0) + 1
    );

    const note = resolutionNote(clubSlug);
    return {
      ...result,
      clubSlug,
      qualityStatus: "verified" as const,
      note: result.note ? `${result.note} ${note}` : note,
    };
  });

  const unresolvedJeonbuk = dataset.results.filter(
    (result) =>
      isJeonbukResult(result) &&
      (result.clubSlug !== confirmedClubSlug(result) ||
        result.qualityStatus !== "verified")
  );
  if (unresolvedJeonbuk.length > 0) {
    throw new Error(
      `Jeonbuk rows remain unresolved: ${JSON.stringify(unresolvedJeonbuk)}`
    );
  }

  dataset.version = TARGET_VERSION;

  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        aliasesAdded: CONFIRMED_ALIASES.length,
        newlyResolved,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
        resolvedByClub: Object.fromEntries(resolvedByClub),
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
