// Signed-in header: avatar, name, sign-out. Renders nothing when signed out,
// and swallows auth errors so `/` still renders if auth is misconfigured
// (the error is already logged at startup). Plain <img>, not next/image,
// which would need remotePatterns for GitHub's avatar host.
import { auth, signOut } from "@project/auth";

export async function SessionHeader() {
  const session = await auth().catch(() => null);
  if (!session?.user) return null;
  const { name, image } = session.user;

  return (
    <header className="mb-6 flex items-center justify-end gap-3 text-sm">
      {image && <img src={image} alt="" width={32} height={32} className="rounded-full" />}
      <span>{name}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100">
          Sign out
        </button>
      </form>
    </header>
  );
}
