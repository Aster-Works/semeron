import { Bell } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getInbox } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { formatMonthDay } from "@/app/lib/utils";
import { MemberShell } from "@/app/components/member/MemberShell";
import { InboxList, type InboxItemVM } from "@/app/components/member/InboxList";
import { EmptyState, SectionHeading } from "@/app/components/ui";

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

  // 多言語・日付整形はサーバー側で解決し、クライアントには確定文字列を渡す。
  const vm: InboxItemVM[] = items.map((n) => ({
    id: n.id,
    title: localize(n.title, locale as "ja" | "en", church.defaultLocale),
    body: localize(n.body, locale as "ja" | "en", church.defaultLocale),
    dateLabel: formatMonthDay(n.createdAt, locale as "ja" | "en", church.timezone),
    read: Boolean(n.read),
  }));

  return (
    <MemberShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="inbox">
      <div className="space-y-4">
        <SectionHeading title={t("inbox.title")} description={t("inbox.quietNote")} />

        {vm.length === 0 ? (
          <EmptyState icon={Bell} title={t("inbox.empty")} />
        ) : (
          <InboxList
            locale={locale as "ja" | "en"}
            churchId={church.id}
            churchSlug={church.slug}
            items={vm}
          />
        )}
      </div>
    </MemberShell>
  );
}
