// Only same-origin paths survive; anything else lands on /jobs
// (docs/specs/auth/sign-in.md).
const DEFAULT = "/jobs";

export function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return DEFAULT;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT;
  return raw;
}
