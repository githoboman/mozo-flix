/**
 * Generic loading skeletons. Use these instead of "Loading…" text.
 */

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-accent-border bg-card-2 shadow-lg">
      <div className="aspect-video animate-shimmer rounded-t-xl bg-card" />
      <div className="space-y-3 p-6">
        <div className="h-5 animate-shimmer rounded bg-card" />
        <div className="h-4 w-2/3 animate-shimmer rounded bg-card" />
        <div className="flex items-center gap-3 pt-2">
          <div className="h-8 w-8 animate-shimmer rounded-full bg-card" />
          <div className="h-3 w-24 animate-shimmer rounded bg-card" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-5">
      <div className="h-10 w-10 shrink-0 animate-shimmer rounded-full bg-card" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-shimmer rounded bg-card" />
        <div className="h-3 w-1/2 animate-shimmer rounded bg-card" />
      </div>
      <div className="h-8 w-20 animate-shimmer rounded bg-card" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-accent-border bg-card p-6">
      <div className="mb-3 h-3 w-20 animate-shimmer rounded bg-card-2" />
      <div className="h-10 w-32 animate-shimmer rounded bg-card-2" />
    </div>
  );
}

export function SkeletonLine({ widthClass = "w-full" }: { widthClass?: string }) {
  return <div className={`h-4 animate-shimmer rounded bg-card ${widthClass}`} />;
}
