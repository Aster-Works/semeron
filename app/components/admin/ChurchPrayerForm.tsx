"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Church, Send } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { submitChurchPrayerRequest } from "@/app/lib/db/actions";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { Button, Callout, Card, CardBody, Field, Input, Textarea } from "@/app/components/ui";

/** 教会公式の祈祷課題の入力フォーム（owner/pastor 限定・即時公開）。 */
export function ChurchPrayerForm({
  locale,
  churchId,
  churchSlug,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setDone(false);
    setError(false);
    startTransition(async () => {
      const res = await submitChurchPrayerRequest({
        churchId,
        churchSlug,
        locale,
        title,
        body,
        expiresAt: expiresAt || null,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setTitle("");
      setBody("");
      setExpiresAt("");
      setDone(true);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Church className="h-4 w-4" aria-hidden />
            {t("churchPrayer.formTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted text-balance-safe">{t("churchPrayer.formNote")}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <Field label={t("churchPrayer.titleLabel")} htmlFor="church-prayer-title" required>
            <Input
              id="church-prayer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("churchPrayer.titlePlaceholder")}
              maxLength={200}
              required
            />
          </Field>
          <Field label={t("churchPrayer.bodyLabel")} htmlFor="church-prayer-body" required>
            <Textarea
              id="church-prayer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={8000}
              required
            />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("churchPrayer.expiresLabel")} htmlFor="church-prayer-expires">
              <Input
                id="church-prayer-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={pending || !title.trim() || !body.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              {t("churchPrayer.submit")}
            </Button>
          </div>
        </form>
        {done ? <Callout tone="sage">{t("churchPrayer.success")}</Callout> : null}
        {error ? <Callout tone="rose">{t("churchPrayer.error")}</Callout> : null}
      </CardBody>
    </Card>
  );
}
