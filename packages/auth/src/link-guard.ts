// Accounts are never linked by email: a first GitHub sign-in whose email
// belongs to an existing user is refused (docs/specs/auth/sign-in.md).
import type { PrismaClient } from "@project/db";

export async function refuseEmailCollision(
  prisma: Pick<PrismaClient, "account" | "user">,
  { provider, providerAccountId, email }: { provider: string; providerAccountId: string; email?: string | null }
): Promise<boolean> {
  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    select: { id: true },
  });
  if (linked || !email) return false;
  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return owner !== null;
}
