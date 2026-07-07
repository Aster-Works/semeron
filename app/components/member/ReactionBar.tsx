"use client";

import { useOptimistic, useTransition } from "react";
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
  // サーバー真値(spec)を権威とし、useOptimistic で即時反映する。
  // revalidate 後にサーバーが再描画されると overlay は自動でサーバー値へ戻るため、
  // 「一度押したら記憶される」（＝再訪でも押した状態が残る）。
  const [state, setOptimistic] = useOptimistic(
    { active: spec.active, count: spec.count },
    (_prev, next: { active: boolean; count: number }) => next,
  );
  const [pending, startTransition] = useTransition();
  const { active, count } = state;
  const meta = META[spec.type];
  const Icon = meta.icon;

  const toggle = () => {
    const next = {
      active: !active,
      count: Math.max(0, count + (!active ? 1 : -1)),
    };
    startTransition(async () => {
      setOptimistic(next);
      await toggleReaction(churchId, contentId, spec.type);
      // 成否に関わらず、server action の revalidate によりサーバー真値へ収束する。
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
