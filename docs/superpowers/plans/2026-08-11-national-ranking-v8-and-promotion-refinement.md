# National Ranking v8 and Promotion Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish integer 4:2:1 recency scoring and apply the approved chevron, result-icon, and campus-promotion refinements.

**Architecture:** Preserve formula v7 and add v8 as the active immutable formula. Scope result-icon backgrounds through existing context classes, and make the promotion order and labels explicit in its presentational component.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, CSS, Supabase, Vercel

## Global Constraints

- Keep all existing formula versions immutable.
- Use exact recency units `4`, `2`, `1` in v8.
- Keep circular result indicators on ranking rows and unboxed indicators on player detail.
- Use the exact approved Korean copy.
- Verify desktop/mobile and light/dark states before shipping.

---

### Task 1: Add formula v8

**Files:** `lib/nationalRanking/*`, `app/methodology/*`

- [ ] Write expectations for v8, `4:2:1`, integer examples, and recalculated totals.
- [ ] Run focused tests and verify they fail because v8 is absent.
- [ ] Add v8, make it the default, and update methodology copy and examples.
- [ ] Run focused tests and verify they pass.

### Task 2: Refine the chevron and result-icon scope

**Files:** `NationalRankingTable.tsx`, `app/globals.css`, and their tests.

- [ ] Write expectations for a square 90-degree chevron, circular ranking icons, and unboxed player-detail icons.
- [ ] Run focused tests and verify RED.
- [ ] Update the SVG and scoped CSS.
- [ ] Run focused tests and verify GREEN.

### Task 3: Reorder and relabel the campus promotion

**Files:** `CampusRankingPromotion.tsx`, `app/globals.css`, and their tests.

- [ ] Write expectations for exact campus labels, inquiry placement, and larger type.
- [ ] Run focused tests and verify RED.
- [ ] Reorder markup, update copy, and adjust typography.
- [ ] Run focused tests and verify GREEN.

### Task 4: Verify and publish

**Files:** Generate `/tmp/national-ranking-v8-seed.sql`.

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Inspect desktop/mobile and light/dark states locally.
- [ ] Review, commit, push `main`, and wait for Vercel production.
- [ ] Publish the immutable v8 Supabase snapshot.
- [ ] Verify production UI, active formula, integer scores, and advisors.
