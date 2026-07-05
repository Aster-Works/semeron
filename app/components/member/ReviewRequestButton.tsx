"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { requestAdminReview } from "@/app/lib/db/actions";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";

export function ReviewRequestButton({
  churchId,
  churchSlug,
  locale,
  contentId,
  alreadyRequested = false,
}: {
  churchId: string;
  churchSlug: string;
  locale: Locale;
  contentId: string;
  alreadyRequested?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [requested, setRequested] = useState(alreadyRequested);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const request = () => {
    setError(false);
    startTransition(async () => {
      const res = await requestAdminReview({ churchId, churchSlug, locale, contentId });
      if (!res.ok) {
        setError(true);
        return;
      }
      setRequested(true);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={request}
        disabled={pending || requested}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-60"
      >
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
        {requested ? t("prayer.reviewRequested") : t("prayer.requestReview")}
      </button>
      {error ? <span className="text-xs text-rose-ink">{t("prayer.reviewRequestError")}</span> : null}
    </div>
  );
}
