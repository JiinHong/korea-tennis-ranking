import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubAliasInput,
  NationalClubInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../../../lib/nationalRanking/types";

type MappingRule = {
  clubSlug: string;
  sourceTeamNames: readonly string[];
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const SOURCE_VERSION = "sources-2026-07-26-v15";
const TARGET_VERSION = "sources-2026-07-26-v16";
const EDITION_KEY = "yanggu-2023-women";

const MAPPING_RULES: readonly MappingRule[] = [
  {
    clubSlug: "kyunghee-kuta-lovice",
    sourceTeamNames: ["경희 B [Q]", "경희 C [Q]"],
  },
  {
    clubSlug: "kyunghee-engineering-impact",
    sourceTeamNames: ["경희 I [Q]"],
  },
  {
    clubSlug: "hanbat-masters",
    sourceTeamNames: ["꿀복숭아 [Q]", "햇감자 [Q]", "박고구마 [Q]"],
  },
  {
    clubSlug: "hufs-ace",
    sourceTeamNames: ["Ace A [Q]", "Ace B [Q]"],
  },
  {
    clubSlug: "suwon-ace",
    sourceTeamNames: ["Ace W [Q]"],
  },
  {
    clubSlug: "ewha-tennis",
    sourceTeamNames: [
      "이대 1화 [Q]",
      "이대 2화 [Q]",
      "이대 3화 [Q]",
      "이대 4화 [Q]",
      "이대 5화 [Q]",
    ],
  },
  {
    clubSlug: "hanyang-women-hytc",
    sourceTeamNames: ["Hytc 사자 [Q]", "Hytc 피스 [Q]"],
  },
  {
    clubSlug: "hanyang-hytc",
    sourceTeamNames: ["Hytc 개나리 [Q]", "Hytc 블루"],
  },
  {
    clubSlug: "hanyang-erica-hitec",
    sourceTeamNames: ["에리카 A [Q]", "에리카 B [Q]"],
  },
  {
    clubSlug: "yonsei-yutt",
    sourceTeamNames: ["연세대 사랑 [Q]"],
  },
  {
    clubSlug: "yonsei-kookdas",
    sourceTeamNames: ["쿠크다스 [Q]"],
  },
  {
    clubSlug: "dongguk-dutc",
    sourceTeamNames: ["Dutc A [Q]", "Dutc B [Q]", "Dutc C [Q]"],
  },
  {
    clubSlug: "korea-kutc",
    sourceTeamNames: ["Kutc A [Q]", "Kutc B [Q]", "Kutc C [Q]"],
  },
  {
    clubSlug: "dankook-jukjeon-dkutc",
    sourceTeamNames: ["Dkuct 2 [Q]", "Dkuct 3 [Q]"],
  },
  {
    clubSlug: "dankook-cheonan-dkutc",
    sourceTeamNames: ["Dkuct 1 [Q]"],
  },
  {
    clubSlug: "inu-uitc",
    sourceTeamNames: ["Uitc 초선 [Q]"],
  },
];

function normalizeAlias(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function appendNote(note: string, addition: string): string {
  return note ? `${note} ${addition}` : addition;
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

function resultKey(result: TeamResultInput): string {
  return `${result.editionKey}::${result.sourceTeamName}`;
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
  const targetsByResultKey = new Map<string, string>();

  for (const rule of MAPPING_RULES) {
    if (!clubsBySlug.has(rule.clubSlug)) {
      throw new Error(`Unknown club slug: ${rule.clubSlug}`);
    }

    for (const sourceTeamName of rule.sourceTeamNames) {
      const key = `${EDITION_KEY}::${sourceTeamName}`;
      if (targetsByResultKey.has(key)) {
        throw new Error(`Duplicate mapping key: ${key}`);
      }
      targetsByResultKey.set(key, rule.clubSlug);
    }
  }

  const matchedKeys = new Set<string>();
  const resolvedByClub = new Map<string, number>();
  const aliasesByNormalizedAlias = new Map(
    dataset.aliases.map((alias) => [alias.normalizedAlias, alias])
  );

  dataset.results = dataset.results.map((result) => {
    const key = resultKey(result);
    const clubSlug = targetsByResultKey.get(key);
    if (!clubSlug) return result;

    if (
      result.clubSlug !== null ||
      result.qualityStatus !== "unresolved" ||
      result.stage === null
    ) {
      throw new Error(`Mapping target is not safely unresolved: ${key}`);
    }

    const club = clubsBySlug.get(clubSlug);
    if (!club) {
      throw new Error(`Unknown club slug: ${clubSlug}`);
    }

    matchedKeys.add(key);
    resolvedByClub.set(clubSlug, (resolvedByClub.get(clubSlug) ?? 0) + 1);
    addAlias(
      dataset.aliases,
      aliasesByNormalizedAlias,
      club,
      result.sourceTeamName
    );

    return {
      ...result,
      clubSlug,
      qualityStatus: "verified" as const,
      note: appendNote(
        result.note,
        `Assigned to ${club.displayName} from the administrator-provided ` +
          "2023 Yanggu women's university-to-team mapping."
      ),
    };
  });

  const missingKeys = [...targetsByResultKey.keys()].filter(
    (key) => !matchedKeys.has(key)
  );
  if (missingKeys.length > 0) {
    throw new Error(`Mapping targets were not found:\n${missingKeys.join("\n")}`);
  }

  const remainingUnresolved = dataset.results.filter(
    (result) =>
      result.editionKey === EDITION_KEY &&
      result.qualityStatus === "unresolved"
  );
  if (remainingUnresolved.length > 0) {
    throw new Error(
      `Expected no unresolved ${EDITION_KEY} rows, found ` +
        remainingUnresolved.map((result) => result.sourceTeamName).join(", ")
    );
  }

  dataset.version = TARGET_VERSION;
  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        version: dataset.version,
        resolvedTotal: matchedKeys.size,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
        aliases: dataset.aliases.length,
        resolvedByClub: Object.fromEntries(
          [...resolvedByClub].sort(([left], [right]) =>
            left.localeCompare(right)
          )
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
