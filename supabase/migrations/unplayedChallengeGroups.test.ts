// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { validateChallengeRange } from "@/lib/campusRanking/rules";

const migrationName = "20260908161331_group_seoultech_unplayed_challenges.sql";
const readMigration = (name: string) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");
const id = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
let db: PGlite;

async function record(
  challenger: number,
  defender: number,
  slug = "seoultech",
  challengerWins = false,
) {
  return db.query<{ result: { duplicate: boolean; rankChanged: boolean } }>(
    `select public.record_public_match($1, $2, $3, $4, $5, (now() at time zone 'Asia/Seoul')::date, $6) result`,
    [
      slug,
      id(challenger),
      id(defender),
      challengerWins ? 6 : 0,
      challengerWins ? 0 : 6,
      `test-${challenger}-${defender}`,
    ],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role;",
  );
  // The core uses built-in gen_random_uuid; pgcrypto is not needed for this test DB.
  await db.exec(
    readMigration("202607100001_create_ranking_schema.sql").replace(
      'create extension if not exists "pgcrypto";',
      "",
    ),
  );
  await db.exec(readMigration("20260710054911_add_match_source_key.sql"));
  await db.exec(readMigration("20260710103925_record_public_match.sql"));
  await db.exec(readMigration("20260710110954_guard_public_match_rpc.sql"));
  await db.exec(readMigration(migrationName));
  await db.exec(readMigration("20260908164305_correct_seoultech_challenge_group_direction.sql"));
}, 30000);

beforeEach(async () => {
  await db.exec(`
    begin;
    insert into clubs(id,slug,name,title,organization,subtitle,logo_path)
      values('${id(100)}','seoultech','test','test','test','test','/test');
    insert into seasons(id,club_id,name,is_current) values
      ('${id(101)}','${id(100)}','current',true), ('${id(102)}','${id(100)}','old',false);
    insert into players(id,name,display_name)
      select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,'p'||n,'p'||n from generate_series(1,19) n;
    insert into season_players(club_id,season_id,player_id,initial_rank,current_rank)
      select '${id(100)}','${id(101)}',id,n,n from (select id,row_number() over(order by id)::integer n from players) p where n<=18;
    insert into rule_configs(club_id,season_id,challenge_range) values('${id(100)}','${id(101)}',4);
    insert into matches(club_id,season_id,played_on,challenger_player_id,defender_player_id,challenger_rank_before,defender_rank_before,winner_player_id,loser_player_id,winner_score,loser_score,defense_result,source)
      select '${id(100)}','${id(101)}','2026-07-01','${id(19)}',player_id,19,current_rank,player_id,'${id(19)}',6,0,'방어 성공','import'
      from season_players where current_rank % 3 = 1;
  `);
});
afterEach(async () => {
  await db.exec("rollback;");
});
afterAll(async () => {
  await db?.close();
});

describe("Seoultech unplayed challenge groups in Postgres", () => {
  it("includes the played leader and their unplayed followers", async () => {
    await db.exec("update rule_configs set challenge_range=1;");
    expect((await record(6, 1)).rows[0].result.duplicate).toBe(false);
  });

  it("starts a new group at the next played player", async () => {
    await db.exec("update rule_configs set challenge_range=1;");
    await expect(record(7, 3)).rejects.toThrow("도전 가능한 순위 범위를 벗어났습니다.");
  });
  it("accepts every player in the fourth group without changing ranks on a defense win", async () => {
    expect((await record(15, 1)).rows[0].result.rankChanged).toBe(false);
    expect(
      (
        await db.query(
          "select current_rank from season_players order by current_rank",
        )
      ).rows,
    ).toEqual(Array.from({ length: 18 }, (_, i) => ({ current_rank: i + 1 })));
  });

  it("rejects the fifth group with no persisted match or ranking change", async () => {
    await db.exec("savepoint rejected_match;");
    await expect(record(18, 1)).rejects.toThrow(
      "도전 가능한 순위 범위를 벗어났습니다.",
    );
    await db.exec("rollback to rejected_match;");
    expect(
      (await db.query("select count(*)::integer n from matches")).rows,
    ).toEqual([{ n: 6 }]);
  });

  it.each(["old season", "voided"])(
    "does not count %s matches as participation",
    async (kind) => {
      await db.exec(
        kind === "old season"
          ? `update matches set season_id='${id(102)}';`
          : "update matches set status='voided';",
      );
      expect((await record(18, 1)).rows[0].result.duplicate).toBe(false);
    },
  );

  it("keeps ordinary four-player limits for PETC", async () => {
    await db.exec("update clubs set slug='petc';");
    await expect(record(15, 1, "petc")).rejects.toThrow(
      "도전 가능한 순위 범위를 벗어났습니다.",
    );
  });

  it("preserves ranking movement and source-key idempotency for an expanded challenge", async () => {
    expect(
      (await record(15, 1, "seoultech", true)).rows[0].result.rankChanged,
    ).toBe(true);
    expect(
      (await record(15, 1, "seoultech", true)).rows[0].result.duplicate,
    ).toBe(true);
    expect(
      (
        await db.query(
          "select current_rank from season_players where player_id=$1",
          [id(15)],
        )
      ).rows,
    ).toEqual([{ current_rank: 1 }]);
    expect(
      (await db.query("select count(*)::integer n from ranking_events")).rows,
    ).toEqual([{ n: 1 }]);
  });

  it("agrees with TypeScript for every pairing, excluding injured boundaries", async () => {
    await db.exec(
      `update season_players set status='injured' where player_id='${id(4)}';`,
    );
    const players = Array.from({ length: 18 }, (_, i) => ({
      id: id(i + 1),
      name: `p${i + 1}`,
      rank: i + 1,
      status: i === 3 ? ("injured" as const) : ("active" as const),
    }));
    const matches = [1, 4, 7, 10, 13, 16].map((rank) => ({
      playerAId: id(rank),
      playerBId: id(19),
      playedOn: "2026-07-01",
    }));
    for (let challenger = 2; challenger <= 18; challenger++) {
      for (let defender = 1; defender < challenger; defender++) {
        await db.exec("savepoint pairing;");
        let accepted = true;
        try {
          await record(challenger, defender);
        } catch {
          accepted = false;
        }
        await db.exec("rollback to pairing; release pairing;");
        const expected = validateChallengeRange(
          players,
          id(challenger),
          id(defender),
          {
            challengeRange: 4,
            rematchCooldownDays: 14,
            inactivityPenaltyDrop: 2,
            groupUnplayedPlayers: true,
          },
          matches,
        ).ok;
        expect(accepted, `${challenger} -> ${defender}`).toBe(expected);
      }
    }
  });

  it("does not expose the unguarded RPC to public clients", async () => {
    expect(
      (
        await db.query(
          `select has_function_privilege('anon', 'public.record_public_match(text,uuid,uuid,integer,integer,date,text)', 'EXECUTE') allowed`,
        )
      ).rows,
    ).toEqual([{ allowed: false }]);
  });
});
