# ADR-0013: Migrations run at container start, not from CI

## Status

Superseded by ADR-0015

## Context

A deploy has to apply pending SQL migrations to production Postgres before
the new code takes traffic. The Postgres firewall admits addresses it lists
plus, optionally, Azure services. GitHub's hosted runners are neither: their
outbound addresses come from a large, changing pool, so a migrate step in
the deploy workflow can't reach the database without opening the firewall
to most of the internet.

## Decision

The web image's start command applies migrations (`apps/migrate`) and then
starts Next. The new revision migrates from inside Azure, at 0% traffic,
before its smoke test. A failed migration exits the container, the smoke
test fails, and traffic stays on the old revision. Migrations are
expand-only, because the old revision keeps serving against the new schema
during the smoke test and after any rollback.

**Runner-up: a Container Apps Job that migrates, triggered by the workflow
before the revision update.** Rejected for now because it is a second
Azure resource to provision, secret, and debug for one small step. Revisit
when migrations get slow, or when the app runs more than one replica.

## Consequences

- **Easier**: no firewall exception; migrations run with the same image,
  env, and network as the code that needs them; nothing new to provision.
- **Harder**: every cold start runs the migrator first (a no-op when
  nothing is pending, but it adds to the first request after scale-to-zero).
- **Accepted tradeoff**: there is no lock between replicas. Max replicas is
  1, and the only overlap is old and new revisions, where only the new one
  migrates. More replicas means this decision gets revisited.
- **Accepted tradeoff**: migrations never roll back automatically. A
  rollback moves traffic, not schema, which is why they are expand-only.

## See also

- `docs/specs/deploy.md` — the deploy contract.
- `docs/runbooks/rollback-bad-deploy.md` — what a rollback does and doesn't undo.
