"use client";
// Retry card for /jobs. Shows a generic message — never error.message.
export default function JobsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="mb-4 text-red-800">We couldn't load your jobs.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </main>
  );
}
