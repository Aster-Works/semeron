"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  BookOpenCheck,
  Heart,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import type { ReactionType } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import type { MessageId } from "@/app/lib/i18n";
import { toggleReaction } from "@/app/lib/db/actions";
import { cn } from "@/app/lib/utils";

const META: Record<ReactionType, { icon: LucideIcon; label: MessageId }> = {
  read: { icon: BookOpenCheck, label: "common.read" },
  prayed: { icon: HeartHandshake, label: "common.prayed" },
  amen: { icon: BadgeCheck, label: "common.amen" },
  thanks: { icon: Heart, label: "common.thanks" },
};

export interface ReactionSpec {
  type: ReactionType;
  count: number;
  active: boolean;
}

/**
 * 応答・祈祷課題への静かなリアクション。クリックで toggleReaction を楽観的に呼ぶ。
 */
export function ReactionBar({
  churchId,
  contentId,
  reactions,
  className,
}: {
  churchId: string;
  contentId: string;
  reactions: ReactionSpec[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {reactions.map((r) => (
        <ReactionButton key={r.type} churchId={churchId} contentId={contentId} spec={r} />
      ))}
    </div>
  );
}

function ReactionButton({
  churchId,
  contentId,
  spec,
}: {
  churchId: string;
  contentId: string;
  spec: ReactionSpec;
}) {
  const { t } = useLocale();
  const [active, setActive] = useState(spec.active);
  const [count, setCount] = useState(spec.count);
  const [pending, startTransition] = useTransition();
  const meta = META[spec.type];
  const Icon = meta.icon;

  const toggle = () => {
    const next = !active;
    setActive(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await toggleReaction(churchId, contentId, spec.type);
      if (!res.ok) {
        // 失敗時は元に戻す
        setActive(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      disabled={pending}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
        active
          ? "border-sage/50 bg-sage-soft text-sage-ink"
          : "border-line-strong bg-surface text-muted hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{t(meta.label)}</span>
      {count > 0 ? <span className="tabular-nums text-xs">{count}</span> : null}
    </button>
  );
}
