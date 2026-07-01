import { Bell } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getInbox } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { formatMonthDay } from "@/app/lib/utils";
import { MemberShell } from "@/app/components/member/MemberShell";
import { Card, CardBody, EmptyState, SectionHeading } from "@/app/components/ui";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");

  const items = await getInbox(supabase, viewer);

  return (
    <MemberShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="inbox">
      <div className="space-y-4">
        <SectionHeading title={t("inbox.title")} description={t("inbox.quietNote")} />

        {items.length === 0 ? (
          <EmptyState icon={Bell} title={t("inbox.empty")} />
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const body = localize(n.body, locale as "ja" | "en", church.defaultLocale);
              return (
                <Card key={n.id}>
                  <CardBody className="flex items-start gap-3">
                    {!n.read ? (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage"
                        aria-hidden
                      />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-ink text-balance-safe">
                          {localize(n.title, locale as "ja" | "en", church.defaultLocale)}
                        </p>
                        <time className="shrink-0 text-xs text-muted">
                          {formatMonthDay(n.createdAt, locale as "ja" | "en", church.timezone)}
                        </time>
                      </div>
                      {body ? (
                        <p className="text-sm text-muted text-balance-safe">{body}</p>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MemberShell>
  );
}
