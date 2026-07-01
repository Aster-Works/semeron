"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { deleteDevotion } from "@/app/lib/db/actions";
import { Button, Modal } from "@/app/components/ui";

/**
 * デボーション削除（一覧の各行）。確認モーダル必須・不可逆の明示。
 * RLS(content_delete)=作者本人 or 教会管理者がサーバー側の権威。
 */
export function DeleteDevotionButton({
  churchId,
  churchSlug,
  contentId,
  label,
  fullWidth = false,
}: {
  churchId: string;
  churchSlug: string;
  contentId: string;
  /** モーダルに表示する識別ラベル（タイトル・日付など）。 */
  label: string;
  fullWidth?: boolean;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(false);
    startTransition(async () => {
      const res = await deleteDevotion({
        churchId,
        churchSlug,
        locale: locale as Locale,
        contentId,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        fullWidth={fullWidth}
        onClick={() => setOpen(true)}
        aria-label={`${t("devotions.delete")}: ${label}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {t("devotions.delete")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={t("devotions.deleteTitle")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={run} disabled={pending}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {pending ? "…" : t("devotions.deleteConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-ink">
          <p className="font-medium text-balance-safe">{label}</p>
          <p className="text-muted text-balance-safe">{t("devotions.deleteBody")}</p>
          {error ? <p className="text-rose-ink">{t("devotions.deleteError")}</p> : null}
        </div>
      </Modal>
    </>
  );
}
