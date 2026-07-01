import {
  Archive,
  Church,
  CircleCheck,
  CircleX,
  Clock,
  EyeOff,
  HeartHandshake,
  Hourglass,
  Lock,
  PencilLine,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type {
  ContentStatus,
  Locale,
  Role,
  SensitiveFlag,
  Visibility,
} from "@/app/lib/demo/types";
import { createT } from "@/app/lib/i18n";
import { cn, type Tone } from "@/app/lib/utils";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-mist text-ink-soft border-line",
  sage: "bg-sage-soft text-sage-ink border-sage/30",
  cedar: "bg-cedar-soft text-cedar-ink border-cedar/30",
  gold: "bg-gold-soft text-gold-ink border-gold/40",
  rose: "bg-rose-soft text-rose-ink border-rose/40",
  slate: "bg-slate-soft text-slate-ink border-slate/30",
};

/** 汎用バッジ。状態は「色のみ」に依存させず、必ずラベル（+アイコン）を伴う。 */
export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}

const visibilityMeta: Record<Visibility, { tone: Tone; icon: LucideIcon }> = {
  pastor_only: { tone: "cedar", icon: Lock },
  elders: { tone: "cedar", icon: ShieldCheck },
  prayer_team: { tone: "sage", icon: HeartHandshake },
  group: { tone: "slate", icon: Users },
  church: { tone: "sage", icon: Church },
  anonymous_church: { tone: "slate", icon: EyeOff },
};

/** 公開範囲バッジ。会員に「誰に見えるか」を常に明示する（誤公開を防ぐ核）。 */
export function VisibilityBadge({
  visibility,
  locale,
  className,
}: {
  visibility: Visibility;
  locale: Locale;
  className?: string;
}) {
  const t = createT(locale);
  const meta = visibilityMeta[visibility];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {t(`visibility.${visibility}`)}
    </Badge>
  );
}

const statusMeta: Record<ContentStatus, { tone: Tone; icon: LucideIcon }> = {
  draft: { tone: "neutral", icon: PencilLine },
  scheduled: { tone: "slate", icon: Clock },
  pending_review: { tone: "gold", icon: Hourglass },
  published: { tone: "sage", icon: CircleCheck },
  rejected: { tone: "rose", icon: CircleX },
  archived: { tone: "neutral", icon: Archive },
};

/** 状態ピル。承認前/公開済み/期限切れ等の状態を明確にする。 */
export function StatusPill({
  status,
  locale,
  className,
}: {
  status: ContentStatus;
  locale: Locale;
  className?: string;
}) {
  const t = createT(locale);
  const meta = statusMeta[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {t(`status.${status}`)}
    </Badge>
  );
}

export function OutcomeBadge({
  outcome,
  locale,
}: {
  outcome: "open" | "answered" | "thanksgiving";
  locale: Locale;
}) {
  const t = createT(locale);
  const tone: Tone = outcome === "thanksgiving" ? "gold" : outcome === "answered" ? "sage" : "neutral";
  return <Badge tone={tone}>{t(`outcome.${outcome}`)}</Badge>;
}

const adminRoles: Role[] = ["owner", "pastor", "elder", "staff"];
export function RoleBadge({ role, locale }: { role: Role; locale: Locale }) {
  const t = createT(locale);
  const tone: Tone = adminRoles.includes(role)
    ? "cedar"
    : role === "prayer_team"
      ? "sage"
      : role === "group_leader"
        ? "slate"
        : "neutral";
  return <Badge tone={tone}>{t(`role.${role}`)}</Badge>;
}

/** センシティブ分類のチップ列（rose で柔らかく注意喚起）。 */
export function SensitiveFlags({
  flags,
  locale,
}: {
  flags: SensitiveFlag[] | undefined;
  locale: Locale;
}) {
  const t = createT(locale);
  if (!flags || flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((f) => {
        const tone: Tone = f === "self_harm_or_immediate_danger" ? "rose" : "rose";
        return (
          <Badge key={f} tone={tone}>
            {t(`flag.${f}`)}
          </Badge>
        );
      })}
    </div>
  );
}
