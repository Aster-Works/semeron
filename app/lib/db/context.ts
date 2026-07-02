import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Church, Viewer } from "@/app/lib/demo/types";
import { createServerSupabase } from "@/app/lib/supabase/server";
import { mapChurch, mapMembership } from "./map";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ChurchContext {
  supabase: SupabaseClient;
  user: User;
  viewer: Viewer;
  personaId: string; // = membership id（?as は使わない。互換のため保持）
}

/** ログイン中の auth ユーザー（未ログインは null）。 */
export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** ユーザーが所属する教会の一覧（入口ルーティング用）。 */
export async function getMyChurches(): Promise<{ user: User | null; churches: Church[] }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, churches: [] };
  const { data } = await supabase
    .from("memberships")
    .select("church:churches(*)")
    .eq("user_id", user.id)
    .eq("status", "active");
  const churches = (data ?? [])
    .map((r: any) => r.church)
    .filter(Boolean)
    .map((c: any) => mapChurch(c));
  return { user, churches };
}

/**
 * churchSlug に対する閲覧者コンテキストを解決。
 * RLS により、非会員・別教会・未ログインでは church 行が返らず null になる。
 * React cache() で同一リクエスト内（layout + page）では1回だけ実行される。
 */
export const resolveChurchContext = cache(async (
  churchSlug: string,
): Promise<ChurchContext | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 教会とメンバーシップ（+ロール/グループ）を1クエリで取得（往復を1つ削減）。
  // churches!inner + church.slug フィルタで、自分の active メンバーシップ行のみ引く。
  // RLS(memberships_select / churches_select)が別教会・非会員を弾く。
  const { data: memRow } = await supabase
    .from("memberships")
    .select("*, membership_roles(role), group_memberships(group_id), church:churches!inner(*)")
    .eq("church.slug", churchSlug)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!memRow || !memRow.church) return null;

  const roles = (memRow.membership_roles ?? []).map((r: any) => r.role);
  const groupIds = (memRow.group_memberships ?? []).map((g: any) => g.group_id);
  const church = mapChurch(memRow.church);
  const membership = mapMembership(memRow, roles, groupIds);

  return { supabase, user, viewer: { church, membership }, personaId: membership.id };
});

/** 会員ページ用。未ログイン/非会員は入口へリダイレクト。 */
export async function requireChurchContext(
  locale: string,
  churchSlug: string,
): Promise<ChurchContext> {
  const ctx = await resolveChurchContext(churchSlug);
  if (!ctx) redirect(`/${locale}`);
  return ctx;
}
