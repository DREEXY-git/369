# 114. Customer Pain schema設計 — docs-only・schema変更なし・migrationなし

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（schema設計の記録。コード差分ゼロ・DB非接触）
- Audit Doc: 114
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Customer Pain Schema Design
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `b0ae06c28431be1ad47363b3c5d813d574a06f75`
- Scope: Customer Pain 本実装に必要になり得る最小 schema 候補を実装前に紙で設計（列の意味・入れてはいけない列・PII禁止・writeDataAccess/writeAudit 接続前提・停止条件・将来の別承認条件）
- Not Included: schema変更・migration・Prisma schema.prisma 変更・Customer Pain本実装・画面・Server Action・writeDataAccess/writeAudit 実接続・高機密ラベル runtime 解禁・RBAC変更・label定義変更・company-brain-reference変更・AI参照条件変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc114 push-only（別承認）
- Do Not Start: schema変更 / migration / Prisma enum追加 / Customer Pain本実装 / 画面・Server Action / writeDataAccess・writeAudit実接続 / customerId参照 / PII保存 / 高機密ラベル実装・解禁 / 本番確認

## 1. 非エンジニア向け要約

- 今回は、Customer Pain（顧客の悩み・失注理由・クレーム等）を将来保存するときの「入れ物（データベースの表）」の**形を紙で設計するだけ**の回です。
- **Prisma schema は変更しません**。**migration は作りません**。**本実装ではありません**。**Customer Pain runtime実装なし**。**高機密ラベル解禁なし**。
- 「どんな列を持たせるか」「絶対に入れてはいけない列は何か」「見た記録・書いた記録に何を残すか」を、非エンジニアにも分かる形で正本に残します。実際に作るのは、この後の**別の重い人間承認**の後です。

## 2. 今回は schema 変更ではないこと

- **schema変更なし**・**migrationなし**・**packages/db/prisma/schema.prisma 変更なし**・**本番DB接続なし**・**本番確認なし**。
- 本書は設計候補（紙）のみ。実際のテーブル作成・列追加・enum 追加は一切していない。

## 3. Customer Pain schema が必要になる理由

- 実際に顧客の悩みを**保存するなら器（テーブル）が必要**（判定ロジック＝候補A があっても、判定する対象の実データの入れ物がないと動かない）。
- **ただし今は保存しない**（PROHIBIT_PII_AND_REAL_CUSTOMER_DATA・実顧客データ保存なし）。
- **実装するなら別の重い人間承認が必要**（schema/migration を伴うため・doc113 §5）。

## 4. 最小 schema 候補（設計候補・実装ではない）

以下は**実装ではなく設計候補**。列名・型は将来変わり得る（enum 化・型確定は別承認）。すべて「本文・PII を持たない」原則の下に置く。

| 列候補 | 何のための列か | PII を入れないための注意 | 一覧表示 | 詳細表示 | writeAudit | writeDataAccess |
|---|---|---|---|---|---|---|
| `id` | レコード識別子 | 連番/UUID・意味のある値を入れない | 可（内部ID） | 可 | 対象（作成時） | 対象外（本文でない） |
| `tenantId` | どの会社のデータか（必須スコープ） | テナントID のみ・顧客情報を含めない | 内部のみ | 内部のみ | 対象 | 対象外 |
| `title` | 案件の見出し | **PII/顧客名が入り得る**ため慎重（§8） | **非許可者にはプレースホルダ**（本文を出さない） | 許可者のみ | 対象（差分要約） | 詳細取得時は対象 |
| `body` | 悩み・課題の本文（一般化・マスキング前提） | **PII/実顧客名を入れない前提**（§8） | 出さない | 許可者のみ（許可判定後に取得） | 対象（本文はログに入れない） | 対象（本文はログに入れない） |
| `category` | 課題の分類（失注/クレーム等） | 分類ラベルのみ・自由文にしない | 可（分類のみ） | 可 | 対象 | 対象外 |
| `severity` | 深刻度 | 固定値のみ | 可 | 可 | 対象 | 対象外 |
| `status` | 対応状態 | 固定値のみ | 可 | 可 | 対象 | 対象外 |
| `label` | 機密ラベル（CUSTOMER_CONFIDENTIAL 前提候補） | ラベル値のみ・解禁はまだ（§6） | badge のみ | badge のみ | 対象 | 対象外 |
| `archivedAt` | ソフトアーカイブ日時（物理削除しない） | 日時のみ | 状態のみ | 状態のみ | 対象（archive 操作） | 対象外 |
| `createdAt` | 作成日時 | 日時のみ | 可 | 可 | 対象 | 対象外 |
| `updatedAt` | 更新日時 | 日時のみ | 可 | 可 | 対象 | 対象外 |
| `createdByUserId` | 作成者（userId 参照候補・§11） | **個人名を複製しない**・id 参照のみ | 内部のみ | 許可者のみ | 対象 | 対象外 |
| `updatedByUserId` | 更新者（userId 参照候補・§11） | **個人名を複製しない**・id 参照のみ | 内部のみ | 許可者のみ | 対象 | 対象外 |

→ 本文（`title`/`body`）は**閲覧経路が writeDataAccess 対象**、変更系（create/update/archive）が **writeAudit 対象**。ただし**ログに本文・PII・顧客名は入れない**（§12）。

## 5. 入れてはいけない列（初期 schema 候補に含めない）

以下は**初期 schema 候補に入れない**（含めると PII・公開・結合リスクを招く）:

- `customerName` / `contactName` / `phone` / `email` / `address`（顧客名・担当者名・連絡先＝PII）
- `rawComplaintText` / `rawLostReasonText` / `rawTranscript`（生のクレーム・失注理由・議事録）
- `sourceUrl`（外部参照 URL）
- `externalAiAllowed` / `publishStatus` / `publicUrl` / `seoSlug` / `customerVoice`（外部AI公開・公開系）
- `customerId`（顧客マスタとの結合）

**`customerId` は将来候補だが、結合リスク（顧客マスタの PII と紐づく）があるため別承認**とする（§18・doc105 §14 継承）。今回は入れない。

## 6. label の扱い

- `label` は **CUSTOMER_CONFIDENTIAL 前提候補**。
- **ただし runtime 解禁ではない**（高機密ラベル解禁なし・doc112 継承）。
- **label定義変更なし**（labels.ts の許可ロールは変更しない・doc105 §7 継承）。
- **CUSTOMER_CONFIDENTIAL 以外（STRICT_SECRET 等）の例外は別設計**（本書では扱わない）。

## 7. tenantId の扱い

- **tenantId 必須**（全モデル tenantId スコープの既存原則・CLAUDE.md）。
- **全検索・更新・閲覧の前提**（tenantId でスコープしない設計は禁止）。
- **tenantId なし設計は禁止**（同一テナント内も含め、テナント境界を必ず効かせる）。

## 8. 本文・title の扱い

- **title にも PII や顧客名が入り得る**（見出しに失注理由・顧客名が書かれる恐れ）。
- **title を一覧に出すかは慎重**（doc105 §8）。**非許可者にはプレースホルダ**（「高機密案件（閲覧制限）」等）。
- **body には PII や実顧客名を入れない前提**（マスキング済み・一般化された記述のみ）。
- **入力時の将来検査候補を記録**: 本文にメール・電話番号形式が現れたら拒否候補、顧客名の複製検知候補（doc105 §18 の入力保証・実装時に具体化）。

## 9. category / severity / status の扱い

- **文字列列にするか enum にするかはまだ決めない**。
- **Prisma enum 追加が必要なら別承認**（enum 追加は migration を伴うため・§18 停止条件）。
- 最小実装では**安全な固定候補を docs で整理するだけ**（例: category=失注/クレーム/競合比較/成果未達、severity=低/中/高、status=新規/対応中/クローズ。値は設計候補で確定しない）。

## 10. archivedAt の扱い

- **物理削除なし**（delete/deleteMany を作らない）。
- **archivedAt でソフトアーカイブ**（doc105 §11 継承）。
- **delete/deleteMany は禁止**（候補B の安全ゲートで brain actions の物理削除は既に FAIL 検知・Customer Pain 実装時も同様に守る）。

## 11. createdBy / updatedBy の扱い

- **userId 参照候補**（`createdByUserId` / `updatedByUserId`）。
- **個人名を複製しない**（id 参照のみ・氏名は User 側の統治下で解決）。
- **監査用途**（誰が作成・更新したかの追跡）。
- **詳細な人事情報とは結合しない**（HR_CONFIDENTIAL 等とは分離）。

## 12. writeDataAccess / writeAudit との関係

- **詳細閲覧は writeDataAccess 対象**（高機密詳細を見るたびに1件記録・doc105 §10）。
- **create / update / archive は writeAudit 対象**（書き込みのたびに記録・doc105 §11）。
- **ログに本文・PII・顧客名を入れない**（「誰が・いつ・どのレコードを・どの経路で・許可/不許可」だけ・doc105 §12）。
- **実接続はまだしない**（本書は設計・writeDataAccess/writeAudit 実接続は候補C 実装の別承認）。

## 13. 標準閲覧式との関係

doc110 の `canViewCustomerPainDetail` を使う**前提候補**（実接続はまだしない）:

- `tenantId`（一致）
- `knowledge:update`（`canForRoles(viewer.roles, 'knowledge', 'update')`）
- `canAccessLabel(viewer.roles, CUSTOMER_CONFIDENTIAL)`
- `isHumanUser`（AIロール除外）
- `archivedAt` null

→ schema の `tenantId` / `label` / `archivedAt` 列は、この標準閲覧式の入力になる想定。**ただし実接続はまだしない**（候補C の別承認）。

## 14. AI参照禁止

- **company-brain-reference に入れない**（Customer Pain を AI 参照層に注入しない）。
- **AIに読ませない**（PROHIBIT_AI_REFERENCE 継続）。
- **AI参照条件変更なし**（AI が読むのは匿名化済み CaseStudy のみ、という現行条件は不変）。

## 15. 公開禁止

- **externalAiAllowed なし**・**publishStatus なし**（列に持たせない・§5）。
- **PR / SEO / SNS / 顧客の声公開なし**（`publicUrl` / `seoSlug` / `customerVoice` を持たせない）。
- **公開活用なし**（Customer Pain は公開素材にしない恒久方向・doc100/doc105 §16 継承）。

## 16. schema 設計の選択肢（最低3案）

- **案A: NO_SCHEMA_CHANGE_AND_DESIGN_ONLY** — schema 候補を docs で固定するだけ。schema/migration は作らない。**推奨**。
- **案B: MINIMAL_SCHEMA_AFTER_SEPARATE_HEAVY_APPROVAL** — 別の重い人間承認後に最小 schema だけを作る（追加のみ migration・破壊的 SQL なし）。ただし今回ではない。
- **案C: QUALITY_FOUNDATION_BEFORE_SCHEMA** — schema より先に CI / Test / Release Governance を強化する。Customer Pain ラインは一旦保留。

## 17. 推奨案

- **推奨: 案A（NO_SCHEMA_CHANGE_AND_DESIGN_ONLY）**。
- 理由: **まだ実装しない**／schema/migration に進む前に**列の意味を確定できる**／**可逆**（紙の設計は後から直せる）／**人間が判断しやすい**（何を作り、何を作らないかが明確になる）。
- ただし**案Aでも schema/migration は作らない**（本書は設計のみ）。案B・案C も人間が選べば別承認で開始できる。

## 18. 事前停止条件

将来の実装ミッションで、以下に**1つでも該当したら即停止**し、人間判断へ戻す:

- **schema変更が必要** / **migrationが必要** / **Prisma enum追加が必要**
- **customerId 参照が必要**
- **PII保存が必要** / **顧客名保存が必要**
- **AI参照が必要**（company-brain-reference 変更・AI参照条件変更）
- **公開導線が必要**（externalAiAllowed / publishStatus / PR / SEO / SNS）
- **本番DB接続が必要** / **外部送信が必要** / **実LLM・AIコストが必要**

## 19. 今回やらなかったこと

- **schema変更なし**・**migrationなし**・**Customer Pain本実装なし**・**Customer Pain runtime実装なし**。
- **画面なし**・**Server Actionなし**・**writeDataAccess/writeAudit実接続なし**。
- **AI参照条件変更なし**・**company-brain-reference変更なし**。
- **PII保存なし**・**実顧客データ保存なし**・**customerId参照は別承認**。
- **高機密ラベル解禁なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**pushなし**。
- 既存 docs 改名なし・HOLD 記録削除なし・doc14 変更なし・docs/10_obsidian 変更なし・apps/packages/scripts/.github 変更なし。

## 20. Evidence Map

- 現在地の根拠: Scout 実測（HEAD = origin/main = origin/feature = `b0ae06c28431be1ad47363b3c5d813d574a06f75`・working tree clean・`origin/main..HEAD` 空）。
- 前段の根拠: doc113（候補C前提設計・schema/migration前のdocs-only・Customer Pain本実装なし）／doc112（候補A+B完了後もまだ runtime 解禁しない）を read-only で確認。
- 候補A+B 完了の根拠: doc111（候補B・safety script 完了）／doc110（候補A・純粋関数完了）。
- 守り方の設計根拠: doc105（標準閲覧式・writeDataAccess・writeAudit・安全ゲート・否定系テスト・事前停止条件）を read-only で確認。
- 安全の土台が生きている根拠: `node scripts/check-company-brain-safety.mjs` を read-only 実行 → **exit 0**（`Company Brain safety checks passed. (actions: 4, ui files scanned: 156)`）。
- 封印維持の実測: company-brain-reference への CaseStudyConsent/CustomerPain 注入 0・`anonymized: true` 2・**apps の Customer Pain runtime 実装 0**・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2（不変）。

## 21. Assumption Log

- schema 候補（§4）は**設計であり実装ではない**。列名・型は将来変わり得る。
- **customerId は別承認**（結合リスクのため今回は入れない）。
- **enum 化は別承認**（category/severity/status を Prisma enum にすると migration を伴うため）。
- 本文・PII をログ・列に入れない原則は調整対象外（doc105 §12・§14 継承）。

## 22. Unknowns Log

- 最小 schema の最終列（実装承認時に確定）。
- category/severity/status を **enum にするか文字列にするか**（enum は別承認）。
- **customerId を使うかどうか**（別承認）。
- 実顧客データ投入時期（設計・実装・本番確認後のさらに別承認）。
- 高機密ラベル runtime 解禁時期（schema 実装可否判断後の個別人間承認）。

## 23. Risk Register

- **schema 設計を実装と誤読するリスク** → §1・§2・§19 で **schema変更なし・migrationなし** を明記。
- **PII 混入リスク** → §5 の禁止列・§8 の本文/title 注意・候補B の安全ゲートで機械検知。
- **customerId 結合リスク** → §5・§18 で customerId を初期候補から除外・参照自体を別承認。
- **title 経由の漏えいリスク** → §8 で非許可者にプレースホルダ・title を一覧に安易に出さない。
- **enum 追加が migration になるリスク** → §9・§18 で enum 追加を停止条件に。
- **未push commit の揮発リスク** → 次の doc114 push-only（別承認）で解消。

## 24. Definition of Done

- [x] Customer Pain 最小 schema 候補・入れてはいけない列・customerId 参照の扱い・PII禁止・writeDataAccess/writeAudit 接続前提・停止条件・将来の別承認条件を記録。
- [x] 「schema変更ではない・migration なし・本実装なし・解禁なし」を明記。
- [x] read-only 安全確認（safety script exit 0）を Evidence Map に記録。
- [x] CURRENT_STATE / PROGRESS / vault ノート＋index の正本反映。
- [x] 許可5ファイルのみで Gate 全 green（code/schema/migration/RBAC/label定義/company-brain-reference/scripts/doc14/docs/10_obsidian 無変更）。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 25. 次回推奨プロンプト案

1. **doc114 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **Customer Pain schema 実装可否判断ミッション**（別の重い人間承認。schema変更/migration を伴う可能性あり・§18 停止条件を最初に判定・追加のみ migration/破壊的 SQL なしの範囲を明示）。
3. 品質基盤強化ミッション（CI / Test / Release Governance・別承認）。
4. 高機密ラベル runtime 解禁判断（schema 実装後の個別人間承認・まだ解禁しない選択も可）。

## 26. 判定

**判定: READY / GO**（Customer Pain の最小 schema 候補・禁止列・記録接続前提・停止条件を紙で設計した）。

ただし、これは **schema 変更ではない**。**migrationなし**・**本実装なし**（**Customer Pain本実装なし**・**Customer Pain runtime実装なし**）・**高機密ラベル解禁なし**・**schema変更なし**・**RBAC変更なし**・**label定義変更なし**・**company-brain-reference変更なし**・**AI参照条件変更なし**・**externalAiAllowedなし**・**publishStatusなし**・**PII保存なし**・**実顧客データ保存なし**・**customerId参照は別承認**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・push なし。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
