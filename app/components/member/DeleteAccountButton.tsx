"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { deleteMyAccount } from "@/app/lib/db/actions";
import { Button, Field, Input, Modal } from "@/app/components/ui";
import { purgePwaCaches } from "@/app/lib/pwa/cache";

const CONFIRM_TEXT = "DELETE";

/**
 * ログイン主体を削除し、Semeron側のmembership識別子を匿名化する。
 * 教会履歴そのものは消さない。
 */
export function DeleteAccountButton({ locale }: { locale: Locale }) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmed = confirm.trim() === CONFIRM_TEXT;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setConfirm("");
    setError(null);
  };

  const run = () => {
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMyAccount({ locale });
      if (!res.ok) {
        setError(errorText(res.error, ja));
        return;
      }
      await purgePwaCaches();
      router.replace(`/${locale}/login`);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)} data-testid="delete-account-button">
        <Trash2 className="h-4 w-4" aria-hidden />
        {t("me.deleteAccount")}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={t("me.deleteTitle")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={close} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={run}
              disabled={pending || !confirmed}
              data-testid="delete-account-confirm"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {pending ? "..." : t("me.deleteConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-ink">
          <p className="text-muted text-balance-safe">{t("me.deleteBody")}</p>
          <Field
            label={t("me.deleteTypeLabel")}
            htmlFor="delete-account-confirm"
            hint={t("me.deleteTypeHint")}
          >
            <Input
              id="delete-account-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              inputMode="text"
              placeholder={CONFIRM_TEXT}
              data-testid="delete-account-confirm-input"
            />
          </Field>
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
        ? "あなたが最後のオーナーになっている教会があります。先に別の方へオーナーを付与してください。"
        : "You are the last owner of a church. Grant owner to someone else first.";
    case "not signed in":
      return ja ? "ログイン状態を確認できませんでした。" : "Could not confirm your signed-in account.";
    default:
      return ja ? "アカウントを削除できませんでした。" : "Could not delete your account.";
  }
}
