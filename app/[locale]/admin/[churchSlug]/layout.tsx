import { redirect } from "next/navigation";
import { requireChurchContext } from "@/app/lib/db/context";
import { canModerate, isChurchAdmin } from "@/app/lib/demo/visibility";
import { AdminShell } from "@/app/components/admin/AdminShell";

/**
 * 管理セクションの共有レイアウト。シェル（ヘッダー+サイド/横ナビ)を常駐させ、
 * セクション間ナビゲーションではページ(children)だけを差し替える。
 *
 * 入場ゲート: moderate（祈祷チーム等）以上。祈祷課題の承認画面はモデレーターも
 * 使うため、ここでは緩い方で通し、admin 限定ページは各ページが isChurchAdmin を
 * 確認して AccessDenied を返す（従来の require="admin|moderate" と同等の防御）。
 * データ自体は RLS が最終防衛線。
 */
export default async function AdminLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string; churchSlug: string }>;
  children: React.ReactNode;
}) {
  const { locale, churchSlug } = await params;
  const { viewer } = await requireChurchContext(locale, churchSlug);

  if (!canModerate(viewer) && !isChurchAdmin(viewer)) {
    redirect(`/${locale}/church/${churchSlug}/today`);
  }

  return (
    <AdminShell locale={locale as "ja" | "en"} church={viewer.church}>
      {children}
    </AdminShell>
  );
}
