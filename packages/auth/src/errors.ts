// No imports on purpose: tests and apps/web/lib/errors.ts load this without
// pulling in Auth.js.
export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Sign in to continue") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}
