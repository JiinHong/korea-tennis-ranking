import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  NationalRankingDataset,
  TeamResultInput,
} from "../lib/nationalRanking/types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const EDITION_KEY = "gyeongin-2024-men";
const SOURCE_VERSION = "sources-2026-07-26-v12";
const TARGET_VERSION = "sources-2026-07-26-v13";
const SOURCE_DIRECTORY = "경인지구/2024/남자";

const ORDERED_SOURCE_REFS = [
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 001.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 002.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 003.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 004.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-48 005.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 006.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 007.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 008.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 009.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 010.jpeg`,
  `${SOURCE_DIRECTORY}/KakaoTalk_Photo_2026-07-08-04-55-49 011.jpeg`,
] as const;

type Resolution = Pick<
  TeamResultInput,
  "clubSlug" | "stage" | "qualityStatus" | "sourceRef" | "note"
>;

const RESOLUTIONS = new Map<string, Resolution>([
  [
    "DUTC A팀",
    {
      clubSlug: "dongguk-dutc",
      stage: "round_of_16",
      qualityStatus: "verified",
      sourceRef: ORDERED_SOURCE_REFS[2],
      note:
        "Image 003 shows DUTC A팀 beating 단국대 A 3-1. " +
        "When images 001-004 and 005-008 are joined vertically, the same " +
        "bracket slot continues into the Round of 16 and loses 0-3 to 서강대; " +
        "the 단국대 A label in image 007 is a carried-forward display error. " +
        "DUTC is assigned to 동국대학교 DUTC.",
    },
  ],
  [
    "단국대 A",
    {
      clubSlug: "dankook-cheonan-dkutc",
      stage: "round_of_32",
      qualityStatus: "verified",
      sourceRef: ORDERED_SOURCE_REFS[2],
      note:
        "Image 003 shows a 1-3 Round-of-32 loss to DUTC A팀. " +
        "Assigned to 단국대학교 DKUTC(천안캠퍼스) from the administrator's " +
        "prior confirmation for the generic 단국대 label.",
    },
  ],
  [
    "SSTC A",
    {
      clubSlug: "soongsil-sstc",
      stage: "first_match_loss",
      qualityStatus: "verified",
      sourceRef: ORDERED_SOURCE_REFS[2],
      note:
        "BYE, then first played-match loss 1-3 to 서강대. " +
        "SSTC is assigned to 숭실대학교 SSTC.",
    },
  ],
  [
    "아주대 A",
    {
      clubSlug: "ajou-tennis",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: ORDERED_SOURCE_REFS[10],
      note:
        "School-qualified final frozen to 아주대학교 ATC, the university's " +
        "pre-assignment men's leader. Final shows a 1-3 loss to 서울대학교 A.",
    },
  ],
  [
    "경희대학교 A",
    {
      clubSlug: "kyunghee-seoul-kuta",
      stage: "round_of_16",
      qualityStatus: "verified",
      sourceRef: ORDERED_SOURCE_REFS[7],
      note:
        "Lost 1-3 to 아주대 A. Assigned to 경희대학교 서울캠퍼스 KUTA " +
        "from the administrator's direct confirmation.",
    },
  ],
]);

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;

  if (dataset.version !== SOURCE_VERSION) {
    throw new Error(
      `Expected ${SOURCE_VERSION}, received ${dataset.version}`
    );
  }

  const edition = dataset.editions.find(({ key }) => key === EDITION_KEY);
  if (!edition) {
    throw new Error(`Missing edition: ${EDITION_KEY}`);
  }
  if (edition.actualEntrants !== 48 || edition.sourceStatus !== "unresolved") {
    throw new Error(`Unexpected source state for ${EDITION_KEY}`);
  }

  edition.sourceStatus = "verified";
  edition.sourceRefs = [...ORDERED_SOURCE_REFS];

  const matchedNames = new Set<string>();
  dataset.results = dataset.results.map((result) => {
    if (result.editionKey !== EDITION_KEY) return result;

    const resolution = RESOLUTIONS.get(result.sourceTeamName);
    if (!resolution) return result;
    if (matchedNames.has(result.sourceTeamName)) {
      throw new Error(
        `Duplicate result name in ${EDITION_KEY}: ${result.sourceTeamName}`
      );
    }

    matchedNames.add(result.sourceTeamName);
    return {
      ...result,
      ...resolution,
    };
  });

  const missingNames = [...RESOLUTIONS.keys()].filter(
    (sourceTeamName) => !matchedNames.has(sourceTeamName)
  );
  if (missingNames.length > 0) {
    throw new Error(`Missing results: ${missingNames.join(", ")}`);
  }

  const editionResults = dataset.results.filter(
    (result) => result.editionKey === EDITION_KEY
  );
  if (
    editionResults.length !== 48 ||
    editionResults.some((result) => result.stage === null)
  ) {
    throw new Error(
      `${EDITION_KEY} must contain 48 terminal-stage results`
    );
  }

  dataset.version = TARGET_VERSION;
  await writeFile(DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  process.stdout.write(
    `${JSON.stringify(
      {
        version: dataset.version,
        editionStatus: edition.sourceStatus,
        resolvedResults: matchedNames.size,
        editionUnresolvedResults: editionResults.filter(
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
