"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Locale, Localized, Role } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { languageName } from "@/app/lib/i18n/languages";
import { updateRoleLabels } from "@/app/lib/db/actions";
import { ALL_ROLES } from "@/app/lib/roleLabels";
import { Button, Card, CardBody, Input, RoleBadge } from "@/app/components/ui";

/**
 * 役割の「呼び方」エディタ（管理 > 設定・owner/pastor のみ）。
 * 権限そのものは変わらない（方針A）。空欄は標準の呼び方に戻る。
 * 例: elder を「執事」、pastor を「主事」など教会の呼称に合わせられる。
 */
export function RoleLabelsEditor({
  locale,
  churchId,
  churchSlug,
  contentLanguages,
  initial,
  canEdit,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  contentLanguages: string[];
  initial: Record<string, Localized>;
  canEdit: boolean;
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [labels, setLabels] = useState<Record<string, Record<string, string>>>(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const role of ALL_ROLES) {
      out[role] = {};
      for (const lang of contentLanguages) {
        out[role][lang] = (initial[role]?.[lang] ?? "") as string;
      }
    }
    return out;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const setLabel = (role: string, lang: string, value: string) => {
    setSaved(false);
    setLabels((prev) => ({ ...prev, [role]: { ...prev[role], [lang]: value } }));
  };

  const save = () => {
    setError(false);
    startTransition(async () => {
      const res = await updateRoleLabels({ churchId, churchSlug, locale, labels });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("settings.roleLabels")}</h3>
          <p className="mt-1 text-xs text-muted text-balance-safe">{t("settings.roleLabelsHint")}</p>
        </div>

        <div className="space-y-2.5">
          {ALL_ROLES.map((role) => (
            <div
              key={role}
              className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center"
            >
              <div className="flex w-40 shrink-0 items-center gap-2">
                <RoleBadge role={role as Role} locale={locale} />
                {role === "owner" ? (
                  <span className="text-[10px] text-muted">{ja ? "必須" : "required"}</span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                {contentLanguages.map((lang) => (
                  <div key={lang} className="min-w-36 flex-1">
                    <Input
                      value={labels[role]?.[lang] ?? ""}
                      onChange={(e) => setLabel(role, lang, e.target.value)}
                      maxLength={20}
                      disabled={!canEdit || pending}
                      placeholder={
                        contentLanguages.length > 1
                          ? languageName(lang)
                          : ja
                            ? "標準のまま"
                            : "Default"
                      }
                      aria-label={`${role} (${lang})`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="flex items-center justify-end gap-3">
            {saved ? (
              <span className="flex items-center gap-1 text-xs text-sage-ink">
                <Check className="h-3.5 w-3.5" aria-hidden />
                {ja ? "保存しました" : "Saved"}
              </span>
            ) : null}
            {error ? <span className="text-xs text-rose-ink">{t("assist.error")}</span> : null}
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "…" : t("common.save")}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted">
            {ja ? "変更はオーナー・牧師のみ行えます。" : "Only owners and pastors can change these."}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
