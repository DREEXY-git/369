# 59. Phase 2-B-5-ENTRY — SalesPlaybookEntry AI参照追加の設計確認（docs-only・判定 READY / GO）

> Phase 2-B-5（AIが営業プレイブックを読む段）の**実装前設計確認**。今回は **docs-only** であり、**実装なし・コード変更なし・schema変更なし・migrationなし・DB変更なし・pushなし**。
> 本書は repo の read-only 確認に基づく設計であり、**AI が本番接続確認したものではない**。
> 前例: 2-A-3c-1 設計（doc44）→ 2-A-3c-2 実装（doc45）→ 本番 HOLD→GO（doc46/47）。設計の正: doc51 §6。

---

## 1. 非エンジニア向け要約

- 次の Phase 2-B-5 は「**AIが営業プレイブック（売り方の型）を読んで、ナレッジ検索の回答に活かせるようにする**」段階です。今回はその**実装前の安全設計だけ**を確定しました。まだAIは営業プレイブックを読みません。
- 結論: **会社方針・商品カタログで実証済みの既存 AI 参照の仕組み（2-A-3c-2）に、3つ目のテーブルとして追加するだけで実現できます**。新しい仕組み・schema変更・migration は不要です。
- 安全の型も既存と同一: 読み取り専用・自テナントのみ・アーカイブ済み除外・機密2ラベルのみ・参照のたびに監査ログ・外部AI送信は封印のまま（構造的にゼロ）。
- **判定: READY / GO**（実装は別承認。承認されれば変更は実質1ファイル＋テスト1本の最小差分）。

## 2. 現在地

- Phase 2-B: 設計（2-B-1/doc51）→ schema（2-B-2/doc52・本番GO doc53）→ read-only（2-B-3/doc54・本番GO doc56）→ **人間書き込み（2-B-4/doc57・本番GO doc58）まで完全クローズ**。
- 最新の本番確認GO済みプロダクト基準: **Phase 2-B-4 / `26a7a30`**（本設計では変更しない）。
- Phase 2-B-5（AI参照）は**未着手**。本書はその入口レビュー。

## 3. 既存実装の read-only 確認結果（コードの事実）

| # | 確認対象 | 事実 |
|---|---|---|
| 1 | `apps/web/lib/company-brain-reference.ts` | AI参照候補の取得ヘルパー。**read-only**（create/update/delete 呼び出しゼロ）。CompanyPolicy＋ProductCatalogItem の2テーブル構成。`AI_READABLE_LABELS = NORMAL / INTERNAL` のみ・**tenantId** スコープ・**archivedAt:null** のみ・**canAccessLabel** を通す。決定的な簡易一致スコア（bigram・LLM不使用）で **各テーブル3件・合計5件上限・最低スコア3・本文800字上限** |
| 2 | 同上・外部LLM分岐 | `isExternalLlmEnabled()` が true の場合、**externalAiAllowed=true のレコードのみ注入し maskText を通す**。true にする UI が無いため**外部LLM時の注入は構造的にゼロ（安全側デフォルト）** |
| 3 | `knowledge/search/page.tsx` | 参照結果を LLM の contexts に追加し、「参照した会社の頭脳」セクションに**タイトルとラベルのみ表示**（本文は表示しない）。**参照レコードごとに writeAIDataAccess（accessType: ai_reference）を1件記録**。purpose は質問の先頭80字のみ（本文・PII を入れない） |
| 4 | `apps/web/lib/audit.ts` / `db.ts` | writeAIDataAccess / writeDataAccess は既存関数。accessType に `ai_reference` が定義済み。**流用可能・変更不要** |
| 5 | `schema.prisma` の SalesPlaybookEntry | title / body / category / playbookType / targetIndustry / targetSituation / objection / recommendedTalkTrack / doNotSay / tags / label（default INTERNAL）/ externalAiAllowed（**default false**）/ archivedAt を保持。**index [tenantId, label] あり**。AI参照に必要な材料はすべて揃っており **schema変更なし・migrationなしで実装可能** |
| 6 | `brain/playbooks/actions.ts` | 人間書き込みは isHumanUser で AI mutation禁止済み。**AI参照の追加はこの actions に一切触れない**（読む側と書く側は分離） |
| 7 | seed デモデータ | 営業プレイブック6件は全件 externalAiAllowed=false・NORMAL/INTERNAL のみ・PII/実価格/口コミ/顧客の声ゼロ（doc54） |

## 4. 2-A-3c-2 の流用可能点と SalesPlaybookEntry 固有の注意点

**流用できるもの（=新規に作らないもの）**: 取得ヘルパーの構造・ラベルゲート・canAccessLabel・外部LLMゲート＋maskText・スコアリング・件数上限・ai_reference 記録のループ・「参照した会社の頭脳」表示。

**SalesPlaybookEntry 固有の注意点**:
1. **doNotSay（言わないこと）の文脈化**: AIが禁止例を肯定文として引用しないよう、既存一覧画面と同じく「言わない: 〜」の**明示プレフィックス付き**で contexts に入れる（例: No.1表記・効果保証・誇大広告の禁止例）。
2. **relatedPolicyIds / relatedProductCatalogItemIds は解決しない**: ID配列の参照展開は今回のスコープ外（将来拡張。2重取得・件数超過を防ぐ）。
3. **playbookType を文脈ラベルに使う**: 「【営業プレイブック/切り口】…」のように種類を明示し、回答の根拠が「売り方の型」であることを分かるようにする。
4. **入力混入リスク**: 営業プレイブックは入力ガイドで顧客名・成果数値・口コミ・顧客の声を書かない運用だが、**人間の入力ミスで混入する可能性はゼロではない**。緩和策: (a) 内部AI参照でも本文は800字に切る既存上限 (b) 外部LLMへは externalAiAllowed=false 全件のため構造的に出ない (c) 画面表示はタイトルのみ (d) 万一の混入は人間の編集・アーカイブで即修正可能（2-B-4 で本番確認済み）。

## 5. 最小実装案（次回・別承認）

- **変更ファイルは実質1つ**: `apps/web/lib/company-brain-reference.ts` に SalesPlaybookEntry を3つ目の候補テーブルとして追加（entityType union に `'SalesPlaybookEntry'` を追加・スコア対象フィールド: title / category / playbookType / targetIndustry / targetSituation / objection / recommendedTalkTrack / tags / body）。
- `knowledge/search/page.tsx` は**変更不要の見込み**（参照ループは entityType を透過的に扱うため。型 union 拡張のみで ai_reference の entityType に `SalesPlaybookEntry` が記録される）。実装時に typecheck で確認する。
- **件数上限は据え置き**: MAX_PER_TABLE=3・**MAX_TOTAL=5 は変更しない**（3テーブル×3=9候補から上位5件。合計上限を増やさないのが安全側）。
- **監査ログ設計**: 既存 writeAIDataAccess を流用・**レコードごと1件**・accessType=ai_reference・**entityType='SalesPlaybookEntry'**・entityId・label・purpose=「ナレッジ検索: 質問先頭80字」（本文・PII なし）。CompanyPolicy / ProductCatalogItem と**同じ粒度**。
- **追加テスト**: smoke **18本目**「ナレッジ検索で営業プレイブックの参照元が表示される」（seed の「美容室向け・予約導線の切り口」を検索し、『参照した会社の頭脳』にタイトルが出ることを確認）。既存17本は無変更。
- **検証計画（実装時に全実行）**: db:generate → pnpm test（211＋）→ typecheck → lint → SKIP_DB_SETUP=1 build → ローカルPG起動→ migrate deploy「No pending migrations」→ seed → smoke 18/18 → 後片付け。
- **本番確認観点（doc49 の型・利用者実測・実装後の PROD ミッションで）**: 本番に実在する営業プレイブック（2-B-4 の GO で人間が作成可能）で検索 → AI回答＋「参照した会社の頭脳」に営業プレイブックのタイトル表示 → 監査ログに SalesPlaybookEntry の ai_reference → 既存検索・既存画面無回帰 → 外部送信なし。**2-A-3c-2 の HOLD の教訓（本番に実在するデータで確認する）を最初から適用**。
- **STOP条件（実装ミッション用）**: §0テンプレート未記入／期待SHA不一致／forbidden差分／同一エラー2回／検証RED を修正Loop 3回で解消できない場合。

## 6. 安全境界（実装時も維持するもの）

- **tenantId** スコープ必須・**archivedAt:null** のみ・label は **NORMAL / INTERNAL** のみ・**canAccessLabel** を通す・**高機密ラベルは扱わない**。
- **externalAiAllowed=false（全件・デフォルト）のため外部LLMへの営業プレイブック送出は構造的にゼロ**。外部LLM時は externalAiAllowed=true＋**maskText** 済みのみという既存ゲートをそのまま通す（true UI は作らない）。
- **AI mutation禁止は不変**: AI参照は read-only であり、作成・編集・アーカイブ（actions.ts）には一切触れない。rbac.ts・labels.ts も無変更。
- 外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・**ENSHiN OS 外部発信なし**・**Phase 8（実課金）なし**・MCP/API公開なし。

## 7. 今回やらないこと（docs-only の確認）

- **実装なし**（company-brain-reference.ts・knowledge/search とも未編集）・**AI参照の実行なし**・writeDataAccess/ai_reference の実装なし。
- **schema変更なし・migrationなし・seed変更なし**・rbac/labels/package/lock/.env/vercel.json 無変更。
- DB操作なし・本番接触なし・**外部LLM送信なし**・externalAiAllowed true 解禁なし・高機密ラベル対応なし。
- push なし（commit-only・main push は別承認）。

## 8. 判定と承認ゲート

- **判定: READY / GO**（設計確認として。2-A-3c-2 の実証済みの型に3テーブル目を足す最小差分で、未知の設計論点は残っていない）。
- **Phase 2-B-5 の実装には、人間の個別承認（実装ミッションのプロンプト貼付）なしに進まない。**
- 実装 → push-only → 本番確認（doc49 の型・doc60/61 候補）→ GO で Phase 2-B 全体クローズ判定、が残りの道筋。
- 併記（任意・別承認の改善候補）: CI 導入・安全境界の否定系テスト・doc49 script化。2-B-5 実装と独立に実施可能。

## 9. 次回実装プロンプト案（骨子）

> Phase 2-B-5 — SalesPlaybookEntry AI参照の最小実装。許可ファイル: `apps/web/lib/company-brain-reference.ts`・`apps/web/tests/e2e/smoke.spec.ts`（18本目追加のみ）・doc60・CURRENT_STATE・PROGRESS・vault 2件（knowledge/search/page.tsx は typecheck 上必要な場合のみ型対応の最小差分を許可）。安全境界: doc59 §6 のとおり。MAX_TOTAL=5 据え置き。検証: doc59 §5 の全項目。commit-only・push別承認。

- 参照: 設計の正=doc51 §6・doc44／実装前例=doc45／本番確認の型=doc49／書き込み側の現状=doc57・doc58。
