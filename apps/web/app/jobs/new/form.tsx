"use client";
// The add-a-job form. Field errors render under their input; any other error
// renders once at the top.
import { useActionState } from "react";
import { createJobAction } from "./actions";

const input = "w-full rounded border border-neutral-300 px-3 py-2";

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {messages[0]}
    </p>
  );
}

// Statuses come from the server page: importing @project/domain here would
// pull the Prisma client into the browser bundle.
export function NewJobForm({ statuses, today }: { statuses: readonly string[]; today: string }) {
  const [state, formAction, pending] = useActionState(createJobAction, null);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.fieldErrors && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.error.message}
        </p>
      )}

      <div>
        <label htmlFor="company" className="mb-1 block text-sm font-medium">Company</label>
        <input id="company" name="company" required defaultValue={v?.company} className={input}
          aria-invalid={!!fe.company} aria-describedby={fe.company ? "company-error" : undefined} />
        <FieldError id="company-error" messages={fe.company} />
      </div>

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">Title</label>
        <input id="title" name="title" required defaultValue={v?.title} className={input}
          aria-invalid={!!fe.title} aria-describedby={fe.title ? "title-error" : undefined} />
        <FieldError id="title-error" messages={fe.title} />
      </div>

      <div>
        <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
        <select id="status" name="status" defaultValue={v?.status || "APPLIED"} className={input}
          aria-invalid={!!fe.status} aria-describedby={fe.status ? "status-error" : undefined}>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <FieldError id="status-error" messages={fe.status} />
      </div>

      <div>
        <label htmlFor="dateApplied" className="mb-1 block text-sm font-medium">Date applied</label>
        <input id="dateApplied" name="dateApplied" type="date" defaultValue={v?.dateApplied || today} className={input}
          aria-invalid={!!fe.dateApplied} aria-describedby={fe.dateApplied ? "dateApplied-error" : undefined} />
        <FieldError id="dateApplied-error" messages={fe.dateApplied} />
      </div>

      <button type="submit" disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? "Adding…" : "Add job"}
      </button>
    </form>
  );
}
