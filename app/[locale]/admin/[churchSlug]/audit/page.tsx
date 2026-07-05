import { FileClock } from "lucide-react";
import { AccessDenied } from "@/app/components/admin/AdminShell";
import { Badge, Card, EmptyState, SectionHeading } from "@/app/components/ui";
import { requireChurchContext } from "@/app/lib/db/context";
import { getAuditLogs } from "@/app/lib/db/queries";
import type { Locale } from "@/app/lib/demo/types";
import { isChurchAdmin } from "@/app/lib/demo/visibility";
import { createT } from "@/app/lib/i18n";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale: rawLocale, churchSlug } = await params;
  const locale = rawLocale as Locale;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  if (!isChurchAdmin(viewer)) {
    return <AccessDenied locale={locale} church={viewer.church} />;
  }

  const t = createT(locale);
  const logs = await getAuditLogs(supabase, viewer.church.id, 100);

  return (
    <div className="space-y-5">
      <SectionHeading title={t("audit.title")} description={t("audit.description")} />

      {logs.length === 0 ? (
        <EmptyState icon={FileClock} title={t("audit.empty")} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">{t("audit.colWhen")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("audit.colActor")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("audit.colAction")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("audit.colTarget")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("audit.colDetails")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map(({ log, actorName }) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {formatDate(log.createdAt, locale, viewer.church.timezone)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink text-balance-safe">
                        {actorName ?? t("audit.unknownActor")}
                      </p>
                      {log.actorMembershipId ? (
                        <p className="mt-0.5 font-mono text-[11px] text-muted">
                          {shortId(log.actorMembershipId)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={toneForAction(log.action)}>
                        {actionLabel(log.action, locale)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        {log.targetType}
                      </p>
                      {log.targetId ? (
                        <p className="mt-0.5 font-mono text-xs text-ink-soft">{shortId(log.targetId)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <pre className="max-h-32 min-w-56 overflow-auto rounded-lg border border-line bg-mist px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function formatDate(value: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortId(value: string): string {
  return value.length <= 13 ? value : `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatMetadata(value: Record<string, unknown> | undefined): string {
  if (!value || Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value, null, 2);
}

function actionLabel(action: string, locale: Locale): string {
  const ja = locale === "ja";
  const labels: Record<string, { ja: string; en: string }> = {
    "invite.expired": { ja: "招待コード失効", en: "Invite expired" },
    "invite.rotated": { ja: "招待コード再発行", en: "Invite rotated" },
    "roles.updated": { ja: "役割変更", en: "Roles updated" },
    "member.suspended": { ja: "メンバー休止", en: "Member suspended" },
    "member.restored": { ja: "メンバー復帰", en: "Member restored" },
    "member.removed": { ja: "メンバー除外", en: "Member removed" },
    "moderation.approved": { ja: "祈祷課題承認", en: "Prayer approved" },
    "moderation.rejected": { ja: "祈祷課題却下", en: "Prayer rejected" },
    "moderation.needs_revision": { ja: "修正依頼", en: "Needs revision" },
    "devotion.deleted": { ja: "デボーション削除", en: "Devotion deleted" },
    "church.role_labels_updated": { ja: "役割名変更", en: "Role labels updated" },
    "account.deleted": { ja: "アカウント削除", en: "Account deleted" },
  };
  const label = labels[action];
  return label ? label[ja ? "ja" : "en"] : action;
}

function toneForAction(action: string): "neutral" | "sage" | "cedar" | "gold" | "rose" | "slate" {
  if (action.includes("deleted") || action.includes("removed") || action.includes("expired")) return "rose";
  if (action.includes("moderation") || action.includes("roles")) return "gold";
  if (action.includes("restored") || action.includes("rotated")) return "sage";
  return "slate";
}
