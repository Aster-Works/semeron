"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GracefulReveal } from "./GracefulReveal";
import {
  dailyOpenCookieName,
  readDailyOpenFlag,
  todayDailyOpenKey,
  writeDailyOpenFlag,
} from "./todayDailyAnimation";

export function TodayPrayerPreviewFlow({
  churchId,
  todayKey,
  animationReplayKey,
  children,
}: {
  churchId: string;
  todayKey: string;
  animationReplayKey?: string;
  children: ReactNode;
}) {
  const dailyOpenKey = todayDailyOpenKey(churchId, todayKey);
  const dailyOpenCookieKey = dailyOpenCookieName(dailyOpenKey);
  const dailyOpenDecisionKey = animationReplayKey
    ? `${dailyOpenKey}:replay:${animationReplayKey}`
    : dailyOpenKey;
  const [animateFlow, setAnimateFlow] = useState<boolean | null>(null);
  const dailyOpenDecision = useRef<{ key: string; shouldAnimate: boolean } | null>(null);

  useEffect(() => {
    if (dailyOpenDecision.current?.key !== dailyOpenDecisionKey) {
      const shouldReplayAnimation = Boolean(animationReplayKey);
      const openedToday = shouldReplayAnimation ? false : readDailyOpenFlag(dailyOpenKey, dailyOpenCookieKey);
      if (shouldReplayAnimation || !openedToday) writeDailyOpenFlag(dailyOpenKey, dailyOpenCookieKey);
      dailyOpenDecision.current = { key: dailyOpenDecisionKey, shouldAnimate: shouldReplayAnimation || !openedToday };
    }

    const frame = window.requestAnimationFrame(() => {
      setAnimateFlow(dailyOpenDecision.current?.shouldAnimate ?? false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [animationReplayKey, dailyOpenCookieKey, dailyOpenDecisionKey, dailyOpenKey]);

  return (
    <div
      data-testid="today-prayer-preview-flow"
      data-animate-flow={animateFlow === true ? "true" : animateFlow === false ? "false" : "pending"}
      data-animation-replay={animationReplayKey ? "true" : "false"}
    >
      {animateFlow == null ? null : animateFlow ? <GracefulReveal delayMs={140}>{children}</GracefulReveal> : children}
    </div>
  );
}
