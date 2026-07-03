"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { HeartHandshake, MessageCircleHeart, Send } from "lucide-react";
import type { Church, ContentItem, Locale } from "@/app/lib/demo/types";
import type { PrayerVM, ReflectionVM } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { fmt, resolveRoleLabels } from "@/app/lib/roleLabels";
import { ButtonLink, Card, CardBody, EmptyState, ScriptureBlock, SectionHeading } from "@/app/components/ui";
import { GracefulReveal } from "./GracefulReveal";
import { ReflectionCard } from "./ReflectionCard";
import { ReflectionComposer } from "./ReflectionComposer";
import { TodayActions } from "./TodayActions";
import { TodayPrayerCarousel } from "./TodayPrayerCarousel";

type FlowStage = 0 | 1 | 2 | 3 | 4;
type RevealTrigger = "mount" | "in-view";

export function TodayDevotionFlow({
  devotion,
  church,
  locale,
  todayKey,
  animationReplayKey,
  initialRead,
  initialPrayed,
  prayers,
  reflections,
  shareHref,
  prayersHref,
  talkToPastorLabel,
}: {
  devotion: ContentItem;
  church: Church;
  locale: Locale;
  todayKey: string;
  animationReplayKey?: string;
  initialRead: boolean;
  initialPrayed: boolean;
  prayers: PrayerVM[];
  reflections: ReflectionVM[];
  shareHref: string;
  prayersHref: string;
  talkToPastorLabel: string;
}) {
  const t = createT(locale);
  const roleLabels = useMemo(() => resolveRoleLabels(church, locale), [church, locale]);
  const dailyOpenKey = `semeron:today-flow-opened:${church.id}:${todayKey}`;
  const dailyOpenDecisionKey = animationReplayKey
    ? `${dailyOpenKey}:replay:${animationReplayKey}`
    : dailyOpenKey;
  const initialPrayerDone = prayers.length === 0 || prayers.every((vm) => vm.viewerPrayed);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<FlowStage>(0);
  const [animateFlow, setAnimateFlow] = useState<boolean | null>(null);
  const [devotionDone, setDevotionDone] = useState(initialRead && initialPrayed);
  const [prayersDone, setPrayersDone] = useState(initialPrayerDone);
  const lastGestureAt = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const dailyOpenDecision = useRef<{ key: string; shouldAnimate: boolean } | null>(null);

  const revealAtLeast = useCallback((nextStage: FlowStage) => {
    setStage((current) => (current >= nextStage ? current : nextStage));
  }, []);

  const advanceByGesture = useCallback(() => {
    if (!ready || !animateFlow) return;
    const now = Date.now();
    if (now - lastGestureAt.current < 900) return;
    lastGestureAt.current = now;
    setStage((current) => {
      if (current < 1) return 1;
      if (current < 2) return 2;
      if (current < 3) return 3;
      if (current < 4 && prayersDone) return 4;
      return current;
    });
  }, [animateFlow, prayersDone, ready]);

  useEffect(() => {
    if (dailyOpenDecision.current?.key !== dailyOpenDecisionKey) {
      let openedToday = false;
      const shouldReplayAnimation = Boolean(animationReplayKey);
      try {
        openedToday = shouldReplayAnimation ? false : window.localStorage.getItem(dailyOpenKey) === "true";
        if (shouldReplayAnimation || !openedToday) window.localStorage.setItem(dailyOpenKey, "true");
      } catch {
        openedToday = false;
      }
      dailyOpenDecision.current = { key: dailyOpenDecisionKey, shouldAnimate: shouldReplayAnimation || !openedToday };
    }

    if (!dailyOpenDecision.current.shouldAnimate) {
      const frame = window.requestAnimationFrame(() => {
        setAnimateFlow(false);
        setStage(4);
        setReady(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setReady(false);
    setStage(0);
    const frame = window.requestAnimationFrame(() => setAnimateFlow(true));
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [animationReplayKey, dailyOpenDecisionKey, dailyOpenKey]);

  useEffect(() => {
    if (!animateFlow) return undefined;
    if (stage >= 2 && prayersDone) {
      const timer = window.setTimeout(() => revealAtLeast(4), 1400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [animateFlow, prayersDone, revealAtLeast, stage]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY > 8) advanceByGesture();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", "Space"].includes(event.code)) advanceByGesture();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const startY = touchStartY.current;
      const currentY = event.touches[0]?.clientY;
      if (startY == null || currentY == null) return;
      if (startY - currentY > 12) advanceByGesture();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [advanceByGesture]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a, button, input, textarea, select, label")) return;
    advanceByGesture();
  };

  const onDevotionStatusChange = (status: { read: boolean; prayed: boolean; done: boolean }) => {
    if (!status.done || devotionDone) return;
    setDevotionDone(true);
    revealAtLeast(2);
  };

  const onTodayPrayersCompleted = () => {
    setPrayersDone(true);
    revealAtLeast(4);
  };

  const onReflectionPosted = () => {
    revealAtLeast(4);
  };

  const reflectionQuestion = localize(devotion.reflectionQuestion, locale, church.defaultLocale);
  const prayerGuide = localize(devotion.prayerGuide, locale, church.defaultLocale);
  const actionStyle = (delay: string) => ({ "--today-flow-action-delay": delay }) as CSSProperties;
  const reveal = (children: ReactNode, delayMs: number, trigger: RevealTrigger = "in-view") =>
    animateFlow ? (
      <GracefulReveal delayMs={delayMs} trigger={trigger}>
        {children}
      </GracefulReveal>
    ) : (
      children
    );

  return (
    <div
      className="today-flow min-h-[72vh] space-y-6"
      data-testid="today-flow"
      data-animate-flow={animateFlow === true ? "true" : animateFlow === false ? "false" : "pending"}
      data-animation-replay={animationReplayKey ? "true" : "false"}
      onPointerDown={onPointerDown}
    >
      {!ready || animateFlow == null ? null : (
        <>
          {animateFlow ? (
            <GracefulReveal delayMs={80}>
              <ScriptureBlock
                reference={devotion.scriptureReference}
                translation={devotion.scriptureTranslation}
                quote={localize(devotion.scriptureQuote, locale, church.defaultLocale)}
                copyrightNotice={devotion.copyrightNotice}
              />
            </GracefulReveal>
          ) : (
            <ScriptureBlock
              reference={devotion.scriptureReference}
              translation={devotion.scriptureTranslation}
              quote={localize(devotion.scriptureQuote, locale, church.defaultLocale)}
              copyrightNotice={devotion.copyrightNotice}
            />
          )}

          {animateFlow ? (
            <GracefulReveal as="section" delayMs={760} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{t("today.pastorNote")}</p>
              <h1 className="text-xl font-semibold text-ink text-balance-safe">
                {localize(devotion.title, locale, church.defaultLocale)}
              </h1>
              <p className="whitespace-pre-line leading-relaxed text-ink-soft text-balance-safe">
                {localize(devotion.body, locale, church.defaultLocale)}
              </p>
            </GracefulReveal>
          ) : (
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{t("today.pastorNote")}</p>
              <h1 className="text-xl font-semibold text-ink text-balance-safe">
                {localize(devotion.title, locale, church.defaultLocale)}
              </h1>
              <p className="whitespace-pre-line leading-relaxed text-ink-soft text-balance-safe">
                {localize(devotion.body, locale, church.defaultLocale)}
              </p>
            </section>
          )}
        </>
      )}

      {stage >= 1 ? (
        <div className="space-y-5">
          {reflectionQuestion
            ? reveal(
                <Card>
                  <CardBody>
                    <p className="text-xs font-medium uppercase tracking-wide text-sage-ink">{t("today.reflection")}</p>
                    <p className="mt-1.5 text-base text-ink text-balance-safe">{reflectionQuestion}</p>
                  </CardBody>
                </Card>,
                80,
              )
            : null}

          {prayerGuide
            ? reveal(
                <div className="rounded-2xl border border-gold/25 bg-gold-soft/40 p-5">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gold-ink">
                    <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
                    {t("today.guidedPrayer")}
                  </p>
                  <p className="font-scripture mt-1.5 text-base leading-relaxed text-ink text-balance-safe">
                    {prayerGuide}
                  </p>
                </div>,
                440,
              )
            : null}

          {reveal(
            <TodayActions
              talkToPastorLabel={talkToPastorLabel}
              churchId={church.id}
              contentId={devotion.id}
              initialRead={initialRead}
              initialPrayed={initialPrayed}
              shareHref={shareHref}
              staggered={Boolean(animateFlow)}
              showLinks={false}
              onStatusChange={onDevotionStatusChange}
            />,
            800,
          )}

          {reveal(
            <div className="flex items-center gap-3 pt-2">
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs text-muted">{t("today.softGate.gentle")}</span>
              <span className="h-px flex-1 bg-line" />
            </div>,
            1400,
          )}
        </div>
      ) : null}

      {stage >= 2
        ? reveal(
            <section className="space-y-3" data-testid="today-prayer-stage">
              {prayers.length === 0 ? (
                <EmptyState icon={HeartHandshake} title={fmt(t("prayer.empty"), { pastor: roleLabels.pastor })} />
              ) : (
                <>
                  <TodayPrayerCarousel
                    prayers={prayers}
                    church={church}
                    locale={locale}
                    prayersHref={prayersHref}
                    animate={Boolean(animateFlow)}
                    onCompleted={onTodayPrayersCompleted}
                  />
                  <div className="grid gap-2 sm:grid-cols-2" data-testid="today-prayer-links">
                    <ButtonLink
                      href={shareHref}
                      variant="secondary"
                      size="sm"
                      className={animateFlow ? "today-flow-action-item" : undefined}
                      style={animateFlow ? actionStyle("520ms") : undefined}
                    >
                      <Send className="h-4 w-4" aria-hidden />
                      {t("today.shareRequest")}
                    </ButtonLink>
                    <ButtonLink
                      href={shareHref}
                      variant="quiet"
                      size="sm"
                      className={animateFlow ? "today-flow-action-item" : undefined}
                      style={animateFlow ? actionStyle("780ms") : undefined}
                    >
                      <MessageCircleHeart className="h-4 w-4" aria-hidden />
                      {talkToPastorLabel}
                    </ButtonLink>
                  </div>
                </>
              )}
            </section>,
            80,
          )
        : null}

      {stage >= 3
        ? reveal(
            <section className="space-y-3" data-testid="today-reflection-section">
              <SectionHeading title={t("today.yourReflection")} />
              <ReflectionComposer churchId={church.id} churchSlug={church.slug} onPosted={onReflectionPosted} />
            </section>,
            80,
          )
        : null}

      {stage >= 4 && reflections.length > 0
        ? reveal(
            <section className="space-y-3" data-testid="today-recent-reflections">
              <SectionHeading title={t("today.recentReflections")} />
              {reflections.map((vm) => (
                <ReflectionCard key={vm.item.id} vm={vm} church={church} locale={locale} />
              ))}
            </section>,
            120,
          )
        : null}
    </div>
  );
}
