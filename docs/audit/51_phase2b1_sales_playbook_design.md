# 51. Phase 2-B-1 — SalesPlaybookEntry 設計案（docs-only・判定 GO）

> docs-only / 三段承認の第一段（設計）。**schema変更なし・migration なし・実装なし・DB操作なし。**
> フェーズ: Phase 2-B-1 / 現在位置は git refs を正とする。
> 前提: doc50（Phase 2-B-ENTRY・READY / GO）の推奨に基づく。既存2モデル（CompanyPolicy / ProductCatalogItem・schema.prisma 実定義）と doc33 §5 の素案を read-only で確認し、その流儀に合わせた設計案。

---

## 1. 非エンジニア向け要約

- **Sales Playbook は「売り方の型」を貯める棚**です: 業種別の切り口・営業トーク・よくある反論への返し方・提案前の確認ポイント。新人教育と営業準備にすぐ効きます。
- **顧客事例や顧客課題ではありません**。顧客名・会社名・成果数値・顧客の声を**最初から扱わない設計**にするので、Company Brain の次の一歩として最も安全です（doc50 の比較評価どおり）。
- **今回は設計だけ**です。データベースの変更（schema変更）も画面の実装もしません。次の Phase 2-B-2（schema変更）はあなたの別承認が必要です。

## 2. 現在地

- Phase 2-A（Company Brain foundation）正式完了（doc48）。Phase X-04 本番確認プレイブック完了（doc49）。Phase 2-B-ENTRY 完了（doc50・READY / GO）。
- 最新本番確認GO済みプロダクト基準: **Phase 2-A-3c-2 / `85f1bf3`**（本設計はこれを動かさない）。
- doc50 の推奨に従い、Company Brain 後続領域の最初は **Sales Playbook**（PII最遠・Phase 2-A の型を流用可）。

## 3. SalesPlaybookEntry の役割

**であるもの（社内ナレッジ）:**

- 営業の型（勝ちパターン・提案の流れ）
- 業種別の切り口（例:「美容室には予約導線の改善から入る」）
- 商品別の売り方（どの商品を・どんな課題の相手に・どう提案するか）
- よくある反論への返し方（反論対応）
- 提案前の確認ポイント（ヒアリング項目・NG事項）
- 新人教育・営業準備のための社内共有知

**ではないもの（明示的にスコープ外）:**

- 顧客事例ではない（→ Case Study 領域・後続別承認）
- 顧客の声ではない・testimonial ではない
- 口コミではない・口コミ投稿の素材ではない
- SNS投稿案ではない・外部公開素材ではない・実名掲載素材ではない
- 見積・請求・価格計算ではない（price / invoice / billing / quote / accounting に接続しない）

## 4. 推奨フィールド案（次の schema 設計候補。**今回は schema変更なし**）

既存 CompanyPolicy / ProductCatalogItem（schema.prisma 実定義）の流儀に合わせる:

| フィールド | 型（案） | 説明 |
|---|---|---|
| id | String @id cuid | 既存2モデルと同じ |
| tenantId | String（スカラ・relation なし） | **必須**。全クエリでスコープ。Tenant への relation は張らない（repo 規約） |
| title | String | 型の名前（例: 美容室向け・予約導線の切り口） |
| body | String | 型の本文（手順・トーク骨子） |
| category | String | 分類（例: 切り口 / 反論対応 / 提案準備） |
| playbookType | String | 型の種類（候補は §9 の人間判断: 例 approach / objection / preparation / talk_track） |
| targetIndustry | String? | 対象業種（例: 美容室・イベント） |
| targetSituation | String? | 使う場面（例: 初回訪問・見積提示後） |
| objection | String? | 想定される反論（反論対応型のとき） |
| recommendedTalkTrack | String? | 推奨トーク（言い回しの骨子） |
| doNotSay | String? | 言ってはいけないこと（No.1表記・効果保証・誇大広告表現の禁止例をここに蓄積） |
| relatedPolicyIds | String[] | 関連する会社方針の ID 配列（§4-2 比較の推奨案） |
| relatedProductCatalogItemIds | String[] | 関連する商品カタログの ID 配列（同上） |
| tags | String[] | 既存2モデルと同じ |
| label | ConfidentialityLabel @default(INTERNAL) | **NORMAL / INTERNAL のみ**（UI・action 側で2択に制限。高機密は扱わない） |
| externalAiAllowed | Boolean @default(false) | **false デフォルト・true にする UI は作らない**（既存2モデルと同じ封印） |
| sourceType / sourceNote | String? | 出典メモ（既存2モデルと同じ） |
| createdById / updatedById | String? | 既存2モデルと同じ |
| createdAt / updatedAt | DateTime | 既存2モデルと同じ |
| archivedAt | DateTime? | **ソフトアーカイブのみ**（物理削除なし） |

インデックス案: `@@index([tenantId, category])`・`@@index([tenantId, label])`・`@@index([tenantId, playbookType])`（既存の tenantId 複合 index の流儀）。

### 4-2. 関連参照の設計比較（ID配列 vs 明示 relation）

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **A: ID配列（String[]）** | relatedPolicyIds / relatedProductCatalogItemIds をスカラ配列で持つ | **既存流儀と一致**（ProductCatalogItem.productAssetId・RetrievalLog.chunkIds が relation なしの ID 参照）。migration が単純・削除連鎖なし・アーカイブ済み参照も安全に残る | 参照整合性はアプリ層で担保（存在しない ID は表示時に無視する実装が必要） |
| B: 明示 relation（中間テーブル） | SalesPlaybookEntry↔CompanyPolicy 等の join モデル | DB が整合性を担保・双方向参照が容易 | テーブルが2つ増える・既存2モデル側の変更（対向 relation）が必要になり得る・薄い縦切りに対して過剰 |

**推奨: 案A（ID配列）**。理由: 既存コードの流儀（relation なしの ID 参照）と一致し、既存モデルへの変更ゼロで足せる。参照は「AI回答の材料と参照元表示」用途であり、DB整合性より変更の小ささが効く。将来必要になれば B へ移行可能。**ただし採否は Phase 2-B-2（schema変更承認）の人間判断**。

### 4-3. 入力ガイド（必須・UI に明記する前提）

- 本文・トーク・反論対応に**顧客名・会社名・個人名・具体案件名・成果数値・口コミ・顧客の声を書かない**（書きたくなったら Case Study 領域へ＝§6）。
- doNotSay には「No.1表記・効果保証・誇大広告表現を使わない」を蓄積し、営業文生成の禁止例として将来活用する。
- 価格は書かない（商品カタログの priceNote と同じく、請求・課金に接続する数値を持たない）。

## 5. 安全境界（Phase 2-A から流用）

- **AI mutation禁止**: 作成・編集・アーカイブは人間のみ（actions 層で isHumanUser 相当を最初から組み込む。rbac.ts / labels.ts は変更しない方針）。
- 物理削除なし（delete/deleteMany 不使用・archivedAt のみ）。
- tenantId スコープ必須。
- label 2択（**NORMAL / INTERNAL**）・高機密ラベル未対応のまま。
- externalAiAllowed false 固定（create false 固定・update 不変更・true UI なし）→ **外部LLM送信解禁なし**。
- **writeAudit** は将来の変更系実装（Phase 2-B-4）で必須。**writeDataAccess / ai_reference** は将来のAI参照実装（Phase 2-B-5）で必須（レコードごと1件）。
- 本番確認は **doc49 の本番確認プレイブック**の型を使う（§0 実測・GO/HOLD/STOP・本番に実在するデータで確認）。

## 6. ENSHiN OS / 外部発信リスク

Sales Playbook では以下を**禁止または後続送り**とする（AI の自己判断では一切行わない）:

- **口コミ投稿・SNS投稿・外部発信**（下書き素材化も含めて Sales Playbook の用途外）
- **顧客の声公開・testimonial 掲載・推薦コメント掲載・導入事例公開・Before / After 公開**
- 社長ブランディング投稿・会社ブランディング投稿・紹介依頼送信
- **No.1表記・効果保証・誇大広告表現**（doNotSay に禁止例として蓄積し、使用が疑われる文面は人間・法務判断へ）

**運用ルール**: Sales Playbook 本文に顧客事例・顧客の声を書きたくなった場合は **Case Study 領域に送る**。Case Study は**許諾管理（ConsentRecord）・公開前人間承認・広告表現チェック・外部発信ログとセットで別承認**（doc50 §5・doc49 §10 のとおり）。

## 7. AI参照設計（将来案・**今回は実装なし**）

- 最初の接続先は**ナレッジ検索**への追加候補（Phase 2-A-3c-2 と同じ型）。
- `apps/web/lib/company-brain-reference.ts` への SalesPlaybookEntry 追加は **Phase 2-B-5（実装段）の別承認**。追加時も read-only・NORMAL/INTERNAL・canAccessLabel・件数上限・決定的順位付けの既存方針に従う。
- AI が参照したレコードごとに **ai_reference** ログを1件残す（writeAIDataAccess の既存経路）。
- **externalAiAllowed=false の場合、外部LLMへ本文を送らない**（現状 true にする UI が無いため構造的にゼロ）。FakeLLM / 内部参照は既存方針（ローカル実行＝外部送信に該当しない）に従う。
- 画面には**参照元表示**（「参照した会社の頭脳」への追加）を行う。

## 8. 三段承認計画（提案）

| 段 | 内容 | 承認 |
|---|---|---|
| **Phase 2-B-1（今回）** | SalesPlaybookEntry 設計 docs-only | 本書（判定 GO はここまで） |
| Phase 2-B-2 | schema 変更（model 追加・migration）※§4 の案の採否含む | **別承認** |
| Phase 2-B-3 | read-only 一覧画面＋seed デモデータ＋本番確認（doc49 の型） | 別承認 |
| Phase 2-B-4 | 人間書き込み（作成・編集・アーカイブ＋writeAudit。AI mutation禁止を最初から） | 別承認 |
| Phase 2-B-5 | AI参照追加（company-brain-reference への追加＋ai_reference ログ＋参照元表示） | 別承認 |
| Phase 2-B-PROD | 各段の本番確認記録（doc49 の型・本番に実在するデータで確認） | 各段ごと |

Phase 2-A（2-A-2 → 3a → 3b → 3c-2）と同じ刻み方であり、各段は「動く薄い縦切り」で閉じる。

## 9. 人間判断が必要な点（未決事項）

1. **呼称**: 「Phase 2-B」をこのまま Company Brain 後続領域の名前として使うか（roadmap 01 の「2-B=CRM/Sales AI」との呼び分け。doc50 §12 から継続）。
2. **参照構造**: §4-2 の推奨（案A: ID配列）を採用するか（Phase 2-B-2 で確定）。
3. **playbookType の候補**: 例として approach（切り口）/ objection（反論対応）/ preparation（提案準備）/ talk_track（トーク）を提案。増減はあなたの営業実務に合わせて決める。
4. **seed デモデータの内容**（Phase 2-B-3）: 架空・PII なし・実価格なしの数件（例:「美容室向け・予約導線の切り口」「値引き要求への返し方」）。
5. **AI参照への追加時期**: 2-B-5 を 2-B-4 直後にやるか、書き込み運用が落ち着いてからにするか。
6. **Case Study にいつ進むか**（許諾管理・公開前承認・広告表現チェックの設計着手時期）。
7. **ENSHiN OS 資料をいつ提供するか**（提供まで Enshin 由来機能は証拠不足のまま個別登録しない）。

## 10. やっていないこと

- **schema変更なし**・migration なし・Prisma migrate なし・DB操作なし・seed 変更なし
- **実装なし**（apps/・packages/・UI・Server Action・AI参照・writeAudit/writeDataAccess いずれも未実装）
- rbac / labels / package / lock 変更なし
- 外部送信・**口コミ投稿・SNS投稿・顧客の声公開**・許諾管理実装・広告表現チェック実装: なし
- 外部LLM送信解禁・高機密ラベル対応・externalAiAllowed true UI・**Phase 8**・MCP/API公開・ENSHiN OS 外部発信: なし

## 11. 判定

- **Phase 2-B-1 設計 docs-only 判定 GO** — SalesPlaybookEntry の設計案を固定した。
- ただし **schema変更・実装への GO ではない**（三段承認の第一段のみ）。
- 次: 本 doc51 commit の main 反映（push-only・別承認）→ **Phase 2-B-2（schema変更）の承認判断**（§9 の未決事項 1〜3 の回答とセットが望ましい）。
