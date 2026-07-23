# テナント分離（教会間の越境防止）

Semeron はマルチテナント。テナント境界は **`church_id`**。会員は自分の教会のデータしか読めない・書けない。

## 仕組み（3層）

1. **RLS**: 全ポリシーは `private.is_active_member(church_id)` 等の definer ヘルパーで
   「操作者が当該教会の active member か」を確認する。church_id を偽っても RLS で 0 行になる。
2. **整合性トリガー**: 子表（content_items, prayer_logs, completion_logs, reactions,
   notifications, group_memberships 等）には `private.enforce_child_church` 系トリガーがあり、
   親（content/group/membership）の church_id と行の church_id の不一致を INSERT/UPDATE 時に拒否する。
   → RLS をすり抜ける経路（definer 関数のバグ等）があっても、他教会 ID の混入自体が失敗する。
3. **アプリ層の二重確認**: Server Actions は `myMembershipId(supabase, churchId)` で
   membership を解決してから書き込む。グループ操作は `assertGroupInChurch` で同一教会を確認。

## 小グループの分離（教会内の内側の境界）

- `visibility='group'` の published コンテンツは **作者本人＋当該グループ所属者のみ**閲覧可。
  管理者でもグループ外なら見えない（2026-07-05 修正、migration `20260705135614`）。
- `groups` / `group_memberships` の SELECT も所属者または管理者に限定。

## 検証

```bash
npm run db:test
# rls_isolation.test.sql       … 教会間の読み書き越境（17+件）
# rls_content_visibility.test.sql … 公開範囲ごとの可視性（33件）
# security_hardening.test.sql  … prayer_logs の越境・なりすまし拒否（8件）
```

## 変更時の注意

- 新しい子表を追加したら、①church_id 列 ②RLS ③`enforce_child_church` トリガー ④pgTAP を必ずセットで。
- definer 関数を追加したら `anon` から EXECUTE を revoke する（[rls-policies.md](rls-policies.md)）。
