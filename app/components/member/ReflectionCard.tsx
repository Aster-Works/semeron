import type { Church, Locale } from "@/app/lib/demo/types";
import type { ReflectionVM } from "@/app/lib/db/queries";
import { localize } from "@/app/lib/i18n";
import { Avatar, Card, CardBody } from "@/app/components/ui";
import { ReactionBar } from "./ReactionBar";
import { ReflectionEditor } from "./ReflectionEditor";

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
  const { item, authorName, isMine, reactions } = vm;
  const bodyText = localize(item.body, locale, church.defaultLocale);
  const edited = new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
  return (
    <Card as="article">
      <CardBody className="space-y-3">
        <div className="flex items-center gap-2">
          <Avatar name={authorName} size="sm" />
          <p className="truncate text-sm font-medium text-ink">{authorName}</p>
        </div>
        {isMine ? (
          <ReflectionEditor
            churchId={church.id}
            churchSlug={church.slug}
            contentId={item.id}
            initialBody={bodyText}
            edited={edited}
          />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft text-balance-safe">
            {bodyText}
          </p>
        )}
        <ReactionBar churchId={church.id} contentId={item.id} reactions={reactions} />
      </CardBody>
    </Card>
  );
}
