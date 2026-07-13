import "server-only";

import { unstable_cache } from "next/cache";

import { getSupabaseReadClient } from "@/lib/supabaseServer";
import type {
  NationalRankingHonor,
  RankingGender,
} from "@/lib/nationalRanking/types";

export type PublicNationalRankingRow = {
  rank: number;
  clubSlug: string;
  universityName: string;
  clubName: string;
  displayName: string;
  points: number;
  latestEditionPoints: number;
  championships: number;
  runnerUps: number;
  honors: NationalRankingHonor[];
};

export type NationalRankingViewRow = {
  formula_version: string;
  calculated_at: string;
  gender: RankingGender;
  rank: number;
  total_points: number;
  latest_edition_points: number;
  championships: number;
  runner_ups: number;
  honors: unknown;
  club_slug: string;
  university_name: string;
  club_name: string;
  display_name: string;
};

export type NationalRankingReadAdapter = {
  listLatestRows(): Promise<NationalRankingViewRow[]>;
};

export type NationalRankingPageData = {
  formulaVersion: string;
  calculatedAt: string;
  rankings: Record<RankingGender, PublicNationalRankingRow[]>;
};

function createNationalRankingReadAdapter(): NationalRankingReadAdapter {
  const supabase = getSupabaseReadClient();

  return {
    async listLatestRows() {
      const { data, error } = await supabase
        .from("latest_national_rankings")
        .select(
          "formula_version, calculated_at, gender, rank, total_points, latest_edition_points, championships, runner_ups, honors, club_slug, university_name, club_name, display_name"
        )
        .order("gender", { ascending: true })
        .order("rank", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []) as NationalRankingViewRow[];
    },
  };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return String(error);
}

function requireHonorString(
  value: unknown,
  field: string,
  clubSlug: string
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `National ranking honors field ${field} is invalid for ${clubSlug}`
    );
  }

  return value;
}

function parseNationalRankingHonors(
  value: unknown,
  clubSlug: string
): NationalRankingHonor[] {
  if (!Array.isArray(value)) {
    throw new Error(`National ranking honors must be an array for ${clubSlug}`);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `National ranking honors item ${index} is invalid for ${clubSlug}`
      );
    }

    const record = item as Record<string, unknown>;
    const year = record.year;
    const gender = record.gender;
    const stage = record.stage;

    if (!Number.isInteger(year) || (year as number) <= 0) {
      throw new Error(
        `National ranking honors field year is invalid for ${clubSlug}`
      );
    }
    if (gender !== "men" && gender !== "women") {
      throw new Error(
        `National ranking honors field gender is invalid for ${clubSlug}`
      );
    }
    if (stage !== "champion" && stage !== "runner_up") {
      throw new Error(
        `National ranking honors field stage is invalid for ${clubSlug}`
      );
    }

    return {
      editionKey: requireHonorString(record.editionKey, "editionKey", clubSlug),
      tournamentSlug: requireHonorString(
        record.tournamentSlug,
        "tournamentSlug",
        clubSlug
      ),
      tournamentName: requireHonorString(
        record.tournamentName,
        "tournamentName",
        clubSlug
      ),
      year: year as number,
      gender,
      stage,
    };
  });
}

export async function getNationalRankingPageData(
  adapter: NationalRankingReadAdapter = createNationalRankingReadAdapter()
): Promise<NationalRankingPageData | null> {
  let rows: NationalRankingViewRow[];

  try {
    rows = await adapter.listLatestRows();
  } catch (error) {
    throw new Error(`National ranking read failed: ${describeError(error)}`);
  }

  if (rows.length === 0) {
    return null;
  }

  const { formula_version: formulaVersion, calculated_at: calculatedAt } =
    rows[0];
  const rankings: Record<RankingGender, PublicNationalRankingRow[]> = {
    men: [],
    women: [],
    combined: [],
  };

  for (const row of rows) {
    if (
      row.formula_version !== formulaVersion ||
      row.calculated_at !== calculatedAt
    ) {
      throw new Error(
        "National ranking snapshot metadata mismatch: expected " +
          `formula_version ${formulaVersion} and calculated_at ${calculatedAt}, ` +
          `received formula_version ${row.formula_version} and ` +
          `calculated_at ${row.calculated_at}`
      );
    }

    rankings[row.gender].push({
      rank: row.rank,
      clubSlug: row.club_slug,
      universityName: row.university_name,
      clubName: row.club_name,
      displayName: row.display_name,
      points: row.total_points,
      latestEditionPoints: row.latest_edition_points,
      championships: row.championships,
      runnerUps: row.runner_ups,
      honors: parseNationalRankingHonors(row.honors, row.club_slug),
    });
  }

  for (const ranking of Object.values(rankings)) {
    ranking.sort((left, right) => left.rank - right.rank);
  }

  return {
    formulaVersion,
    calculatedAt,
    rankings,
  };
}

export const getCachedNationalRankingPageData = unstable_cache(
  () => getNationalRankingPageData(),
  ["national-ranking-v3"],
  { tags: ["national-ranking"], revalidate: 300 }
);
