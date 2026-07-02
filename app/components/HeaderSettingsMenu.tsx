"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings, UserRound, X } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import { signOut } from "@/app/lib/db/actions";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import { ThemeSelect } from "@/app/components/ThemeSelect";
import { cn } from "@/app/lib/utils";

/**
 * ヘッダー右上の歯車 →「設定」メニュー。
 * - 表示言語(ja/en)の切替
 * - 管理⇄会員の切替（管理権限がある場合のみ表示＝実運用と同じ挙動）
 * デモの視点(ペルソナ)・教会切替は DemoBar 側に残す。
 */
export function HeaderSettingsMenu({
  locale,
  churchSlug,
  section,
  personaId,
  canAdmin,
}: {
  locale: Locale;
  churchSlug: string;
  section: "member" | "admin";
  personaId?: string;
  canAdmin: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const qs = personaId ? `?as=${personaId}` : "";

  const doSignOut = () =>
    startTransition(async () => {
      await signOut();
      router.push(`/${locale}/login`);
      router.refresh();
    });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("settings.menu")}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-mist hover:text-ink",
          open && "bg-mist text-ink",
        )}
      >
        <Settings className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-sm font-semibold text-ink">{t("settings.menu")}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              className="rounded-lg p-1 text-muted hover:bg-mist hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="space-y-1 border-t border-line pt-2">
            <div className="flex items-center justify-between gap-3 px-1 py-1.5">
              <span className="text-sm text-ink-soft">{t("me.language")}</span>
              <LocaleSwitcher />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 py-1.5">
              <span className="text-sm text-ink-soft">{t("settings.theme")}</span>
              <ThemeSelect />
            </div>
          </div>

          {canAdmin ? (
            <div className="mt-1 border-t border-line pt-2">
              {section === "member" ? (
                <Link
                  href={`/${locale}/admin/${churchSlug}${qs}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-mist"
                >
                  <LayoutDashboard className="h-4 w-4 text-sage-ink" aria-hidden />
                  {t("settings.goAdmin")}
                </Link>
              ) : (
                <Link
                  href={`/${locale}/church/${churchSlug}/today${qs}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-mist"
                >
                  <UserRound className="h-4 w-4 text-sage-ink" aria-hidden />
                  {t("settings.goMember")}
                </Link>
              )}
            </div>
          ) : null}

          <div className="mt-1 border-t border-line pt-2">
            <button
              type="button"
              onClick={doSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-mist"
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden />
              {locale === "ja" ? "ログアウト" : "Log out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

