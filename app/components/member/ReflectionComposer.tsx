"use client";

import { useState, useTransition } from "react";
import { Check, PenLine } from "lucide-react";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { postReflection } from "@/app/lib/db/actions";
import { Button, Callout, Card, CardBody, Textarea } from "@/app/components/ui";

/**
 * デボーション後の短い応答。postReflection で即時公開（会員の応答は非モデレーション）。
 */
export function ReflectionComposer({
  churchId,
  churchSlug,
  devotionContentId,
  onPosted,
}: {
  churchId: string;
  churchSlug: string;
  devotionContentId: string;
  onPosted?: () => void;
}) {
  const { t, locale } = useLocale();
  const [value, setValue] = useState("");
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await postReflection(churchId, churchSlug, locale, value.trim(), devotionContentId);
      if (res.ok) {
        setPosted(true);
        onPosted?.();
      } else {
        setError(res.error);
      }
    });
  };

  if (posted) {
    return (
      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-sage-ink">
          <Check className="h-4 w-4" aria-hidden />
          {t("today.reflectionNote")}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <PenLine className="h-4 w-4 text-sage-ink" aria-hidden />
          {t("today.yourReflection")}
        </div>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("today.reflectionPlaceholder")}
          rows={3}
        />
        {error ? <Callout tone="rose">{error}</Callout> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted text-balance-safe">{t("today.reflectionNote")}</p>
          <Button
            size="sm"
            className="w-full shrink-0 whitespace-nowrap sm:w-auto"
            disabled={value.trim().length === 0 || pending}
            onClick={submit}
          >
            {t("today.reflectionPost")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
