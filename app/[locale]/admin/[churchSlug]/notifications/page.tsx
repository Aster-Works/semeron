import { Bell, Radio } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getChurchNotifications } from "@/app/lib/db/queries";
import type { AppNotification } from "@/app/lib/demo/types";
import { createT, localize } from "@/app/lib/i18n";
import type { MessageId } from "@/app/lib/i18n";
import { formatMonthDay } from "@/app/lib/utils";
import type { Tone } from "@/app/lib/utils";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import {
  Badge,
  Callout,
  Card,
  CardBody,
  EmptyState,
  SectionHeading,
} from "@/app/components/ui";

const statusMeta: Record<AppNotification["status"], { tone: Tone; label: MessageId }> = {
  sent: { tone: "sage", label: "notifications.statusSent" },
  failed: { tone: "rose", label: "notifications.statusFailed" },
  queued: { tone: "slate", label: "notifications.statusQueued" },
  skipped: { tone: "neutral", label: "notifications.statusSkipped" },
};

export default async function AdminNotificationsPage({
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
  const notifications = await getChurchNotifications(supabase, church.id);

  return (
    <>
      <div className="space-y-5">
        <SectionHeading title={t("notifications.title")} />

        <Callout tone="sage" icon={Radio}>
          {t("notifications.fallbackNote")}
        </Callout>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title={t("inbox.empty")} />
        ) : (
          <>
            {/* --- Desktop / tablet: quiet table (sm+) --- */}
            <div className="hidden sm:block">
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("notifications.colType")}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("notifications.colChannel")}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {t("notifications.colStatus")}
                        </th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">
                          {t("notifications.colWhen")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {notifications.map((n) => {
                        const meta = statusMeta[n.status];
                        return (
                          <tr key={n.id} className="align-top">
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-ink-soft text-balance-safe">
                                {t(`notifType.${n.type}` as MessageId)}
                              </p>
                              <p className="mt-0.5 text-ink text-balance-safe">
                                {localize(n.title, locale, church.defaultLocale) || "—"}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                              {t(`channel.${n.channel}` as MessageId)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                              {n.failureReason ? (
                                <p className="mt-1 text-xs text-muted text-balance-safe">
                                  {n.failureReason}
                                </p>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted">
                              {formatMonthDay(n.createdAt, locale, church.timezone)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* --- Mobile: stacked cards (< sm) --- */}
            <div className="space-y-3 sm:hidden">
              {notifications.map((n) => {
                const meta = statusMeta[n.status];
                return (
                  <Card key={n.id}>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-ink-soft text-balance-safe">
                            {t(`notifType.${n.type}` as MessageId)}
                          </p>
                          <p className="mt-0.5 text-sm text-ink text-balance-safe">
                            {localize(n.title, locale, church.defaultLocale) || "—"}
                          </p>
                        </div>
                        <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span>
                          {t("notifications.colChannel")}: {t(`channel.${n.channel}` as MessageId)}
                        </span>
                        <span className="tabular-nums">
                          {t("notifications.colWhen")}:{" "}
                          {formatMonthDay(n.createdAt, locale, church.timezone)}
                        </span>
                      </div>

                      {n.failureReason ? (
                        <p className="text-xs text-muted text-balance-safe">
                          {n.failureReason}
                        </p>
                      ) : null}
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
