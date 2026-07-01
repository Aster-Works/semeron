import { ArrowLeft, HeartHandshake, Users } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireChurchContext } from "@/app/lib/db/context";
import { getGroup, getGroupMembers, getGroupPrayers } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { MemberShell } from "@/app/components/member/MemberShell";
import { PrayerCard } from "@/app/components/member/PrayerCard";
import { Avatar, Badge, Card, CardBody, EmptyState, SectionHeading } from "@/app/components/ui";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string; groupId: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const { groupId } = await params;
  const t = createT(locale as "ja" | "en");

  const group = await getGroup(supabase, groupId);
  if (!group) notFound();

  const members = await getGroupMembers(supabase, groupId);
  const prayers = await getGroupPrayers(supabase, viewer, groupId, locale as "ja" | "en");
  const description = group.description
    ? localize(group.description, locale as "ja" | "en", church.defaultLocale)
    : "";

  return (
    <MemberShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="groups">
      <div className="space-y-6">
        <Link
          href={`/${locale}/church/${church.slug}/groups`}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("groups.title")}
        </Link>

        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-ink text-balance-safe">
            {localize(group.name, locale as "ja" | "en", church.defaultLocale)}
          </h1>
          {description ? (
            <p className="leading-relaxed text-ink-soft text-balance-safe">{description}</p>
          ) : null}
        </header>

        <Card>
          <CardBody className="space-y-3">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-sage-ink">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {members.length}
              {locale === "ja" ? "名" : " members"}
            </p>
            {members.length === 0 ? (
              <p className="text-sm text-muted text-balance-safe">
                {locale === "ja"
                  ? "このグループにはまだメンバーがいません。"
                  : "This group has no members yet."}
              </p>
            ) : (
              <ul className="space-y-2.5">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <Avatar name={m.displayName} size="sm" />
                    <span className="min-w-0 truncate text-sm text-ink">{m.displayName}</span>
                    {group.leaderMembershipId === m.id ? (
                      <Badge tone="slate">{t("groups.leader")}</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <section className="space-y-3">
          <SectionHeading title={t("groups.groupPrayers")} />
          {prayers.length === 0 ? (
            <EmptyState icon={HeartHandshake} title={t("groups.noGroupPrayers")} />
          ) : (
            <div className="space-y-3">
              {prayers.map((vm) => (
                <PrayerCard key={vm.item.id} vm={vm} church={church} locale={locale as "ja" | "en"} />
              ))}
            </div>
          )}
        </section>
      </div>
    </MemberShell>
  );
}
