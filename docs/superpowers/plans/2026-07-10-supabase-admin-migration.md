# Supabase Admin Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the ranking system toward Supabase by first building a tested rule engine, database schema, and server-side data access layer that preserves the current ranking API contract.

**Architecture:** Keep the existing UI and `getRankingDataForClub` response shape stable while introducing Supabase behind a repository boundary. Public and admin mutations go through Next.js server routes; browser code never receives the Supabase service role key.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Supabase Postgres 17, `@supabase/supabase-js`, server-side environment variables.

## Global Constraints

- Follow TDD for every behavior change.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` or any admin secret to the browser.
- Keep Google Sheets code working during the migration.
- Preserve the public API shape: `club`, `players`, `matches`, `summary`, `detailsByPlayer`.
- Public users can submit normal match results without login.
- Admin pages can be visited without login, but sensitive mutations require `x-admin-secret`.
- Supabase migrations must enable RLS and explicit grants because recent Supabase changes make table exposure opt-in or project-dependent.
- Work in small commits and verify with `npm test`, `npm run lint`, and `npm run build`.

---

## File Structure

- Create `lib/rankingRules.ts`: pure TypeScript rule engine for match validation, challenger/defender detection, score validation, ranking movement, and monthly penalty preview.
- Create `lib/rankingRules.test.ts`: TDD coverage for all ranking rules.
- Create `supabase/migrations/202607100001_create_ranking_schema.sql`: Supabase schema, constraints, indexes, RLS, and grants.
- Create `lib/supabaseServer.ts`: server-only Supabase client factory.
- Create `lib/supabaseRankingRepository.ts`: converts Supabase rows into existing `RankingData[]`, `MatchRecord[]`, and `HistoricalMatchRecord[]` shapes.
- Create `lib/supabaseRankingRepository.test.ts`: tests mapping behavior with a mocked Supabase query adapter.
- Modify `lib/rankingData.ts`: choose Sheets or Supabase repository based on a server env flag.
- Create `app/api/clubs/[club]/matches/route.ts`: public match submission endpoint.
- Create `app/api/clubs/[club]/matches/route.test.ts`: API behavior tests for match submission.
- Create `app/api/clubs/[club]/matches/route.ts`: public match submission validation shell.

This plan covers the first implementation slice: rule engine, schema, read repository, read feature flag, and a validation-only public match route. Full public submission persistence and admin UI are intentionally outside this plan and require a second plan after this foundation is verified.

---

### Task 1: Ranking Rule Engine

**Files:**
- Create: `lib/rankingRules.ts`
- Create: `lib/rankingRules.test.ts`

**Interfaces:**
- Produces:
  - `type RankedPlayer = { id: string; name: string; rank: number; status: "active" | "injured" | "inactive" | "left" }`
  - `type RankingRuleConfig = { challengeRange: number; rematchCooldownDays: number; inactivityPenaltyDrop: number }`
  - `type MatchInput = { player1Id: string; player2Id: string; player1Score: number; player2Score: number; playedOn: string }`
  - `type PreviousMatch = { playerAId: string; playerBId: string; playedOn: string }`
  - `function validateScore(input: MatchInput): { ok: true } | { ok: false; message: string }`
  - `function resolveMatchRoles(players: RankedPlayer[], input: MatchInput): { challenger: RankedPlayer; defender: RankedPlayer; winnerId: string; loserId: string }`
  - `function validateChallengeRange(players: RankedPlayer[], challengerId: string, defenderId: string, config: RankingRuleConfig): { ok: true } | { ok: false; message: string }`
  - `function validateRematchCooldown(input: MatchInput, previousMatches: PreviousMatch[], config: RankingRuleConfig): { ok: true } | { ok: false; message: string }`
  - `function applyMatchRanking(players: RankedPlayer[], challengerId: string, defenderId: string, winnerId: string): RankedPlayer[]`

- [ ] **Step 1: Write the failing score validation tests**

```ts
import { describe, expect, test } from "vitest";
import { validateScore } from "@/lib/rankingRules";

describe("validateScore", () => {
  test("accepts a 6 to 5 result", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 5,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: true });
  });

  test("rejects a match without a 6-point winner", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 5,
        player2Score: 4,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: false, message: "승자는 반드시 6점이어야 합니다." });
  });

  test("rejects tied scores", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 6,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: false, message: "동점은 입력할 수 없습니다." });
  });
});
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: FAIL because `@/lib/rankingRules` does not exist.

- [ ] **Step 3: Implement minimal score validation**

Create `lib/rankingRules.ts`:

```ts
export type PlayerStatus = "active" | "injured" | "inactive" | "left";

export type RankedPlayer = {
  id: string;
  name: string;
  rank: number;
  status: PlayerStatus;
};

export type RankingRuleConfig = {
  challengeRange: number;
  rematchCooldownDays: number;
  inactivityPenaltyDrop: number;
};

export type MatchInput = {
  player1Id: string;
  player2Id: string;
  player1Score: number;
  player2Score: number;
  playedOn: string;
};

export type PreviousMatch = {
  playerAId: string;
  playerBId: string;
  playedOn: string;
};

export type RuleResult = { ok: true } | { ok: false; message: string };

export function validateScore(input: MatchInput): RuleResult {
  const scores = [input.player1Score, input.player2Score];

  if (input.player1Score === input.player2Score) {
    return { ok: false, message: "동점은 입력할 수 없습니다." };
  }

  if (!scores.includes(6)) {
    return { ok: false, message: "승자는 반드시 6점이어야 합니다." };
  }

  const loserScore = Math.min(input.player1Score, input.player2Score);

  if (loserScore < 0 || loserScore > 5) {
    return { ok: false, message: "패자의 점수는 0점부터 5점까지만 가능합니다." };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the score tests to verify GREEN**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: PASS for `validateScore`.

- [ ] **Step 5: Add RED tests for role detection and ranking movement**

Append to `lib/rankingRules.test.ts`:

```ts
import { applyMatchRanking, resolveMatchRoles } from "@/lib/rankingRules";

const players = [
  { id: "p1", name: "오준석", rank: 1, status: "active" as const },
  { id: "p2", name: "김도훈", rank: 2, status: "active" as const },
  { id: "p3", name: "박정용", rank: 3, status: "active" as const },
  { id: "p4", name: "이민우", rank: 4, status: "active" as const },
];

describe("resolveMatchRoles", () => {
  test("uses the lower ranked player as challenger and the higher ranked player as defender", () => {
    expect(
      resolveMatchRoles(players, {
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
      })
    ).toMatchObject({
      challenger: { id: "p4" },
      defender: { id: "p1" },
      winnerId: "p4",
      loserId: "p1",
    });
  });
});

describe("applyMatchRanking", () => {
  test("keeps rankings when the defender wins", () => {
    expect(applyMatchRanking(players, "p4", "p1", "p1")).toEqual(players);
  });

  test("moves the challenger into the defender rank when the challenger wins", () => {
    expect(applyMatchRanking(players, "p4", "p1", "p4")).toEqual([
      { id: "p4", name: "이민우", rank: 1, status: "active" },
      { id: "p1", name: "오준석", rank: 2, status: "active" },
      { id: "p2", name: "김도훈", rank: 3, status: "active" },
      { id: "p3", name: "박정용", rank: 4, status: "active" },
    ]);
  });
});
```

- [ ] **Step 6: Run tests to verify RED**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: FAIL because `resolveMatchRoles` and `applyMatchRanking` are not implemented.

- [ ] **Step 7: Implement role detection and ranking movement**

Add to `lib/rankingRules.ts`:

```ts
export type ResolvedMatchRoles = {
  challenger: RankedPlayer;
  defender: RankedPlayer;
  winnerId: string;
  loserId: string;
};

function findRankedPlayer(players: RankedPlayer[], playerId: string): RankedPlayer {
  const player = players.find((candidate) => candidate.id === playerId);

  if (!player) {
    throw new Error("선수를 찾을 수 없습니다.");
  }

  return player;
}

export function resolveMatchRoles(
  players: RankedPlayer[],
  input: MatchInput
): ResolvedMatchRoles {
  const player1 = findRankedPlayer(players, input.player1Id);
  const player2 = findRankedPlayer(players, input.player2Id);
  const challenger = player1.rank > player2.rank ? player1 : player2;
  const defender = player1.rank < player2.rank ? player1 : player2;
  const winnerId = input.player1Score > input.player2Score ? input.player1Id : input.player2Id;
  const loserId = winnerId === input.player1Id ? input.player2Id : input.player1Id;

  return {
    challenger,
    defender,
    winnerId,
    loserId,
  };
}

export function applyMatchRanking(
  players: RankedPlayer[],
  challengerId: string,
  defenderId: string,
  winnerId: string
): RankedPlayer[] {
  if (winnerId === defenderId) {
    return players;
  }

  const challenger = findRankedPlayer(players, challengerId);
  const defender = findRankedPlayer(players, defenderId);

  return players
    .map((player) => {
      if (player.id === challenger.id) {
        return { ...player, rank: defender.rank };
      }

      if (player.rank >= defender.rank && player.rank < challenger.rank) {
        return { ...player, rank: player.rank + 1 };
      }

      return player;
    })
    .sort((a, b) => a.rank - b.rank);
}
```

- [ ] **Step 8: Run tests to verify GREEN**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: PASS.

- [ ] **Step 9: Add RED tests for challenge range and rematch cooldown**

Append to `lib/rankingRules.test.ts`:

```ts
import { validateChallengeRange, validateRematchCooldown } from "@/lib/rankingRules";

describe("validateChallengeRange", () => {
  test("allows challenging within four active ranking spots", () => {
    expect(
      validateChallengeRange(players, "p4", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: true });
  });

  test("rejects challenging beyond four active ranking spots", () => {
    const longRanking = [
      ...players,
      { id: "p5", name: "이도현", rank: 5, status: "active" as const },
      { id: "p6", name: "김혜은", rank: 6, status: "active" as const },
    ];

    expect(
      validateChallengeRange(longRanking, "p6", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: false, message: "도전 가능한 순위 범위를 벗어났습니다." });
  });

  test("skips injured players when calculating challenge range", () => {
    const rankingWithInjury = [
      { id: "p1", name: "오준석", rank: 1, status: "active" as const },
      { id: "p2", name: "김도훈", rank: 2, status: "injured" as const },
      { id: "p3", name: "박정용", rank: 3, status: "injured" as const },
      { id: "p4", name: "이민우", rank: 4, status: "active" as const },
      { id: "p5", name: "이도현", rank: 5, status: "active" as const },
      { id: "p6", name: "김혜은", rank: 6, status: "active" as const },
    ];

    expect(
      validateChallengeRange(rankingWithInjury, "p6", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: true });
  });
});

describe("validateRematchCooldown", () => {
  test("rejects rematches within fourteen days", () => {
    expect(
      validateRematchCooldown(
        {
          player1Id: "p1",
          player2Id: "p2",
          player1Score: 6,
          player2Score: 4,
          playedOn: "2026-07-10",
        },
        [{ playerAId: "p2", playerBId: "p1", playedOn: "2026-06-30" }],
        {
          challengeRange: 4,
          rematchCooldownDays: 14,
          inactivityPenaltyDrop: 2,
        }
      )
    ).toEqual({ ok: false, message: "동일 선수와는 2주 동안 재경기할 수 없습니다." });
  });
});
```

- [ ] **Step 10: Run tests to verify RED**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: FAIL because the new validation functions are missing.

- [ ] **Step 11: Implement range and cooldown validation**

Add to `lib/rankingRules.ts`:

```ts
function activeRankIndex(players: RankedPlayer[], playerId: string): number {
  return players
    .filter((player) => player.status === "active")
    .sort((a, b) => a.rank - b.rank)
    .findIndex((player) => player.id === playerId);
}

export function validateChallengeRange(
  players: RankedPlayer[],
  challengerId: string,
  defenderId: string,
  config: RankingRuleConfig
): RuleResult {
  const challengerIndex = activeRankIndex(players, challengerId);
  const defenderIndex = activeRankIndex(players, defenderId);

  if (challengerIndex === -1 || defenderIndex === -1) {
    return { ok: false, message: "활동 중인 선수끼리만 경기할 수 있습니다." };
  }

  const distance = challengerIndex - defenderIndex;

  if (distance < 1 || distance > config.challengeRange) {
    return { ok: false, message: "도전 가능한 순위 범위를 벗어났습니다." };
  }

  return { ok: true };
}

function toDateValue(date: string): number {
  return new Date(`${date}T00:00:00+09:00`).getTime();
}

function samePair(input: MatchInput, previousMatch: PreviousMatch): boolean {
  const current = [input.player1Id, input.player2Id].sort().join(":");
  const previous = [previousMatch.playerAId, previousMatch.playerBId].sort().join(":");

  return current === previous;
}

export function validateRematchCooldown(
  input: MatchInput,
  previousMatches: PreviousMatch[],
  config: RankingRuleConfig
): RuleResult {
  const playedOn = toDateValue(input.playedOn);
  const cooldownMs = config.rematchCooldownDays * 24 * 60 * 60 * 1000;
  const hasRecentMatch = previousMatches.some((match) => {
    return samePair(input, match) && playedOn - toDateValue(match.playedOn) < cooldownMs;
  });

  if (hasRecentMatch) {
    return { ok: false, message: "동일 선수와는 2주 동안 재경기할 수 없습니다." };
  }

  return { ok: true };
}
```

- [ ] **Step 12: Run tests to verify GREEN**

Run: `npm test -- lib/rankingRules.test.ts`

Expected: PASS.

- [ ] **Step 13: Commit Task 1**

Run:

```bash
git add lib/rankingRules.ts lib/rankingRules.test.ts
git commit -m "feat: add ranking rule engine"
```

---

### Task 2: Supabase Schema Migration

**Files:**
- Create: `supabase/migrations/202607100001_create_ranking_schema.sql`

**Interfaces:**
- Produces the tables required by `supabaseRankingRepository.ts`.
- Enables RLS on public tables.
- Grants read access for `anon` only where safe.
- Grants full server-side access to `service_role`.

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/202607100001_create_ranking_schema.sql`:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text not null,
  organization text not null,
  subtitle text not null,
  logo_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, name)
);

create unique index if not exists seasons_one_current_per_club
  on public.seasons (club_id)
  where is_current;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.season_players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  initial_rank integer not null check (initial_rank > 0),
  current_rank integer not null check (current_rank > 0),
  note text not null default '',
  status text not null default 'active' check (status in ('active', 'injured', 'inactive', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, player_id),
  unique (season_id, current_rank)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  played_on date not null,
  challenger_player_id uuid not null references public.players(id) on delete restrict,
  defender_player_id uuid not null references public.players(id) on delete restrict,
  challenger_rank_before integer not null check (challenger_rank_before > 0),
  defender_rank_before integer not null check (defender_rank_before > 0),
  winner_player_id uuid not null references public.players(id) on delete restrict,
  loser_player_id uuid not null references public.players(id) on delete restrict,
  winner_score integer not null check (winner_score = 6),
  loser_score integer not null check (loser_score between 0 and 5),
  defense_result text not null check (defense_result in ('방어 성공', '방어 실패')),
  source text not null default 'public_form' check (source in ('public_form', 'admin', 'import')),
  status text not null default 'confirmed' check (status in ('confirmed', 'voided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (challenger_player_id <> defender_player_id),
  check (winner_player_id <> loser_player_id)
);

create table if not exists public.injury_periods (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  starts_on date not null,
  ends_on date,
  reason text not null default '',
  approved boolean not null default true,
  exemption_month text,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rule_configs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  challenge_range integer not null default 4 check (challenge_range > 0),
  rematch_cooldown_days integer not null default 14 check (rematch_cooldown_days >= 0),
  inactivity_penalty_drop integer not null default 2 check (inactivity_penalty_drop > 0),
  injury_exemption_limit integer not null default 2 check (injury_exemption_limit >= 0),
  injury_notice_deadline_days_before_month_end integer not null default 7 check (injury_notice_deadline_days_before_month_end >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, season_id)
);

create table if not exists public.ranking_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  event_type text not null,
  actor_type text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  action text not null,
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.season_players enable row level security;
alter table public.matches enable row level security;
alter table public.injury_periods enable row level security;
alter table public.rule_configs enable row level security;
alter table public.ranking_events enable row level security;
alter table public.admin_action_logs enable row level security;

create policy "Public can read active clubs" on public.clubs
  for select to anon
  using (is_active = true);

create policy "Public can read seasons" on public.seasons
  for select to anon
  using (true);

create policy "Public can read players" on public.players
  for select to anon
  using (true);

create policy "Public can read season players" on public.season_players
  for select to anon
  using (true);

create policy "Public can read confirmed matches" on public.matches
  for select to anon
  using (status = 'confirmed');

create policy "Public can read approved injuries" on public.injury_periods
  for select to anon
  using (approved = true);

create policy "Public can read rule configs" on public.rule_configs
  for select to anon
  using (true);

grant select on public.clubs, public.seasons, public.players, public.season_players, public.matches, public.injury_periods, public.rule_configs to anon;
grant select, insert, update, delete on public.clubs, public.seasons, public.players, public.season_players, public.matches, public.injury_periods, public.rule_configs, public.ranking_events, public.admin_action_logs to service_role;
grant usage, select on all sequences in schema public to service_role;
```

- [ ] **Step 2: Apply migration to Supabase**

Use the Supabase MCP `apply_migration` tool:

```text
project_id: ltxoewsvzhumsudwrzdq
name: create_ranking_schema
query: contents of supabase/migrations/202607100001_create_ranking_schema.sql
```

Expected: migration applies without SQL errors.

- [ ] **Step 3: Verify schema with SQL**

Run through Supabase MCP `execute_sql`:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'clubs',
    'seasons',
    'players',
    'season_players',
    'matches',
    'injury_periods',
    'rule_configs',
    'ranking_events',
    'admin_action_logs'
  )
order by table_name;
```

Expected: nine rows.

- [ ] **Step 4: Run Supabase advisors**

Run security and performance advisors for `ltxoewsvzhumsudwrzdq`.

Expected: no critical RLS findings for the new tables.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add supabase/migrations/202607100001_create_ranking_schema.sql
git commit -m "feat: add supabase ranking schema"
```

---

### Task 3: Server Supabase Client

**Files:**
- Create: `lib/supabaseServer.ts`
- Create: `lib/supabaseServer.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces:
  - `function requireServerEnv(name: string): string`
  - `function createServiceRoleClient(): SupabaseClient`

- [ ] **Step 1: Install Supabase client**

Run:

```bash
npm install @supabase/supabase-js
```

Expected: `package.json` and `package-lock.json` include `@supabase/supabase-js`.

- [ ] **Step 2: Write failing env tests**

Create `lib/supabaseServer.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import { requireServerEnv } from "@/lib/supabaseServer";

describe("requireServerEnv", () => {
  test("returns an environment variable value", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");

    expect(requireServerEnv("SUPABASE_URL")).toBe("https://example.supabase.co");

    vi.unstubAllEnvs();
  });

  test("throws a helpful error when an environment variable is missing", () => {
    vi.stubEnv("SUPABASE_URL", "");

    expect(() => requireServerEnv("SUPABASE_URL")).toThrow("SUPABASE_URL is missing");

    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 3: Run tests to verify RED**

Run: `npm test -- lib/supabaseServer.test.ts`

Expected: FAIL because `@/lib/supabaseServer` does not exist.

- [ ] **Step 4: Implement server client factory**

Create `lib/supabaseServer.ts`:

```ts
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function requireServerEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

export function createServiceRoleClient(): SupabaseClient {
  return createClient(
    requireServerEnv("SUPABASE_URL"),
    requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
```

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npm test -- lib/supabaseServer.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add package.json package-lock.json lib/supabaseServer.ts lib/supabaseServer.test.ts
git commit -m "feat: add server supabase client"
```

---

### Task 4: Supabase Ranking Read Repository

**Files:**
- Create: `lib/supabaseRankingRepository.ts`
- Create: `lib/supabaseRankingRepository.test.ts`

**Interfaces:**
- Consumes `createServiceRoleClient()` from `lib/supabaseServer.ts`.
- Produces:
  - `async function getSupabaseRankingTable(clubSlug: string): Promise<RankingData[]>`
  - `async function getSupabaseMatchLogTable(clubSlug: string): Promise<MatchRecord[]>`

- [ ] **Step 1: Write failing mapping tests**

Create `lib/supabaseRankingRepository.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest";
import {
  mapSupabaseMatches,
  mapSupabaseRankingRows,
  type SupabaseMatchRow,
  type SupabaseRankingRow,
} from "@/lib/supabaseRankingRepository";

describe("mapSupabaseRankingRows", () => {
  test("maps season player rows into existing RankingData shape", () => {
    const rows: SupabaseRankingRow[] = [
      {
        current_rank: 1,
        note: "",
        players: {
          display_name: "오준석",
        },
      },
    ];

    expect(mapSupabaseRankingRows(rows)).toEqual([
      {
        rank: 1,
        name: "오준석",
        note: "",
      },
    ]);
  });
});

describe("mapSupabaseMatches", () => {
  test("maps match rows into existing MatchRecord shape", () => {
    const rows: SupabaseMatchRow[] = [
      {
        played_on: "2026-07-10",
        challenger_rank_before: 4,
        defender_rank_before: 1,
        winner_score: 6,
        loser_score: 4,
        defense_result: "방어 실패",
        challenger: { display_name: "이민우" },
        defender: { display_name: "오준석" },
        winner: { display_name: "이민우" },
      },
    ];

    expect(mapSupabaseMatches(rows)).toEqual([
      {
        date: "2026-07-10",
        challenger: "이민우",
        challengerRank: 4,
        defender: "오준석",
        defenderRank: 1,
        winner: "이민우",
        score: "6:4",
        defenseResult: "방어 실패",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- lib/supabaseRankingRepository.test.ts`

Expected: FAIL because repository file does not exist.

- [ ] **Step 3: Implement mapping functions**

Create `lib/supabaseRankingRepository.ts`:

```ts
import type { MatchRecord } from "@/lib/matchLogTable";
import type { RankingData } from "@/lib/rankingTable";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export type SupabaseRankingRow = {
  current_rank: number;
  note: string | null;
  players: {
    display_name: string;
  } | null;
};

export type SupabaseMatchRow = {
  played_on: string;
  challenger_rank_before: number;
  defender_rank_before: number;
  winner_score: number;
  loser_score: number;
  defense_result: string;
  challenger: {
    display_name: string;
  } | null;
  defender: {
    display_name: string;
  } | null;
  winner: {
    display_name: string;
  } | null;
};

export function mapSupabaseRankingRows(rows: SupabaseRankingRow[]): RankingData[] {
  return rows
    .filter((row) => row.players)
    .map((row) => ({
      rank: row.current_rank,
      name: row.players?.display_name ?? "",
      note: row.note ?? "",
    }));
}

export function mapSupabaseMatches(rows: SupabaseMatchRow[]): MatchRecord[] {
  return rows
    .filter((row) => row.challenger && row.defender && row.winner)
    .map((row) => ({
      date: row.played_on,
      challenger: row.challenger?.display_name ?? "",
      challengerRank: row.challenger_rank_before,
      defender: row.defender?.display_name ?? "",
      defenderRank: row.defender_rank_before,
      winner: row.winner?.display_name ?? "",
      score: `${row.winner_score}:${row.loser_score}`,
      defenseResult: row.defense_result,
    }));
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- lib/supabaseRankingRepository.test.ts`

Expected: PASS.

- [ ] **Step 5: Add repository read functions**

Append to `lib/supabaseRankingRepository.ts`:

```ts
async function getCurrentSeasonId(clubSlug: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, clubs!inner(slug)")
    .eq("is_current", true)
    .eq("clubs.slug", clubSlug)
    .single();

  if (error || !data) {
    throw new Error(`현재 시즌을 찾지 못했습니다: ${clubSlug}`);
  }

  return data.id;
}

export async function getSupabaseRankingTable(clubSlug: string): Promise<RankingData[]> {
  const supabase = createServiceRoleClient();
  const seasonId = await getCurrentSeasonId(clubSlug);
  const { data, error } = await supabase
    .from("season_players")
    .select("current_rank, note, players(display_name)")
    .eq("season_id", seasonId)
    .in("status", ["active", "injured"])
    .order("current_rank", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return mapSupabaseRankingRows((data ?? []) as SupabaseRankingRow[]);
}

export async function getSupabaseMatchLogTable(clubSlug: string): Promise<MatchRecord[]> {
  const supabase = createServiceRoleClient();
  const seasonId = await getCurrentSeasonId(clubSlug);
  const { data, error } = await supabase
    .from("matches")
    .select(`
      played_on,
      challenger_rank_before,
      defender_rank_before,
      winner_score,
      loser_score,
      defense_result,
      challenger:players!matches_challenger_player_id_fkey(display_name),
      defender:players!matches_defender_player_id_fkey(display_name),
      winner:players!matches_winner_player_id_fkey(display_name)
    `)
    .eq("season_id", seasonId)
    .eq("status", "confirmed")
    .order("played_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return mapSupabaseMatches((data ?? []) as SupabaseMatchRow[]);
}
```

- [ ] **Step 6: Run focused tests**

Run: `npm test -- lib/supabaseRankingRepository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add lib/supabaseRankingRepository.ts lib/supabaseRankingRepository.test.ts
git commit -m "feat: add supabase ranking repository"
```

---

### Task 5: Feature Flag Supabase Reads

**Files:**
- Modify: `lib/clubs.ts`
- Modify: `lib/rankingData.ts`
- Modify: `lib/rankingDataForClub.test.ts`

**Interfaces:**
- Consumes `getSupabaseRankingTable(club.slug)` and `getSupabaseMatchLogTable(club.slug)`.
- Produces existing `getRankingDataForClub(club)` behavior with optional Supabase read source.

- [ ] **Step 1: Add failing test for Supabase feature flag**

Modify `lib/rankingDataForClub.test.ts` with a new mock for Supabase repository and test:

```ts
vi.mock("@/lib/supabaseRankingRepository", () => ({
  getSupabaseRankingTable: vi.fn(),
  getSupabaseMatchLogTable: vi.fn(),
}));

import {
  getSupabaseMatchLogTable,
  getSupabaseRankingTable,
} from "@/lib/supabaseRankingRepository";

test("reads ranking and matches from Supabase when the data source flag is supabase", async () => {
  vi.stubEnv("RANKING_DATA_SOURCE", "supabase");
  vi.mocked(getSupabaseRankingTable).mockResolvedValue([
    { rank: 1, name: "오준석", note: "" },
    { rank: 2, name: "김도훈", note: "" },
  ]);
  vi.mocked(getSupabaseMatchLogTable).mockResolvedValue([]);

  const data = await getRankingDataForClub(club);

  expect(getSupabaseRankingTable).toHaveBeenCalledWith("seoultech");
  expect(getSupabaseMatchLogTable).toHaveBeenCalledWith("seoultech");
  expect(data.players).toEqual([
    {
      rank: 1,
      name: "오준석",
      note: "",
      wins: 0,
      losses: 0,
      matches: 0,
      recent5: [],
    },
    {
      rank: 2,
      name: "김도훈",
      note: "",
      wins: 0,
      losses: 0,
      matches: 0,
      recent5: [],
    },
  ]);

  vi.unstubAllEnvs();
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- lib/rankingDataForClub.test.ts`

Expected: FAIL because `getRankingDataForClub` still always reads Google Sheets.

- [ ] **Step 3: Implement feature flag**

Modify `lib/rankingData.ts`:

```ts
import {
  getSupabaseMatchLogTable,
  getSupabaseRankingTable,
} from "@/lib/supabaseRankingRepository";
```

Inside `getRankingDataForClub` replace the first match/ranking reads with:

```ts
const dataSource = process.env.RANKING_DATA_SOURCE ?? "sheets";
const spreadsheetId = getSpreadsheetId(club.sheetIdEnv);
const ranking =
  dataSource === "supabase"
    ? await getSupabaseRankingTable(club.slug)
    : await getRankingTable(spreadsheetId);
const matches =
  dataSource === "supabase"
    ? await getSupabaseMatchLogTable(club.slug)
    : await getMatchLogTable(spreadsheetId);
```

Keep historical Sheets reads unchanged for the first slice.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- lib/rankingDataForClub.test.ts`

Expected: PASS.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add lib/rankingData.ts lib/rankingDataForClub.test.ts
git commit -m "feat: support supabase ranking reads"
```

---

### Task 6: Public Match Submission API

**Files:**
- Create: `app/api/clubs/[club]/matches/route.ts`
- Create: `app/api/clubs/[club]/matches/route.test.ts`
- Modify: `lib/supabaseRankingRepository.ts`

**Interfaces:**
- Consumes Task 1 rule engine.
- Produces public `POST /api/clubs/[club]/matches`.

- [ ] **Step 1: Write failing API tests for invalid score and valid shape**

Create `app/api/clubs/[club]/matches/route.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { POST } from "./route";

describe("POST /api/clubs/[club]/matches", () => {
  test("rejects invalid scores before touching the database", async () => {
    const response = await POST(
      new Request("http://localhost/api/clubs/seoultech/matches", {
        method: "POST",
        body: JSON.stringify({
          player1Id: "p1",
          player2Id: "p2",
          player1Score: 5,
          player2Score: 4,
          playedOn: "2026-07-10",
        }),
      }),
      { params: Promise.resolve({ club: "seoultech" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "승자는 반드시 6점이어야 합니다.",
    });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- app/api/clubs/[club]/matches/route.test.ts`

Expected: FAIL because route does not exist.

- [ ] **Step 3: Implement score-only route shell**

Create `app/api/clubs/[club]/matches/route.ts`:

```ts
import { validateScore, type MatchInput } from "@/lib/rankingRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MatchRouteContext = {
  params: Promise<{
    club: string;
  }>;
};

export async function POST(request: Request, _context: MatchRouteContext) {
  const input = (await request.json()) as MatchInput;
  const scoreResult = validateScore(input);

  if (!scoreResult.ok) {
    return Response.json(scoreResult, { status: 400 });
  }

  return Response.json(
    {
      ok: false,
      message: "경기 저장 기능은 아직 준비 중입니다.",
    },
    { status: 501 }
  );
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test -- app/api/clubs/[club]/matches/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 6 shell**

Run:

```bash
git add app/api/clubs/[club]/matches/route.ts app/api/clubs/[club]/matches/route.test.ts
git commit -m "feat: add public match submission route shell"
```

Further DB-backed submission should be a separate task after repository writes are tested.

---

### Task 7: Verification And Push

**Files:**
- No new files.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no lint errors.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: build succeeds. The existing Next workspace-root warning is acceptable unless new warnings appear.

- [ ] **Step 4: Push**

Run:

```bash
git push origin main
```

Expected: branch pushes to GitHub, triggering Vercel deployment.
