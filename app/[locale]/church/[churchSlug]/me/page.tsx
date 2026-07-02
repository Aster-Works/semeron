import { Info, Users } from "lucide-react";
import { requireChurchContext } from "@/app/lib/db/context";
import { getMyGroups } from "@/app/lib/db/queries";
import { createT, localize } from "@/app/lib/i18n";
import { MemberShell } from "@/app/components/member/MemberShell";
import { DisplayNameEditor } from "@/app/components/member/DisplayNameEditor";
import { NotificationSettings } from "@/app/components/member/NotificationSettings";
import { InstallPrompt } from "@/app/components/member/InstallPrompt";
import { LocaleSwitcher } from "@/app/components/LocaleSwitcher";
import {
  Avatar,
  Badge,
  Callout,
  Card,
  CardBody,
  RoleBadge,
  SectionHeading,
} from "@/app/components/ui";

/** 設定風の Me 画面。所属教会・役割・グループ・言語を静かに並べる。 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">{children}</div>
      </CardBody>
    </Card>
  );
}

export default async function MePage({
  params,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
}) {
  const { locale, churchSlug } = await params;
  const { supabase, viewer } = await requireChurchContext(locale, churchSlug);
  const church = viewer.church;
  const t = createT(locale as "ja" | "en");
  const membership = viewer.membership;
  if (!membership) return null; // requireChurchContext が membership を保証するが型の保険

  const groups = await getMyGroups(supabase, viewer);

  return (
    <MemberShell locale={locale as "ja" | "en"} church={church} viewer={viewer} active="me">
      <div className="space-y-5">
        <SectionHeading title={t("me.title")} />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={membership.displayName} />
            <DisplayNameEditor
              locale={locale as "ja" | "en"}
              churchId={church.id}
              churchSlug={church.slug}
              initialName={membership.displayName}
            />
          </div>

          <div className="space-y-3">
            <Row label={t("me.church")}>
              <span className="text-sm font-medium text-ink text-balance-safe">
                {localize(church.name, locale as "ja" | "en", church.defaultLocale)}
              </span>
            </Row>

            <Row label={t("me.role")}>
              {membership.roles.map((role) => (
                <RoleBadge key={role} role={role} locale={locale as "ja" | "en"} />
              ))}
            </Row>

            <Row label={t("groups.mine")}>
              {groups.length === 0 ? (
                <span className="text-sm text-muted">{t("groups.empty")}</span>
              ) : (
                groups.map((g) => (
                  <Badge key={g.id} tone="slate" icon={Users}>
                    {localize(g.name, locale as "ja" | "en", church.defaultLocale)}
                  </Badge>
                ))
              )}
            </Row>

            <Row label={t("me.language")}>
              <LocaleSwitcher />
            </Row>
          </div>

          <Card>
            <CardBody className="space-y-5">
              <NotificationSettings locale={locale as "ja" | "en"} churchId={church.id} />
              <div className="border-t border-line pt-5">
                <InstallPrompt locale={locale as "ja" | "en"} />
              </div>
            </CardBody>
          </Card>

          <Callout tone="neutral" icon={Info}>
            {locale === "ja"
              ? "これはあなたの実際のアカウントです。ログイン中の情報が表示されています。"
              : "This is your real, signed-in account. The details above reflect your live membership."}
          </Callout>
        </div>
      </div>
    </MemberShell>
  );
}
