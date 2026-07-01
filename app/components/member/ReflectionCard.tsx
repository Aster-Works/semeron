import type { Church, Locale } from "@/app/lib/demo/types";
import type { ReflectionVM } from "@/app/lib/db/queries";
import { localize } from "@/app/lib/i18n";
import { Avatar, Card, CardBody } from "@/app/components/ui";
import { ReactionBar } from "./ReactionBar";

/** 応答・証しカード（実データ VM 版）。Amen / Thanks の静かなリアクション。 */
export function ReflectionCard({
  vm,
  church,
  locale,
}: {
  vm: ReflectionVM;
  church: Church;
  locale: Locale;
}) {
  const { item, authorName, reactions } = vm;
  return (
    <Card as="article">
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <Avatar name={authorName} size="sm" />
          <p className="truncate text-sm font-medium text-ink">{authorName}</p>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
          {localize(item.body, locale, church.defaultLocale)}
        </p>
        <ReactionBar churchId={church.id} contentId={item.id} reactions={reactions} />
      </CardBody>
    </Card>
  );
}
