import { BookOpen } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * みことばの表示。参照 + 翻訳出典を必ず示し、引用はセリフで静かに際立たせる。
 * 聖書本文は短い引用のみ（09 Bible Text Policy）。
 */
export function ScriptureBlock({
  reference,
  translation,
  quote,
  copyrightNotice,
  className,
}: {
  reference?: string;
  translation?: string;
  quote?: string;
  copyrightNotice?: string;
  className?: string;
}) {
  if (!reference && !quote) return null;
  return (
    <figure
      className={cn(
        "rounded-2xl border border-gold/25 bg-gold-soft/50 p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-gold-ink">
        <BookOpen className="h-4 w-4" aria-hidden />
        <span className="text-sm font-semibold">{reference}</span>
        {translation ? (
          <span className="text-xs text-muted">・{translation}</span>
        ) : null}
      </div>
      {quote ? (
        <blockquote className="font-scripture mt-3 text-lg leading-relaxed text-ink text-balance-safe">
          {quote}
        </blockquote>
      ) : null}
      {copyrightNotice ? (
        <figcaption className="mt-3 text-[11px] text-muted">{copyrightNotice}</figcaption>
      ) : null}
    </figure>
  );
}
