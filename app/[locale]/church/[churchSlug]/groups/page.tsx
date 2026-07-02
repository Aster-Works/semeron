import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getGroupMembers, getMyGroups } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { Card, EmptyState, SectionHeading } from "@/app/components/ui";

export default async function GroupsPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  const groups = await getMyGroups(supabase, viewer);
  const groupsWithCounts = await Promise.all(
    groups.map(async (group) => ({
      group,
      memberCount: (await getGroupMembers(supabase, group.id)).length,
    })),
  );

  return (
    <>
      <div className="space-y-4">
        <SectionHeading title={t("groups.mine")} />

        {groupsWithCounts.length === 0 ? (
          <EmptyState icon={Users} title={t("groups.empty")} />
        ) : (
          <div className="space-y-3">
            {groupsWithCounts.map(({ group, memberCount }) => {
              const description = group.description
                ? localize(group.description, locale as "ja" | "en", church.defaultLocale)
                : "";

              return (
                <Link
                  key={group.id}
                  href={`/${locale}/church/${church.slug}/groups/${group.id}`}
                  className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-ink"
                >
                  <Card className="transition-colors hover:border-line-strong">
                    <div className="flex items-start gap-3 p-5 sm:p-6">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sage-ink">
                        <Users className="h-5 w-5" aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-base font-semibold text-ink text-balance-safe">
                          {localize(group.name, locale as "ja" | "en", church.defaultLocale)}
                        </h3>

                        {description ? (
                          <p className="text-sm leading-relaxed text-muted text-balance-safe">
                            {description}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted">
                          <span>
                            {memberCount}
                            {t("groups.memberCount")}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
