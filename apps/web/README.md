# @project/web — the Next.js app

The user-facing web application. A Next.js server-rendered React app.

The Job Tracker: a landing page, the signed-in user's job list, and a form to
add a job (see `docs/specs/jobs/list.md`).

## Public surface

Pages live under `app/`, route handlers under `app/api/`:

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Landing page — links to the job list |
| `/jobs` | GET | The current user's jobs, newest applied first |
| `/jobs/new` | GET | Add-a-job form; submits via a Server Action |
| `/api/health` | GET | Health check — is the process alive? Can it reach the DB? |

## Dependencies

- `@project/db` — the Prisma client and generated types
- `@project/services` — queue, storage, and notify adapters
- `@project/domain` — Zod schemas and database queries
- `@project/auth` — the `currentUserId()` dev identity stub
- `@project/log` — pino logger

## Consumers

Users with a browser. No other app or package imports from `@project/web`.

## Local dev

```bash
pnpm dev:web     # starts the Next.js dev server
```

The dev server expects a Postgres server and Azurite running alongside it.
Start everything together with `pnpm dev` from the repo root. The dev server
uses Turbopack (`--turbopack`).

## When it changes

- A new route goes in `app/api/`.
- A new Client Component goes in `components/`.
- Routes are Server Components. Forms and interactivity are Client Components.
  The split is Week 5's topic.