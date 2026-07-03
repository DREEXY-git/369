# 44. Phase 2-A-3c-1 — Company Brain AI参照経路＋writeDataAccess 設計（docs-only）

> docs-only / design record。**コード実装・schema変更・migration・RBAC/labels変更・DB操作は一切なし（実装なし）。**
> フェーズ: Phase 2-A-3c-1 / 現在位置は git refs を正とする。
> 前提: 設計=doc33／schema=doc34／read-only=doc36／書き込み=doc39〜43（すべて本番確認GO済み）。

---

## 1. 非エンジニア向け要約

- Company Brain（会社方針＋商品カタログ）は、**人間が育てられる状態まで本番確認込みで完了**しました。
- 次は「**AI が会社の頭脳を読んで、回答や提案に活かす**」段です。ただし読ませる前に、**誰が（どのAIが）・いつ・何を読んだかを記録する仕組み（writeDataAccess）**と、**外部のAIサービスに勝手に送らない仕組み**を先に設計しておく必要があります。
- **今回は設計だけです。実装はしません。** 実装は Phase 2-A-3c-2 以降の個別承認です。

## 2. 現在地

- CompanyPolicy / ProductCatalogItem: 作成・編集・アーカイブまで**本番確認GO済み**（最新GO済み基準: Phase 2-A-3b-2 / `aa40f2f`）。
- **writeDataAccess（Company Brain 向け）: 未実装**。**AI参照経路: 未実装**。
- **高機密ラベルは未解禁**（書き込みは NORMAL/INTERNAL のみ）。**externalAiAllowed を true にする UI は存在しない**（全レコード false）。
- AI mutation禁止（isHumanUser）は両テーブルの actions で有効。priceNote は課金に未接続。

## 3. read-only 監査結果（実コード実測）

| # | 対象 | 実測結果 |
|---|---|---|
| 1 | `maskText`（packages/shared/src/masking.ts:43） | メール・電話・健康/家族キーワードをマスクする実装が存在。`ai-safety.ts`・`packages/ai/src/tasks.ts` で使用実績あり |
| 2 | `canAccessLabel(roleKeys, label)`（labels.ts） | ラベル別許可ロール表 `LABEL_ALLOWED_ROLES` で判定。**NORMAL / INTERNAL は AI_AGENT / AI_ASSISTANT も閲覧可**の既存設計。ナレッジ検索で実使用中 |
| 3 | `writeDataAccess`（apps/web/lib/db.ts） | DataAccessLog へ記録（tenantId / actorId / actorType / entityType / entityId / label / **action** / purpose / aiAgentId / llmCallLogId / metadata）。**`action: 'ai_reference'` が型に定義済み** |
| 4 | `writeAIDataAccess`（apps/web/lib/audit.ts） | `writeDataAccess` の薄いラッパー（action='ai_reference'・actorType 既定 'ai_agent'）。**AI参照ログの既存パターンが存在** |
| 5 | 既存のAI参照ログ実績 | leadmap 分析・marketing campaign・DX opportunity・**ナレッジ検索**で writeDataAccess 使用中 |
| 6 | ナレッジ検索（apps/web/app/(app)/knowledge/search/page.tsx） | **AI参照の完成形パターンが既に存在**: `safeAiInput`（命令注入ガード）→ tenantId＋active フィルタ → `canAccessLabel` フィルタ → embedding 順位付け → `answerKnowledgeQuestion`（contexts 注入）→ `writeAIDataAccess` → RetrievalLog＋AnswerCitation（**参照元の保存と表示**） |
| 7 | `getLLMProvider`（packages/ai/src/providers/index.ts） | **env キー未設定なら必ず FakeLLM（ローカル・外部送信なし）**。OpenAI/Anthropic キー設定時のみ外部LLM送信が発生し得る |
| 8 | Company Brain 現状 | writeDataAccess 呼び出しなし（コメント言及のみ）・AI mutation禁止有効・archivedAt/label/externalAiAllowed カラム利用可能 |
| 9 | 外部LLM送信リスク | 現構成（キー未設定=FakeLLM）では**外部送信は構造的に発生しない**。リスクが生じるのは実キー設定時のみ → 設計で externalAiAllowed ゲートを先に固定する価値がある |
| 10 | ENSHiN OS外部発信リスク | Company Brain は外部発信機能と未接続。本設計でも接続しない（口コミ投稿・SNS投稿・顧客の声公開への経路は作らない） |

## 4. 設計原則（12箇条）

1. **AIは書けない・消せないまま**（mutation は人間専用・rbac 無変更）。
2. **AI参照は read-only**（参照経路から create/update/delete を呼ばない）。
3. **tenantId スコープ必須**。
4. **archivedAt: null のみ**（アーカイブ済みは AI に読ませない）。
5. **第一段では label は NORMAL / INTERNAL のみ**（`canAccessLabel` を必ず通す）。
6. **高機密ラベルは対象外**（writeDataAccess とマスキング設計が固まり、別承認が出るまで）。
7. **externalAiAllowed=false のデータを外部LLMへ送らない**（下記 §5 の分岐）。
8. **外部LLMへ送る場合は maskText を必ず通す**（送信直前に適用）。
9. **AIが何を参照したか writeDataAccess（action='ai_reference'）に残す**。
10. **参照元を出力に明示する**（既存 AnswerCitation パターンの流用）。
11. **ENSHiN OS外部発信・口コミ投稿・SNS投稿・顧客の声公開には接続しない**。
12. **Phase 8課金には接続しない**（priceNote の非接続も維持）。

## 5. 参照対象案（第一段）

**対象**: CompanyPolicy＋ProductCatalogItem／`tenantId` 一致／`archivedAt: null`／label は NORMAL・INTERNAL のみ（`canAccessLabel(user.roles, label)` を通す）。

**externalAiAllowed の扱い（3層分岐）**:

| 経路 | 可否 |
|---|---|
| アプリ内表示・内部参照（FakeLLM 含む。FakeLLM はローカル実行のため**外部送信に該当しない**、と整理） | **read 可**（NORMAL/INTERNAL のみ） |
| 外部LLM送信（実キー設定時の OpenAI/Anthropic） | **externalAiAllowed=true かつ maskText 済みのみ**。現在 true にする UI が無いため、**外部LLMへ Company Brain 本文を送る実装は原則 HOLD**（実キー設定時は注入対象が空になる=安全側デフォルト） |
| 実装の優先順 | まず「**参照候補の取得＋監査ログ（writeDataAccess）設計**」を先に実装し、外部送信の解禁は 3c-5 の人間判断に送る |

## 6. writeDataAccess 設計案

- **記録単位（推奨）**: AI実行1回につき、**参照した Company Brain レコードごとに1件**記録（entityType='CompanyPolicy' or 'ProductCatalogItem'・entityId=レコードid・label=レコードの label・action='ai_reference'・actorType='ai_agent'・purpose='ナレッジ検索: <質問の先頭80字>'）。参照は上位数件（例: 最大5件）に絞られるため件数爆発しない。
- **代替案**: 実行1回=1件（entityType='CompanyBrainReference'・metadata に参照id配列）。集計は軽いが「どのレコードを読んだか」の直接検索性が落ちる。→ **粒度は人間判断（§9）**。
- **既存パターンとの整合**: `writeAIDataAccess`（action='ai_reference'）をそのまま流用。summary/purpose に**本文・価格メモ・PIIを入れない**（質問文の先頭のみ）。
- **失敗・ブロック時**: `safeAiInput` でブロックされた場合は AI 参照自体が発生しないため記録しない（ブロックは既存 ai-safety ログ側に残る）。参照後に LLM 呼び出しが失敗した場合も「参照した事実」は記録する（読んだことは事実のため）。
- **役割分担**: writeAudit=変更の記録（誰が書き換えたか）／writeDataAccess=参照の記録（誰が・AIが読んだか）。Company Brain は 3b で前者を実装済み・3c で後者を追加する。

## 7. 最初に接続するAIタスク候補（比較と推奨）

| 候補 | 外部送信リスク | 本番影響 | E2E容易性 | writeDataAccess確認 | ユーザー価値 | ENSHiN外部発信直結 |
|---|---|---|---|---|---|---|
| **ナレッジ検索（answerKnowledgeQuestion）** | 低（回答は画面内・送信なし） | 小（既存画面の文脈が増えるだけ） | ◎（smoke 11本目が既にこの画面） | ◎（既存 writeAIDataAccess 併設） | ◎（方針・商品が回答に反映） | しない |
| 営業メール下書き（generateOutreachDraft） | **中**（OutreachDraft は外部送信前提の成果物） | 中 | ○ | ○ | ◎ | 間接的に近い |
| 会議要約 | 低 | 小 | △（アップロード経由） | ○ | △ | しない |
| 会社方針Q&A（新画面） | 低 | **新画面追加=面が増える** | ○ | ○ | ○ | しない |

**推奨（1つに絞る）: ナレッジ検索**。理由: ①参照の完成形パターン（ラベルフィルタ・ai_reference ログ・引用表示・注入ガード）が既にこの画面に揃っており、**最小差分＝Company Brain を検索対象に加えるだけ**で成立する ②成果物が画面内回答で外部送信と切り離されている ③smoke で最も検証しやすい。営業メール下書きは価値が高いが、外部送信系成果物への注入は externalAiAllowed 解禁の議論（3c-5）とセットで扱うべきで第一段には選ばない。

## 8. Phase 2-A-3c-2 以降の分割案

| 段 | 内容 | 承認ポイント |
|---|---|---|
| **3c-2** | 参照候補取得ヘルパー（tenantId・archivedAt:null・canAccessLabel・NORMAL/INTERNAL）＋ **writeDataAccess（ai_reference）記録の最小実装** ＋ ナレッジ検索への Company Brain 文脈注入（外部LLM時は externalAiAllowed ゲートで注入対象が空になる安全側実装）＋ smoke 15本目 | 実装承認（本設計の粒度確定後） |
| 3c-3 | （3c-2 を取得+記録のみに絞った場合）1タスクへの文脈注入 ※3c-2 に注入まで含める案を推奨・分割するかは人間判断 | 実装承認 |
| 3c-4 | 本番確認（利用者実測・doc番号は実行時の最新） | 実測GO/HOLD |
| 3c-5 | 高機密ラベル解禁・externalAiAllowed true UI・外部LLM送信の判断 | **別途の重い承認**（マスキング水準・同意設計込み） |

## 9. 人間判断が必要な未決定事項

1. **最初に接続するAIタスク**（推奨=ナレッジ検索。営業メール下書きを選ぶ場合は 3c-5 の議論を前倒しする必要）。
2. **externalAiAllowed=false の内部参照可否**（推奨=可。FakeLLM・画面内表示は外部送信ではないという §5 の整理を承認するか）。
3. **外部LLM送信をいつ解禁するか**（3c-5。実キー運用開始と同時にゲート実装を必須化）。
4. **writeDataAccess の粒度**（推奨=レコードごと1件。代替=実行ごと1件）。
5. **参照元をユーザー画面にどこまで表示するか**（推奨=既存 AnswerCitation 同等の「参照元タイトル表示」）。
6. **高機密ラベルをいつ扱うか**（3c-5 以降・別承認）。
7. **ENSHiN OS 連携をいつ始めるか**（本設計では接続しない。資料提供と許諾管理設計が前提）。

## 10. 今回やっていないこと

**実装なし**・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・labels変更なし・**AI参照実行なし**・**writeDataAccess実行なし**・**外部LLM送信なし**（externalAiAllowed=false データを外部LLMへ送っていない）・外部発信なし・**SNS投稿なし**・**口コミ投稿なし**・顧客の声公開なし・課金なし・Phase 8なし。

## 11. 判定

- **設計 GO（docs-only・Phase 2-A-3c-1 完了）。**
- 次: 本設計の main 反映（push-only・別承認）→ §9 の人間判断（特に①④）→ **Phase 2-A-3c-2 の実装承認判断**（別承認）。
