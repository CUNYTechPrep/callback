// Add-a-job page (docs/specs/jobs/list.md).
import Link from "next/link";
import { JOB_STATUSES } from "@project/domain";
import { requireUserId } from "../../../lib/require-user";
import { NewJobForm } from "./form";

// Dynamic so the date-applied default is today, not the build date.
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireUserId("/jobs/new");
  return (
    <main className="space-y-6">
      <header>
        <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Your jobs
        </Link>
        <h1 className="text-2xl font-bold">Add a job</h1>
      </header>
      <NewJobForm statuses={JOB_STATUSES} today={new Date().toISOString().slice(0, 10)} />
    </main>
  );
}
