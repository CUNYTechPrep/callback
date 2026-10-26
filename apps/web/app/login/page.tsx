// Sign-in page: one action, "Sign in with GitHub" (docs/specs/auth/sign-in.md).
import { redirect } from "next/navigation";
import { auth, safeCallbackUrl, signIn } from "@project/auth";

export const dynamic = "force-dynamic";

// Plain messages keyed by Auth.js error code; the raw param is never echoed.
const MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "An account with this email already exists and isn't linked to GitHub.",
  Configuration: "Sign-in is unavailable right now.",
};
const FALLBACK = "Sign-in didn't complete. Please try again.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth().catch(() => null);
  if (session?.user?.id) redirect("/jobs");

  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const message = params.error ? (MESSAGES[params.error] ?? FALLBACK) : null;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {message && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
