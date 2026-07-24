import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalClubInput,
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

type ReviewedResolutionRule = {
  clubSlug: string;
  reviewMemo: string;
  reviewKeys: readonly string[];
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

const NEW_CLUBS: NationalClubInput[] = [
  {
    slug: "suwon-ace",
    universityName: "수원대학교",
    clubName: "ACE",
    displayName: "수원대학교 ACE",
  },
  {
    slug: "knue-tennis",
    universityName: "한국교원대학교",
    clubName: "테니스부",
    displayName: "한국교원대학교 테니스부",
  },
];

const REVIEWED_RESOLUTION_RULES: ReviewedResolutionRule[] = [
  {
    clubSlug: "yonsei-yutt",
    reviewMemo: "YUTT",
    reviewKeys: [
      "yanggu-2025-men::연세대 자유",
      "yanggu-2025-men::연세대 평화",
      "yanggu-2025-men::연세대 진리",
      "yanggu-2025-men::연세대 정의",
      "yanggu-2025-women::연세대 자유",
      "yanggu-2025-women::연세대 평화",
      "yanggu-2025-women::연세대 진리",
      "yanggu-2025-women::연세대 정의",
    ],
  },
  {
    clubSlug: "hanyang-hytc",
    reviewMemo: "HYTC",
    reviewKeys: [
      "yanggu-2025-men::한양대 A [3]",
      "yanggu-2025-men::한양대 B",
      "yanggu-2025-men::한양대 C",
      "yanggu-2025-men::한양대 D",
      "yanggu-2025-women::한양대 A",
      "yanggu-2025-women::한양대 B",
    ],
  },
  {
    clubSlug: "jeonbuk-ace",
    reviewMemo: "ACE",
    reviewKeys: [
      "yanggu-2024-men::전북대 A [2]",
      "yanggu-2024-men::전북대 B",
      "yanggu-2024-women::전북대 A",
      "yanggu-2024-women::전북대 B",
      "yanggu-2025-men::전북대 B",
      "yanggu-2025-women::전북대 A",
    ],
  },
  {
    clubSlug: "gyeonggi-ktf",
    reviewMemo: "경기대학교 KTF",
    reviewKeys: [
      "yanggu-2025-men::Ktf A",
      "yanggu-2025-men::Ktf B",
      "yanggu-2025-men::Ktf C",
    ],
  },
  {
    clubSlug: "kyunghee-seoul-kuta",
    reviewMemo: "경희대 KUTA",
    reviewKeys: [
      "yanggu-2023-men::Kuta A [Q]",
      "yanggu-2025-women::경희대 Kuta",
    ],
  },
  {
    clubSlug: "kyunghee-global-luvis",
    reviewMemo: "경희대 러비스",
    reviewKeys: [
      "yanggu-2024-men::경희대 국제 A",
      "yanggu-2024-men::경희대 국제 B",
      "yanggu-2024-men::경희대 국제 C",
      "yanggu-2024-women::경희대 국제 B",
      "yanggu-2024-women::경희대 국제 C",
      "yanggu-2025-women::경희대 국제 A [2]",
      "yanggu-2025-women::경희대 국제 B",
      "yanggu-2025-women::경희대 국제 C",
      "yanggu-2025-women::경희대 국제 D",
    ],
  },
  {
    clubSlug: "suwon-ace",
    reviewMemo: "수원대학교 ACE",
    reviewKeys: [
      "yanggu-2025-men::수원대 A",
      "yanggu-2025-women::수원대 W",
    ],
  },
  {
    clubSlug: "knue-tennis",
    reviewMemo: "한국교원대학교 테니스부",
    reviewKeys: [
      "yanggu-2024-men::교원대 테니스부",
      "yanggu-2024-women::교원대 테니스부",
      "yanggu-2025-men::한국교원대",
      "yanggu-2025-women::한국교원대",
    ],
  },
];

function resultReviewKey(result: TeamResultInput): string {
  return `${result.editionKey}::${result.sourceTeamName}`;
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;

  if (dataset.version !== "sources-2026-07-24-v9") {
    throw new Error(
      `Expected sources-2026-07-24-v9, received ${dataset.version}`
    );
  }

  const existingClubSlugs = new Set(dataset.clubs.map((club) => club.slug));
  for (const club of NEW_CLUBS) {
    if (existingClubSlugs.has(club.slug)) {
      throw new Error(`Club already exists: ${club.slug}`);
    }
    dataset.clubs.push(club);
    existingClubSlugs.add(club.slug);
  }

  const rulesByReviewKey = new Map<
    string,
    Omit<ReviewedResolutionRule, "reviewKeys">
  >();
  for (const { reviewKeys, ...rule } of REVIEWED_RESOLUTION_RULES) {
    if (!existingClubSlugs.has(rule.clubSlug)) {
      throw new Error(`Unknown reviewed club slug: ${rule.clubSlug}`);
    }

    for (const reviewKey of reviewKeys) {
      if (rulesByReviewKey.has(reviewKey)) {
        throw new Error(`Duplicate reviewed result key: ${reviewKey}`);
      }
      rulesByReviewKey.set(reviewKey, rule);
    }
  }

  const resolvedCounts = new Map<string, number>();
  const matchedReviewKeys = new Set<string>();

  dataset.results = dataset.results.map((result) => {
    const reviewKey = resultReviewKey(result);
    const rule = rulesByReviewKey.get(reviewKey);
    if (!rule) return result;

    if (
      result.clubSlug !== null ||
      result.qualityStatus !== "unresolved" ||
      result.stage === null
    ) {
      throw new Error(`Reviewed row is not safely unresolved: ${reviewKey}`);
    }

    matchedReviewKeys.add(reviewKey);
    resolvedCounts.set(
      rule.clubSlug,
      (resolvedCounts.get(rule.clubSlug) ?? 0) + 1
    );

    const resolutionNote =
      `Assigned to ${rule.clubSlug} from administrator review memo ` +
      `"${rule.reviewMemo}".`;

    return {
      ...result,
      clubSlug: rule.clubSlug,
      qualityStatus: "verified" as const,
      note: result.note
        ? `${result.note} ${resolutionNote}`
        : resolutionNote,
    };
  });

  const missingReviewKeys = [...rulesByReviewKey.keys()].filter(
    (reviewKey) => !matchedReviewKeys.has(reviewKey)
  );
  if (missingReviewKeys.length > 0) {
    throw new Error(
      `Reviewed rows were not found:\n${missingReviewKeys.join("\n")}`
    );
  }

  const deferred = dataset.results.filter(
    (result) =>
      resultReviewKey(result) ===
      "yanggu-2025-women::전북대 탑스핀"
  );
  if (
    deferred.length !== 1 ||
    deferred[0]?.clubSlug !== null ||
    deferred[0]?.qualityStatus !== "unresolved"
  ) {
    throw new Error("The explicitly deferred Jeonbuk Topspin row changed.");
  }

  dataset.version = "sources-2026-07-24-v10";

  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        resolvedTotal: matchedReviewKeys.size,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
        resolvedByClub: Object.fromEntries(
          [...resolvedCounts].sort(([left], [right]) =>
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
