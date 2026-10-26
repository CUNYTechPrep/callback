// Auth.js config: GitHub only, database sessions so sign-out revokes
// (docs/specs/auth/sign-in.md, ADR-0012). Does not throw at import when env is
// missing — the root layout imports this and `/` must keep rendering.
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@project/db";
import { log } from "@project/log";
import { missingAuthEnv } from "./config";
import { refuseEmailCollision } from "./link-guard";
import { safeCallbackUrl } from "./redirect";

const missing = missingAuthEnv();
if (missing.length > 0) log.error({ missing }, "auth configuration error");

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  // Auth.js cookies are already HttpOnly + SameSite=Lax; Secure is set
  // explicitly so it doesn't depend on the request protocol.
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
    redirect({ url, baseUrl }) {
      let path = url;
      if (!url.startsWith("/")) {
        // Absolute URLs pass only when same-origin; compare origins, not prefixes.
        try {
          const u = new URL(url);
          path = u.origin === new URL(baseUrl).origin ? u.pathname + u.search : "";
        } catch {
          path = "";
        }
      }
      return baseUrl + safeCallbackUrl(path);
    },
    async signIn({ account, user }) {
      if (!account) return true;
      const refuse = await refuseEmailCollision(prisma, {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email,
      });
      return refuse ? "/login?error=OAuthAccountNotLinked" : true;
    },
  },
});
