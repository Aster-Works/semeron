"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { leaveChurch } from "@/app/lib/db/actions";
import { Button, Modal } from "@/app/components/ui";
import { purgePwaCaches } from "@/app/lib/pwa/cache";

/**
 * 自分の教会所属から抜ける。アカウント削除ではなく memberships.status='removed'。
 */
export function LeaveChurchButton({
  locale,
  churchId,
  churchSlug,
  churchName,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  churchName: string;
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await leaveChurch({ churchId, churchSlug, locale });
      if (!res.ok) {
        setError(errorText(res.error, ja));
        return;
      }
      const data = res.data as { nextPath?: string } | undefined;
      const nextPath = typeof data?.nextPath === "string" ? data.nextPath : `/${locale}/onboarding`;
      setOpen(false);
      await purgePwaCaches();
      router.replace(nextPath);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => { setError(null); setOpen(true); }}
        data-testid="leave-church-button"
      >
        <DoorOpen className="h-4 w-4" aria-hidden />
        {t("me.leaveChurch")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={t("me.leaveTitle")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={run}
              disabled={pending}
              data-testid="leave-church-confirm"
            >
              <DoorOpen className="h-4 w-4" aria-hidden />
              {pending ? "..." : t("me.leaveConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-ink">
          <p className="font-medium text-balance-safe">{churchName}</p>
          <p className="text-muted text-balance-safe">{t("me.leaveBody")}</p>
          {error ? <p className="text-rose-ink text-balance-safe">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}

function errorText(error: string, ja: boolean): string {
  switch (error) {
    case "last owner":
      return ja
        ? "あなたは最後のオーナーです。先に別の方へオーナーを付与してください。"
        : "You are the last owner. Grant owner to someone else first.";
    case "membership is not active":
      return ja ? "現在この教会を抜けることはできません。" : "You cannot leave this church right now.";
    default:
      return ja ? "教会を抜けられませんでした。" : "Could not leave this church.";
  }
}
