// Redirect convenience for signed-out requests. It only checks that a session
// cookie exists (Postgres is out of reach here); currentUserId() in every
// server entry is the real gate (docs/specs/auth/sign-in.md).
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];
const PUBLIC_EXACT = new Set(["/", "/login", "/api/health"]);

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_EXACT.has(pathname) || pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (SESSION_COOKIES.some((name) => req.cookies.has(name))) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Sign in to continue" } },
      { status: 401 }
    );
  const login = new URL("/login", req.url);
  login.searchParams.set("callbackUrl", pathname + search);
  return NextResponse.redirect(login, 307);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
