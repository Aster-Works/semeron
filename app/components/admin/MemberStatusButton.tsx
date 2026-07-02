"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { setMemberStatus } from "@/app/lib/db/actions";
import { Button, Modal } from "@/app/components/ui";

type Status = "invited" | "active" | "inactive" | "removed";

/**
 * メンバーの休止/復帰。Auth user は消さず、memberships.status だけを切り替える。
 * 休止されたメンバーは active membership を失うため、教会スペースへ入れなくなる。
 */
export function MemberStatusButton({
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

  if (status !== "active" && status !== "inactive") return null;

  const suspending = status === "active";
  const nextStatus = suspending ? "inactive" : "active";
  const title = suspending ? t("members.suspendTitle") : t("members.restoreTitle");
  const body = suspending ? t("members.suspendBody") : t("members.restoreBody");
  const confirm = suspending ? t("members.suspendConfirm") : t("members.restoreConfirm");
  const Icon = suspending ? UserX : UserCheck;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await setMemberStatus({
        churchId,
        churchSlug,
        locale,
        membershipId,
        status: nextStatus,
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
        variant={suspending ? "danger" : "secondary"}
        size="sm"
        onClick={() => { setError(null); setOpen(true); }}
        disabled={suspending && isSelf}
        title={suspending && isSelf ? t("members.suspendSelf") : undefined}
        data-testid={`member-status-${membershipId}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {suspending ? t("members.suspend") : t("members.restore")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={title}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={suspending ? "danger" : "primary"}
              onClick={run}
              disabled={pending}
              data-testid="member-status-confirm"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {pending ? "..." : confirm}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-ink">
          <p className="font-medium text-balance-safe">{memberName}</p>
          <p className="text-muted text-balance-safe">{body}</p>
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
    case "cannot suspend self":
      return ja ? "自分自身は休止できません。" : "You cannot suspend yourself.";
    case "member removed":
      return ja ? "削除済みのメンバーは復帰できません。" : "Removed members cannot be restored.";
    default:
      return ja ? "状態を変更できませんでした。" : "Could not update this member.";
  }
}
