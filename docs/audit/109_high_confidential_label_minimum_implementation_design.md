# 109. 高機密ラベル運用 最小実装設計 — docs-only・解禁なし・実装前停止条件の整理

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（最小実装の設計。コード差分ゼロ）
- Audit Doc: 109
- Product Phase: Data Classification / Security Governance
- Lineage: Data Classification / High Confidential Label Lineage
- Stage: Minimum Implementation Design
- Status: READY / GO
- Baseline Commit: CaseStudyConsent anonymized=false 本格扱い / `611e51e`
- Current HEAD: `fd60ed0b369539c04c514b39c6bdde461df8719a`
- Scope: 高機密ラベル運用を将来最小実装する場合の範囲・順序・停止条件・Gate・否定系テストの設計
- Not Included: 実装・解禁・Customer Pain実装・schema変更・migration・RBAC変更・label定義変更・AI参照条件変更・company-brain-reference変更・PII保存・実顧客データ保存・本番確認・push
- Next Action: doc109 push-only（別承認）
- Do Not Start: 高機密ラベル実装・解禁 / Customer Pain実装 / schema変更 / migration / RBAC変更 / label定義変更 / AI参照条件変更 / company-brain-reference変更 / 本番確認

## 1. 非エンジニア向け要約

- 前回（doc108）で「高機密ラベルはまだ解禁しない。次は守り方の最小実装設計を紙の上（docs-only）で進める」と正式に決めました。今回はその**最小実装の設計だけ**を行う回です。
- 「最小実装」とは、いきなり全部を作らず、**危険の少ない部品から順に、しかも今回は設計（紙）だけ**にすることです。
- 具体的には、実装候補を3つ（A＝守りの判定ロジックとテストだけ／B＝自動見張り（安全ゲート）だけ／C＝Customer Pain の器（schema）まで含む本実装）に分け、**A と B を先に紙で固め、schema や migration が必要になる C は別の重い人間承認へ送る**という順序を設計しました。
- これは**実装ではない**し、**解禁ではない**。コードは1行も変わっていません。**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Data Classification実装なし**。

## 2. doc108 の決定値の再掲

doc108（`DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN`）で人間が確定した §0 の安全側決定10項目。本書はこの決定の次段（最小実装設計）に当たる。

```
HIGH_CONFIDENTIAL_ENABLEMENT_POLICY: DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN
ENABLEMENT_SCOPE_POLICY: NO_RUNTIME_ENABLEMENT_NOW
LABEL_POLICY: CUSTOMER_CONFIDENTIAL_ONLY_LATER
VIEW_POLICY: TENANT_KNOWLEDGE_UPDATE_LABEL_HUMAN_AND_ONLY
ACCESS_LOG_POLICY: WRITE_DATA_ACCESS_REQUIRED_LATER
WRITE_AUDIT_POLICY: WRITE_AUDIT_REQUIRED_LATER
PII_POLICY: PROHIBIT_PII_AND_REAL_CUSTOMER_DATA_NOW
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE
PUBLIC_USE_POLICY: PROHIBIT_PUBLIC_USE
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

## 3. 今回は解禁でも実装でもないこと

- 本書は**設計のみ**であり、**解禁ではない**。高機密ラベル（CUSTOMER_CONFIDENTIAL）を実際に使い始める判断は、本書の後の**個別人間承認（重い判断）**として残る。
- Customer Pain のテーブル・画面・Server Action は一切作っていない（**Customer Pain実装なし**・実装候補 grep 0件を §19 で実測）。
- **高機密ラベル解禁なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference変更なし**。

## 4. 最小実装の考え方

- 高機密ラベル運用の全体（判定ロジック＋自動見張り＋器＋画面＋記録）を**一度に作らない**。
- **危険度と可逆性で部品を並べ替え、危険が少なく後戻りできるものから**着手する順序を設計する。
- 最も危険が少ないのは「**DB に触らず・実データを持たず・純粋な判定ロジックとテストだけ**」を書くことであり、最も重いのは「**Customer Pain の器（schema）と実データ**」に触ることである。
- 今回は**その順序を紙で決めるだけ**（DOCS_ONLY_NOW）。実装は各段でさらに別承認。

## 5. 実装を分割する理由

- **可逆性**: 純粋関数やテストは後から消しても実害がない。schema や実データは一度入れると後戻りが難しい。
- **検知可能性**: 守りの判定ロジックと自動見張りを先に用意すれば、後で器を作るときに「守りが後退したら機械的に落ちる」状態から始められる。
- **停止条件の明確化**: schema / migration / RBAC / label定義変更が必要になった瞬間に停止できるよう、それらを必要としない範囲（A・B）と必要とする範囲（C）を分けておく。
- **人間の判断コストの最小化**: 非エンジニアの承認者が「今回はどこまでか」を1目で判断できるよう、段を小さく切る。

## 6. 最小実装候補A: 純粋な権限判定関数とテストだけ

- 内容: doc105 の**標準閲覧式**を、`packages/shared` の**純粋関数**として設計・（将来）実装する。DB 読み書きなし・Prisma import なし・引数だけで判定。
  - `isHumanUser(user)`＝**AIロール除外**（AI_AGENT / AI_ASSISTANT を構造的に排除する述語）。これは新しい述語であり、`ROLE_PERMISSIONS`（rbac.ts）も `labels.ts` の label定義も**変更しない**（既存のロール情報を読むだけ）。
  - `canViewCustomerPainDetail(...)`＝`tenantId` 一致 × `knowledge:update`（`hasPermission`）× `canAccessLabel(user,'CUSTOMER_CONFIDENTIAL')` × `isHumanUser` × `archivedAt` null の **AND 交差**（OR 緩和禁止）。
  - あわせて **否定系テスト**（§15 の1〜5・7）を先行実装可能。
- 特徴: **schema変更なし・migrationなし・RBAC変更なし・label定義変更なし**で実装できる範囲（＝A は事前停止条件に抵触しない）。実行時の挙動（既存画面）を一切変えない。
- ただし**今回は A も実装しない**（本書は設計のみ・A の実装可否はさらに別承認）。

## 7. 最小実装候補B: 安全ゲート追加だけ

- 内容: doc105 §17 の**安全ゲート**（14種）を、既存 `scripts/check-company-brain-safety.mjs` の前例に倣った**静的検査（CI スクリプト）**として設計・（将来）追加する。
  - 「消えたら FAIL」6種（tenantId / knowledge:update / canAccessLabel / isHumanUser / writeDataAccess / writeAudit の後退検知）。
  - 「現れたら FAIL」8種（company-brain-reference への CustomerPain 注入・AI参照・公開導線・PII混入・ログ本文混入・Customer PII直接表示・externalAiAllowed UI・publishStatus UI の出現検知）。
- 特徴: Node 標準ライブラリのみの検査で、**schema・DB・実行時挙動に触れない**。守りが後退したら CI で落ちる状態を用意する。
- ただし**今回は B も実装しない**（設計のみ）。A の判定ロジックが実在してから B の検査文字列を確定するのが自然（§17 順序）。

## 8. 最小実装候補C: Customer Pain schemaまで含む実装は別承認・重い判断

- 内容: Customer Pain の**器（schema）＋ migration ＋ 一覧/詳細画面 ＋ Server Action ＋ writeDataAccess / writeAudit の実接続**。
- これは **schema変更・migration が必須**であり、doc105 §19 と本書 §10 の**事前停止条件に直接該当する**。
- したがって C は**今回の範囲外**であり、**別の重い人間承認**（schema / migration / 実データを伴う判断）を要する。A・B の設計・実装が終わってからでも遅くない。

## 9. 推奨: まずA+Bをdocs上で設計し、schema/migrationが必要なCは別承認へ送る

- **推奨**: 本書で **A（純粋権限判定関数＋否定系テスト）** と **B（安全ゲート）** の設計を固め、**schema / migration が必要な C（Customer Pain 本実装）は別承認へ送る**。
- 理由: A・B は DB・実データ・器に触れず、可逆で、守りを先に用意できる。C は器と実データに触れるため最も重く、順序の最後に置くのが安全。
- **本書は設計のみ**（DOCS_ONLY_NOW）。A・B の**実装**も、それぞれさらに別承認（本書は「次にやること」を A+B 実装可否判断に向けるだけで、実装は行わない）。

## 10. 事前停止条件

将来の実装ミッションで、以下に**1つでも該当したら実装せず停止**し、人間判断へ戻す（doc105 §19 を継承）。

- schema変更が必要 / migrationが必要 / RBAC変更が必要 / label定義変更が必要
- 高機密ラベルを実際に使い始める（＝解禁。個別人間承認が別途必要）
- Customer Pain の実データを保存する / PII を保存する / 顧客名・担当者名を保存する
- company-brain-reference を変更する / AI参照条件を変更する / 公開機能に触る
- externalAiAllowed / publishStatus UI を追加する
- 本番確認が必要 / 本番DBに触る / 外部送信が発生する / 実LLM・AIコストが発生する

→ A・B はこのいずれにも該当しない範囲に限定して設計する。C は該当するため停止・別承認。

## 11. 標準閲覧式の設計再掲

doc105 §5〜§7 の**標準閲覧式**（将来実装する場合も、以下の **AND** をすべて満たす**人間ユーザーだけ**に限定。OR 緩和禁止）。

1. `tenantId` が一致する
2. `knowledge:update` 以上を持つ（`hasPermission(user, 'knowledge', 'update')`）
3. `canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL')` を満たす
4. AIロールではない（**AIロール除外**＝`isHumanUser(user)`。AI_AGENT / AI_ASSISTANT を構造的に排除）
5. `archivedAt` が null
6. 参照時に `writeDataAccess` を記録できる（記録できない経路では表示しない）

擬似コード（**実装しない**）:

```ts
const canViewCustomerPainDetail =
  sameTenant &&
  hasPermission(user, 'knowledge', 'update') &&
  canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL') &&
  isHumanUser(user) &&
  !archivedAt;
```

RBAC・label 定義そのものは変更せず（**RBAC変更なし**・**label定義変更なし**）、利用側の条件式で守る。

## 12. writeDataAccess記録粒度

高機密詳細の閲覧1回につき1件記録（既存 `writeDataAccess` helper＝`apps/web/lib/db.ts` の流用前提・helper 自体は変更しない）。記録するのは「**誰が・いつ・どのレコードを・どの経路で・許可/不許可どちらで**」のみ。

- tenantId / actorUserId / targetType=`CustomerPain` / targetId / action=`view` / purpose=`customer_pain_internal_review` / label=`CUSTOMER_CONFIDENTIAL` / route / result（allowed・denied）/ reasonCode（安全な列挙値のみ）/ timestamp。
- **本文・PII・顧客名・担当者名・電話番号・メール・住所・生のクレーム/失注理由/競合比較/価格交渉の本文は一切入れない**（§14）。

## 13. writeAudit記録粒度

書き込みは将来実装する場合でも **writeAudit を必須**（KEEP_WRITE_AUDIT_REQUIRED）。

- 対象操作候補: `create` / `update` / `archive`（物理削除は作らない・ソフトアーカイブのみ）。
- restore / label変更 / customerId 紐づけ変更は**別承認**（操作追加・機密度引き下げ・結合リスク変化のため）。
- writeAudit にも**本文・PII・顧客名・担当者名の生値を入れない**（差分要約・フィールド名レベルに留める）。

## 14. 記録してはいけない情報（writeDataAccess / writeAudit 共通）

本文 / PII / 顧客名 / 担当者名 / 電話番号 / メールアドレス / 住所 / 生のクレーム本文 / 失注理由本文 / 競合比較本文 / 成果未達の詳細本文 / 価格交渉の本文 は**いずれのログにも入れない**。ログは中身を一切持たない。

## 15. 安全ゲート設計

doc105 §17 を継承。将来の実装ミッションで、以下が**消えたり現れたりしたら FAIL** にする静的検査（候補B）を実装と同時に導入する。

**消えたら FAIL（守りの後退を検知）:**
1. tenantId 条件 / 2. `knowledge:update` 条件 / 3. `canAccessLabel` 条件 / 4. `isHumanUser`（AIロール除外）/ 5. `writeDataAccess`（詳細表示経路）/ 6. `writeAudit`（mutation）

**現れたら FAIL（封印破りを検知）:**
7. company-brain-reference への CustomerPain 注入 / 8. AI参照（AIタスク・プロンプト文脈への CustomerPain 出現）/ 9. public / publish / SEO / SNS / customer_voice の公開導線 / 10. 本文への PII 混入 / 11. ログへの本文混入 / 12. Customer マスタ PII の直接表示（`prisma.customer` join 展開）/ 13. externalAiAllowed true UI（`name="externalAiAllowed"`）/ 14. publishStatus UI（`name="publishStatus"`）

## 16. 否定系テスト設計

doc105 §18 を継承。わざと守りを破って失敗を確認する**否定系テスト**（1〜5・7 は shared 純粋関数として候補A で先行実装可能）。

**アクセス制御:** 1. tenantId 不一致→閲覧不可 / 2. knowledge:update なし→閲覧不可 / 3. label許可ロールなし→閲覧不可 / 4. AIロール（AI_AGENT / AI_ASSISTANT）→権限・ラベルを満たしても閲覧不可 / 5. archivedAt あり→閲覧不可

**記録の保証:** 6. 閲覧時に writeDataAccess が無いなら失敗 / 7. denied は安全な reasonCode のみ（自由文・本文断片が入ったら失敗）/ 8. ログに本文・PII が入ったら失敗

**封印の保証:** 9. company-brain-reference に CustomerPain が入ったら失敗 / 10. externalAiAllowed UI が出たら失敗 / 11. publishStatus UI が出たら失敗 / 12. public / PR / SEO / SNS / customer_voice 導線が出たら失敗

**入力の保証（実装時に具体化）:** 13. 本文にメール・電話番号らしき値を保存しようとしたら拒否候補 / 14. 顧客名を本文へ複製しようとしたら拒否候補 / 15. customerId 参照のない自由記述で実顧客名を扱う設計は**設計レビューの停止条件**として扱う

## 17. Customer Pain schemaが必要になった場合の停止条件

- A・B の実装過程で、**Customer Pain の器（テーブル）や customerId 参照が必要**と判明した時点で、それは C の領域であり **schema変更・migration に該当 → 即停止・別承認**。
- 「純粋関数のテストのために架空の型が欲しい」場合でも、**Prisma schema に model を足すのは停止条件**（テスト用の型は shared 内の TypeScript 型で閉じ、DB schema に触れない）。
- schema が要るとわかったら、A・B を完了させたうえで、**C を独立した重い承認ミッション**として切り出す。

## 18. 実装順序案（各段さらに別承認）

1. doc109（本書）の push（push-only・別承認）
2. **候補A の実装**: `isHumanUser` ＋ `canViewCustomerPainDetail` の純粋関数 ＋ 否定系テスト（schema / migration なしの範囲に限定・別承認）
3. **候補B の実装**: 安全ゲート（静的検査）の追加（CI スクリプト・別承認）
4. **高機密ラベル実装・解禁の可否判断**（個別人間承認・重い判断）
5. **候補C**: Customer Pain schema ＋ migration ＋ 画面 ＋ Server Action ＋ writeDataAccess / writeAudit 実接続（**schema / migration を伴う別の重い承認**）
6. 本番確認（利用者実測）→ 実顧客データはさらに別承認

## 19. 今回やらなかったこと

- 実装（shared 関数・Server Action・画面・テストコード・CI スクリプトのいずれも書いていない）
- 高機密ラベル解禁（**高機密ラベル解禁なし**のまま）・**Customer Pain実装なし**・**Data Classification実装なし**
- **DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし**
- **AI参照条件変更なし・company-brain-reference変更なし**・**AIに読ませない**
- **PII保存なし・実顧客データ保存なし**・顧客名/担当者名保存なし
- 公開活用（**外部公開なし**・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし）
- **外部送信なし・実LLMなし・AIコストなし・本番確認なし**・push なし・doc14 追記なし・docs/10_obsidian 変更なし

## 20. Evidence Map

- 現在地の根拠: Scout 実測（HEAD = origin/main = origin/feature = `fd60ed0b369539c04c514b39c6bdde461df8719a`・working tree clean・`origin/main..HEAD` 空）。
- 決定の根拠: doc108（`DO_NOT_ENABLE_YET_AND_PREPARE_MIN_IMPL_DESIGN`・§0 10項目）を read-only で確認。
- 3案・§0候補の根拠: doc107（§8 の3案・§10 の §0 人間決定候補10項目）。
- 守り方の根拠: doc105（標準閲覧式・writeDataAccess §10・writeAudit §11・安全ゲート §17・否定系テスト §18・事前停止条件 §19）を read-only で確認・本書に継承。
- 封印維持の実測（Customer Pain / 高機密ラベル Lineage）: company-brain-reference への CaseStudyConsent/caseStudyConsent/validateCaseStudyConsentReconciliation 注入 0件・`anonymized: true` 2件・Customer Pain実装 apps/packages 0件・schema/labels.ts の CUSTOMER_CONFIDENTIAL 各2件（既存定義・確認のみ・変更しない）。
- 補足: `externalAiAllowed` / `publishStatus` は既存の会社ブレイン（brain catalog/policies/playbooks）・CaseStudy（brain/case-studies）の従来機能であり、Customer Pain とは別ドメイン。**今回commitでこれらの UI を新規追加していない**（変更は docs/tasks/vault の5ファイルのみ）。

## 21. Assumption Log

- 「純粋関数（候補A）＋静的ゲート（候補B）は schema / migration / RBAC / label定義に触れずに実装できる範囲であり、最も可逆で危険が少ない」と仮定し、A+B 先行・C 別承認を推奨。
- `isHumanUser` は doc103/doc105 で設計した「AI_AGENT / AI_ASSISTANT を除外する述語」の名称であり、実装時の関数名・置き場所（shared 候補）は A 実装ミッションで確定する。
- 安全ゲートの検査文字列は A の実コードが実在してから確定する（本書は検査意図の確定であり、文字列リテラルは実装ミッション）。

## 22. Unknowns Log

- 候補A・B の実装可否判断の時期（人間判断・別承認待ち）。
- Customer Pain のスキーマ形状（本書はスキーマを決めない。NO_SCHEMA_CHANGE のまま・C の設計ミッション対象）。
- denied 記録の既定（全 denied を記録するか攻撃兆候のみか）は A 実装設計で決定。
- 高機密ラベル実装・解禁の可否判断の時期（個別人間承認・人間判断待ち）。

## 23. Risk Register

- **A のつもりで C に踏み込むリスク**: 純粋関数の検証に schema を足したくなる → §17 の停止条件（Prisma schema 追加は停止）で防ぐ。
- **ラベル単独運用への後退リスク**: 実装者が canAccessLabel のみで判定しがち → 標準閲覧式（5層 AND）＋安全ゲート1〜4で機械検知。
- **ログへの機密混入リスク**: writeDataAccess / writeAudit に本文を入れると漏えい → §14 の禁止リスト＋否定系テスト8＋安全ゲート11で三重防御。
- **順序を飛ばして解禁するリスク**: A・B・可否判断を飛ばして C に行くと、否定系テスト・本番確認前に実データが露出 → §18 の順序と §10 の停止条件で防ぐ。
- **未push commit の揮発リスク**: 次の doc109 push-only（別承認）で解消。

## 24. Definition of Done

- [x] doc108 の決定を受けた最小実装の範囲・順序・停止条件・標準閲覧式・writeDataAccess/writeAudit 粒度・安全ゲート・否定系テストを記録。
- [x] 実装候補を A（純粋関数＋テスト）／B（安全ゲート）／C（Customer Pain schema 本実装）に分割し、A+B 先行・C 別承認を推奨。
- [x] 「解禁ではない・実装ではない」ことの明記（実装・解禁・実データはすべて別承認のまま）。
- [x] CURRENT_STATE / PROGRESS / vault ノート＋index の正本反映。
- [x] 許可5ファイルのみで Gate 全 green（code/schema/migration/RBAC/label定義/company-brain-reference/doc14/docs/10_obsidian 無変更）。
- [x] commit 1件作成・push なし・working tree clean・未push1件で停止。

## 25. 次回推奨プロンプト案

1. **doc109 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature → main・Gate ＋ 17項目報告）。
2. **候補A 実装ミッション**（`isHumanUser` ＋ `canViewCustomerPainDetail` 純粋関数 ＋ 否定系テストのみ。schema / migration / RBAC / label定義変更が必要と判明したら即停止して人間判断へ）。
3. **候補B 実装ミッション**（安全ゲート静的検査の追加。CI スクリプトのみ・実行時挙動不変）。
4. 品質基盤強化ミッション（CI / Test / Release Governance・別承認）。
5. 候補C（Customer Pain schema 本実装）は、A・B と解禁可否判断のあとの**別の重い人間承認**。

## 26. 判定

**判定: READY / GO**（高機密ラベル運用の最小実装設計は完了。実装候補を A/B/C に分割し、A+B 先行設計・C 別承認の順序を固定した）。

ただし、これは**解禁ではない**。**高機密ラベル解禁なし**・**Customer Pain実装なし**・**Data Classification実装なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference変更なし**・**PII保存なし**・**実顧客データ保存なし**・**外部送信なし**・**実LLMなし**・**AIコストなし**・**本番確認なし**・**pushなし**。プロダクト基準（Baseline Commit）は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
