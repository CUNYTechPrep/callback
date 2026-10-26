---
type: feature
---
# People sign in with GitHub, and everything they see is theirs alone

## Why
A job search is private. Each person signs in with their GitHub account and
sees only their own jobs; signing out on a shared laptop leaves nothing for
the next person to find. This executes the session-derived identity
contract in [auth.md](../auth.md).

## Where it lives
- `packages/auth/src/` — Auth.js config (GitHub provider, Prisma adapter,
  database sessions) and `currentUserId()`, derived from the session
- `packages/db/prisma/schema.prisma` — `Account`, `Session`,
  `VerificationToken`; `User` gains `image` and `emailVerified`
- `apps/web/app/api/auth/[...nextauth]/route.ts` — the Auth.js handlers
- `apps/web/app/login/page.tsx` — the sign-in page
- `apps/web/middleware.ts` — redirects signed-out page requests to `/login`,
  answers signed-out `/api/*` requests with 401
- `apps/web/lib/require-user.ts` — `requireUserId(path)` for pages: turns
  an unauthenticated error into the `/login` redirect
- `apps/web/app/layout.tsx` — signed-in header: avatar, name, sign-out
- `apps/web/lib/errors.ts` — maps the unauthenticated error to 401
- `packages/db/prisma/migrations/0002_auth.sql` — the delta that applies
  those models
- `apps/migrate/src/seed.ts` — seeds an existing signed-in user, not a
  hardcoded one

## Behavior
- **Public surface is exactly** `/`, `/login`, `/api/health`, and
  `/api/auth/*`. Every other route requires a session.
- A signed-out request for a gated **page** redirects to
  `/login?callbackUrl=<path>`. A signed-out **Server Action** returns
  `{ error: { code: "UNAUTHENTICATED", message } }` and writes nothing; a
  signed-out **route handler** (or middleware, for `/api/*`) responds 401
  with that body.
- A request that carries a replayed or expired cookie passes middleware but
  fails `currentUserId()`; pages turn that into the same `/login` redirect
  through `requireUserId(path)` rather than an error card.
- `/login` offers one action, "Sign in with GitHub". After GitHub consent
  the user lands on `callbackUrl` if it is same-origin, else `/jobs`.
  A signed-in visit to `/login` redirects to `/jobs`.
- **First sign-in creates the user**: one `User` (name, email, avatar from
  GitHub), one `Account` (`provider: "github"`, GitHub's account id), one
  `Session`. Later sign-ins with the same GitHub account reuse that user —
  matched on `(provider, providerAccountId)`, never on email or name.
- `currentUserId()` returns the user id of an unexpired database `Session`
  row and nothing else. With no valid session it throws
  `UnauthenticatedError`; it never falls back. The dev identity stub's
  header and env-var inputs exist nowhere in code or living docs.
- **Sign-out** deletes the `Session` row and clears the cookie, then lands
  on `/`. Afterwards, the old cookie value, the back button, or a reload of
  `/jobs` gets the signed-out behavior above.
- Pages that render user data are dynamic and sent with
  `Cache-Control: private, no-store`, so neither the browser cache nor a
  shared proxy replays them to the next person.
- Every page shows a signed-in header — avatar, name, "Sign out" — and
  nothing when signed out.
- **The seed never creates a user.** It attaches jobs to the user who owns
  the most recent unexpired `Session`; with none, it exits 1 with "sign in
  at http://localhost:3000/login first" (see [jobs/seed.md](../jobs/seed.md)).
- The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in
  production. Sessions last 30 days, extended on use at most once a day.
- If the user declines consent on GitHub, or GitHub returns an error, they
  land back on `/login` with a plain message; no user or session is written.
- If the GitHub email matches an existing user that has no GitHub account
  linked, sign-in is refused with a message — accounts are never linked
  by email.
- Missing `AUTH_SECRET`, `AUTH_GITHUB_ID`, or `AUTH_GITHUB_SECRET` makes
  sign-in fail with a logged configuration error; `/api/health` and `/`
  are unaffected. The variables live in `apps/web/.env.local`; the GitHub
  OAuth app's callback URL is `http://localhost:3000/api/auth/callback/github`.

## Examples

| State / input | Behavior |
|---|---|
| signed out → `GET /jobs` | 307 to `/login?callbackUrl=%2Fjobs` |
| signed out → `GET /api/health` | 200, unchanged |
| signed out → submit the `/jobs/new` action | `UNAUTHENTICATED` error result, no row written |
| signed out → any gated `/api/*` route | 401 `UNAUTHENTICATED` |
| `/jobs` request carries a replayed or expired cookie | redirect to `/login?callbackUrl=%2Fjobs` |
| `pnpm db:seed` with no unexpired `Session` | exits 1: "sign in at http://localhost:3000/login first" |
| new GitHub account completes sign-in | one `User` + `Account` + `Session`; lands on `/jobs`, empty state |
| same GitHub account signs in again | no new `User`; new `Session`; their jobs appear |
| signed in as A, request carries a client-supplied user-id header for B | header ignored; A's jobs only |
| signed in as A → `/jobs/<B's job id>` (when that route exists) | 404 |
| sign out, then replay the old cookie on `/jobs` | redirect to `/login` |
| `callbackUrl=https://evil.example` | lands on `/jobs` |
| user declines on GitHub | back on `/login` with a message; zero rows written |

## Verify
- `pnpm test:integration` — covers: `currentUserId()` with a valid, expired,
  and deleted session and an ignored client-supplied user-id header
  (`auth-current-user`); first sign-in, repeat sign-in, and sign-out through
  the Prisma adapter against PGlite (`auth-adapter`); the email-collision
  refusal and `callbackUrl` sanitising (`auth-guards`); the unauthenticated
  result from the add-a-job action (`jobs-action`).
- `grep -rn "x-user-i[d]\|DEV_USER_I[D]\|ALLOW_DEV_IDENTIT[Y]" apps packages
  tests docs .opencode README.md` returns hits only in
  [ADR-0003](../../adr/0003-dev-identity-stub.md) and the test that proves
  a spoofed header is ignored.
- `curl -si localhost:3000/jobs | head -1` → 307, with `location:` showing
  `/login?callbackUrl=%2Fjobs`; `curl -s localhost:3000/api/health` → 200,
  also with `AUTH_*` unset.
- `curl -sI -b "authjs.session-token=<token>" localhost:3000/jobs` shows a
  `cache-control` containing `private` and `no-store`; replaying the cookie
  after sign-out redirects to `/login`.
- Manual drill with a GitHub OAuth app pointed at `localhost:3000`: sign in,
  add a job, sign out, press Back and reload — the login page, not the job.
  Sign in as a second GitHub account — the first account's job is absent.
- Keyboard-only pass: reach and activate "Sign in with GitHub" and
  "Sign out" with Tab and Enter.

## Constraints & decisions
- **One provider, GitHub.** Adding another is a spec change; see
  [auth.md](../auth.md).
- **Database sessions, not JWTs.** Sign-out must actually revoke; a deleted
  row does, a JWT does not.
- **Middleware only checks cookie presence.** It cannot reach Postgres, so
  it is a redirect convenience; `currentUserId()` in every server entry is
  the real gate.
- **No dev bypass.** Local dev signs in through a GitHub OAuth app like
  production; tests mock `@project/auth` at the package seam instead.
- **No email-based account linking.** Linking by unverified email would let
  one person take over another's data.
- **Identity is the database `Session` row.** `currentUserId()` accepts a
  session only while its row exists and has not expired; the mechanism that
  reads it is an implementation detail of `packages/auth`.
- **Cache headers are Next's default.** Dynamic pages are sent with
  `private, no-cache, no-store`; user-data pages stay `force-dynamic` so
  that holds.
- **The header uses a plain `<img>`**, not `next/image`, which would need
  the avatar host allow-listed in `next.config.ts` for a 32px picture.
- **A link guard states the collision rule in our code.** `link-guard.ts`
  refuses a sign-in whose email matches a user with no linked GitHub
  account, so the rule is testable and does not rest on library internals;
  `allowDangerousEmailAccountLinking` stays off.
- **The seed targets a session, not a name.** Picking the most recent
  unexpired `Session` keeps the seed from inventing identities.
- **Dependencies pinned exactly in `packages/auth`:** `next-auth@5.0.0-beta.32`
  and `@auth/prisma-adapter@2.11.3`. The stub's retirement is recorded in
  [ADR-0012](../../adr/0012-github-sessions-replace-dev-identity.md), which
  supersedes [ADR-0003](../../adr/0003-dev-identity-stub.md).

## Out of scope
- Roles, admin, account deletion and export — future work with a privacy
  doc, per [auth.md](../auth.md).
- Worker identity — the worker has no user context; unchanged.
- Additional providers, email/password, magic links — not planned.
- Seeding behavior beyond targeting a signed-in user —
  [jobs/seed.md](../jobs/seed.md).
