import type { LucideIcon } from "lucide-react";
import { cn, type Tone } from "@/app/lib/utils";

const toneStyles: Record<Tone, string> = {
  neutral: "border-line bg-mist/60 text-ink",
  sage: "border-sage/30 bg-sage-soft text-ink",
  cedar: "border-cedar/30 bg-cedar-soft text-ink",
  gold: "border-gold/40 bg-gold-soft text-ink",
  rose: "border-rose/40 bg-rose-soft text-ink",
  slate: "border-slate/30 bg-slate-soft text-ink",
};

const iconTone: Record<Tone, string> = {
  neutral: "text-muted",
  sage: "text-sage-ink",
  cedar: "text-cedar-ink",
  gold: "text-gold-ink",
  rose: "text-rose-ink",
  slate: "text-slate-ink",
};

/**
 * 注意・案内ボックス。センシティブ警告やソフトゲートの文言に使う。
 * 赤で煽らない（rose は柔らかい警告）。
 */
export function Callout({
  tone = "neutral",
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border p-4", toneStyles[tone], className)}
      role="note"
    >
      <div className="flex gap-3">
        {Icon ? (
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconTone[tone])} aria-hidden />
        ) : null}
        <div className="min-w-0 text-sm text-balance-safe">
          {title ? <p className="font-semibold text-ink">{title}</p> : null}
          {children ? (
            <div className={cn("leading-relaxed text-ink-soft", title && "mt-1")}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
