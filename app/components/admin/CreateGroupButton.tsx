"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { createGroup } from "@/app/lib/db/actions";
import { Button, Field, Input, Modal, Textarea } from "@/app/components/ui";

/** グループ作成（管理 > グループ）。名前は教会の主言語キーで保存する。 */
export function CreateGroupButton({
  locale,
  churchId,
  churchSlug,
  primaryLang,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  primaryLang: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(false);
    startTransition(async () => {
      const res = await createGroup({
        churchId,
        churchSlug,
        locale,
        primaryLang,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
    });
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("groupsAdmin.create")}
      </Button>

      <Modal
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title={t("groupsAdmin.create")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim()}>
              {pending ? "…" : t("groupsAdmin.createConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={t("groupsAdmin.nameLabel")} htmlFor="grp-name" required>
            <Input id="grp-name" value={name} maxLength={80} required
              onChange={(e) => setName(e.target.value)}
              placeholder={locale === "ja" ? "例: 火曜祈り会" : "e.g. Tuesday Prayer"} />
          </Field>
          <Field label={t("groupsAdmin.descLabel")} htmlFor="grp-desc">
            <Textarea id="grp-desc" value={description} rows={2}
              onChange={(e) => setDescription(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-rose-ink">{t("assist.error")}</p> : null}
        </div>
      </Modal>
    </>
  );
}
