# @project/auth — identity / auth

The "who is the current user?" logic: Auth.js v5 with GitHub and database
sessions. Identity comes from the `Session` row only — never from a client-supplied
header, param, or env var. Contract: `docs/specs/auth.md`; behavior:
`docs/specs/auth/sign-in.md`.

## Public API

All exports come from `src/index.ts`:

| Export | What it does |
|---|---|
| `currentUserId()` | Returns the signed-in user's ID from an unexpired database session. Throws `UnauthenticatedError` when there is none. |
| `UnauthenticatedError` | The thrown error (`code: "UNAUTHENTICATED"`); `apps/web` maps it to 401. |
| `safeCallbackUrl(raw)` | Returns `raw` only if it is a same-origin path, else `/jobs`. |
| `handlers`, `auth`, `signIn`, `signOut` | The Auth.js exports, mounted by `apps/web`. |

## Files

`errors.ts`, `redirect.ts`, `config.ts` (env check), `auth.ts` (Auth.js
config), `link-guard.ts` (refuses email-based account linking), `current-user.ts`.

## Dependencies

- `next-auth` (`5.0.0-beta.32`) and `@auth/prisma-adapter` (`2.11.3`), pinned exactly
- `@project/db` — the Prisma client the adapter uses
- `@project/log` — logs a configuration error when `AUTH_*` is missing

## Consumers

- `apps/web` — via `@project/auth`. The worker has no user context and does
  not import it.

## Configuration

`AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, read by Next from
`apps/web/.env.local`. Missing values log a configuration error and make
sign-in fail; they do not break `/api/health`. Setup is in the root README.

## Testing

Tests mock `@project/auth` at the package seam (`currentUserId`); there is no
dev bypass. See `tests/integration/auth-*.test.ts`.
