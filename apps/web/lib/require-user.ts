// For pages only: a missing, expired, or replayed session redirects to /login
// instead of throwing into the error card. Actions and routes use
// currentUserId() and mapError() instead (docs/specs/auth/sign-in.md).
import { redirect } from "next/navigation";
import { currentUserId, UnauthenticatedError } from "@project/auth";

export async function requireUserId(path: string): Promise<string> {
  try {
    return await currentUserId();
  } catch (e) {
    if (e instanceof UnauthenticatedError) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
    throw e;
  }
}
