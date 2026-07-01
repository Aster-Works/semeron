import { cn } from "@/app/lib/utils";

/** 小見出し（アイブロウ + タイトル + 説明）。祈りに集中できる静かな見出し。 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-ink text-balance-safe sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted text-balance-safe">{description}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
