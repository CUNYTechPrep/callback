---
type: infrastructure
---
# Specs — per-subsystem specifications

These documents describe how each subsystem behaves: its flow, boundaries,
error states, and testing strategy. They evolve with the code and reference
the ADRs that shaped them.

Specs use a `type:` frontmatter tag: `infrastructure` (cross-cutting,
on every branch) or `feature` (application behavior, under `docs/specs/<domain>/`).

**New feature specs start from [`_template-feature.md`](_template-feature.md)**
(every section required); **new infrastructure specs start from
[`_template-infrastructure.md`](_template-infrastructure.md)** (fixed opening
and closing — Purpose, then Verify + Key ADRs — with a free-form middle that
fits the content). A spec is born in the working session that builds
the behavior: drafted from its issue, reviewed and corrected, landed in the
same PR as the code. From then on it is evergreen — the PR that changes the
behavior updates the spec. Linkage is one-way: issues cite specs; specs never
store issue state. See [CONTRIBUTING](../../CONTRIBUTING.md) for the full arc.

| Doc | Type | What it covers | Key ADRs |
|---|---|---|---|
| [monorepo](monorepo.md) | infrastructure | Apps vs packages layout, dependency rules, `@project` scope placeholder | 0001, 0009 |
| [seams](seams.md) | infrastructure | The unifying seam pattern: local stand-in by default, real cloud via env var | 0005, 0008, 0012 |
| [storage](storage.md) | infrastructure | Local-vs-real Azure pattern across blob and queue | 0006, 0008, 0005 |
| [web](web.md) | infrastructure | Health endpoint, async-honesty UI standard, server entry ritual + error shape (404-not-403) | 0012, 0009 |
| [auth](auth.md) | infrastructure | Identity derivation: session-only, never client-supplied | 0012 |
| [deploy](deploy.md) | infrastructure | Container build + Azure topology, config via env only, kill-switches | 0008 |
| [observability](observability.md) | infrastructure | Structured logs, request IDs, what gets measured | — |

### Jobs domain (`jobs/`)

| Doc | Type | What it covers | Key ADRs |
|---|---|---|---|
| [data-model](jobs/data-model.md) | feature | `Job` + append-only `JobEvent`; scoping, soft delete, history in one transaction | 0009 |
| [seed](jobs/seed.md) | feature | Believable demo data for the signed-in user | 0012 |
| [list](jobs/list.md) | feature | `/jobs` lists my jobs; `/jobs/new` adds one with validation + `CREATED` event | 0009, 0012 |

### Auth domain (`auth/`)

| Doc | Type | What it covers | Key ADRs |
|---|---|---|---|
| [sign-in](auth/sign-in.md) | feature | GitHub sign-in, database sessions, gated routes, sign-out | 0012 |

Feature specs live under `docs/specs/<domain>/`, grouped by the domain they
describe.
