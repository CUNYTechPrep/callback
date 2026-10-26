// The env vars sign-in cannot work without.
const REQUIRED = ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"] as const;

export function missingAuthEnv(): string[] {
  return REQUIRED.filter((k) => !process.env[k]);
}
