import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * 匿名集計の数値表示。個人別ではない・ランキングでもない、静かな指標。
 * 「信仰スコア」的な演出は絶対にしない。
 */
export function Stat({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-4", className)}>
      <div className="flex items-center gap-2 text-muted">
        {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
