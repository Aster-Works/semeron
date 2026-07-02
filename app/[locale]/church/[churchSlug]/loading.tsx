import { PageSkeleton } from "@/app/components/ui/PageSkeleton";

/** タブ間ナビの即時フィードバック（シェルは layout に常駐、本文のみ差し替え）。 */
export default function Loading() {
  return <PageSkeleton rows={3} />;
}
