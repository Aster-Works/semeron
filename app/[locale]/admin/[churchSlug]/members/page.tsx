import { KeyRound, Users } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getChurchGroups, getMembers } from "@/app/lib/db/queries";
import type { Group, Membership, Role } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { resolveRoleLabels } from "@/app/lib/roleLabels";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { EditRolesButton } from "@/app/components/admin/EditRolesButton";
import { InviteButton } from "@/app/components/admin/InviteButton";
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  EmptyState,
  RoleBadge,
  SectionHeading,
} from "@/app/components/ui";

const ROLE_ORDER: Role[] = [
  "owner", "pastor", "elder", "staff", "prayer_team", "group_leader", "member", "guest",
];

export default async function AdminMembersPage({
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

  const [membersRaw, groups] = await Promise.all([
    getMembers(supabase, church.id),
    getChurchGroups(supabase, church.id),
  ]);
  const members = membersRaw.sort(sortMembers);
  const groupsById = new Map<string, Group>(groups.map((g) => [g.id, g]));

  const roleLabelMap = resolveRoleLabels(church, locale);

  // 役割編集は owner/pastor のみ（RLS 0010 と同一基準。サーバーアクション側でも再確認）
  const canEditRoles = (viewer.membership?.roles ?? []).some(
    (r) => r === "owner" || r === "pastor",
  );

  function statusBadge(m: Membership) {
    switch (m.status) {
      case "active":
        return <Badge tone="sage">{t("members.statusActive")}</Badge>;
      case "invited":
        return <Badge tone="gold">{t("members.statusInvited")}</Badge>;
      default:
        return <Badge tone="neutral">{t("members.statusInactive")}</Badge>;
    }
  }

  function groupBadges(m: Membership) {
    const gs = m.groupIds.map((id) => groupsById.get(id)).filter((g): g is Group => Boolean(g));
    if (gs.length === 0) return <span className="text-xs text-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {gs.map((g) => (
          <Badge key={g.id} tone="slate">
            {localize(g.name, locale, church.defaultLocale)}
          </Badge>
        ))}
      </div>
    );
  }

  function rolesRow(m: Membership) {
    if (m.roles.length === 0) return <span className="text-xs text-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {[...m.roles]
          .sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b))
          .map((role) => (
            <RoleBadge key={role} role={role} locale={locale} label={roleLabelMap[role]} />
          ))}
      </div>
    );
  }

  const inviteCard = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-mist px-3 py-1.5 text-xs">
        <KeyRound className="h-3.5 w-3.5 text-sage-ink" aria-hidden />
        <span className="text-muted">{t("members.inviteCode")}</span>
        <span className="font-mono font-semibold tracking-wide text-ink">{church.inviteCode}</span>
      </span>
      <InviteButton
        locale={locale}
        inviteCode={church.inviteCode}
        churchName={localize(church.name, locale, church.defaultLocale)}
      />
    </div>
  );

  return (
    <>
      <div className="space-y-5">
        <SectionHeading title={t("members.title")} right={inviteCard} />

        {members.length === 0 ? (
          <EmptyState icon={Users} title={locale === "ja" ? "まだメンバーがいません。" : "No members yet."} />
        ) : (
          <>
            <div className="hidden sm:block">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                        <th scope="col" className="px-4 py-3 font-medium">{t("members.colName")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("members.colRoles")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("members.colGroups")}</th>
                        <th scope="col" className="px-4 py-3 font-medium">{t("members.colStatus")}</th>
                        {canEditRoles ? (
                          <th scope="col" className="px-4 py-3">
                            <span className="sr-only">{t("members.editRoles")}</span>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {members.map((m) => (
                        <tr key={m.id} className="align-top">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={m.displayName} size="sm" />
                              <div className="min-w-0">
                                <p className="font-medium text-ink text-balance-safe">{m.displayName}</p>
                                {m.email ? <p className="mt-0.5 truncate text-xs text-muted">{m.email}</p> : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{rolesRow(m)}</td>
                          <td className="px-4 py-3">{groupBadges(m)}</td>
                          <td className="px-4 py-3">{statusBadge(m)}</td>
                          {canEditRoles ? (
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <EditRolesButton
                                locale={locale}
                                churchId={church.id}
                                churchSlug={church.slug}
                                membershipId={m.id}
                                memberName={m.displayName}
                                currentRoles={m.roles}
                                roleLabels={roleLabelMap}
                              />
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="space-y-3 sm:hidden">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={m.displayName} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink text-balance-safe">{m.displayName}</p>
                          {m.email ? <p className="mt-0.5 truncate text-xs text-muted">{m.email}</p> : null}
                        </div>
                      </div>
                      {statusBadge(m)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t("members.colRoles")}</p>
                        {rolesRow(m)}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t("members.colGroups")}</p>
                        {groupBadges(m)}
                      </div>
                    </div>
                    {canEditRoles ? (
                      <div className="border-t border-line pt-3">
                        <EditRolesButton
                          locale={locale}
                          churchId={church.id}
                          churchSlug={church.slug}
                          membershipId={m.id}
                          memberName={m.displayName}
                          currentRoles={m.roles}
                          roleLabels={roleLabelMap}
                        />
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function sortMembers(a: Membership, b: Membership): number {
  const statusRank = (m: Membership) => (m.status === "active" ? 0 : m.status === "invited" ? 1 : 2);
  const s = statusRank(a) - statusRank(b);
  if (s !== 0) return s;
  const roleRank = (m: Membership) =>
    m.roles.length === 0 ? ROLE_ORDER.length : Math.min(...m.roles.map((r) => ROLE_ORDER.indexOf(r)));
  const r = roleRank(a) - roleRank(b);
  if (r !== 0) return r;
  return a.displayName.localeCompare(b.displayName);
}
