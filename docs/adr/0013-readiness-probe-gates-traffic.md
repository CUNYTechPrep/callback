# ADR-0013: The platform's readiness probe decides when a revision gets traffic

## Status

Accepted

## Context

A deploy must never send users to a revision whose env is broken or
whose migration failed. Today the workflow enforces that itself. The
app runs in multiple-revision mode with traffic pinned to a named
revision. Each deploy starts a revision at 0%, curls its
`/api/health` until it says `db: "ok"`, moves traffic with
`az containerapp ingress traffic set`, and deactivates the revision if
the smoke test fails. That is about forty lines of shell. It also adds
a precondition (traffic must be pinned, never "latest revision") that
the workflow has to check and the provisioning runbook has to set up.

Container Apps can do the same thing itself. In single-revision mode, a
new revision replaces the old one only after its replicas pass their
readiness probe. Until then the old revision keeps serving. A revision
that never becomes ready never takes traffic. `/api/health` already
returns 503 when the database is unreachable, so it works as a
readiness probe unchanged.

## Decision

The app runs in **single-revision mode** with a **readiness probe** on
`GET /api/health` (HTTP, 503 = not ready). The probe's failure threshold
leaves room for a cold start, about two minutes. The deploy workflow is checkout → Azure login → GHCR login →
`azure/container-apps-deploy-action`. It has no smoke test, no traffic
step and no pin check. A liveness probe on the same path restarts a
replica that later loses the database.

**Runner-up: keep multiple-revision mode and the workflow's smoke test.**
This is what we run today. It has one advantage: the gate is visible in the
Actions log and in the job summary, rather than in the platform's
revision status. It was rejected because it duplicates a feature the
platform has, and because the "traffic must be pinned" rule is easy to
break by hand and awkward to explain.

**Also considered: labels mode (`targetLabel`).** This gives
blue/green with stable per-label URLs. It still needs a scripted smoke
test and a label swap, so it is no simpler than the runner-up. It would
be worth it if we wanted to test a revision by hand before promoting it.

## Consequences

- **Easier**: the workflow drops to one deploy step, the pin rule and its
  check go away, and a failed revision cleans itself up.
- **Harder**: a failed deploy shows up in Azure (revision
  `provisioningState` / `healthState`), not as a failed smoke-test step
  in Actions. The deploy action's `update` returns before the revision
  is ready, so a red build no longer means "didn't ship". The workflow
  should wait on the revision's state so CI still goes red.
- **Harder**: rollback is no longer "move traffic to the old revision".
  Single-revision mode keeps one active revision, so rolling back means
  redeploying the previous image (`az containerapp update --image
  <previous-sha>`), which takes minutes instead of seconds.
- **Unverified**: how this interacts with min replicas 0. The platform
  needs a replica running to probe it, and we believe a new revision is
  started for provisioning regardless of min replicas. The
  broken-revision drill (`docs/specs/deploy.md` → Verify) must pass
  before this ADR is accepted.
- **Accepted tradeoff**: the probe checks only what `/api/health` checks:
  the process is up and the DB is reachable. That is the same coverage
  as today's smoke test, no more.

## See also

- `docs/specs/deploy.md` — the deploy contract this would change.
- `docs/runbooks/provision-production.md` — sets `--revisions-mode multiple` and pins traffic today.
- `docs/runbooks/rollback-bad-deploy.md` — would become a redeploy-previous-image procedure.
