# 54. Phase 2-B-3 — SalesPlaybookEntry read-only 可視化（判定 GO・commit-only）

> 実装ミッション（seed＋read-only 一覧＋ナビ＋smoke 16本目）。**schema・migration・rbac・labels・package/lock は無変更。**
> フェーズ: Phase 2-B-3 / 現在位置は git refs を正とする。
> 前例: 2-A-3a（doc36・Company Brain read-only 可視化）と同じ型。設計の正: doc51。
> **本番確認は未実施**（push も未実施・commit-only）。GO済み基準は Phase 2-B-2 / `811b8c6` のまま。

---

## 1. 非エンジニア向け要約

- 営業プレイブック（売り方の型）が**初めて画面で見える**ようになりました: 架空のデモデータ6件＋閲覧専用の一覧画面＋ナビの1行。
- **閲覧のみ**です。作成・編集・アーカイブのボタンはどこにもありません（書き込みは 2-B-4 の別承認）。AIもまだ読みません（AI参照は 2-B-5 の別承認）。
- 検証はすべて green（テスト211本・型チェック・lint・build・**smoke 16/16**・既存15本回帰なし）。
- まだローカルの commit だけで、push・本番反映・本番確認はこれからです。

## 2. 変更内容

| # | ファイル | 内容 |
|---|---|---|
| 1 | `packages/db/prisma/seed.ts` | SalesPlaybookEntry の架空デモデータ **6件** を追加（追記のみ・既存 seed 無変更）。**playbookType 4種を網羅**: approach 2件・objection 2件・preparation 1件・talk_track 1件。全件 tenantId スコープ・**label は NORMAL / INTERNAL のみ**・**externalAiAllowed=false**・archivedAt 未設定。**PII・実顧客名・実会社名・成果数値・実価格・口コミ・顧客の声・testimonial・SNS投稿素材・外部公開素材: ゼロ**。doNotSay に安全サンプル（No.1表記を使わない・効果保証をしない・誇大広告表現を避ける）。件数ログに `playbooks` を追加 |
| 2 | `apps/web/app/(app)/brain/playbooks/page.tsx` | **read-only 一覧（新規）**。requireUser＋knowledge:read＋tenantId スコープ・archivedAt:null のみ表示。表示: title/body要約/category/playbookType（日本語ラベル）/targetIndustry/targetSituation/recommendedTalkTrack/doNotSay/tags/label（既存 LABEL_BADGE 流用）。**作成・編集・削除・アーカイブ・Server Action・ボタン: 一切なし**。「この画面は閲覧のみです。」を明記 |
| 3 | `apps/web/components/shell/nav.ts` | 「会議・ナレッジ」内・「会社の頭脳」直下に**1行だけ**追加: 営業プレイブック → /brain/playbooks（icon は既存 import の BookText を流用・新分類なし・権限は既存 Company Brain read-only と同じ扱い） |
| 4 | `apps/web/tests/e2e/smoke.spec.ts` | **末尾に16本目を1本だけ追加**（既存15本は無変更・削除行ゼロ・skipなし）: login → /brain/playbooks → 見出し表示 → seed 固有タイトル「美容室向け・予約導線の切り口」表示 → 「この画面は閲覧のみです。」表示 → **「新規作成」リンク0件・「アーカイブ」ボタン0件**（read-only の確認） |

## 3. 検証結果（全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DB URL localhost 確認（値非表示） | ✅ DATABASE_URL / DIRECT_URL とも localhost |
| 2 | pnpm db:generate | ✅ |
| 3 | pnpm test | ✅ **211 passed（23 files）** |
| 4 | pnpm typecheck | ✅ exit 0 |
| 5 | pnpm lint | ✅ exit 0 |
| 6 | SKIP_DB_SETUP=1 pnpm build | ✅ Compiled successfully・`/brain/playbooks` ルート生成確認 |
| 7 | ローカル PostgreSQL 起動 → pnpm db:migrate:deploy | ✅ No pending migrations（新migration作成なしの確認を兼ねる） |
| 8 | pnpm db:seed（ローカルDBのみ） | ✅ **playbooks: 6**（policies:5 / catalogItems:8 は既存どおり） |
| 9 | production server 起動 → /login HTTP 200 | ✅ 200 |
| 10 | Playwright smoke | ✅ **16/16 green（13.0s）・既存15本回帰なし** |
| 11 | 後片付け（server 停止・PostgreSQL 停止） | ✅ 完了 |

- 修正ループ: 実装・検証とも **0回**（後片付けの server 停止コマンドの1回目が wrapper プロセスのみ停止となり2回に分けて停止したが、検証結果には無関係）。
- **本番確認は未実施**。**AI が本番接続確認したものではない**（本番には一切触れていない。ローカルDBのみ）。

## 4. 安全境界の遵守

- **read-only 厳守**: create/update/archive/delete・Server Action・writeAudit・writeDataAccess・ai_reference: **実装なし**（2-B-4／2-B-5 の別承認）。
- company-brain-reference.ts への AI参照追加: **なし**（AIはまだ営業プレイブックを読まない）。
- schema.prisma・migrations・rbac.ts・labels.ts・package/lock・.env・vercel.json: **無変更**。
- seed は**架空データのみ・externalAiAllowed=false のみ・NORMAL / INTERNAL のみ**。
- **口コミ投稿なし・SNS投稿なし・顧客の声公開なし**・推薦コメント掲載なし・**ENSHiN OS 外部発信なし**・外部送信なし・実メール送信なし。
- **Phase 8なし**・MCP/API公開なし・本番DB操作なし。
- **push なし（main も feature も未実施・commit-only）**。

## 5. 判定と次アクション

- **判定: GO（Phase 2-B-3 実装完了・smoke 16/16 green・commit-only）。**
- 「最新の本番確認GO済みプロダクト基準」は **Phase 2-B-2 / `811b8c6` のまま**（本番確認前のため昇格しない）。
- 次アクション（いずれも別承認）:
  1. 本 commit の push-only（feature＋main）。**本番の seed は自動実行されないため、本番の一覧は空で表示されるのが正常**（2-A-3a の前例。doc49 の「本番に実在するデータで確認」原則に従い、本番確認の GO 条件は「画面が開き空一覧＋既存画面無回帰」とする）。
  2. 本番確認（doc49 の型・利用者実測・doc55 候補）。
  3. **Phase 2-B-4（人間書き込み: 作成・編集・アーカイブ＋writeAudit＋AI mutation禁止）の承認判断**。
- 参照: 設計=doc51／schema=doc52／本番確認の型=doc49／read-only 可視化の前例=doc36。
