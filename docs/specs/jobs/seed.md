---
type: feature
---
# The seed writes a believable job search, and re-running it changes nothing

## Why
A data model demos as well as its data. The seed gives the signed-in user a
six-week search worth looking at — statuses across the pipeline, events
spread over weeks, follow-ups due soon and overdue — so every later
feature lands on data that reads like a real search, not lorem ipsum.

## Where it lives
- `apps/migrate/src/seed.ts` — the script (`pnpm db:seed`, dev running, signed in
  once)

## Behavior
- **The seed never creates a user.** It targets the user who owns the most
  recent unexpired `Session`; with none, it exits 1 with "sign in at
  http://localhost:3000/login first".
- Writes a fixed set of ten jobs for that user with realistic companies,
  titles, sources, locations, and salary ranges.
- Every job gets a `CREATED` event dated to its application date; jobs
  with more story get `STATUS_CHANGE` and `NOTE_ADDED` events at
  plausible intervals after it.
- Timestamps are relative to the day the seed runs: applications spread
  over the prior six weeks; `followUpDate`s straddle the 7-day window —
  at least one overdue, at least one due within a week.
- Statuses cover the whole pipeline: multiple `APPLIED`, some
  `INTERVIEWING`, and at least one each of `OFFER`, `REJECTED`,
  `WITHDRAWN`.
- **Idempotent by construction:** if the target user already has jobs, the
  seed reports and exits without writing. Run twice, same database.

## Examples

| State / input | Behavior |
|---|---|
| Fresh database, never signed in → `pnpm db:seed` | exits 1: "sign in at http://localhost:3000/login first"; zero writes |
| Signed in, no jobs → `pnpm db:seed` | 10 jobs + their event chains created for that user |
| Seeded database → `pnpm db:seed` | "already present, leaving them alone" — zero writes |
| `pnpm db:reset`, restart dev, sign in, seed | Same shape of data, dated relative to today |

## Verify
- With no session the seed exits 1; after signing in it succeeds.
- Seed twice; `SELECT count(*) FROM "Job"` is identical after each run.
- Browse in Prisma Studio: statuses varied, events ordered sensibly,
  follow-ups on both sides of today.

## Constraints & decisions
- **Tests never use the seed** — tests own their data (fixtures in the
  test file). The seed is for humans looking at the app.
- **No user fabrication.** Identity comes only from signing in
  ([auth/sign-in.md](../auth/sign-in.md)); the seed borrows the newest session's owner.
- **Volume is fixed, not configurable.** Ten jobs is enough to make every
  list and rollup interesting; knobs would be speculation.
- **Idempotency is skip-if-present, not upsert-per-row.** Simpler to
  reason about, and preserves any edits you made to seeded rows.

## Out of scope
- The data model itself (`docs/specs/jobs/data-model.md`).
- Per-test fixtures (each test file owns its own).
