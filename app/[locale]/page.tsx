import { redirect } from "next/navigation";
import { getMyChurches } from "@/app/lib/db/context";

// 入口: セッションに応じて振り分け（マーケLPではない）。
export default async function LocaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user, churches } = await getMyChurches();
  if (!user) redirect(`/${locale}/login`);
  if (churches.length === 0) redirect(`/${locale}/onboarding`);
  redirect(`/${locale}/church/${churches[0].slug}/today`);
}
