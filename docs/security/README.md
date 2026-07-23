# Semeron セキュリティ文書

2026-07 のセキュリティ・Egress監査（Claude Code）で整備。**「実態と一致しない文書は書かない」**を原則とし、
各文書は末尾に検証コマンドを持つ。仕様変更時は該当文書を同じPRで更新すること。

## 多層防御マップ

```
[ブラウザ]
  ├─ CSP / セキュリティヘッダ ……………… headers-csp.md
  └─ （クライアント検証はUX用。信用しない）
[Next.js Server Actions]
  ├─ 入力検証（長さ・空・形式） ………… rate-limiting-validation.md
  ├─ レート制限（60秒12件） ……………… rate-limiting-validation.md
  └─ メンバーシップ確認（myMembershipId）
[Supabase / Postgres]
  ├─ RLS（全15表・authenticatedのみ）…… rls-policies.md
  ├─ テナント分離（church_id）…………… tenant-isolation.md
  ├─ 匿名の不変条件（3層）……………… anonymity.md
  ├─ 列レベルGRANT / definer関数 ……… rls-policies.md
  └─ 整合性トリガー ……………………… tenant-isolation.md
[運用]
  ├─ Egress/コスト管理 …………………… egress-cost.md
  ├─ バックアップ（scripts/backup-db.sh）incident-response.md
  └─ インシデント対応 …………………… incident-response.md
```

## 文書一覧

| 文書 | 内容 |
|---|---|
| [tenant-isolation.md](tenant-isolation.md) | church_id による教会間分離の仕組みと検証 |
| [rls-policies.md](rls-policies.md) | RLSポリシー台帳・権限モデル・definer関数 |
| [anonymity.md](anonymity.md) | 匿名投稿の不変条件（★変更禁止事項） |
| [headers-csp.md](headers-csp.md) | セキュリティヘッダとCSPの設計 |
| [rate-limiting-validation.md](rate-limiting-validation.md) | レート制限と入力検証 |
| [egress-cost.md](egress-cost.md) | Egress増大の原因と対策（LIMIT・射影） |
| [auth.md](auth.md) | 認証設計・パスワードポリシー・HIBP |
| [incident-response.md](incident-response.md) | インシデント対応・バックアップ/リストア |

## 一括検証

```bash
npm run db:reset && npm run db:test   # pgTAP 125件（RLS/匿名/分離/権限剥奪の回帰）
npm run typecheck && npm run lint && npm test
supabase db advisors --linked --level error --fail-on error  # 本番アドバイザ
```
