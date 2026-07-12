import sourceDataset from "@/data/national-ranking/v1/dataset.json";

import type {
  NationalClubAliasInput,
  NationalClubInput,
  NationalRankingDataset,
  TeamResultInput,
  TournamentEditionInput,
  TournamentInput,
} from "./types";

const NATIONAL_GENDERS = ["men", "women"] as const;
const RESULT_QUALITY_STATUSES = [
  "verified",
  "unresolved",
  "missing",
  "did_not_enter",
] as const;
const SOURCE_STATUSES = ["verified", "unresolved", "missing"] as const;
const TOURNAMENT_SCOPES = ["national", "regional"] as const;
const TOURNAMENT_STAGES = [
  "champion",
  "runner_up",
  "semifinal",
  "quarterfinal",
  "round_of_16",
  "round_of_32",
  "round_of_64",
  "first_match_loss",
] as const;

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }

  return value;
}

function requireStringValue(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }

  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${path} must be a positive integer`);
  }

  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }

  return value;
}

function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string
): T {
  if (typeof value === "string") {
    const match = allowed.find((candidate) => candidate === value);
    if (match) return match;
  }

  throw new Error(`${path} must be one of: ${allowed.join(", ")}`);
}

function requireNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return requireString(value, path);
}

function requireUnique(
  values: Set<string>,
  value: string,
  path: string,
  description: string
): void {
  if (values.has(value)) {
    throw new Error(`${path}: duplicate ${description} "${value}"`);
  }

  values.add(value);
}

function parseClubs(value: unknown): NationalClubInput[] {
  const slugs = new Set<string>();

  return requireArray(value, "dataset.clubs").map((item, index) => {
    const path = `dataset.clubs[${index}]`;
    const record = requireRecord(item, path);
    const slug = requireString(record.slug, `${path}.slug`);

    requireUnique(slugs, slug, `${path}.slug`, "club slug");

    return {
      slug,
      universityName: requireString(record.universityName, `${path}.universityName`),
      clubName: requireString(record.clubName, `${path}.clubName`),
      displayName: requireString(record.displayName, `${path}.displayName`),
    };
  });
}

function parseAliases(value: unknown): NationalClubAliasInput[] {
  const aliases = new Set<string>();

  return requireArray(value, "dataset.aliases").map((item, index) => {
    const path = `dataset.aliases[${index}]`;
    const record = requireRecord(item, path);
    const normalizedAlias = requireString(
      record.normalizedAlias,
      `${path}.normalizedAlias`
    );

    requireUnique(aliases, normalizedAlias, `${path}.normalizedAlias`, "normalized alias");

    return {
      clubSlug: requireString(record.clubSlug, `${path}.clubSlug`),
      normalizedAlias,
      sourceLabel: requireString(record.sourceLabel, `${path}.sourceLabel`),
    };
  });
}

function parseTournaments(value: unknown): TournamentInput[] {
  const slugs = new Set<string>();

  return requireArray(value, "dataset.tournaments").map((item, index) => {
    const path = `dataset.tournaments[${index}]`;
    const record = requireRecord(item, path);
    const slug = requireString(record.slug, `${path}.slug`);
    const scope = requireOneOf(record.scope, TOURNAMENT_SCOPES, `${path}.scope`);
    const scopeFactor = requireNumber(record.scopeFactor, `${path}.scopeFactor`);

    requireUnique(slugs, slug, `${path}.slug`, "tournament slug");

    if (scopeFactor !== 1 && scopeFactor !== 0.85) {
      throw new Error(`${path}.scopeFactor must be exactly 1 or 0.85`);
    }
    if (scope === "national" && scopeFactor !== 1) {
      throw new Error(`${path}.scopeFactor: national scope requires scopeFactor 1`);
    }
    if (scope === "regional" && scopeFactor !== 0.85) {
      throw new Error(`${path}.scopeFactor: regional scope requires scopeFactor 0.85`);
    }

    return {
      slug,
      name: requireString(record.name, `${path}.name`),
      scope,
      scopeFactor,
    };
  });
}

function parseEditions(value: unknown): TournamentEditionInput[] {
  const keys = new Set<string>();
  const naturalKeys = new Set<string>();

  return requireArray(value, "dataset.editions").map((item, index) => {
    const path = `dataset.editions[${index}]`;
    const record = requireRecord(item, path);
    const key = requireString(record.key, `${path}.key`);
    const tournamentSlug = requireString(record.tournamentSlug, `${path}.tournamentSlug`);
    const year = requirePositiveInteger(record.year, `${path}.year`);
    const gender = requireOneOf(record.gender, NATIONAL_GENDERS, `${path}.gender`);
    const sourceStatus = requireOneOf(
      record.sourceStatus,
      SOURCE_STATUSES,
      `${path}.sourceStatus`
    );
    const sourceRefs = requireArray(record.sourceRefs, `${path}.sourceRefs`).map(
      (sourceRef, sourceIndex) =>
        requireString(sourceRef, `${path}.sourceRefs[${sourceIndex}]`)
    );
    const uniqueSourceRefs = new Set<string>();

    for (const sourceRef of sourceRefs) {
      requireUnique(
        uniqueSourceRefs,
        sourceRef,
        `${path}.sourceRefs`,
        "source reference"
      );
    }

    requireUnique(keys, key, `${path}.key`, "edition key");
    requireUnique(
      naturalKeys,
      `${tournamentSlug}:${year}:${gender}`,
      path,
      "tournament/year/gender edition"
    );

    if (sourceStatus === "verified" && sourceRefs.length === 0) {
      throw new Error(`${path}.sourceRefs: verified edition must include a source reference`);
    }

    return {
      key,
      tournamentSlug,
      year,
      gender,
      actualEntrants: requirePositiveInteger(
        record.actualEntrants,
        `${path}.actualEntrants`
      ),
      sourceStatus,
      sourceRefs,
    };
  });
}

function parseResults(value: unknown): TeamResultInput[] {
  return requireArray(value, "dataset.results").map((item, index) => {
    const path = `dataset.results[${index}]`;
    const record = requireRecord(item, path);

    return {
      editionKey: requireString(record.editionKey, `${path}.editionKey`),
      clubSlug: requireNullableString(record.clubSlug, `${path}.clubSlug`),
      sourceTeamName: requireString(record.sourceTeamName, `${path}.sourceTeamName`),
      teamLabel: requireStringValue(record.teamLabel, `${path}.teamLabel`),
      stage: requireOneOf(record.stage, TOURNAMENT_STAGES, `${path}.stage`),
      qualityStatus: requireOneOf(
        record.qualityStatus,
        RESULT_QUALITY_STATUSES,
        `${path}.qualityStatus`
      ),
      sourceRef: requireString(record.sourceRef, `${path}.sourceRef`),
      note: requireStringValue(record.note, `${path}.note`),
    };
  });
}

function validateRelationships(dataset: NationalRankingDataset): void {
  const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
  const tournamentSlugs = new Set(dataset.tournaments.map((tournament) => tournament.slug));
  const editionsByKey = new Map(dataset.editions.map((edition) => [edition.key, edition]));
  const resultIdentities = new Set<string>();

  for (const [index, alias] of dataset.aliases.entries()) {
    if (!clubSlugs.has(alias.clubSlug)) {
      throw new Error(
        `dataset.aliases[${index}].clubSlug: alias references an unknown club "${alias.clubSlug}"`
      );
    }
  }

  for (const [index, edition] of dataset.editions.entries()) {
    if (!tournamentSlugs.has(edition.tournamentSlug)) {
      throw new Error(
        `dataset.editions[${index}].tournamentSlug: edition references an unknown tournament "${edition.tournamentSlug}"`
      );
    }
  }

  for (const result of dataset.results) {
    const edition = editionsByKey.get(result.editionKey);
    const resultPath = result.sourceRef;

    if (!edition) {
      throw new Error(
        `${resultPath}: result references an unknown edition "${result.editionKey}"`
      );
    }

    if (!edition.sourceRefs.includes(result.sourceRef)) {
      throw new Error(
        `${resultPath}: result sourceRef is not listed by its edition "${edition.key}"`
      );
    }

    if (result.qualityStatus === "verified") {
      if (!result.clubSlug || !clubSlugs.has(result.clubSlug)) {
        throw new Error(
          `${resultPath}: verified result must reference a known club "${result.clubSlug ?? "null"}"`
        );
      }
    } else if (result.clubSlug && !clubSlugs.has(result.clubSlug)) {
      throw new Error(
        `${resultPath}: result references an unknown club "${result.clubSlug}"`
      );
    }

    requireUnique(
      resultIdentities,
      `${result.editionKey}:${result.sourceTeamName}:${result.teamLabel}`,
      resultPath,
      "result identity"
    );
  }
}

export function parseNationalRankingDataset(value: unknown): NationalRankingDataset {
  const record = requireRecord(value, "dataset");
  const dataset: NationalRankingDataset = {
    version: requireString(record.version, "dataset.version"),
    clubs: parseClubs(record.clubs),
    aliases: parseAliases(record.aliases),
    tournaments: parseTournaments(record.tournaments),
    editions: parseEditions(record.editions),
    results: parseResults(record.results),
  };

  validateRelationships(dataset);
  return dataset;
}

export function loadNationalRankingDataset(): NationalRankingDataset {
  return parseNationalRankingDataset(sourceDataset);
}
