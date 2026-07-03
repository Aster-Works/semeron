"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { BookOpenCheck, Check, HeartHandshake, MessageCircleHeart, Send } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { setCompletion } from "@/app/lib/db/actions";
import { buttonClass } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

/**
 * 「読みました / 祈りました」。押しやすいが達成感を煽りすぎない。
 * クリックで completion_logs を更新（本人のみ・管理者には匿名集計）。
 */
export function TodayActions({
  churchId,
  contentId,
  initialRead,
  initialPrayed,
  shareHref,
  talkToPastorLabel,
  staggered = false,
  showLinks = true,
  onStatusChange,
}: {
  churchId: string;
  contentId: string;
  initialRead: boolean;
  initialPrayed: boolean;
  shareHref: string;
  /** 「{pastor}に相談する」の教会別呼称ラベル。省略時は標準。 */
  talkToPastorLabel?: string;
  staggered?: boolean;
  showLinks?: boolean;
  onStatusChange?: (status: { read: boolean; prayed: boolean; done: boolean }) => void;
}) {
  const { t } = useLocale();
  const [read, setRead] = useState(initialRead);
  const [prayed, setPrayed] = useState(initialPrayed);
  const [, startTransition] = useTransition();
  const done = read && prayed;
  const actionStyle = (delay: string) => ({ "--today-flow-action-delay": delay }) as CSSProperties;

  const toggle = (kind: "read" | "prayed") => {
    const cur = kind === "read" ? read : prayed;
    const next = !cur;
    const nextRead = kind === "read" ? next : read;
    const nextPrayed = kind === "prayed" ? next : prayed;
    (kind === "read" ? setRead : setPrayed)(next);
    onStatusChange?.({ read: nextRead, prayed: nextPrayed, done: nextRead && nextPrayed });
    startTransition(async () => {
      const res = await setCompletion(churchId, contentId, kind, next);
      if (!res.ok) {
        (kind === "read" ? setRead : setPrayed)(cur);
        onStatusChange?.({ read, prayed, done: read && prayed });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <CompletionButton
          active={read}
          onClick={() => toggle("read")}
          icon={BookOpenCheck}
          label={t("common.read")}
          className={staggered ? "today-flow-action-item" : undefined}
          style={staggered ? actionStyle("0ms") : undefined}
        />
        <CompletionButton
          active={prayed}
          onClick={() => toggle("prayed")}
          icon={HeartHandshake}
          label={t("common.iPrayed")}
          className={staggered ? "today-flow-action-item" : undefined}
          style={staggered ? actionStyle("260ms") : undefined}
        />
      </div>

      {showLinks ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={shareHref}
            className={cn(buttonClass({ variant: "secondary", size: "sm" }), staggered && "today-flow-action-item")}
            style={staggered ? actionStyle("520ms") : undefined}
          >
            <Send className="h-4 w-4" aria-hidden />
            {t("today.shareRequest")}
          </Link>
          <Link
            href={shareHref}
            className={cn(buttonClass({ variant: "quiet", size: "sm" }), staggered && "today-flow-action-item")}
            style={staggered ? actionStyle("780ms") : undefined}
          >
            <MessageCircleHeart className="h-4 w-4" aria-hidden />
            {talkToPastorLabel ?? t("today.talkToPastor")}
          </Link>
        </div>
      ) : null}

      {done ? (
        <p className="flex items-center gap-1.5 text-sm text-sage-ink" role="status">
          <Check className="h-4 w-4" aria-hidden />
          {t("today.completedQuiet")}
        </p>
      ) : null}
    </div>
  );
}

function CompletionButton({
  active,
  onClick,
  icon: Icon,
  label,
  className,
  style,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpenCheck;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        buttonClass({ variant: active ? "primary" : "secondary", size: "md", fullWidth: true }),
        !active && "border-dashed",
        className,
      )}
      style={style}
    >
      {active ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
      {label}
    </button>
  );
}
