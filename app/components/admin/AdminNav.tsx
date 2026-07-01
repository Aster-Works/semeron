"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  HeartHandshake,
  LayoutDashboard,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import type { MessageId } from "@/app/lib/i18n";
import { cn } from "@/app/lib/utils";

export type AdminSection =
  | "dashboard"
  | "devotions"
  | "prayers"
  | "groups"
  | "members"
  | "notifications"
  | "settings";

const ITEMS: { key: AdminSection; path: string; icon: LucideIcon; label: MessageId }[] = [
  { key: "dashboard", path: "", icon: LayoutDashboard, label: "adminNav.dashboard" },
  { key: "devotions", path: "devotions", icon: BookOpen, label: "adminNav.devotions" },
  { key: "prayers", path: "prayer-requests", icon: HeartHandshake, label: "adminNav.prayerRequests" },
  { key: "groups", path: "groups", icon: Users, label: "adminNav.groups" },
  { key: "members", path: "members", icon: UserRound, label: "adminNav.members" },
  { key: "notifications", path: "notifications", icon: Bell, label: "adminNav.notifications" },
  { key: "settings", path: "settings", icon: Settings, label: "adminNav.settings" },
];

export function AdminNav({
  locale,
  churchSlug,
  active,
  personaId,
  orientation,
}: {
  locale: Locale;
  churchSlug: string;
  active: AdminSection;
  personaId?: string;
  orientation: "vertical" | "horizontal";
}) {
  const { t } = useLocale();
  const qs = personaId ? `?as=${personaId}` : "";
  const hrefFor = (path: string) =>
    `/${locale}/admin/${churchSlug}${path ? `/${path}` : ""}${qs}`;

  return (
    <ul
      className={cn(
        orientation === "vertical"
          ? "space-y-1"
          : "flex gap-1 overflow-x-auto pb-1",
      )}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        const Icon = item.icon;
        return (
          <li key={item.key} className={orientation === "horizontal" ? "shrink-0" : ""}>
            <Link
              href={hrefFor(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                orientation === "horizontal" && "whitespace-nowrap",
                isActive
                  ? "bg-sage-soft text-sage-ink"
                  : "text-ink-soft hover:bg-mist",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {t(item.label)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
