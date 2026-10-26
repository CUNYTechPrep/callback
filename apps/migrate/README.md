# @project/migrate — the migration CLI and seed script

One-shot tools for managing the database schema and seed data. CI uses these
against a Postgres service container; local dev rarely needs them because the
db-server auto-applies migrations on boot.

## What it does

| Script | Command | Purpose |
|---|---|---|
| `src/index.ts` | `pnpm db:migrate` | Apply pending migrations over the wire |
| `src/seed.ts` | `pnpm db:seed` | Seed starter jobs for the signed-in user |

## Dependencies

- `@project/db` — `applyMigrations` for running SQL migration files
- `pg` — the PostgreSQL client driver

## Consumers

Developers and CI. No code imports from `@project/migrate`.

## Local dev

```bash
pnpm db:migrate      # apply pending migrations
pnpm db:seed         # seed jobs for the signed-in user (sign in first; safe to re-run)
```

Requires the database server running (start it with `pnpm dev` or `pnpm db:dev`).

## The seed data

The seed writes no user. It attaches ten starter jobs to the user who owns the
most recent unexpired session, and exits 1 with "sign in at
http://localhost:3000/login first" if there is none. It's safe to re-run —
jobs are only created if that user has none. Edit `src/seed.ts` to change the
starting data. See `docs/specs/jobs/seed.md`.