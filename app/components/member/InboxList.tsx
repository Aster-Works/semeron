"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, EyeOff } from "lucide-react";
import type { Locale, NotificationCategory } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { markAllNotificationsRead, markNotificationRead, muteNotification } from "@/app/lib/db/actions";
import { Button, Badge, Card, CardBody } from "@/app/components/ui";

export interface InboxItemVM {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
  read: boolean;
  category: NotificationCategory;
}

type InboxFilter = "all" | "unread" | "today" | "prayer" | "admin" | "social";

const FILTERS: InboxFilter[] = ["all", "unread", "today", "prayer", "admin", "social"];

/**
 * 受信箱の一覧。タップで1件を既読、「すべて既読にする」で全既読（本人のみ）。
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
    if (filter === "unread") return !isRead(it);
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
          <Card key={n.id}>
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
        );
      })}
    </div>
  );
}
