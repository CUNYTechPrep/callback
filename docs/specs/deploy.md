---
type: infrastructure
---
# Deploy — merges to main ship themselves

Shipping is a merge, not a ritual performed by someone who remembers the steps.

## Behavior

- CI builds the web app's image (the **only** place images are built) from
  `apps/web/Dockerfile` and pushes it to GHCR, tagged with the commit SHA.
  Contributor laptops never need docker.
- On main, `.github/workflows/deploy.yml` creates a new Azure Container Apps
  revision at 0% traffic → smoke-tests that revision's `GET /api/health`
  (must say `db: "ok"`) → moves 100% of traffic to it. A failing smoke test
  means traffic never shifts, and the failed revision is deactivated.
- Traffic is pinned to a named revision, never to "latest revision". The
  workflow refuses to deploy if it finds traffic following the latest
  revision, because the new one would be live before its smoke test.
- The container migrates, then serves: on start it applies pending SQL
  migrations (`apps/migrate`), and only then starts Next. A failed migration
  exits the container, so the revision never answers its smoke test.
- Secrets live in Container Apps secrets, referenced by env vars
  (`secretref:`); `.env.example` documents every variable; probes point at
  /api/health.
- `PG_POOL_MAX=1` against the shared class Postgres — connection etiquette.

## Error states

| Failure | What happens |
|---|---|
| broken env in a new revision | smoke fails; old revision keeps traffic |
| migration fails on start | container exits; smoke fails; old revision keeps traffic |
| image can't be pulled (GHCR package private) | revision never starts; smoke fails |
| image build fails | workflow red; nothing deploys |
| a bad revision passed smoke and took traffic | [rollback-bad-deploy](../runbooks/rollback-bad-deploy.md) |

## Constraints & decisions

- GHCR, not ACR — free for public repos. The package is public so Container
  Apps can pull it without stored credentials.
- Container Apps consumption, min replicas 0 (scale-to-zero is the default
  posture), max replicas 1; anything needing always-on gets its own
  discussion.
- Azure access from Actions is OIDC (federated credential on `main`), never
  a stored password.
- Migrations are expand-only: add tables, columns, and indexes; never drop
  or rename in the same deploy that stops using them. During the smoke test,
  and after any rollback, the *old* revision runs against the *new* schema.
- The worker deploys separately (as a Functions timer when precomputation
  arrives — an epic ticket, not part of the base deploy).
- Standing up production from nothing is
  [provision-production](../runbooks/provision-production.md).

## Verify

- The broken-revision drill, run on purpose periodically: deploy a revision
  with a bad `DATABASE_URL` and watch traffic stay put.
- A one-line PR reaches the live URL in < 10 minutes, untouched by hands.
- `curl https://<app>/api/health` says `db: "ok"`.

## Key ADRs

- [ADR-0013](../adr/0013-migrate-on-container-start.md) — migrations run at
  container start, not from CI.
- [ADR-0008](../adr/0008-azurite-seam.md) — the same code talks to local
  stand-ins or Azure by env var alone.
