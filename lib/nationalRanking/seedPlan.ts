import { calculateNationalRankings } from "./calculate";
import { NATIONAL_FORMULA_V1 } from "./formula";
import type {
  CalculatedRankingRow,
  NationalRankingDataset,
} from "./types";

export const PRIMARY_METHODOLOGY_REFERENCES = [
  {
    label: "ATP rankings FAQ",
    url: "https://www.atptour.com/en/rankings/rankings-faq",
  },
  {
    label: "BWF World Ranking System",
    url: "https://system.bwfbadminton.com/documents/folder_1_81/folder_1_82/New-Regulations-2018/5.3.3.1%20World%20Ranking%20System.pdf",
  },
  {
    label: "Official World Golf Ranking methodology",
    url: "https://www.owgr.com/how-the-ranking-works",
  },
  {
    label: "UEFA club ranking overview",
    url: "https://www.uefa.com/nationalassociations/uefarankings/",
  },
  {
    label: "solved.ac rating explanation UX reference",
    url: "https://help.solved.ac/ko/stats/ac-rating",
  },
] as const;

export type NationalRankingSeedPlan = {
  datasetVersion: NationalRankingDataset["version"];
  formula: {
    version: typeof NATIONAL_FORMULA_V1.version;
    displayName: string;
    config: typeof NATIONAL_FORMULA_V1;
    effectiveOn: string;
    sourceReferences: typeof PRIMARY_METHODOLOGY_REFERENCES;
  };
  sourceRevision: string;
  clubs: NationalRankingDataset["clubs"];
  aliases: NationalRankingDataset["aliases"];
  tournaments: NationalRankingDataset["tournaments"];
  editions: NationalRankingDataset["editions"];
  results: NationalRankingDataset["results"];
  rows: CalculatedRankingRow[];
};

export function buildNationalRankingSeedPlan(
  dataset: NationalRankingDataset,
  sourceRevision: string
): NationalRankingSeedPlan {
  const calculated = calculateNationalRankings(dataset);

  return {
    datasetVersion: dataset.version,
    formula: {
      version: NATIONAL_FORMULA_V1.version,
      displayName: "National Club Ranking v1",
      config: NATIONAL_FORMULA_V1,
      effectiveOn: "2026-07-12",
      sourceReferences: PRIMARY_METHODOLOGY_REFERENCES,
    },
    sourceRevision,
    clubs: dataset.clubs,
    aliases: dataset.aliases,
    tournaments: dataset.tournaments,
    editions: dataset.editions,
    results: dataset.results,
    rows: calculated.rows,
  };
}
