import { Users } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getChurchGroups, getGroupMembers, getMembers } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { CreateGroupButton } from "@/app/components/admin/CreateGroupButton";
import {
  GroupAdminCard,
  type GroupAdminVM,
  type GroupMemberVM,
} from "@/app/components/admin/GroupAdminCard";
import { EmptyState, SectionHeading } from "@/app/components/ui";

/** 管理 > グループ: 作成・メンバー追加/削除・リーダー設定・アーカイブ（05 §8）。 */
export default async function AdminGroupsPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale: rawLocale, churchSlug } = await params;
  const locale = rawLocale as "ja" | "en";
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale as "ja" | "en"} church={viewer.church} />;
  }
  const church = viewer.church;
  const t = createT(locale);
  const primaryLang = church.contentLanguages[0] ?? church.defaultLocale;

  const [groups, allMembersRaw] = await Promise.all([
    getChurchGroups(supabase, church.id),
    getMembers(supabase, church.id),
  ]);
  const allMembers: GroupMemberVM[] = allMembersRaw
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.id, name: m.displayName }));

  const groupsData: GroupAdminVM[] = await Promise.all(
    groups.map(async (group) => {
      const members = await getGroupMembers(supabase, group.id);
      return {
        id: group.id,
        name: localize(group.name, locale, church.defaultLocale),
        description: group.description
          ? localize(group.description, locale, church.defaultLocale)
          : "",
        archived: group.status === "archived",
        leaderMembershipId: group.leaderMembershipId ?? null,
        members: members.map((m) => ({ id: m.id, name: m.displayName })),
      };
    }),
  );
  // アクティブを先に、アーカイブは後ろへ
  groupsData.sort((a, b) => Number(a.archived) - Number(b.archived));

  return (
    <>
      <div className="space-y-5">
        <SectionHeading
          title={t("adminNav.groups")}
          right={
            <CreateGroupButton
              locale={locale}
              churchId={church.id}
              churchSlug={church.slug}
              primaryLang={primaryLang}
            />
          }
        />

        {groupsData.length === 0 ? (
          <EmptyState icon={Users} title={t("groups.empty")} />
        ) : (
          <div className="space-y-3">
            {groupsData.map((group) => (
              <GroupAdminCard
                key={group.id}
                locale={locale}
                churchId={church.id}
                churchSlug={church.slug}
                group={group}
                allMembers={allMembers}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
