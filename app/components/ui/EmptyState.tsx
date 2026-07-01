import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

/** 空状態。責めない・急かさない、静かな文言で（12 Copy Principles）。 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-mist/50 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage-ink">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <p className="text-sm font-medium text-ink text-balance-safe">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted text-balance-safe">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
