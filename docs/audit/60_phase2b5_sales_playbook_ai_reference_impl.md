# 60. Phase 2-B-5 — SalesPlaybookEntry AI参照の最小実装（判定 GO・commit-only）

> 実装ミッション（doc59 の設計どおり・AI参照候補に営業プレイブックを追加＋smoke 18本目）。
> **schema変更なし・migrationなし・seed変更なし・rbac/labels変更なし・package/lock変更なし。**
> **本番確認は未実施**（push も未実施・commit-only）。**AI が本番接続確認したものではない**。GO済み基準は Phase 2-B-4 / `26a7a30` のまま。

---

## 1. 非エンジニア向け要約

- **AIが営業プレイブック（売り方の型）を読めるようになりました**: ナレッジ検索で質問すると、関係する営業プレイブックが AI の回答材料になり、「参照した会社の頭脳」に参照元として表示されます。
- **読むだけです**: AIは営業プレイブックを書き換えられません・消せません（書き込みは 2-B-4 のまま人間専用）。
- **読んだら必ず記録**: どのプレイブックを参照したかが監査ログ（ai_reference）にレコード単位で残ります。
- **外部AIには出ません**: 営業プレイブックは全件「外部AI送信禁止」のままで、許可するボタンも存在しないため、外部LLM時は構造的にゼロです。
- 検証はすべて green（テスト211・型・lint・build・**smoke 18/18**・既存17本回帰なし）。まだローカル commit のみで、push・本番確認はこれからです。

## 2. 変更内容

| # | ファイル | 内容 |
|---|---|---|
| 1 | `apps/web/lib/company-brain-reference.ts` 編集 | AI参照候補の3テーブル目として SalesPlaybookEntry を追加（doc59 §5 どおり）。**read-only**（create/update/delete/upsert 不使用）。where は `{ tenantId, archivedAt: null, label: { in: AI_READABLE_LABELS } }`（**NORMAL / INTERNAL** のみ）・**canAccessLabel** を通す・select は必要最小限（sourceNote は AI context に入れない）。score対象= title/category/playbookType/targetIndustry/targetSituation/objection/recommendedTalkTrack/tags/body。文脈化は `【営業プレイブック/切り口】…` のように playbookType を明示し、**objection は「想定反論:」・recommendedTalkTrack は「推奨トーク:」・doNotSay は「言わない:」プレフィックス**（AIが禁止例を肯定文として引用しないため）。text は既存 CONTEXT_TEXT_LIMIT（800字）で切る。**relatedPolicyIds / relatedProductCatalogItemIds（related IDs）は未展開**（doc59 §4・将来拡張）。**MAX_PER_TABLE=3 維持・MAX_TOTAL=5維持**（3テーブルの候補から上位5件・合計上限は増やさない）。**外部LLM時の既存ゲート維持: externalAiAllowed=true のみ＋maskText 必須＝true UI が無いため外部LLM時は構造的にゼロ** |
| 2 | `apps/web/tests/e2e/smoke.spec.ts` 編集 | **18本目を追加**（+9行のみ・既存17本は1文字も変更なし・skip/only/fixme なし）: ナレッジ検索「美容室 予約 導線 切り口」→ AIの回答＋「参照した会社の頭脳」＋seed の「美容室向け・予約導線の切り口」が参照元に表示されることを確認 |

- **条件付き許可ファイルは触っていない**: `knowledge/search/page.tsx`・`apps/web/lib/audit.ts`・`apps/web/lib/db.ts` はいずれも**変更なし**。CompanyBrainReference の entityType union 拡張（'SalesPlaybookEntry' 追加）は型定義元（helper 側）のみで完結し、参照記録ループは entityType を透過的に扱うため、**writeAIDataAccess / writeDataAccess は既存のまま流用**できた（doc59 §5 の見込みどおり）。
- これにより **ai_reference は SalesPlaybookEntry についても、CompanyPolicy / ProductCatalogItem と同じ粒度（参照レコードごと1件・purpose は質問先頭80字のみ・本文/PII なし）で自動記録**される。

## 3. 検証結果（全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DB URL localhost 確認（値非表示） | ✅ |
| 2 | pnpm db:generate | ✅ |
| 3 | pnpm test | ✅ **211 passed（23 files）** |
| 4 | pnpm typecheck | ✅ exit 0 |
| 5 | pnpm lint | ✅ exit 0 |
| 6 | SKIP_DB_SETUP=1 pnpm build | ✅ Compiled successfully |
| 7 | PostgreSQL 起動 → pnpm db:migrate:deploy | ✅ **No pending migrations**（schema変更なしの裏付け） |
| 8 | pnpm db:seed（ローカルDBのみ・seed.ts は無変更） | ✅ playbooks: 6 |
| 9 | production server 起動 → /login HTTP 200 | ✅ 200 |
| 10 | Playwright smoke | ✅ **18/18 green（17.8s）・既存17本回帰なし・18本目 green** |
| 11 | 後片付け（server・PostgreSQL 停止） | ✅ 完了 |

- 検証コマンドの RED: **0回**。編集ミス1回（smoke 追記時に本文が重複）を検証実行前に自己検知して即修正（記録のため明記）。

## 4. 安全境界の遵守

- **read-only**: AI は営業プレイブックを参照するのみ。**AI mutation なし**（`brain/playbooks/actions.ts` 無変更・isHumanUser の人間専用書き込みは 2-B-4 のまま）。
- **tenantId スコープ・archivedAt:null・NORMAL/INTERNAL のみ・canAccessLabel・高機密ラベルは扱わない**。
- **externalAiAllowed ゲート＋maskText 維持＝外部LLM時は構造的にゼロ**（true にする UI なし・解禁していない）。
- **schema変更なし・migrationなし・seed変更なし・rbac/labels変更なし・package/lock変更なし**・env/vercel.json 無変更・Server Action 追加なし。
- 外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・**ENSHiN OS外部発信なし**・**Phase 8なし**・MCP/API公開なし・本番DB操作なし。
- **push なし（commit-only）**。

## 5. 判定と次アクション

- **判定: GO（Phase 2-B-5 実装完了・smoke 18/18 green・commit-only）。**
- **本番確認は未実施**のため、**GO済み基準は Phase 2-B-4 / `26a7a30` のまま昇格しない**。
- 次アクション（いずれも別承認）:
  1. 本 commit の push-only（feature＋main）。
  2. 本番確認（doc49 の型・利用者実測・doc61 候補）: **本番に実在する営業プレイブックで確認**（2-B-4 GO済みの本番UIで作成→検索→「参照した会社の頭脳」に表示→監査ログに SalesPlaybookEntry の ai_reference→既存検索無回帰）。
  3. 本番確認 GO 後に **Phase 2-B 全体クローズ判定**。
- 参照: 設計=doc59／前例実装=doc45／本番確認の型=doc49／書き込み側=doc57・doc58。
