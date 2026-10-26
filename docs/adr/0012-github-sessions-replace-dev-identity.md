# ADR-0012: GitHub database sessions replace the dev identity stub

## Status

Accepted

## Context

[ADR-0003](0003-dev-identity-stub.md) shipped a deliberately naive
`currentUserId()` that trusted a client-supplied header, and planted the
lesson that identity must never come from the client. The app now holds
private per-user data (jobs and their history), and sign-out on a shared
machine must leave nothing behind. The stub also made local dev behave
differently from production, so auth bugs only showed up after deploy.

## Decision

Replace the stub with Auth.js v5 (`next-auth`), the Prisma adapter, GitHub as
the only provider, and **database sessions**. `currentUserId()` resolves the
user from an unexpired `Session` row and throws `UnauthenticatedError`
otherwise; there is no fallback and no dev bypass. Local dev signs in through
a GitHub OAuth app like production; tests mock `@project/auth` at the
package seam. Versions are pinned exactly in `packages/auth`
(`next-auth@5.0.0-beta.32`, `@auth/prisma-adapter@2.11.3`). Behavior lives in
[auth/sign-in](../specs/auth/sign-in.md).

**Runner-up: JWT sessions.** Rejected because a JWT cannot be revoked:
signing out would only clear a cookie, and a copied cookie would keep
working until it expired. Deleting a `Session` row revokes immediately.

## Consequences

- **Easier**: one identity path for dev and production; sign-out really
  revokes; the foreign-resource and scoping rules rest on a server-held
  identity.
- **Harder**: dev needs a GitHub OAuth app and three env vars before anything
  gated works; the seed needs a signed-in user; every `currentUserId()` call
  reads the database.
- **Accepted tradeoff**: Auth.js v5 is a beta line, so it is pinned exactly
  and upgraded deliberately. Middleware checks cookie presence only, because
  it cannot reach Postgres; `currentUserId()` is the real gate.
- **Accepted tradeoff**: the auth package stays coupled to Next.js, so the
  worker still has no user context.

## See also

- [ADR-0003](0003-dev-identity-stub.md) — the stub this supersedes.
- `docs/specs/auth.md` — the identity contract.
- `docs/specs/auth/sign-in.md` — the feature spec.
