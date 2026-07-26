import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

type InferenceRule = {
  clubSlug: string;
  sourcePattern: RegExp;
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

const SOURCE_VERSION = "sources-2026-07-26-v11";
const TARGET_VERSION = "sources-2026-07-26-v12";

// These rules come from administrator review notes or a source spelling that
// already maps consistently to one canonical club in another stored edition.
// Generic names such as "ACE" are intentionally excluded because several
// universities use them.
const INFERENCE_RULES: readonly InferenceRule[] = [
  {
    clubSlug: "sogang-sgtc",
    sourcePattern: /^sgtc[a-e]?$/u,
  },
  {
    clubSlug: "hongik-hitc",
    sourcePattern: /^hitc$/u,
  },
  {
    clubSlug: "gachon-tiebreak",
    sourcePattern: /^(?:타이브레이크[a-c]?|tiebreak무한이)$/u,
  },
  {
    clubSlug: "gyeongsang-ktc-jtc",
    sourcePattern: /^ktcxjtc$/u,
  },
  {
    clubSlug: "knue-tennis",
    sourcePattern: /^(?:한국교원대|교원대테니스부)$/u,
  },
  {
    clubSlug: "korea-petc",
    sourcePattern: /^petc(?:[a-cs])?$/u,
  },
  {
    clubSlug: "yonsei-yutt",
    sourcePattern: /^연세대(?:자유|정의|진리|평화)$/u,
  },
  {
    clubSlug: "ajou-tennis",
    sourcePattern: /^atc[a-b]?$/u,
  },
  {
    clubSlug: "inha-rapum",
    sourcePattern: /^라중$/u,
  },
  {
    clubSlug: "kyunghee-seoul-kuta",
    sourcePattern: /^kuta(?:[a-c]|남b|서울a)$/u,
  },
];

function compactSourceName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/[\s·._()[\]-]+/gu, "");
}

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function findInferenceRule(
  result: TeamResultInput
): InferenceRule | undefined {
  const sourceName = compactSourceName(result.sourceTeamName);

  return INFERENCE_RULES.find((rule) =>
    rule.sourcePattern.test(sourceName)
  );
}

function resolutionNote(
  displayName: string,
  sourceTeamName: string
): string {
  const spellingNote =
    compactSourceName(sourceTeamName) === "hitc"
      ? " HITC identifies Hongik University; HiTEC/하이텍 remains the separate Hanyang University ERICA club."
      : "";

  return (
    `Assigned to ${displayName} from administrator review notes and ` +
    "the same club's repeated confirmed source labels. Draw qualifiers and " +
    `team letters do not change the club identity.${spellingNote}`
  );
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

  const clubsBySlug = new Map(dataset.clubs.map((club) => [club.slug, club]));
  for (const rule of INFERENCE_RULES) {
    if (!clubsBySlug.has(rule.clubSlug)) {
      throw new Error(`Missing inferred club: ${rule.clubSlug}`);
    }
  }

  let newlyResolved = 0;
  const resolvedByClub = new Map<string, number>();

  dataset.results = dataset.results.map((result) => {
    const rule = findInferenceRule(result);
    if (!rule) return result;

    if (
      result.clubSlug !== null &&
      (result.clubSlug !== rule.clubSlug ||
        result.qualityStatus !== "verified")
    ) {
      throw new Error(
        `Conflicting existing mapping for ${result.editionKey}::` +
          `${result.sourceTeamName}: ${result.clubSlug}`
      );
    }

    if (
      result.clubSlug === rule.clubSlug &&
      result.qualityStatus === "verified"
    ) {
      return result;
    }

    if (result.stage === null) {
      throw new Error(
        `Cannot verify a result without a terminal stage: ` +
          `${result.editionKey}::${result.sourceTeamName}`
      );
    }

    const club = clubsBySlug.get(rule.clubSlug);
    if (!club) {
      throw new Error(`Unknown inferred club: ${rule.clubSlug}`);
    }

    newlyResolved += 1;
    resolvedByClub.set(
      rule.clubSlug,
      (resolvedByClub.get(rule.clubSlug) ?? 0) + 1
    );

    const note = resolutionNote(club.displayName, result.sourceTeamName);
    return {
      ...result,
      clubSlug: rule.clubSlug,
      qualityStatus: "verified" as const,
      note: result.note ? `${result.note} ${note}` : note,
    };
  });

  if (newlyResolved !== 55) {
    throw new Error(`Expected to resolve 55 rows, resolved ${newlyResolved}`);
  }

  const aliasesByNormalizedAlias = new Map(
    dataset.aliases.map((alias) => [alias.normalizedAlias, alias])
  );
  const aliasesToAdd: NationalClubAliasInput[] = [];

  for (const result of dataset.results) {
    const rule = findInferenceRule(result);
    if (!rule) continue;

    const club = clubsBySlug.get(rule.clubSlug);
    if (!club) {
      throw new Error(`Unknown inferred club: ${rule.clubSlug}`);
    }

    const normalizedAlias = normalizeAlias(
      `${club.universityName} ${result.sourceTeamName}`
    );
    const existingAlias = aliasesByNormalizedAlias.get(normalizedAlias);

    if (existingAlias) {
      if (existingAlias.clubSlug !== rule.clubSlug) {
        throw new Error(
          `Alias conflict for ${normalizedAlias}: ` +
            `${existingAlias.clubSlug} versus ${rule.clubSlug}`
        );
      }
      continue;
    }

    const alias = {
      clubSlug: rule.clubSlug,
      normalizedAlias,
      sourceLabel: result.sourceTeamName,
    };
    aliasesToAdd.push(alias);
    aliasesByNormalizedAlias.set(normalizedAlias, alias);
  }

  if (aliasesToAdd.length !== 39) {
    throw new Error(
      `Expected to add 39 aliases, found ${aliasesToAdd.length}`
    );
  }
  dataset.aliases.push(...aliasesToAdd);

  const unresolvedInferredResults = dataset.results.filter((result) => {
    const rule = findInferenceRule(result);
    return (
      rule !== undefined &&
      (result.clubSlug !== rule.clubSlug ||
        result.qualityStatus !== "verified")
    );
  });
  if (unresolvedInferredResults.length > 0) {
    throw new Error(
      `Inferred rows remain unresolved: ` +
        JSON.stringify(unresolvedInferredResults)
    );
  }

  dataset.version = TARGET_VERSION;

  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        aliasesAdded: aliasesToAdd.length,
        newlyResolved,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
        resolvedByClub: Object.fromEntries(
          [...resolvedByClub].sort(([left], [right]) =>
            left.localeCompare(right)
          )
        ),
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
