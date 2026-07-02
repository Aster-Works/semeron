/**
 * ナビゲーション中の静かなスケルトン（loading.tsx 用）。
 * 派手なスピナーは使わず、カードの淡いパルスのみ。シェル（ヘッダー/ナビ）は
 * layout に常駐しているため、ここは本文領域だけを埋める。
 */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden role="presentation">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-mist" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-5">
          <div className="h-4 w-3/5 rounded bg-mist" />
          <div className="mt-3 h-3 w-4/5 rounded bg-mist" />
          <div className="mt-2 h-3 w-2/5 rounded bg-mist" />
        </div>
      ))}
    </div>
  );
}
