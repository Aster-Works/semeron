"use client";

import { useEffect, useId, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/app/lib/utils";

type MotionPattern = 1 | 2 | 3 | 4 | 5;
type RevealTrigger = "mount" | "in-view";

export const IN_VIEW_REVEAL_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: "0px 0px -32% 0px",
  threshold: 0.24,
};

function randomPattern(): MotionPattern {
  return (Math.floor(Math.random() * 5) + 1) as MotionPattern;
}

export function GracefulReveal({
  as,
  children,
  className,
  delayMs = 0,
  trigger = "mount",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delayMs?: number;
  trigger?: RevealTrigger;
}) {
  const Tag = as ?? "div";
  const revealId = useId();
  const [pattern, setPattern] = useState<MotionPattern | null>(null);

  useEffect(() => {
    let frame: number | null = null;
    if (trigger === "mount") {
      frame = window.requestAnimationFrame(() => setPattern(randomPattern()));
      return () => {
        if (frame != null) window.cancelAnimationFrame(frame);
      };
    }

    const element = document.querySelector(`[data-reveal-id="${revealId}"]`);
    if (!element || !("IntersectionObserver" in window)) {
      frame = window.requestAnimationFrame(() => setPattern(randomPattern()));
      return () => {
        if (frame != null) window.cancelAnimationFrame(frame);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        frame = window.requestAnimationFrame(() => setPattern(randomPattern()));
        observer.disconnect();
      },
      IN_VIEW_REVEAL_OPTIONS,
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [revealId, trigger]);

  return (
    <Tag
      data-reveal-id={revealId}
      className={cn(
        pattern ? `motion-pattern-${pattern} graceful-reveal-enter` : "graceful-reveal-prep",
        className,
      )}
      style={{ "--reveal-delay": `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
