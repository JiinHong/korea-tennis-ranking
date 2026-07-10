import { describe, expect, test } from "vitest";

import {
  buildSupabaseBaseSeedSql,
  buildSupabaseMatchSeedSql,
  buildSupabaseSeedSqlFiles,
  buildSupabaseSeedSql,
} from "@/lib/supabaseSeedSql";
import type { SupabaseSeedPlan } from "@/lib/supabaseSeedPlan";

const plan: SupabaseSeedPlan = {
  club: {
    slug: "seoultech",
    title: "서울과학기술대학교 테니스 단식 랭킹",
    organization: "서울과학기술대학교 테니스",
    subtitle: "도전과 방어",
    logoPath: "/seoultech-symbol.png",
  },
  seasons: [
    { name: "시즌3", isCurrent: true },
    { name: "시즌2", isCurrent: false },
  ],
  players: [
    { name: "오준석", displayName: "오준석", normalizedName: "오준석" },
    { name: "김도훈", displayName: "김도훈", normalizedName: "김도훈" },
  ],
  seasonPlayers: [
    {
      seasonName: "시즌3",
      playerName: "오준석",
      initialRank: 1,
      currentRank: 1,
      note: "",
      status: "active",
    },
  ],
  matches: [
    {
      seasonName: "시즌3",
      playedOn: "2026-07-08",
      challengerName: "김도훈",
      defenderName: "오준석",
      challengerRank: 2,
      defenderRank: 1,
      winnerName: "오준석",
      winnerScore: 6,
      loserScore: 4,
      defenseResult: "방어 성공",
      source: "import",
      sourceKey: "current:1",
    },
  ],
  ruleConfig: {
    seasonName: "시즌3",
    challengeRange: 4,
    rematchCooldownDays: 14,
    inactivityPenaltyDrop: 2,
    injuryExemptionLimit: 2,
    injuryNoticeDeadlineDaysBeforeMonthEnd: 7,
  },
};

describe("buildSupabaseSeedSql", () => {
  test("generates one idempotent transaction for clubs, players, rankings, matches, and rules", () => {
    const sql = buildSupabaseSeedSql(plan);

    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("on conflict (slug) do update");
    expect(sql).toContain("on conflict (club_id, normalized_name)");
    expect(sql).toContain("delete from public.season_players");
    expect(sql).toContain("where not exists");
    expect(sql).toContain("insert into public.rule_configs");
    expect(sql).toContain("서울과학기술대학교 테니스 단식 랭킹");
  });

  test("escapes single quotes inside JSON literals", () => {
    const sql = buildSupabaseSeedSql({
      ...plan,
      club: {
        ...plan.club,
        subtitle: "도전과 '방어'",
      },
    });

    expect(sql).toContain("도전과 ''방어''");
  });

  test("generates a base-only transaction without match inserts", () => {
    const sql = buildSupabaseBaseSeedSql(plan);

    expect(sql).toContain("insert into public.clubs");
    expect(sql).toContain("insert into public.players");
    expect(sql).toContain("insert into public.rule_configs");
    expect(sql).not.toContain("insert into public.matches");
  });

  test("generates a match-only transaction for chunked imports", () => {
    const sql = buildSupabaseMatchSeedSql(plan.club.slug, plan.matches);

    expect(sql).toContain("insert into public.matches");
    expect(sql).toContain("source_key");
    expect(sql).toContain("where not exists");
    expect(sql).toContain("existing.club_id = resolved.club_id");
    expect(sql).toContain("existing.source_key = resolved.source_key");
    expect(sql).toContain('"winnerScore":6');
    expect(sql).not.toContain("delete from public.season_players");
    expect(sql).not.toContain("insert into public.players");
  });

  test("splits seed SQL into one base file and numbered match chunks", () => {
    const files = buildSupabaseSeedSqlFiles(
      {
        ...plan,
        matches: [
          plan.matches[0],
          { ...plan.matches[0], playedOn: "2026-07-09" },
          { ...plan.matches[0], playedOn: "2026-07-10" },
        ],
      },
      2
    );

    expect(files.map((file) => file.name)).toEqual([
      "001-base.sql",
      "002-matches-001.sql",
      "003-matches-002.sql",
    ]);
    expect(files[0].sql).not.toContain("insert into public.matches");
    expect(files[1].sql).toContain("2026-07-08");
    expect(files[1].sql).toContain("2026-07-09");
    expect(files[1].sql).not.toContain("2026-07-10");
    expect(files[2].sql).toContain("2026-07-10");
  });
});
