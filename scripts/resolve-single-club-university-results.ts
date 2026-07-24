import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

type UniversityResolutionRule = {
  clubSlug: string;
  sourcePrefix: RegExp;
};

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

// Only institutions with one unambiguous club in the public ranking are listed.
// Universities with multiple clubs, colleges, or campuses require manual review.
const UNIVERSITY_RESOLUTION_RULES: UniversityResolutionRule[] = [
  {
    clubSlug: "gangwon-shot",
    sourcePrefix: /^(강원대|강원대학교)삼척/,
  },
  {
    clubSlug: "hanyang-erica-hitec",
    sourcePrefix: /^한양대(학교)?에리카/,
  },
  {
    clubSlug: "hanyang-women-hytc",
    sourcePrefix: /^한양여대(학교)?/,
  },
  {
    clubSlug: "gachon-tiebreak",
    sourcePrefix: /^가천대(학교)?/,
  },
  {
    clubSlug: "catholic-courtrang",
    sourcePrefix: /^[가카]톨릭대(학교)?/,
  },
  {
    clubSlug: "konkuk-ktc",
    sourcePrefix: /^건국대(학교)?/,
  },
  {
    clubSlug: "gyeonggi-ktf",
    sourcePrefix: /^경기대(학교)?/,
  },
  {
    clubSlug: "kyungpook-kutc",
    sourcePrefix: /^경북대(학교)?/,
  },
  {
    clubSlug: "kwangwoon-kwtc",
    sourcePrefix: /^광운대(학교)?/,
  },
  {
    clubSlug: "kumoh-kotc",
    sourcePrefix: /^(국립)?금오(공과)?대(학교)?/,
  },
  {
    clubSlug: "hanbat-masters",
    sourcePrefix: /^(국립)?한밭대(학교)?/,
  },
  {
    clubSlug: "kookmin-kmtc",
    sourcePrefix: /^(국민대(학교)?|국민(?=남자|여자))/,
  },
  {
    clubSlug: "dongguk-dutc",
    sourcePrefix: /^동국대(학교)?/,
  },
  {
    clubSlug: "sangmyung-tesla",
    sourcePrefix: /^상명대(학교)?/,
  },
  {
    clubSlug: "sangji-ace",
    sourcePrefix: /^상지대(학교)?/,
  },
  {
    clubSlug: "sogang-sgtc",
    sourcePrefix: /^서강대(학교)?/,
  },
  {
    clubSlug: "seoultech-neutinamu",
    sourcePrefix: /^(서울과학기술대(학교)?|서울과기대|과기대)/,
  },
  {
    clubSlug: "uos-approach",
    sourcePrefix: /^(서울시립대(학교)?|시립대(학교)?)/,
  },
  {
    clubSlug: "sungkyunkwan-stc",
    sourcePrefix: /^성균관대(학교)?/,
  },
  {
    clubSlug: "sejong-stc",
    sourcePrefix: /^세종대(학교)?/,
  },
  {
    clubSlug: "soongsil-sstc",
    sourcePrefix: /^숭실대(학교)?/,
  },
  {
    clubSlug: "ajou-tennis",
    sourcePrefix: /^아주대(학교)?/,
  },
  {
    clubSlug: "yeungnam-yuta",
    sourcePrefix: /^영남대(학교)?/,
  },
  {
    clubSlug: "ulsan-utc",
    sourcePrefix: /^울산대(학교)?/,
  },
  {
    clubSlug: "inu-uitc",
    sourcePrefix: /^인천대(학교)?/,
  },
  {
    clubSlug: "inha-rapum",
    sourcePrefix: /^인하대(학교)?/,
  },
  {
    clubSlug: "chungang-love4t",
    sourcePrefix: /^중앙대(학교)?/,
  },
  {
    clubSlug: "chungnam-goodshot",
    sourcePrefix: /^충남대(학교)?/,
  },
  {
    clubSlug: "chungbuk-ace",
    sourcePrefix: /^충북대(학교)?/,
  },
  {
    clubSlug: "ut-perfect",
    sourcePrefix: /^한국교통대(학교)?/,
  },
  {
    clubSlug: "hufs-ace",
    sourcePrefix: /^(한국외대|한국외국어대(학교)?)/,
  },
  {
    clubSlug: "kau-ace",
    sourcePrefix: /^한국항공대(학교)?/,
  },
  {
    clubSlug: "hannam-winners",
    sourcePrefix: /^한남대(학교)?/,
  },
  {
    clubSlug: "hongik-hitc",
    sourcePrefix: /^홍익대(학교)?/,
  },
  {
    clubSlug: "kaist-stroke",
    sourcePrefix: /^(카이스트|kaist)/i,
  },
];

function compactSourceName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s·._()[\]-]+/g, "")
    .toLowerCase();
}

function findResolutionRule(
  result: TeamResultInput
): UniversityResolutionRule | undefined {
  if (
    result.clubSlug !== null ||
    result.qualityStatus !== "unresolved" ||
    result.stage === null
  ) {
    return undefined;
  }

  const sourceName = compactSourceName(result.sourceTeamName);
  return UNIVERSITY_RESOLUTION_RULES.find((rule) =>
    rule.sourcePrefix.test(sourceName)
  );
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;
  const clubsBySlug = new Map(dataset.clubs.map((club) => [club.slug, club]));
  const resolvedCounts = new Map<string, number>();

  if (dataset.version !== "sources-2026-07-23-v8") {
    throw new Error(
      `Expected sources-2026-07-23-v8, received ${dataset.version}`
    );
  }

  dataset.results = dataset.results.map((result) => {
    const rule = findResolutionRule(result);
    if (!rule) return result;

    const club = clubsBySlug.get(rule.clubSlug);
    if (!club) {
      throw new Error(`Unknown club slug in resolution rule: ${rule.clubSlug}`);
    }

    resolvedCounts.set(
      rule.clubSlug,
      (resolvedCounts.get(rule.clubSlug) ?? 0) + 1
    );

    const resolutionNote =
      `Assigned to ${club.displayName} under the administrator-approved ` +
      "single-club university rule.";

    return {
      ...result,
      clubSlug: rule.clubSlug,
      qualityStatus: "verified",
      note: result.note
        ? `${result.note} ${resolutionNote}`
        : resolutionNote,
    };
  });
  dataset.version = "sources-2026-07-24-v9";

  const resolvedTotal = [...resolvedCounts.values()].reduce(
    (total, count) => total + count,
    0
  );
  if (resolvedTotal !== 332) {
    throw new Error(`Expected to resolve 332 rows, resolved ${resolvedTotal}`);
  }

  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        resolvedTotal,
        verifiedResults: dataset.results.filter(
          (result) => result.qualityStatus === "verified"
        ).length,
        unresolvedResults: dataset.results.filter(
          (result) => result.qualityStatus === "unresolved"
        ).length,
        clubs: Object.fromEntries(
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
