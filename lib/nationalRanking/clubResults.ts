import "server-only";

import { unstable_cache } from "next/cache";

import { getSupabaseReadClient } from "@/lib/supabaseServer";
import type { NationalGender, TournamentStage } from "./types";

export type PublicNationalClubResultStage = Extract<
  TournamentStage,
  "champion" | "runner_up" | "semifinal" | "quarterfinal" | "round_of_16"
>;

export type NationalClubResultViewRow = {
  club_slug: string;
  university_name: string;
  club_name: string;
  display_name: string;
  tournament_slug: string | null;
  tournament_name: string | null;
  edition_year: number | null;
  gender: NationalGender | null;
  actual_entrants: number | null;
  stage: PublicNationalClubResultStage | null;
  source_team_name: string | null;
  team_label: string | null;
};

export type PublicNationalClubResult = {
  tournamentSlug: string;
  tournamentName: string;
  year: number;
  gender: NationalGender;
  actualEntrants: number;
  stage: PublicNationalClubResultStage;
  sourceTeamName: string;
  teamLabel: string;
};

export type NationalClubResultsPageData = {
  club: {
    slug: string;
    universityName: string;
    clubName: string;
    displayName: string;
  };
  results: PublicNationalClubResult[];
};

export type NationalClubResultReadAdapter = {
  listByClubSlug(clubSlug: string): Promise<NationalClubResultViewRow[]>;
};

const publicResultStages = new Set<PublicNationalClubResultStage>([
  "champion",
  "runner_up",
  "semifinal",
  "quarterfinal",
  "round_of_16",
]);

function createNationalClubResultReadAdapter(): NationalClubResultReadAdapter {
  const supabase = getSupabaseReadClient();

  return {
    async listByClubSlug(clubSlug) {
      const { data, error } = await supabase
        .from("public_national_club_results")
        .select(
          "club_slug, university_name, club_name, display_name, tournament_slug, tournament_name, edition_year, gender, actual_entrants, stage, source_team_name, team_label"
        )
        .eq("club_slug", clubSlug)
        .order("edition_year", { ascending: false, nullsFirst: false });

      if (error) {
        throw error;
      }

      return (data ?? []) as NationalClubResultViewRow[];
    },
  };
}

function describeError(error: unknown): string {
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

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`National club result field ${field} is invalid`);
  }

  return value;
}

function parseResult(row: NationalClubResultViewRow): PublicNationalClubResult | null {
  if (row.tournament_slug === null) {
    const nullableFields = [
      row.tournament_name,
      row.edition_year,
      row.gender,
      row.actual_entrants,
      row.stage,
      row.source_team_name,
      row.team_label,
    ];

    if (nullableFields.some((value) => value !== null)) {
      throw new Error("National club result empty row is inconsistent");
    }

    return null;
  }

  if (!Number.isInteger(row.edition_year) || (row.edition_year ?? 0) <= 0) {
    throw new Error("National club result field edition_year is invalid");
  }
  if (row.gender !== "men" && row.gender !== "women") {
    throw new Error("National club result field gender is invalid");
  }
  if (
    !Number.isInteger(row.actual_entrants) ||
    (row.actual_entrants ?? 0) <= 0
  ) {
    throw new Error("National club result field actual_entrants is invalid");
  }
  if (row.stage === null || !publicResultStages.has(row.stage)) {
    throw new Error("National club result field stage is invalid");
  }

  return {
    tournamentSlug: row.tournament_slug,
    tournamentName: requireString(row.tournament_name, "tournament_name"),
    year: row.edition_year as number,
    gender: row.gender,
    actualEntrants: row.actual_entrants as number,
    stage: row.stage,
    sourceTeamName: requireString(row.source_team_name, "source_team_name"),
    teamLabel: row.team_label ?? "",
  };
}

export async function getNationalClubResultsPageData(
  clubSlug: string,
  adapter: NationalClubResultReadAdapter = createNationalClubResultReadAdapter()
): Promise<NationalClubResultsPageData | null> {
  let rows: NationalClubResultViewRow[];

  try {
    rows = await adapter.listByClubSlug(clubSlug);
  } catch (error) {
    throw new Error(`National club results read failed: ${describeError(error)}`);
  }

  if (rows.length === 0) {
    return null;
  }

  const firstRow = rows[0];
  const club = {
    slug: requireString(firstRow.club_slug, "club_slug"),
    universityName: requireString(
      firstRow.university_name,
      "university_name"
    ),
    clubName: requireString(firstRow.club_name, "club_name"),
    displayName: requireString(firstRow.display_name, "display_name"),
  };

  const results = rows.flatMap((row) => {
    if (
      row.club_slug !== club.slug ||
      row.university_name !== club.universityName ||
      row.club_name !== club.clubName ||
      row.display_name !== club.displayName
    ) {
      throw new Error("National club result metadata mismatch");
    }

    const result = parseResult(row);
    return result ? [result] : [];
  });

  results.sort(
    (left, right) =>
      right.year - left.year ||
      left.tournamentName.localeCompare(right.tournamentName, "ko-KR") ||
      left.gender.localeCompare(right.gender)
  );

  return { club, results };
}

export const getCachedNationalClubResultsPageData = unstable_cache(
  (clubSlug: string) => getNationalClubResultsPageData(clubSlug),
  ["national-club-results-v1"],
  { tags: ["national-club-results"], revalidate: 300 }
);
