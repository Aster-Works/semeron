import { Plus, Users } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getChurchGroups, getGroupMembers } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { AdminShell } from "@/app/components/admin/AdminShell";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  RoleBadge,
  SectionHeading,
} from "@/app/components/ui";

export default async function AdminGroupsPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale: rawLocale, churchSlug } = await params;
  const locale = rawLocale as "ja" | "en";
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale);

  const groups = await getChurchGroups(supabase, church.id);
  const groupsData = await Promise.all(
    groups.map(async (group) => ({ group, members: await getGroupMembers(supabase, group.id) })),
  );
  const memberCountLabel = (n: number) =>
    locale === "ja" ? `${n}${t("groups.memberCount")}` : `${n} ${t("groups.memberCount")}`;

  return (
    <AdminShell locale={locale} church={church} viewer={viewer} active="groups">
      <div className="space-y-5">
        <SectionHeading
          title={t("adminNav.groups")}
          right={
            <Button variant="secondary" size="sm" disabled>
              <Plus className="h-4 w-4" aria-hidden />
              {locale === "ja" ? "グループを作成" : "Create group"}
            </Button>
          }
        />

        {groupsData.length === 0 ? (
          <EmptyState icon={Users} title={t("groups.empty")} />
        ) : (
          <div className="space-y-3">
            {groupsData.map(({ group, members }) => {
              const leader = members.find((m) => m.id === group.leaderMembershipId);
              const description = group.description
                ? localize(group.description, locale, church.defaultLocale)
                : "";

              return (
                <Card key={group.id}>
                  <CardBody className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-ink text-balance-safe">
                          {localize(group.name, locale, church.defaultLocale)}
                        </h3>
                        {description ? (
                          <p className="mt-1 text-sm text-muted text-balance-safe">{description}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">
                        {memberCountLabel(members.length)}
                      </span>
                    </div>

                    {leader ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted">
                          {t("groups.leader")}
                        </span>
                        <Avatar name={leader.displayName} size="sm" />
                        <span className="font-medium text-ink text-balance-safe">{leader.displayName}</span>
                        <RoleBadge role="group_leader" locale={locale} />
                      </div>
                    ) : null}

                    <div className="border-t border-line pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        {t("groups.title")}
                      </p>
                      {members.length === 0 ? (
                        <p className="text-sm text-muted text-balance-safe">{t("groups.empty")}</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {members.map((m) => (
                            <li key={m.id} className="flex items-center gap-2.5">
                              <Avatar name={m.displayName} size="sm" />
                              <span className="text-sm text-ink text-balance-safe">{m.displayName}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
