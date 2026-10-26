# @project/web — the Next.js app

The user-facing web application. A Next.js server-rendered React app.

The Job Tracker: a landing page, the signed-in user's job list, and a form to
add a job (see `docs/specs/jobs/list.md`).

## Public surface

Pages live under `app/`, route handlers under `app/api/`:

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Landing page — links to the job list |
| `/login` | GET | "Sign in with GitHub" |
| `/jobs` | GET | The current user's jobs, newest applied first (signed in) |
| `/jobs/new` | GET | Add-a-job form; submits via a Server Action (signed in) |
| `/api/auth/*` | GET, POST | Auth.js handlers (sign-in, callback, sign-out) |
| `/api/health` | GET | Health check — is the process alive? Can it reach the DB? |

Everything except `/`, `/login`, `/api/health`, and `/api/auth/*` requires a
session; `middleware.ts` redirects on cookie presence and `currentUserId()` is
the real gate (see `docs/specs/auth/sign-in.md`).

## Dependencies

- `@project/db` — the Prisma client and generated types
- `@project/services` — queue, storage, and notify adapters
- `@project/domain` — Zod schemas and database queries
- `@project/auth` — Auth.js sessions and `currentUserId()`
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

Sign-in needs `AUTH_SECRET`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` in
`apps/web/.env.local` (see the root README).

## When it changes

- A new route goes in `app/api/`.
- A new Client Component goes in `components/`.
- Routes are Server Components. Forms and interactivity are Client Components.
  The split is Week 5's topic.