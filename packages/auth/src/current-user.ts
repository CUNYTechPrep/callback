// The only source of identity: the database session behind the Auth.js cookie.
// No header, env var, or fallback (docs/specs/auth/sign-in.md).
import { auth } from "./auth";
import { UnauthenticatedError } from "./errors";

export async function currentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthenticatedError();
  return session.user.id;
}
