"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { markAllNotificationsRead, markNotificationRead } from "@/app/lib/db/actions";
import { Button, Card, CardBody } from "@/app/components/ui";

export interface InboxItemVM {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
  read: boolean;
}

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
  const [pending, startTransition] = useTransition();

  const isRead = (it: InboxItemVM) => it.read || readIds.has(it.id);
  const anyUnread = items.some((it) => !isRead(it));

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
    setReadIds(new Set(items.map((it) => it.id))); // 楽観的
    startTransition(async () => {
      await markAllNotificationsRead({ churchId, churchSlug, locale });
      window.dispatchEvent(new Event("semeron:unread-refresh"));
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {anyUnread ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={readAll} disabled={pending}>
            <CheckCheck className="h-4 w-4" aria-hidden />
            {t("inbox.markAllRead")}
          </Button>
        </div>
      ) : null}

      {items.map((n) => {
        const read = isRead(n);
        return (
          <Card key={n.id}>
            <button
              type="button"
              onClick={() => readOne(n.id, read)}
              aria-label={read ? undefined : t("inbox.tapToRead")}
              className="w-full text-left disabled:cursor-default"
              disabled={read}
            >
              <CardBody className="flex items-start gap-3">
                <span
                  className={
                    read
                      ? "mt-1.5 h-2 w-2 shrink-0"
                      : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage"
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
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
                    <time className="shrink-0 text-xs text-muted">{n.dateLabel}</time>
                  </div>
                  {n.body ? (
                    <p className="text-sm text-muted text-balance-safe">{n.body}</p>
                  ) : null}
                </div>
              </CardBody>
            </button>
          </Card>
        );
      })}
    </div>
  );
}
