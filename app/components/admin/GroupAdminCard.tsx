"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Crown, Trash2, UserMinus, UserPlus } from "lucide-react";
import type { Locale } from "@/app/lib/demo/types";
import { useLocale } from "@/app/lib/i18n/LocaleProvider";
import {
  addGroupMember,
  deleteGroup,
  removeGroupMember,
  setGroupArchived,
  setGroupLeader,
} from "@/app/lib/db/actions";
import { Avatar, Badge, Button, Card, CardBody, Modal, Select } from "@/app/components/ui";

export interface GroupMemberVM {
  id: string;
  name: string;
}
export interface GroupAdminVM {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  leaderMembershipId: string | null;
  members: GroupMemberVM[];
}

/** 管理者用グループカード: メンバー追加/削除・リーダー設定・アーカイブ。 */
export function GroupAdminCard({
  locale,
  churchId,
  churchSlug,
  group,
  allMembers,
}: {
  locale: Locale;
  churchId: string;
  churchSlug: string;
  group: GroupAdminVM;
  allMembers: GroupMemberVM[];
}) {
  const { t } = useLocale();
  const ja = locale === "ja";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addId, setAddId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(group.members.map((m) => m.id));
  const addable = allMembers.filter((m) => !memberIds.has(m.id));

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(t("assist.error"));
        return;
      }
      router.refresh();
    });
  };

  const base = { churchId, churchSlug, locale, groupId: group.id };

  const runDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteGroup(base);
      if (!res.ok) {
        setError(res.error === "group has content" ? t("groupsAdmin.deleteHasContent") : t("groupsAdmin.deleteError"));
        return;
      }
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Card className={group.archived ? "opacity-70" : undefined}>
        <CardBody className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-semibold text-ink text-balance-safe">
                {group.name}
                {group.archived ? <Badge tone="neutral">{t("groups.archived")}</Badge> : null}
              </h3>
              {group.description ? (
                <p className="mt-1 text-sm text-muted text-balance-safe">{group.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">
              {ja ? `${group.members.length}${t("groups.memberCount")}` : `${group.members.length} ${t("groups.memberCount")}`}
            </span>
          </div>

          {/* メンバー一覧（リーダー印・削除・リーダー設定） */}
          <ul className="flex flex-col gap-2">
            {group.members.map((m) => {
              const isLeader = m.id === group.leaderMembershipId;
              return (
                <li key={m.id} className="flex items-center gap-2.5">
                  <Avatar name={m.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{m.name}</span>
                  {isLeader ? (
                    <Badge tone="cedar">{t("groups.leader")}</Badge>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setGroupLeader({ ...base, membershipId: m.id }))}
                      title={t("groupsAdmin.makeLeader")}
                      className="rounded-lg p-1.5 text-muted hover:bg-mist hover:text-ink disabled:opacity-50"
                    >
                      <Crown className="h-4 w-4" aria-hidden />
                      <span className="sr-only">{t("groupsAdmin.makeLeader")}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeGroupMember({ ...base, membershipId: m.id }))}
                    title={t("groupsAdmin.removeMember")}
                    className="rounded-lg p-1.5 text-muted hover:bg-mist hover:text-rose-ink disabled:opacity-50"
                  >
                    <UserMinus className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{t("groupsAdmin.removeMember")}</span>
                  </button>
                </li>
              );
            })}
            {group.members.length === 0 ? (
              <li className="text-sm text-muted">{t("groups.empty")}</li>
            ) : null}
          </ul>

          {/* メンバー追加 + アーカイブ/削除 */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {addable.length > 0 ? (
              <>
                <Select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  disabled={pending}
                  aria-label={t("groupsAdmin.addMember")}
                  className="h-11 w-auto min-w-40 flex-1 sm:flex-none"
                >
                  <option value="">{t("groupsAdmin.selectMember")}</option>
                  {addable.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending || !addId}
                  onClick={() => { const id = addId; setAddId(""); run(() => addGroupMember({ ...base, membershipId: id })); }}
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  {t("groupsAdmin.addMember")}
                </Button>
              </>
            ) : null}
            <span className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setGroupArchived({ ...base, archived: !group.archived }))}
            >
              {group.archived
                ? <ArchiveRestore className="h-4 w-4" aria-hidden />
                : <Archive className="h-4 w-4" aria-hidden />}
              {group.archived ? t("groupsAdmin.unarchive") : t("groupsAdmin.archive")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => { setError(null); setDeleteOpen(true); }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("groupsAdmin.delete")}
            </Button>
          </div>

          {group.leaderMembershipId ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setGroupLeader({ ...base, membershipId: null }))}
                className="text-xs text-muted hover:text-ink hover:underline disabled:opacity-50"
              >
                {t("groupsAdmin.clearLeader")}
              </button>
            </div>
          ) : null}

          {error && !deleteOpen ? <p className="text-sm text-rose-ink text-balance-safe">{error}</p> : null}
        </CardBody>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => (pending ? undefined : setDeleteOpen(false))}
        title={t("groupsAdmin.deleteTitle")}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={runDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" aria-hidden />
              {pending ? "…" : t("groupsAdmin.deleteConfirm")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-ink">
          <p className="font-medium text-balance-safe">{group.name}</p>
          <p className="text-muted text-balance-safe">{t("groupsAdmin.deleteBody")}</p>
          {error ? <p className="text-rose-ink text-balance-safe">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
