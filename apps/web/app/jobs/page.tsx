// The current user's jobs, newest applied first (docs/specs/jobs/list.md).
import Link from "next/link";
import { listJobs } from "@project/domain";
import { requireUserId } from "../../lib/require-user";

export const dynamic = "force-dynamic";

// UTC so a date stored at midnight UTC doesn't render as the previous day.
function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { timeZone: "UTC" });
}

const addLink = (
  <Link
    href="/jobs/new"
    className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
  >
    Add a job
  </Link>
);

export default async function JobsPage() {
  const userId = await requireUserId("/jobs");
  const jobs = await listJobs(userId);

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your jobs</h1>
        {addLink}
      </header>

      {jobs.length === 0 ? (
        <section className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="mb-4 text-neutral-600">No jobs yet. Add the first application you've sent.</p>
          {addLink}
        </section>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="py-2 font-medium">Company</th>
              <th className="py-2 font-medium">Title</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Applied</th>
              <th className="py-2 font-medium">Follow up</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-neutral-100">
                <td className="py-2">{j.company}</td>
                <td className="py-2">{j.title}</td>
                <td className="py-2">{j.status}</td>
                <td className="py-2">{fmt(j.dateApplied)}</td>
                <td className="py-2">{j.followUpDate ? fmt(j.followUpDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
