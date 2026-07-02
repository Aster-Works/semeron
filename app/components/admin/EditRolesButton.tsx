"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import type { Locale, Role } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { updateMemberRoles } from "@/app/lib/db/actions";
import { Button, Modal } from "@/app/components/ui";

const ROLE_OPTIONS: Role[] = [
  "owner", "pastor", "elder", "staff", "prayer_team", "group_leader", "member", "guest",
];

/**
 * メンバーの役割編集（owner/pastor のみ表示・サーバー側でも再確認）。
 * 最後のオーナーから owner を外す操作はサーバーが拒否する。
 */
export function EditRolesButton({
  locale,
  churchId,
  churchSlug,
  membershipId,
  memberName,
  currentRoles,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  membershipId: string;
  memberName: string;
  currentRoles: Role[];
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set(currentRoles));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (role: string) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateMemberRoles({
        churchId,
        churchSlug,
        locale,
        membershipId,
        roles: [...roles],
      });
      if (!res.ok) {
        setError(
          res.error === "last owner"
            ? ja
              ? "この方は最後のオーナーです。先に別の方へオーナーを付与してください。"
              : "This is the last owner. Grant owner to someone else first."
            : t("assist.error"),
        );
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setRoles(new Set(currentRoles)); setError(null); setOpen(true); }}>
        <KeyRound className="h-4 w-4" aria-hidden />
        {t("members.editRoles")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={`${t("members.editRoles")} — ${memberName}`}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "…" : t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-muted text-balance-safe">{t("members.editRolesHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm hover:bg-mist/50"
              >
                <input
                  type="checkbox"
                  checked={roles.has(role)}
                  onChange={() => toggle(role)}
                  className="h-4 w-4 accent-[var(--color-sage-strong)]"
                />
                <span className="text-ink">{t(`role.${role}`)}</span>
              </label>
            ))}
          </div>
          {error ? <p className="text-sm text-rose-ink text-balance-safe">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
