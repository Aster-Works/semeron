"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine, X } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { updateMyDisplayName } from "@/app/lib/db/actions";
import { Button, Input } from "@/app/components/ui";

/** 自分の表示名をその場で編集する（自分ページ）。RPCで本人のみ・表示名のみ更新。 */
export function DisplayNameEditor({
  locale,
  churchId,
  churchSlug,
  initialName,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  initialName: string;
}) {
  const ja = locale === "ja";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(false);
    startTransition(async () => {
      const res = await updateMyDisplayName({
        churchId,
        churchSlug,
        locale,
        displayName: name.trim(),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <p className="text-lg font-semibold text-ink text-balance-safe">{initialName}</p>
        <button
          type="button"
          onClick={() => { setName(initialName); setEditing(true); }}
          aria-label={ja ? "表示名を編集" : "Edit display name"}
          className="rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink"
        >
          <PencilLine className="h-4 w-4" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(); }}
      className="flex w-full max-w-sm items-center gap-2"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        required
        aria-label={ja ? "表示名" : "Display name"}
        className="h-11"
      />
      <Button type="submit" size="sm" disabled={pending || !name.trim()}>
        <Check className="h-4 w-4" aria-hidden />
        {pending ? "…" : ja ? "保存" : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">{ja ? "キャンセル" : "Cancel"}</span>
      </Button>
      {error ? (
        <span className="text-xs text-rose-ink">{ja ? "保存できませんでした" : "Could not save"}</span>
      ) : null}
    </form>
  );
}
