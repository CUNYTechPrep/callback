---
type: feature
---
# Jobs are rows a user owns; their history is rows that append

## Why
Everything else stands on two tables and three promises. A job seeker's
pipeline is a list of applications and the story of what happened to each —
so the model is a `Job` owned by a `User`, and an append-only `JobEvent`
history per job. Stated once, here, so every other spec can lean on it.

## Where it lives
- `packages/db/prisma/schema.prisma` — the models, enums, and indexes
- `packages/db/prisma/migrations/0001_init.sql` — the schema as applied DDL
- `packages/domain/src/schemas/job.ts` — boundary validation (`CreateJob`)
- `packages/domain/src/queries/jobs.ts` — `listJobs`, `getJob`, `createJob`

## Behavior
- A `Job` belongs to exactly one `User` (`userId`, cascade on delete) and
  carries: company, title, a status in the pipeline enum (`APPLIED →
  INTERVIEWING → OFFER | REJECTED | WITHDRAWN`), `dateApplied`,
  optional `followUpDate`, `source`, `url`, `location`, salary range, and
  free-text `notes`.
- A `JobEvent` records one thing that happened to one job: its `type`
  (`CREATED`, `STATUS_CHANGE`, `NOTE_ADDED`, `RESTORED`), optional
  from/to statuses, an optional note, and when. Events are append-only:
  nothing updates or deletes an event row.
- **Promise 1 — scoping.** Every read and write is scoped by the current
  user's id. A job that exists but belongs to someone else behaves exactly
  like a job that does not exist.
- **Promise 2 — soft delete.** Deletion sets `deletedAt`; reads exclude
  rows where `deletedAt` is set. No code path hard-deletes user data.
- **Promise 3 — history rides the change.** A write that implies history
  (creating a job, changing its status) writes its `JobEvent` in the same
  transaction. `createJob` creates the job and its `CREATED` event
  atomically; a crash between the two leaves neither.
- Invalid input never reaches the database: `CreateJob` validates at the
  boundary (required non-empty company/title, enum status, URL shape,
  `salaryMin ≤ salaryMax`, length caps).

## Examples

| State / input | Behavior |
|---|---|
| `createJob(user, {company, title})` | Job row with status `APPLIED` + one `CREATED` event, atomically |
| `listJobs(userA)` when userB has jobs | userB's jobs never appear |
| Job with `deletedAt` set | Absent from `listJobs` and `getJob` |
| `createJob` input with empty company | Rejected by `CreateJob` before any query runs |
| `salaryMin: 90_000, salaryMax: 80_000` | Rejected: `salaryMin cannot exceed salaryMax` |

## Verify
- `pnpm test` — `tests/integration/jobs.test.ts` exercises all three
  promises against in-memory PGlite.
- `pnpm dev`, then `npx prisma studio` in `packages/db` — browse `Job` and
  `JobEvent`; the model is the demo.

## Constraints & decisions
- **No auth tables yet.** Identity is the dev stub (`x-user-id` /
  `DEV_USER_ID`) until real auth arrives; the schema stays silent about
  sessions on purpose (see `docs/specs/auth.md`).
- **`notes` is unbounded text** (capped at the boundary, not the column) —
  cheap now, revisited only if it ever hurts.
- **No `[userId, followUpDate]` index.** No query reads by follow-up date
  yet; indexes arrive with the queries that earn them.
- **Statuses are an enum, not a table.** The pipeline is product-defined
  and small; configurable pipelines are a different product.

## Out of scope
- Reading the history back (`docs/specs/jobs/latest-activity.md` and
  `docs/specs/jobs/history.md` own the read models).
- Seed data (`docs/specs/jobs/seed.md`).
- Attachments, tags, contacts — no spec owns these yet.
