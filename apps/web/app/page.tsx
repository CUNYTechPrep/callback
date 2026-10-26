// Landing page. Points the user at their job list.
import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Job Tracker</h1>
        <p className="text-neutral-600">Every application you've sent, and what happened next.</p>
      </header>
      <Link
        href="/jobs"
        className="inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Your jobs &rarr;
      </Link>
    </main>
  );
}
