# Injury Status Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove period- and exemption-based injury data, make `season_players.status = 'injured'` the only injury source of truth, and guide injured players to report recovery before entering a match.

**Architecture:** A small forward-only Supabase migration removes the unused injury table and exemption columns. The admin dashboard derives injury counts from season-player statuses, while the public match flow continues to offer only active players and refines the existing database rejection into the approved recovery-report message when the rejected participant is injured.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, Supabase Postgres, `@supabase/supabase-js`, Vercel

## Global Constraints

- `season_players.status` is the only source of truth for injury state.
- Injury has no start date, end date, approval, reason, exemption count, or automatic expiration.
- Injury status never exempts a player from the monthly inactivity penalty.
- An injured player remains injured until an administrator changes the status back to `active`.
- Injured players cannot participate in ranking matches.
- Injured players remain excluded from the four-place challenge-distance count.
- Display exactly: `부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요.`
- Do not add or change any ranking rule outside this spec.
- Every behavior change follows RED-GREEN TDD and is committed separately.

---

## File Map

- Create `supabase/migrations/20260710164117_simplify_injury_status.sql`: remove obsolete database structures.
- Create `supabase/migrations/injuryStatusMigrations.test.ts`: migration contract coverage.
- Modify `lib/supabaseSeedPlan.ts`: stop producing removed injury-exemption values.
- Modify `lib/supabaseSeedPlan.test.ts`: lock the smaller rule configuration contract.
- Modify `lib/supabaseSeedSql.ts`: stop inserting removed rule columns.
- Modify `lib/supabaseSeedSql.test.ts`: reject obsolete SQL identifiers.
- Modify `lib/supabaseAdminRepository.ts`: derive injury metrics from player status and remove injury-period queries.
- Modify `lib/supabaseAdminRepository.test.ts`: cover status-only injury counts.
- Modify `app/admin/page.tsx`: rename the metric to `부상 선수`.
- Modify `app/admin/page.test.tsx`: cover the new label and value.
- Modify `lib/adminActionPolicy.ts`: remove separate injury-record actions.
- Modify `lib/adminActionPolicy.test.ts`: cover the reduced action list.
- Modify `lib/rankingTable.ts`: carry player status through the legacy sheet adapter contract.
- Modify `lib/rankingData.ts`: include status in public player data.
- Modify `lib/rankingData.test.ts`: cover status propagation into public players.
- Modify `lib/supabaseRankingRepository.ts`: expose `season_players.status` in ranking rows.
- Modify `lib/supabaseRankingRepository.test.ts`: lock status mapping from Supabase.
- Modify `app/[club]/ClubRankingClient.tsx`: render and filter injury state from status, not note text.
- Modify `app/[club]/ClubRankingClient.test.tsx`: cover status-only injury display.
- Modify `app/api/clubs/[club]/matches/route.ts`: refine a non-active failure when an injured participant caused it.
- Modify `app/api/clubs/[club]/matches/route.test.ts`: cover injured and other non-active failures.
- Modify `app/[club]/MatchEntryDialog.tsx`: show recovery-report guidance.
- Modify `app/[club]/MatchEntryDialog.test.tsx`: verify the guidance is visible.
- Modify `app/globals.css`: style the guidance as quiet informational copy.

---

### Task 1: Remove Obsolete Injury Schema And Seed Contracts

**Files:**
- Create: `supabase/migrations/injuryStatusMigrations.test.ts`
- Create: `supabase/migrations/20260710164117_simplify_injury_status.sql`
- Modify: `lib/supabaseSeedPlan.test.ts`
- Modify: `lib/supabaseSeedPlan.ts`
- Modify: `lib/supabaseSeedSql.test.ts`
- Modify: `lib/supabaseSeedSql.ts`

**Interfaces:**
- Produces: `ruleConfig` with only `seasonName`, `challengeRange`, `rematchCooldownDays`, and `inactivityPenaltyDrop`.
- Produces: a forward migration that removes `public.injury_periods` and both injury-exemption columns.
- Consumes: the existing `SupabaseSeedPlan` and SQL generator contracts.

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_simplify_injury_status.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("injury status simplification migration", () => {
  it("removes period and exemption injury structures", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("drop table if exists public.injury_periods");
    expect(sql).toContain("drop column if exists injury_exemption_limit");
    expect(sql).toContain(
      "drop column if exists injury_notice_deadline_days_before_month_end"
    );
  });
});
```

- [ ] **Step 2: Run the migration test and verify RED**

Run: `npm test -- supabase/migrations/injuryStatusMigrations.test.ts`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Add the minimal forward migration**

```sql
drop table if exists public.injury_periods;

alter table public.rule_configs
  drop column if exists injury_exemption_limit,
  drop column if exists injury_notice_deadline_days_before_month_end;
```

- [ ] **Step 4: Update seed-plan expectations first and verify RED**

Change the exact expected object in `lib/supabaseSeedPlan.test.ts` to:

```ts
expect(result.ruleConfig).toEqual({
  seasonName: "시즌3",
  challengeRange: 4,
  rematchCooldownDays: 14,
  inactivityPenaltyDrop: 2,
});
```

Run: `npm test -- lib/supabaseSeedPlan.test.ts`

Expected: FAIL because the result still contains both injury-exemption fields.

- [ ] **Step 5: Remove injury-exemption fields from the seed plan**

Use this rule type and value:

```ts
ruleConfig: {
  seasonName: string;
  challengeRange: number;
  rematchCooldownDays: number;
  inactivityPenaltyDrop: number;
};
```

```ts
ruleConfig: {
  seasonName: source.currentSeasonName,
  challengeRange: 4,
  rematchCooldownDays: 14,
  inactivityPenaltyDrop: 2,
},
```

- [ ] **Step 6: Add failing SQL-generator assertions**

In `lib/supabaseSeedSql.test.ts`, keep assertions for the three retained rule
columns and add:

```ts
expect(sql).not.toContain("injury_exemption_limit");
expect(sql).not.toContain("injury_notice_deadline_days_before_month_end");
```

Run: `npm test -- lib/supabaseSeedSql.test.ts`

Expected: FAIL because the generated SQL still names both removed columns.

- [ ] **Step 7: Reduce the rule SQL input and upsert**

The `jsonb_to_record` type must be:

```sql
"seasonName" text,
"challengeRange" integer,
"rematchCooldownDays" integer,
"inactivityPenaltyDrop" integer
```

The resolved row, insert columns, select columns, and conflict update must use
only:

```sql
challenge_range,
rematch_cooldown_days,
inactivity_penalty_drop
```

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `npm test -- supabase/migrations/injuryStatusMigrations.test.ts lib/supabaseSeedPlan.test.ts lib/supabaseSeedSql.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260710164117_simplify_injury_status.sql supabase/migrations/injuryStatusMigrations.test.ts lib/supabaseSeedPlan.ts lib/supabaseSeedPlan.test.ts lib/supabaseSeedSql.ts lib/supabaseSeedSql.test.ts
git commit -m "refactor: remove injury exemption data model"
```

---

### Task 2: Derive Administrator Injury State From The Roster

**Files:**
- Modify: `lib/supabaseAdminRepository.test.ts`
- Modify: `lib/supabaseAdminRepository.ts`
- Modify: `app/admin/page.test.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `lib/adminActionPolicy.test.ts`
- Modify: `lib/adminActionPolicy.ts`

**Interfaces:**
- Consumes: `AdminSeasonPlayerRow.status`.
- Produces: `AdminClubOverview.roster.injured` as the sole injury count.
- Removes: `listApprovedInjuries`, `AdminInjuryRow`, date-based injury helpers, and separate injury-record policy actions.

- [ ] **Step 1: Rewrite the repository test for status-only injury counts**

Remove `listApprovedInjuries` from the fake adapter. Include these season-player
rows:

```ts
listSeasonPlayers: vi.fn().mockResolvedValue([
  { seasonId: "season-1", status: "active" },
  { seasonId: "season-1", status: "injured" },
  { seasonId: "season-1", status: "injured" },
]),
```

Assert:

```ts
expect(result[0].roster).toMatchObject({
  total: 3,
  active: 1,
  injured: 2,
});
expect(result[0]).not.toHaveProperty("injuries");
```

Run: `npm test -- lib/supabaseAdminRepository.test.ts`

Expected: FAIL because the adapter still requires injury-period rows and the
overview still exposes `injuries`.

- [ ] **Step 2: Remove injury-period data from the admin repository**

Delete these contracts and behaviors:

```ts
injuries: { active: number };
type AdminInjuryRow = { ... };
listApprovedInjuries(...);
isActiveInjury(...);
```

Load only players, matches, and rules:

```ts
[seasonPlayers, matches, rules] = await Promise.all([
  adapter.listSeasonPlayers(seasonIds),
  adapter.listConfirmedMatches(seasonIds),
  adapter.listRuleConfigs(seasonIds),
]);
```

Remove the two injury-exemption fields from `AdminClubOverview["rules"]`, the
Supabase select string, and its row mapping. Keep these fields:

```ts
rules: {
  challengeRange: number;
  rematchCooldownDays: number;
  inactivityPenaltyDrop: number;
} | null;
```

- [ ] **Step 3: Update the admin page test and verify RED**

Assert the dashboard renders the status count:

```ts
expect(screen.getByText("부상 선수")).toBeDefined();
expect(screen.queryByText("보호 기록")).toBeNull();
```

Run: `npm test -- app/admin/page.test.tsx`

Expected: FAIL because the old label is still rendered.

- [ ] **Step 4: Render the roster injury count**

Replace the old metric with:

```tsx
<div>
  <dt>부상 선수</dt>
  <dd>{club.roster.injured}</dd>
</div>
```

- [ ] **Step 5: Remove separate injury-record permissions**

First change `lib/adminActionPolicy.test.ts` so the expected IDs exclude
`view_injuries` and `mutate_injury`. Verify the focused test fails, then delete
these entries from `ADMIN_ACTIONS`:

```ts
{ id: "view_injuries", ... }
{ id: "mutate_injury", ... }
```

The existing `change_player_status` action remains the only injury-management
permission.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- lib/supabaseAdminRepository.test.ts app/admin/page.test.tsx lib/adminActionPolicy.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/supabaseAdminRepository.ts lib/supabaseAdminRepository.test.ts app/admin/page.tsx app/admin/page.test.tsx lib/adminActionPolicy.ts lib/adminActionPolicy.test.ts
git commit -m "refactor: derive injuries from player status"
```

---

### Task 3: Make Player Status The Public Injury Source Of Truth

**Files:**
- Modify: `lib/rankingTable.ts`
- Modify: `lib/rankingData.test.ts`
- Modify: `lib/rankingData.ts`
- Modify: `lib/supabaseRankingRepository.test.ts`
- Modify: `lib/supabaseRankingRepository.ts`
- Modify: `app/[club]/ClubRankingClient.test.tsx`
- Modify: `app/[club]/ClubRankingClient.tsx`

**Interfaces:**
- Produces: `RankingData.status?: PlayerStatus` and `Player.status?: PlayerStatus`.
- Consumes: `SupabaseSeasonPlayerRow.status` without translating it through note text.
- Preserves: the legacy Google Sheets source by deriving a transitional status while parsing its existing note column.

- [ ] **Step 1: Add failing Supabase ranking status assertions**

Change the injured fixture note to an unrelated value while keeping its status:

```ts
{
  rank: 2,
  note: "왼손잡이",
  status: "injured",
  player: { id: "p2", name: "김도훈", displayName: "김도훈" },
}
```

Expect the public ranking row to expose status independently:

```ts
expect(result.ranking[1]).toEqual({
  rank: 2,
  name: "김도훈",
  note: "왼손잡이",
  status: "injured",
});
```

Run: `npm test -- lib/supabaseRankingRepository.test.ts`

Expected: FAIL because public ranking rows do not contain `status`.

- [ ] **Step 2: Carry status through ranking-source types**

Extend `RankingData`:

```ts
import type { PlayerStatus } from "@/lib/rankingRules";

export type RankingData = {
  rank: number;
  name: string;
  note: string;
  status?: PlayerStatus;
};
```

The legacy Sheets parser supplies its transitional status from the only field
available in that source:

```ts
status: note.includes("부상") ? "injured" : "active",
```

The Supabase repository maps the database value directly:

```ts
status: seasonPlayer.status,
```

- [ ] **Step 3: Add the failing public-player propagation test**

In `lib/rankingData.test.ts`, pass an injured ranking row and assert:

```ts
expect(result[0]).toMatchObject({
  name: "박정용",
  note: "왼손잡이",
  status: "injured",
});
```

Run: `npm test -- lib/rankingData.test.ts`

Expected: FAIL because `buildPlayer` discards the ranking status.

- [ ] **Step 4: Include status in public player data**

Extend `Player`:

```ts
status?: PlayerStatus;
```

Copy it when initializing the player record:

```ts
status: rankingData.status,
```

- [ ] **Step 5: Add the failing status-only client test**

Return a player whose note does not contain the word `부상`:

```ts
{
  rank: 2,
  name: "김도훈",
  note: "왼손잡이",
  status: "injured",
  wins: 0,
  losses: 0,
  matches: 0,
  recent5: [],
}
```

After loading, click the `부상` filter and assert both the player and status chip
remain visible:

```ts
expect(screen.getByText("김도훈")).toBeDefined();
expect(screen.getByText("부상")).toBeDefined();
```

Run: `npm test -- 'app/[club]/ClubRankingClient.test.tsx'`

Expected: FAIL because the client still infers injury from note text.

- [ ] **Step 6: Render and filter by status**

Extend the local `Player` type with:

```ts
status?: "active" | "injured" | "inactive" | "left";
```

Replace note-based injury checks with:

```ts
function isInjured(player: Player) {
  return player.status === "injured";
}
```

Use `isInjured(player)` in `RankingRow` and the injury filter. Continue to show
`player.note` as ordinary secondary information only when the player is not
injured.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- lib/supabaseRankingRepository.test.ts lib/rankingData.test.ts 'app/[club]/ClubRankingClient.test.tsx'`

Expected: all focused tests PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/rankingTable.ts lib/rankingData.ts lib/rankingData.test.ts lib/supabaseRankingRepository.ts lib/supabaseRankingRepository.test.ts 'app/[club]/ClubRankingClient.tsx' 'app/[club]/ClubRankingClient.test.tsx'
git commit -m "refactor: use player status for injury display"
```

---

### Task 4: Explain And Enforce Recovery Reporting In Match Entry

**Files:**
- Modify: `app/api/clubs/[club]/matches/route.test.ts`
- Modify: `app/api/clubs/[club]/matches/route.ts`
- Modify: `app/[club]/MatchEntryDialog.test.tsx`
- Modify: `app/[club]/MatchEntryDialog.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `getSupabaseMatchValidationContext(clubSlug)` only after the existing database RPC rejects a non-active participant.
- Produces: `getMatchFailureMessage(clubSlug, input, error): Promise<string>`.
- Preserves: source-key duplicate handling by keeping the RPC as the first authoritative match operation.

- [ ] **Step 1: Add the failing injured-participant API test**

```ts
it("tells an injured player to report recovery after the database rejects the match", async () => {
  vi.mocked(recordSupabaseMatch).mockRejectedValue(
    new Error("활동 중인 선수끼리만 경기할 수 있습니다.")
  );
  vi.mocked(getSupabaseMatchValidationContext).mockResolvedValue({
    ...validContext,
    players: [
      { id: "p1", name: "오준석", rank: 1, status: "injured" },
      ...validContext.players.slice(1),
    ],
  });

  const response = await POST(
    postRequest({
      player1Id: "p1",
      player2Id: "p2",
      player1Score: 6,
      player2Score: 4,
      sourceKey: "injured-submission",
    }),
    { params: Promise.resolve({ club: "seoultech" }) }
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    ok: false,
    message:
      "부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요.",
  });
});
```

Also add a test where both selected players are `inactive`; it must keep the
existing generic message.

- [ ] **Step 2: Run the route test and verify RED**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts'`

Expected: the injured test FAILS with the generic database message.

- [ ] **Step 3: Implement post-failure status refinement**

Add constants and helper:

```ts
const nonActiveMatchMessage = "활동 중인 선수끼리만 경기할 수 있습니다.";
const injuredMatchMessage =
  "부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요.";

async function getMatchFailureMessage(
  clubSlug: string,
  input: MatchInput,
  error: unknown
): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);

  if (message !== nonActiveMatchMessage) return message;

  try {
    const context = await getSupabaseMatchValidationContext(clubSlug);
    const selected = new Set([input.player1Id, input.player2Id]);
    const hasInjuredPlayer = context.players.some(
      (player) => selected.has(player.id) && player.status === "injured"
    );

    return hasInjuredPlayer ? injuredMatchMessage : message;
  } catch {
    return message;
  }
}
```

Use it in the existing catch:

```ts
} catch (error) {
  return badRequest(await getMatchFailureMessage(club.slug, input, error));
}
```

Do not pre-read validation context before the RPC; duplicate submissions must
still reach the source-key check first.

- [ ] **Step 4: Add the failing dialog guidance test**

Open the dialog and assert:

```ts
expect(
  screen.getByText(
    "부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면 관리자에게 부상 종료를 보고해주세요."
  )
).toBeDefined();
```

Run: `npm test -- 'app/[club]/MatchEntryDialog.test.tsx'`

Expected: FAIL because the guidance is not rendered.

- [ ] **Step 5: Render and style the approved guidance**

Render immediately above the error region:

```tsx
<p className="match-entry-guidance">
  부상 중인 선수는 경기 결과를 입력할 수 없습니다. 부상이 끝났다면
  관리자에게 부상 종료를 보고해주세요.
</p>
```

Add restrained informational styling:

```css
.match-entry-guidance {
  margin: 0;
  color: #667085;
  font-size: 0.84rem;
  line-height: 1.55;
}
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- 'app/api/clubs/[club]/matches/route.test.ts' 'app/[club]/MatchEntryDialog.test.tsx'`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit**

```bash
git add 'app/api/clubs/[club]/matches/route.ts' 'app/api/clubs/[club]/matches/route.test.ts' 'app/[club]/MatchEntryDialog.tsx' 'app/[club]/MatchEntryDialog.test.tsx' app/globals.css
git commit -m "feat: guide injured players through recovery reporting"
```

---

### Task 5: Apply And Verify The Supabase Migration

**Files:**
- Verify: `supabase/migrations/20260710164117_simplify_injury_status.sql`

**Interfaces:**
- Consumes: connected Supabase project `ltxoewsvzhumsudwrzdq`.
- Produces: production schema without injury periods or exemption columns.

- [ ] **Step 1: Reconfirm that no injury-period rows would be discarded**

Run through the Supabase connector:

```sql
select count(*)::integer as injury_period_count
from public.injury_periods;
```

Expected: `0`.

- [ ] **Step 2: Apply the migration through Supabase**

Apply the exact contents of
`supabase/migrations/20260710164117_simplify_injury_status.sql` with migration name
`simplify_injury_status`.

Expected: migration succeeds once.

- [ ] **Step 3: Verify the production schema**

```sql
select to_regclass('public.injury_periods') as injury_periods;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'rule_configs'
  and column_name in (
    'injury_exemption_limit',
    'injury_notice_deadline_days_before_month_end'
  );
```

Expected: `injury_periods` is null and the column query returns zero rows.

- [ ] **Step 4: Verify current injury status data remains intact**

```sql
select status, count(*)::integer
from public.season_players
group by status
order by status;
```

Expected: existing status counts are returned; the migration changes no
`season_players` rows.

- [ ] **Step 5: Run Supabase security and performance advisors**

Expected: no new security finding caused by this migration. Existing intentional
anonymous secret-guarded RPC warnings may remain.

---

### Task 6: Full Verification, Visual QA, And Deployment

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces: deployed production behavior at `https://koreatennisranking.com`.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: every test file passes with zero failures.

- [ ] **Step 2: Run static verification**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

Run: `npm run build`

Expected: the Next.js production build succeeds and lists the existing ranking,
match, admin, and API routes.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: Perform browser QA**

Start: `npm run dev -- --port 3020`

Verify desktop and 412px mobile layouts:

- `/admin` shows `부상 선수` using the roster status count.
- `/{club}` opens the match dialog without overlap or horizontal overflow.
- The recovery-report guidance is readable and visually secondary.
- Only active players appear in both selectors.
- Browser console has no errors or warnings caused by the change.

- [ ] **Step 4: Commit any QA-only correction, then merge and push**

If QA required no correction, keep the existing task commits. Otherwise commit
only the focused correction after its regression test.

Merge the feature branch into `main` with fast-forward, rerun `npm test`, then:

```bash
git push origin main
```

- [ ] **Step 5: Verify Vercel production**

Wait for the production deployment to become `Ready`, then verify:

- `https://koreatennisranking.com/admin` returns 200 and contains `부상 선수`.
- The public match dialog contains the exact recovery-report guidance.
- A stale/direct match request containing an injured player returns HTTP 400
  with the exact approved message.
- `git status --short --branch` reports `main...origin/main` with no changes.
