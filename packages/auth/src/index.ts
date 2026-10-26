// Re-exports the identity layer: Auth.js handlers and the session-derived
// currentUserId(). See docs/specs/auth.md and docs/specs/auth/sign-in.md.
export { currentUserId } from "./current-user";
export { UnauthenticatedError } from "./errors";
export { safeCallbackUrl } from "./redirect";
export { handlers, auth, signIn, signOut } from "./auth";
