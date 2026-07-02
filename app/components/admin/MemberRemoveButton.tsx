"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { removeMemberFromChurch } from "@/app/lib/db/actions";
import { Button, Modal } from "@/app/components/ui";

type Status = "invited" | "active" | "inactive" | "removed";

/**
 * 教会所属から外す。Auth user や履歴は削除せず、memberships.status='removed' にする。
 */
export function MemberRemoveButton({
  locale,
  churchId,
  churchSlug,
  membershipId,
  memberName,
  status,
  isSelf,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  membershipId: string;
  memberName: string;
  status: Status;
  isSelf: boolean;
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "removed") return null;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await removeMemberFromChurch({
        churchId,
        churchSlug,
        locale,
        membershipId,
      });
      if (!res.ok) {
        setError(errorText(res.error, ja));
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
        onClick={() => { setError(null); setOpen(true); }}
        disabled={isSelf}
        title={isSelf ? t("members.removeSelf") : undefined}
      >
        <UserMinus className="h-4 w-4" aria-hidden />
        {t("members.removeFromChurch")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={t("members.removeTitle")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={run} disabled={pending}>
              <UserMinus className="h-4 w-4" aria-hidden />
              {pending ? "..." : t("members.removeConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-ink">
          <p className="font-medium text-balance-safe">{memberName}</p>
          <p className="text-muted text-balance-safe">{t("members.removeBody")}</p>
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
        ? "この方は最後のオーナーです。先に別の方へオーナーを付与してください。"
        : "This is the last owner. Grant owner to someone else first.";
    case "use leave church to remove yourself":
      return ja
        ? "自分自身は管理画面から外せません。自分ページの「教会を抜ける」を使ってください。"
        : "You cannot remove yourself here. Use Leave church on your Me page.";
    case "owner/pastor role required":
      return ja ? "この操作にはオーナーまたは牧師の権限が必要です。" : "Owner or pastor role is required.";
    case "member not found":
      return ja ? "対象メンバーが見つかりません。" : "Member was not found.";
    default:
      return ja ? "教会から外せませんでした。" : "Could not remove this member from the church.";
  }
}
