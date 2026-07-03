"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { CalendarClock, Check, HeartHandshake, RotateCcw } from "lucide-react";
import type { Church, Locale } from "@/app/lib/demo/types";
import type { PrayerVM } from "@/app/lib/db/queries";
import { toggleReaction } from "@/app/lib/db/actions";
import { createT, localize } from "@/app/lib/i18n";
import { resolveRoleLabels, visibilityLabel } from "@/app/lib/roleLabels";
import { cn, formatMonthDay } from "@/app/lib/utils";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardBody,
  SensitiveFlags,
  VisibilityBadge,
} from "@/app/components/ui";

type MotionPattern = {
  id: 1 | 2 | 3 | 4 | 5;
  enterMs: number;
  exitMs: number;
};

const PRAYER_MOTION_PATTERNS: MotionPattern[] = [
  { id: 1, enterMs: 2860, exitMs: 1080 },
  { id: 2, enterMs: 3140, exitMs: 1160 },
  { id: 3, enterMs: 2680, exitMs: 1040 },
  { id: 4, enterMs: 3360, exitMs: 1200 },
  { id: 5, enterMs: 2980, exitMs: 1120 },
];

function randomPrayerPattern(except?: MotionPattern["id"]): MotionPattern {
  const candidates = except
    ? PRAYER_MOTION_PATTERNS.filter((pattern) => pattern.id !== except)
    : PRAYER_MOTION_PATTERNS;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? PRAYER_MOTION_PATTERNS[0];
}

export function TodayPrayerCarousel({
  prayers,
  church,
  locale,
  prayersHref,
  animate = true,
  onCompleted,
}: {
  prayers: PrayerVM[];
  church: Church;
  locale: Locale;
  prayersHref: string;
  animate?: boolean;
  onCompleted?: () => void;
}) {
  const t = createT(locale);
  const roleLabels = useMemo(() => resolveRoleLabels(church, locale), [church, locale]);
  const initialIndex = Math.max(0, prayers.findIndex((vm) => !vm.viewerPrayed));
  const [index, setIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const [entered, setEntered] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [motionPattern, setMotionPattern] = useState<MotionPattern | null>(animate ? null : PRAYER_MOTION_PATTERNS[0]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionNotified = useRef(false);
  const [prayedById, setPrayedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(prayers.map((vm) => [vm.item.id, vm.viewerPrayed])),
  );
  const [countById, setCountById] = useState<Record<string, number>>(() =>
    Object.fromEntries(prayers.map((vm) => [vm.item.id, vm.prayedCount])),
  );

  useEffect(() => {
    if (!animate) return undefined;
    const frame = window.requestAnimationFrame(() => setMotionPattern(randomPrayerPattern()));
    return () => {
      window.cancelAnimationFrame(frame);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, [animate]);

  if (prayers.length === 0) return null;

  const active = prayers[index] ?? prayers[0];
  const item = active.item;
  const title = localize(item.title, locale, church.defaultLocale);
  const body = localize(item.body, locale, church.defaultLocale);
  const visLabel = visibilityLabel(item.visibility, roleLabels, locale);
  const isAnon = item.anonymous || item.visibility === "anonymous_church";
  const showSelfAnon = active.isMine && isAnon;
  const displayName = showSelfAnon ? t("prayer.anonSelf") : active.authorName;
  const prayed = prayedById[item.id] ?? active.viewerPrayed;
  const prayedCount = countById[item.id] ?? active.prayedCount;
  const completedCount = prayers.filter((vm) => prayedById[vm.item.id]).length;
  const hasCompletedSet = completedCount >= prayers.length;
  const showComplete = hasCompletedSet && !isRepeating;
  const progressCurrent = showComplete ? prayers.length : Math.min(index + 1, prayers.length);
  const activeMotionPattern = motionPattern ?? PRAYER_MOTION_PATTERNS[0];
  const motionStyle = {
    "--prayer-enter-duration": `${activeMotionPattern.enterMs}ms`,
    "--prayer-exit-duration": `${activeMotionPattern.exitMs}ms`,
  } as CSSProperties;

  const motionDelay = (durationMs: number) =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : durationMs;

  const notifyCompleted = () => {
    if (completionNotified.current) return;
    completionNotified.current = true;
    onCompleted?.();
  };

  const advance = () => {
    setError("");
    if (index >= prayers.length - 1) {
      setIsRepeating(false);
      setMotionPattern((current) => randomPrayerPattern(current?.id));
      setEntered((current) => current + 1);
      notifyCompleted();
      return;
    }

    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    const nextPattern = randomPrayerPattern(motionPattern?.id);
    if (!animate) {
      setIndex((current) => Math.min(current + 1, prayers.length - 1));
      setMotionPattern(nextPattern);
      setEntered((current) => current + 1);
      return;
    }
    setIsChanging(true);
    transitionTimer.current = setTimeout(() => {
      setIndex((current) => Math.min(current + 1, prayers.length - 1));
      setMotionPattern(nextPattern);
      setEntered((current) => current + 1);
      setIsChanging(false);
    }, motionDelay(activeMotionPattern.exitMs));
  };

  const repeatTodayPrayers = () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    completionNotified.current = false;
    setError("");
    setIsChanging(false);
    setIsRepeating(true);
    setMotionPattern((current) => randomPrayerPattern(current?.id));
    setIndex(0);
    setEntered((current) => current + 1);
  };

  const markPrayed = () => {
    if (prayed) {
      advance();
      return;
    }

    startTransition(async () => {
      const res = await toggleReaction(church.id, item.id, "prayed");
      if (!res.ok) {
        setError(t("todayPrayer.error"));
        return;
      }

      setPrayedById((current) => ({ ...current, [item.id]: true }));
      setCountById((current) => ({ ...current, [item.id]: Math.max(0, (current[item.id] ?? active.prayedCount) + 1) }));
      if (index < prayers.length - 1) {
        advance();
      } else {
        setIsRepeating(false);
        setMotionPattern((current) => randomPrayerPattern(current?.id));
        setEntered((current) => current + 1);
        notifyCompleted();
      }
    });
  };

  const completeMotionClass = animate
    ? motionPattern
      ? `motion-pattern-${activeMotionPattern.id} today-prayer-complete-enter`
      : "today-prayer-card-prep"
    : undefined;
  const cardMotionClass = animate
    ? motionPattern
      ? `motion-pattern-${activeMotionPattern.id} today-prayer-card-enter`
      : "today-prayer-card-prep"
    : undefined;

  return (
    <section className="space-y-3" data-testid="today-prayer">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{t("todayPrayer.eyebrow")}</p>
          <h2 className="text-lg font-semibold text-ink text-balance-safe sm:text-xl">{t("todayPrayer.title")}</h2>
        </div>
        <span className="rounded-full border border-line bg-mist px-2.5 py-1 text-xs font-medium tabular-nums text-muted">
          {progressCurrent} / {prayers.length}
        </span>
      </div>

      {showComplete ? (
        <Card
          className={cn(
            completeMotionClass,
            "border-sage/35 bg-sage-soft/60",
          )}
          style={motionStyle}
        >
          <CardBody className="space-y-3 text-center">
            <p className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white">
              <Check className="h-5 w-5" aria-hidden />
            </p>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-ink text-balance-safe">{t("todayPrayer.completeTitle")}</h3>
              <p className="text-sm text-ink-soft text-balance-safe">{t("todayPrayer.completeBody")}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={repeatTodayPrayers} variant="primary" size="sm">
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t("todayPrayer.repeat")}
              </Button>
              <ButtonLink href={prayersHref} variant="secondary" size="sm">
                <HeartHandshake className="h-4 w-4" aria-hidden />
                {t("todayPrayer.more")}
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card
          key={`${item.id}-${entered}`}
          as="article"
          className={cn(
            cardMotionClass,
            "overflow-hidden",
            animate && isChanging && "today-prayer-card-exit",
          )}
          style={motionStyle}
        >
          <CardBody className="min-h-[280px] space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={displayName} size="sm" />
                <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              </div>
              <VisibilityBadge visibility={item.visibility} locale={locale} label={visLabel} />
            </div>

            {showSelfAnon ? (
              <p className="text-xs text-muted text-balance-safe">{t("prayer.anonSelfNote")}</p>
            ) : null}

            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold text-ink text-balance-safe">{title}</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">{body}</p>
            </div>

            <SensitiveFlags flags={item.sensitiveFlags} locale={locale} />

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
                {locale === "ja" ? `${prayedCount}${t("prayer.prayedCount")}` : `${prayedCount} ${t("prayer.prayedCount")}`}
              </span>
              {item.expiresAt ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  {t("prayer.expiresOn")} {formatMonthDay(item.expiresAt, locale, church.timezone)}
                </span>
              ) : null}
            </div>

            <div className="pt-1">
              <Button type="button" onClick={markPrayed} disabled={pending || isChanging} variant="primary" fullWidth>
                <HeartHandshake className="h-4 w-4" aria-hidden />
                {t("common.iPrayed")}
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-rose-ink" role="alert">
                {error}
              </p>
            ) : null}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
