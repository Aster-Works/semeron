import { requireChurchContext } from "@/app/lib/db/context";
import { MemberShell } from "@/app/components/member/MemberShell";

/**
 * 会員セクションの共有レイアウト。シェル（ヘッダー+下部タブ）をここで常駐させ、
 * タブ間ナビゲーションではページ(children)だけを差し替える。
 * → タップ時にシェルが消えず、loading.tsx が中身のみ即時スケルトン表示。
 * requireChurchContext は React cache() 済みのため、初回表示で page と重複しても
 * 実行は1回。
 */
export default async function ChurchLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
  children: React.ReactNode;
}) {
  const { locale, churchSlug } = await params;
  const { viewer } = await requireChurchContext(locale, churchSlug);

  return (
    <MemberShell locale={locale as "ja" | "en"} church={viewer.church} viewer={viewer}>
      {children}
    </MemberShell>
  );
}
