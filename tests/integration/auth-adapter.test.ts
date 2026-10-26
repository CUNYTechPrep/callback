import { describe, it, expect, beforeAll } from "vitest";

// First sign-in, repeat sign-in, and sign-out through the real Prisma adapter
// against PGlite, in the order Auth.js calls it. Proves the schema and
// migration 0002 match the adapter (docs/specs/auth/sign-in.md).

const HOUR = 60 * 60 * 1000;
let adapter: ReturnType<typeof import("../../packages/auth/node_modules/@auth/prisma-adapter").PrismaAdapter> & Record<string, any>;
let prisma: typeof import("@project/db").prisma;

const github = { provider: "github", providerAccountId: "gh-1001" };

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  ({ prisma } = await import("@project/db"));
  const { PrismaAdapter } = await import("../../packages/auth/node_modules/@auth/prisma-adapter/index.js");
  adapter = PrismaAdapter(prisma) as typeof adapter;
}, 30000);

const session = (userId: string, token: string) => ({
  userId,
  sessionToken: token,
  expires: new Date(Date.now() + 24 * HOUR),
});

describe("Prisma adapter sign-in flow", () => {
  it("first sign-in creates one User, one github Account, one Session", async () => {
    expect(await adapter.getUserByAccount(github)).toBeNull();
    const user = await adapter.createUser({
      id: "ignored",
      name: "Ada",
      email: "ada@example.com",
      image: "https://avatars.example/ada.png",
      emailVerified: null,
    });
    await adapter.linkAccount({ ...github, userId: user.id, type: "oauth", access_token: "t", token_type: "bearer", scope: "read:user" });
    await adapter.createSession(session(user.id, "tok-1"));

    expect(await prisma.user.count({ where: { email: "ada@example.com" } })).toBe(1);
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject(github);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });

  it("repeat sign-in reuses the user and adds only a Session", async () => {
    const existing = await adapter.getUserByAccount(github);
    expect(existing?.email).toBe("ada@example.com");
    await adapter.createSession(session(existing!.id, "tok-2"));

    expect(await prisma.user.count({ where: { email: "ada@example.com" } })).toBe(1);
    expect(await prisma.account.count({ where: { userId: existing!.id } })).toBe(1);
    expect(await prisma.session.count({ where: { userId: existing!.id } })).toBe(2);
  });

  it("sign-out deletes the Session row", async () => {
    await adapter.deleteSession("tok-1");
    expect(await prisma.session.findUnique({ where: { sessionToken: "tok-1" } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { sessionToken: "tok-2" } })).not.toBeNull();
  });
});
