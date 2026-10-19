---
type: feature
---
# Signed-in users see their jobs and can add one

## Why
A job seeker needs to see their whole pipeline in one place and put a new
application into it the moment they send it. This is the first page that
makes the app a Job Tracker rather than a skeleton.

## Where it lives
- `apps/web/app/page.tsx` — landing page linking to `/jobs`
- `apps/web/app/jobs/page.tsx`, `loading.tsx`, `error.tsx` — the list and its
  async states
- `apps/web/app/jobs/new/page.tsx`, `form.tsx`, `actions.ts` — the add form
  and its Server Action
- `apps/web/lib/errors.ts` — maps thrown errors to the one error shape
- `packages/domain/src/schemas/job.ts` — `CreateJob` validation
- `packages/domain/src/queries/jobs.ts` — `listJobs`, `createJob`

## Behavior
- `/jobs` lists the current user's non-deleted jobs, newest `dateApplied`
  first. Each row shows company, title, status, date applied, and follow-up
  date ("—" when none). Dates render in UTC so they do not shift with the
  server's time zone.
- `/jobs` always offers an "Add a job" link. With no jobs it shows an empty
  state whose primary action is that link. While loading it shows a skeleton;
  on failure it shows a retry card with a generic message — never the raw
  error text.
- Jobs belonging to other users never appear; an unknown user sees the empty
  state.
- `/jobs/new` requires company and title. Status defaults to `APPLIED` and
  date applied defaults to today.
- A valid submit writes the job and its `CREATED` event in one transaction,
  then redirects to `/jobs`, where the new job appears.
- An invalid submit writes nothing and re-renders the form with a message
  under each invalid field; the action's result is a `VALIDATION` (400) error
  in the shape `{ error: { code, message } }`.
- Any other failure maps to the same shape: P2002 → 409 `CONFLICT`,
  P2025 → 404 `NOT_FOUND`, anything else → 500 `INTERNAL` with a generic
  message; the original error is logged server-side, not returned.
- `/` is a landing page that links to `/jobs`.

## Examples

| State / input | Behavior |
|---|---|
| seeded `demo-user` → `/jobs` | 10 rows, newest applied first |
| `x-user-id: someone-else` → `/jobs` | empty state with "Add a job" |
| submit `{company:"Acme", title:"SWE"}` | job with status `APPLIED`, date applied today, one `CREATED` event; appears in the list |
| submit `{company:"", title:"SWE"}` | 400 `VALIDATION`, field message on company, no row written |
| user A creates a job | absent from user B's list |
| unexpected error in the action | 500 `INTERNAL`, generic message, no error text leaked |

## Verify
- `pnpm test:integration` — `tests/integration/jobs-create.test.ts` and
  `jobs-action.test.ts` cover every Example above.
- `pnpm dev` + `pnpm db:seed`, open `/jobs` — 10 seeded rows, newest first.
- `curl -s -H 'x-user-id: someone-else' localhost:3000/jobs | grep -i "no jobs"`
  — the empty state.
- Keyboard-only pass on `/jobs/new`: tab through every field and submit with
  Enter.

## Constraints & decisions
- **Adding is a separate page.** `/jobs/new` is a plain form for now; adding
  inline from the list is a later change to this spec.
- **Field errors ride beside the error shape.** The action returns
  `{ error: { code, message }, fieldErrors }`; `fieldErrors` is additive, so
  the one error shape from [web.md](../web.md) is unchanged.
- **The list reads full rows.** `listJobs` has no `select`; narrowing it is
  an optimization nothing needs yet.

## Out of scope
- The health endpoint — owned by [web.md](../web.md).
- Showing each job's latest activity — `docs/specs/jobs/latest-activity.md`
  (does not exist yet).
- Inline add from the list, and deeper async states (streamed sections,
  optimistic updates) — no spec owns these yet.
- Real authentication — [auth.md](../auth.md).
