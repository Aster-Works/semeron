"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, HeartHandshake, Sunrise, User, Users, type LucideIcon } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import type { MessageId } from "@/app/lib/i18n";
import { cn } from "@/app/lib/utils";

export type MemberTab = "today" | "prayer" | "groups" | "inbox" | "me";

const TABS: { key: MemberTab; path: string; icon: LucideIcon; label: MessageId }[] = [
  { key: "today", path: "today", icon: Sunrise, label: "nav.today" },
  { key: "prayer", path: "prayers", icon: HeartHandshake, label: "nav.prayer" },
  { key: "groups", path: "groups", icon: Users, label: "nav.groups" },
  { key: "inbox", path: "inbox", icon: Bell, label: "nav.inbox" },
  { key: "me", path: "me", icon: User, label: "nav.me" },
];

/** モバイルファーストの下部ナビ。達成感を煽らない静かなバッジのみ。 */
export function MemberTabBar({
  locale,
  churchSlug,
  personaId,
  unread = 0,
}: {
  locale: Locale;
  churchSlug: string;
  personaId?: string;
  unread?: number;
}) {
  const { t } = useLocale();
  const pathname = usePathname();
  const qs = personaId ? `?as=${personaId}` : "";
  // /{locale}/church/{slug}/{segment}/... の segment からアクティブタブを導出。
  // シェルは layout に常駐するため、props ではなく現在の URL から判定する。
  const segment = pathname.split("/")[4] ?? "today";
  const active: MemberTab =
    TABS.find((tab) => tab.path === segment)?.key ?? "today";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-safe"
      aria-label={locale === "ja" ? "メインナビ" : "Main navigation"}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const Icon = tab.icon;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={`/${locale}/church/${churchSlug}/${tab.path}${qs}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] items-center justify-center px-1 py-1.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-sage-ink" : "text-muted hover:text-ink",
                )}
              >
                <span className="flex translate-y-[5px] flex-col items-center gap-0.5">
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden />
                    {tab.key === "inbox" && unread > 0 ? (
                      <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                  <span>{t(tab.label)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
