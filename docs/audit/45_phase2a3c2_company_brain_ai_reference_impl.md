# 45. Phase 2-A-3c-2 — Company Brain AI参照（取得＋ai_referenceログ＋ナレッジ検索注入）実装記録

> doc44（設計）に基づく最小実装。**対象はナレッジ検索（/knowledge/search）のみ**。
> フェーズ: Phase 2-A-3c-2 / 現在位置は git refs を正とする。
> **本番確認は未実施**（push も未実施。commit-only・push は別承認）。

---

## 1. 非エンジニア向け要約

- **AI が初めて「会社の頭脳」を読んで回答に活かせるようになりました**（ナレッジ検索だけ）。
- 質問に関係する会社方針・商品カタログが見つかると、AI の回答材料に加わり、画面に**「参照した会社の頭脳」**として何を読んだかが表示されます。
- **AI が読んだ記録は、レコードごとに機密参照ログ（ai_reference）に残ります**（誰の操作で・どの方針/商品を・何の目的で読んだか）。
- **外部のAIサービスには送りません**: 外部LLM使用時は「外部AI送信が許可されたデータのみ・マスキング済みのみ」注入する仕組みで、現在許可データはゼロのため**外部送信は構造的にゼロ**です。
- E2E smoke は **15/15 green**（既存14本回帰なし）。**判定: GO（実装）**。本番確認は次の段取りです。

## 2. 実装範囲（§0 人間判断の遵守）

| §0 確定値 | 実装 |
|---|---|
| FIRST_AI_TASK=ナレッジ検索のみ | `/knowledge/search` のみに注入。営業メール下書き・SNS・口コミ・外部発信・ENSHiN OS には未接続 |
| 粒度=レコードごと1件 | 参照した CompanyPolicy / ProductCatalogItem **1件につき writeDataAccess 1件** |
| action=ai_reference | 既存 `writeAIDataAccess`（action='ai_reference'）を流用 |
| ACTOR_SEMANTICS | **既存ナレッジ検索の実装を優先**: actorId=user.userId・actorType='user'（既存の KnowledgeSearch ログと同一）。doc44 は actorType='ai_agent' 案だったが、「人間の操作を起点に AI が参照した」ことを表す既存パターンとの一貫性を優先（§0 の指示どおり既存コード優先・本書に理由を記録）。schema 変更なし |
| EXTERNAL_LLM_GATE | helper 内で `isExternalLlmEnabled()`（既存関数・provider.name!=='fake'）を判定。**外部LLM時は externalAiAllowed=true のみ注入＋maskText 適用**。true にする UI が無いため外部LLM時の注入はゼロ（安全側デフォルト）。FakeLLM はローカル実行＝外部送信に該当しない |
| 参照元表示 | 回答画面に「参照した会社の頭脳（N件）」として種別バッジ＋タイトル＋機密ラベルを表示 |
| HIGH_LABEL_POLICY | クエリ自体を `label: { in: ['NORMAL','INTERNAL'] }` で絞り、さらに `canAccessLabel(user.roles, label)` を通す（高機密は扱わない） |

## 3. 実装内容

### 3-1. 参照候補取得ヘルパー（`apps/web/lib/company-brain-reference.ts`・新規）

- **read-only**（create/update/delete を一切呼ばない）。tenantId・archivedAt:null・NORMAL/INTERNAL・canAccessLabel。
- 順位付けは**決定的な簡易一致**（タイトル包含ボーナス＋質問文の2-gram一致数・LLM不使用）。閾値未満は除外・CompanyPolicy 最大3件＋ProductCatalogItem 最大3件・合計最大5件・文脈テキストは800字上限。
- 戻り値は「contexts（AI注入用テキスト）」と「references（表示・ログ用のid/タイトル/ラベル）」を分離。**purpose/metadata に本文・priceNote・PII を入れない構造**。
- priceNote は文脈化の際「説明のみ・請求や課金には使わない」と明記した形で含める（計算・請求・課金・見積・会計への接続なし）。

### 3-2. ナレッジ検索ページへの最小注入（`knowledge/search/page.tsx`・改修）

- **既存を壊さない**: safeAiInput ガード・KnowledgeChunk 検索・embedding 順位付け・answerKnowledgeQuestion・既存 writeAIDataAccess・RetrievalLog/AnswerCitation は無変更のまま。
- 追加は3点のみ: ①`getCompanyBrainReferences` の呼び出しと contexts への追加 ②**参照レコードごとの writeAIDataAccess(ai_reference) 記録**（purpose='ナレッジ検索: <質問先頭80字>'・本文なし）③「参照した会社の頭脳」表示セクション（参照ゼロなら非表示）。

### 3-3. E2E smoke（1本追加のみ・15本体制）

- 末尾に「ナレッジ検索で会社の頭脳の参照元が表示される」を追加: `?q=値引き承認ルール` → AIの回答表示＋**参照した会社の頭脳**表示＋seed 固有タイトルの表示を確認。
- **既存14本は1行も変更していない**（skip・削除・期待値変更なし）。

## 4. 検証結果（ローカル・全green・修正ループ0回）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DATABASE_URL / DIRECT_URL localhost 判定（値非表示） | ✅ true |
| 2 | `pnpm db:generate` | ✅ green |
| 3 | `pnpm test` | ✅ **211/211 passed** |
| 4 | `pnpm typecheck` / `pnpm lint` | ✅ green |
| 5 | `pnpm build`（SKIP_DB_SETUP=1） | ✅ green |
| 6 | PG起動 → `pnpm db:migrate:deploy` | ✅ pending なし（新migrationなし） |
| 7 | `pnpm db:seed` | ✅ policies:5 / catalogItems:8 |
| 8 | `pnpm start` → `/login` 200 | ✅ |
| 9 | E2E smoke | ✅ **15/15 green（11.5s）・既存14本回帰なし** |
| 10 | 後片付け（server / PostgreSQL 停止） | ✅ 完了 |

## 5. 変更していないもの（安全境界）

- schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・package/lock・brain/**（書き込みAction含む）・packages/ai の provider: **無変更**
- **AI mutation なし**（参照は read-only。作成・編集・アーカイブ経路には一切触れていない）
- **外部LLM送信なし**（externalAiAllowed=false データを外部LLMへ送っていない。FakeLLM はローカル）
- **高機密ラベル未対応のまま**（NORMAL/INTERNAL のみ）
- externalAiAllowed=true にする UI: **なし**
- **ENSHiN OS 外部発信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・推薦コメント掲載なし**
- **Phase 8（課金）なし**・MCP/API公開なし・本番DB操作なし

## 6. 次段へ送るもの

- **本番確認は未実施**（push → 利用者実測が次。doc46 候補）。
- 高機密ラベル対応・externalAiAllowed true UI・外部LLM送信の解禁（3c-5・重い承認）。
- 他AIタスク（営業メール下書き等）への展開・参照精度の向上（embedding化）は後続候補。

## 7. 判定

- **GO（Phase 2-A-3c-2 実装完了・smoke 15/15 green・commit-only）。**
- 「最新の本番確認GO済みプロダクト基準」は **Phase 2-A-3b-2 / `aa40f2f` のまま**（本実装は本番確認前のため昇格しない）。
- 次: feature push＋main push（いずれも別承認）→ 本番確認 → 3c-5 判断。
