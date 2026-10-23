# Integration tests

End-to-end tests against a real Postgres engine running in-process via PGlite
(Postgres-in-WebAssembly). No server, no Docker, no network.

| File | What it tests |
|---|---|
| `smoke.test.ts` | Boilerplate — verifies the PGlite door connects, inherited from `main` |
| `jobs.test.ts` | Data model — `CREATED` events, scoping, soft-delete filtering, boundary validation |
| `jobs-action.test.ts` | The `/jobs/new` Server Action — redirect + revalidate on success, field errors on rejection, 500 on a db failure |
| `jobs-create.test.ts` | Jobs list + add — creation, validation, user isolation, ordering, and error mapping from `docs/specs/jobs/list.md` |
| `health.test.ts` | `GET /api/health` — 200 with the db up, 503 `db: "error"` when it is unreachable |

**Note**: PGlite does not support `pg_notify`. SSE tests require a real
Postgres connection or mocking.