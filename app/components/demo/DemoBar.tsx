import Link from "next/link";
import { ChevronDown, FlaskConical, Info } from "lucide-react";
import type { Church, Locale } from "@/app/lib/demo/types";
import { allChurches, demoPersonas, getMembership, type Persona } from "@/app/lib/demo/selectors";
import { createT, localize } from "@/app/lib/i18n";
import { RoleBadge } from "@/app/components/ui";
import { cn } from "@/app/lib/utils";

/**
 * デモ専用の視点切替バー。プロダクトの chrome ではなく「デモの足場」であることを
 * 明確にする（点線・ラボアイコン）。視点を変えると公開範囲(RLS相当)の見え方が変わる。
 */
export function DemoBar({
  locale,
  section,
  church,
  personaId,
  containerClass = "max-w-6xl",
}: {
  locale: Locale;
  section: "member" | "admin";
  church: Church;
  personaId?: string;
  /** 内側コンテナの最大幅。会員ビューでは本文列に揃える。 */
  containerClass?: string;
}) {
  const t = createT(locale);
  const personas = demoPersonas(church.id);
  const churches = allChurches();
  const current = personaId ? getMembership(personaId) : undefined;

  const memberHref = (id: string) => `/${locale}/church/${church.slug}/today?as=${id}`;
  const adminHref = (id: string) => `/${locale}/admin/${church.slug}?as=${id}`;
  const hrefFor = (id: string) => (section === "admin" ? adminHref(id) : memberHref(id));

  return (
    <div className="border-b border-dashed border-cedar/30 bg-cedar-soft/60">
      <div className={cn("mx-auto flex flex-col gap-2 px-4 py-2", containerClass)}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-cedar text-paper px-2 py-0.5 text-[11px] font-semibold">
            <FlaskConical className="h-3 w-3" aria-hidden />
            {t("demo.badge")}
          </span>
          <span className="truncate text-xs text-cedar-ink">
            {localize(church.name, locale, church.defaultLocale)}
          </span>
          <span className="text-[11px] text-muted">
            {section === "admin" ? t("common.admin") : t("role.member")}
          </span>
        </div>

        <details className="group text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-cedar-ink">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
            <span className="font-medium">{t("demo.viewingAs")}:</span>
            <span className="text-ink">
              {current?.displayName ?? personas[0]?.displayName}
            </span>
          </summary>

          <div className="mt-2 space-y-2 rounded-xl border border-cedar/20 bg-surface/70 p-3">
            <p className="flex items-start gap-1.5 text-[11px] text-muted">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {t("demo.note")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {personas.map((p) => (
                <PersonaChip
                  key={p.membershipId}
                  persona={p}
                  href={hrefFor(p.membershipId)}
                  active={p.membershipId === (personaId ?? personas[0]?.membershipId)}
                  locale={locale}
                />
              ))}
            </div>
            {churches.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                <span className="text-[11px] text-muted">{t("demo.switchChurch")}:</span>
                {churches.map((c) => (
                  <Link
                    key={c.id}
                    href={
                      section === "admin"
                        ? `/${locale}/admin/${c.slug}`
                        : `/${locale}/church/${c.slug}/today`
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                      c.id === church.id
                        ? "border-cedar/40 bg-cedar-soft text-cedar-ink"
                        : "border-line-strong bg-surface text-muted hover:text-ink",
                    )}
                  >
                    {localize(c.name, locale, c.defaultLocale)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}

function PersonaChip({
  persona,
  href,
  active,
  locale,
}: {
  persona: Persona;
  href: string;
  active: boolean;
  locale: Locale;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition-colors",
        active
          ? "border-sage/50 bg-sage-soft"
          : "border-line-strong bg-surface hover:bg-mist",
      )}
    >
      <span className={cn("text-[11px] font-medium", active ? "text-ink" : "text-ink-soft")}>
        {persona.displayName}
      </span>
      <RoleBadge role={persona.roles[0]} locale={locale} />
    </Link>
  );
}
