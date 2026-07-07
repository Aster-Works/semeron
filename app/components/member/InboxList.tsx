"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, EyeOff } from "lucide-react";
import type { Locale, NotificationCategory } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { markAllNotificationsRead, markNotificationRead, muteNotification } from "@/app/lib/db/actions";
import { Button, Badge, Card, CardBody } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

export interface InboxItemVM {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
  read: boolean;
  category: NotificationCategory;
}

type InboxFilter = "all" | "today" | "prayer" | "admin" | "social";

// 既読は非表示のため「未読」フィルタは廃止（すべて未読なので冗長）。
const FILTERS: InboxFilter[] = ["all", "today", "prayer", "admin", "social"];

/**
 * 受信箱の一覧。タップで1件を既読、「すべて既読にする」で全既読（本人のみ）。
 * モバイルはカードのスワイプ操作: 右=既読 / 左=非表示（ボタンはa11y・デスクトップ用に残す）。
 * 楽観的更新（即座に点を消す）＋ サーバー確定後 router.refresh でタブの未読バッジも更新。
 */
export function InboxList({
  locale,
  churchId,
  churchSlug,
  items,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  items: InboxItemVM[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [muteError, setMuteError] = useState(false);
  const [pending, startTransition] = useTransition();

  const isRead = (it: InboxItemVM) => it.read || readIds.has(it.id);
  const visibleItems = items.filter((it) => !hiddenIds.has(it.id));
  const filteredItems = visibleItems.filter((it) => {
    if (filter === "all") return true;
    return it.category === filter;
  });
  const anyUnread = visibleItems.some((it) => !isRead(it));

  const readOne = (id: string, alreadyRead: boolean) => {
    if (alreadyRead) return;
    setReadIds((prev) => new Set(prev).add(id)); // 楽観的
    startTransition(async () => {
      await markNotificationRead({ churchSlug, locale, notificationId: id });
      window.dispatchEvent(new Event("semeron:unread-refresh"));
      router.refresh();
    });
  };

  const readAll = () => {
    setReadIds(new Set(visibleItems.map((it) => it.id))); // 楽観的
    startTransition(async () => {
      await markAllNotificationsRead({ churchId, churchSlug, locale });
      window.dispatchEvent(new Event("semeron:unread-refresh"));
      router.refresh();
    });
  };

  const muteOne = (id: string) => {
    setMuteError(false);
    setHiddenIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await muteNotification({ churchSlug, locale, notificationId: id });
      if (!res.ok) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setMuteError(true);
        return;
      }
      window.dispatchEvent(new Event("semeron:unread-refresh"));
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={
                filter === value
                  ? "rounded-full border border-sage/40 bg-sage-soft px-3 py-1.5 text-xs font-medium text-sage-ink"
                  : "rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              }
            >
              {t(`inbox.filter.${value}` as never)}
            </button>
          ))}
        </div>
        {anyUnread ? (
          <Button variant="ghost" size="sm" onClick={readAll} disabled={pending}>
            <CheckCheck className="h-4 w-4" aria-hidden />
            {t("inbox.markAllRead")}
          </Button>
        ) : null}
      </div>

      {/* スワイプ操作の案内はタッチ端末（狭幅）だけに出す */}
      {filteredItems.length > 0 ? (
        <p className="text-xs text-muted sm:hidden">{t("inbox.swipeHint")}</p>
      ) : null}

      {muteError ? <p className="text-xs text-rose-ink">{t("inbox.muteError")}</p> : null}

      {filteredItems.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted">{t("inbox.noneInFilter")}</p>
          </CardBody>
        </Card>
      ) : null}

      {filteredItems.map((n) => {
        const read = isRead(n);
        return (
          <SwipeRow
            key={n.id}
            canMarkRead={!read}
            onMarkRead={() => readOne(n.id, read)}
            onHide={() => muteOne(n.id)}
            readLabel={t("inbox.swipeRead")}
            hideLabel={t("inbox.mute")}
          >
            <Card>
              <CardBody className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => readOne(n.id, read)}
                  aria-label={read ? undefined : t("inbox.tapToRead")}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                  disabled={read}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        read
                          ? "mt-1.5 h-2 w-2 shrink-0"
                          : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage"
                      }
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone="neutral">{t(`notificationCategory.${n.category}` as never)}</Badge>
                        <time className="shrink-0 text-xs text-muted">{n.dateLabel}</time>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <p
                          className={
                            read
                              ? "text-sm text-ink-soft text-balance-safe"
                              : "text-sm font-medium text-ink text-balance-safe"
                          }
                        >
                          {n.title}
                        </p>
                      </div>
                      {n.body ? (
                        <p className="text-sm text-muted text-balance-safe">{n.body}</p>
                      ) : null}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => muteOne(n.id)}
                  disabled={pending}
                  className="rounded-lg p-2 text-muted hover:bg-mist hover:text-ink disabled:opacity-50"
                  aria-label={t("inbox.mute")}
                  title={t("inbox.mute")}
                >
                  <EyeOff className="h-4 w-4" aria-hidden />
                </button>
              </CardBody>
            </Card>
          </SwipeRow>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * スワイプ操作（タッチ専用）。右=既読 / 左=非表示。
 *  - 方向ロック: 縦優勢なら何もしない（touch-pan-y でスクロールを妨げない）
 *  - 閾値超えで軽いハプティクス、離すと確定。未満はスナップバック
 *  - 既読不可（既に既読）の右スワイプは強い抵抗で「効かない」ことを伝える
 *  - prefers-reduced-motion ではアニメーションせず即時確定
 *  - 同じ操作はカード内ボタンでも可能（キーボード・デスクトップのフォールバック）
 * ───────────────────────────────────────────────────────────────────────── */

const SWIPE_THRESHOLD = 88;

function SwipeRow({
  canMarkRead,
  onMarkRead,
  onHide,
  readLabel,
  hideLabel,
  children,
}: {
  canMarkRead: boolean;
  onMarkRead: () => void;
  onHide: () => void;
  readLabel: string;
  hideLabel: string;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false); // 指を離した後のアニメーション中
  const [exiting, setExiting] = useState(false);
  const dxRef = useRef(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"h" | "v" | null>(null);
  const crossed = useRef(false);
  const swiped = useRef(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const reduceMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setOffset = (value: number) => {
    dxRef.current = value;
    setDx(value);
  };

  // 右スワイプは既読できるときだけ。閾値超は減速（ゴム感）で行き止まりを伝える。
  const clampOffset = (raw: number) => {
    const limited = raw > 0 && !canMarkRead ? raw / 4 : raw;
    const abs = Math.abs(limited);
    const eased =
      abs > SWIPE_THRESHOLD ? SWIPE_THRESHOLD + (abs - SWIPE_THRESHOLD) * 0.5 : abs;
    return Math.sign(limited) * Math.min(eased, SWIPE_THRESHOLD * 1.6);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (exiting) return;
    const touch = e.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
    axis.current = null;
    crossed.current = false;
    swiped.current = false;
    setSettling(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current || exiting) return;
    const touch = e.touches[0];
    const rawDx = touch.clientX - start.current.x;
    const rawDy = touch.clientY - start.current.y;
    if (!axis.current) {
      if (Math.abs(rawDx) < 10 && Math.abs(rawDy) < 10) return;
      axis.current = Math.abs(rawDx) > Math.abs(rawDy) ? "h" : "v";
    }
    if (axis.current !== "h") return;
    swiped.current = true;
    const next = clampOffset(rawDx);
    const past = Math.abs(next) >= SWIPE_THRESHOLD && (next < 0 || canMarkRead);
    if (past && !crossed.current) {
      crossed.current = true;
      navigator.vibrate?.(10);
    }
    if (!past) crossed.current = false;
    setOffset(next);
  };

  const finish = () => {
    if (!start.current || exiting) return;
    start.current = null;
    if (axis.current !== "h") return;
    const current = dxRef.current;
    const past = Math.abs(current) >= SWIPE_THRESHOLD;
    setSettling(true);
    if (past && current < 0) {
      // 非表示: 左へ滑り出てから確定（reduced-motion は即時）
      if (reduceMotion()) {
        setOffset(0);
        onHide();
      } else {
        setExiting(true);
        setOffset(-(rowRef.current?.offsetWidth ?? 480));
        window.setTimeout(onHide, 200);
      }
      return;
    }
    if (past && current > 0 && canMarkRead) onMarkRead();
    setOffset(0);
  };

  const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);

  return (
    <div ref={rowRef} className="relative">
      {/* 背面のアクション表示（スワイプ中だけ見える） */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-between overflow-hidden rounded-2xl px-5",
          dx > 0 ? "bg-sage-soft" : dx < 0 ? "bg-mist" : "bg-transparent",
        )}
      >
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage-ink"
          style={{ opacity: dx > 8 ? progress : 0 }}
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          {readLabel}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-ink"
          style={{ opacity: dx < -8 ? progress : 0 }}
        >
          {hideLabel}
          <EyeOff className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div
        className={cn("touch-pan-y", (settling || exiting) && "transition-transform duration-200 ease-out")}
        style={dx !== 0 || settling ? { transform: `translateX(${dx}px)` } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={finish}
        onTouchCancel={finish}
        onClickCapture={(e) => {
          // 横スワイプ直後の誤タップ（クリック発火）を抑止
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
