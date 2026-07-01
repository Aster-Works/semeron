import type { Church, Locale, Viewer } from "@/app/lib/demo/types";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { localize } from "@/app/lib/i18n";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { getUnreadInboxCount } from "@/app/lib/db/queries";
import { HeaderSettingsMenu } from "@/app/components/HeaderSettingsMenu";
import { MemberTabBar, type MemberTab } from "./MemberTabBar";

/**
 * 会員体験の外殻（スマホファースト・中央 max-w-2xl 一列）。
 * DemoBar は廃止し、実ユーザーのヘッダ（教会名 + 設定/サインアウト）に置き換え。
 */
export async function MemberShell({
  locale,
  church,
  viewer,
  active,
  children,
}: {
  locale: Locale;
  church: Church;
  viewer: Viewer;
  active: MemberTab;
  children: React.ReactNode;
}) {
  const canAdmin = isChurchAdmin(viewer);
  const supabase = await createServerSupabase();
  const unread = await getUnreadInboxCount(supabase, viewer);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-surface/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {localize(church.name, locale, church.defaultLocale)}
            </p>
            {viewer.membership ? (
              <p className="truncate text-xs text-muted">{viewer.membership.displayName}</p>
            ) : null}
          </div>
          <HeaderSettingsMenu
            locale={locale}
            churchSlug={church.slug}
            section="member"
            canAdmin={canAdmin}
          />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-4 pb-28 pt-4">{children}</main>

      <MemberTabBar locale={locale} churchSlug={church.slug} active={active} unread={unread} />
    </div>
  );
}
