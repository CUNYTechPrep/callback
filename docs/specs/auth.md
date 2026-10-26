---
type: infrastructure
---
# Identity — the auth subsystem

Who the current user is, and how every server entry learns it.

## The contract: session-derived identity, only

`packages/auth/` resolves the current user from a database session through
`currentUserId()`; it throws `UnauthenticatedError` when there is none. The
behavior is specified in [sign-in](auth/sign-in.md).

- Auth.js v5 + Prisma adapter, database sessions, GitHub OAuth (one provider).
- Public surface: landing, /login, /api/health, /api/auth/*. Everything else
  gated; signed-out API calls get 401, pages redirect to /login.
- Identity comes from the session **only**. The client never supplies a user
  id — no header, no param, no dev-only bypass: dev signs in like prod.
- First sign-in creates the user (name/avatar from GitHub).

## Constraints & decisions

- One provider (GitHub); more is out of scope.
- No client-supplied identity input (header, param, env fallback) exists
  anywhere in code or living docs.
- Roles/admin, account deletion + export: future work with a privacy doc.

## Key decisions

- [ADR-0012](../adr/0012-github-sessions-replace-dev-identity.md) — Auth.js
  database sessions with GitHub only.
- [ADR-0003](../adr/0003-dev-identity-stub.md) — superseded: the dev identity
  stub this replaced.
