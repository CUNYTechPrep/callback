// Skeleton for /jobs while the list loads.
export default function Loading() {
  return (
    <main className="space-y-6" aria-busy="true" aria-label="Loading jobs">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-neutral-100" />
        ))}
      </div>
    </main>
  );
}
