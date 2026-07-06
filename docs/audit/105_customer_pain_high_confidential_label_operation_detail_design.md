# 105. Customer Pain 高機密ラベル運用 詳細設計 — 標準閲覧式・記録粒度・安全ゲート・否定系テスト（docs-only・判定 READY / GO）

- 日付: 2026-07-06
- 種別: **docs-only / commit-only**（詳細設計の記録。コード差分ゼロ）
- 前提: doc103（Data Classification / 高機密ラベル運用設計・READY / GO）＋ doc104（§0 12項目の正式決定・GO・`9f77e3a` として push 済み）
- 今回**やっていないこと**: 実装なし・**高機密ラベル解禁なし**・**Customer Pain 実装なし**・**DB変更なし**・**schema変更なし**・**migrationなし**・**RBAC変更なし**・**label定義変更なし**・**AI参照条件変更なし**・**company-brain-reference 変更なし**・PII保存なし・顧客名/担当者名保存なし・**実顧客データ保存なし**・本番確認なし・push なし（commit まで）
- 封印継続: **AIに読ませない**・**CaseStudyConsent は AI 文脈へ注入しない**・**外部公開なし**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・**顧客の声公開なし**・導入事例公開なし・**外部送信なし**・**実LLMなし**・**AIコストなし**

## 1. 非エンジニア向け要約

- 今回は、doc104 で決めた「守り方の方針」を、実装できる粒度まで**細かく設計だけ**した回です。
- 「誰が見られるか」の条件式、「見た記録・書いた記録に何を残し、何を絶対に残さないか」、「後退したら機械的に検知する見張り」、「わざと失敗させて守りを確かめるテスト」を紙の上で確定しました。
- **解禁ではない**し、実装でもありません。コードは1行も変わっていません。高機密ラベルを使い始める判断は、引き続き別の重い人間承認です。

## 2. doc104 決定値の再掲

```
DATA_CLASSIFICATION_POLICY: CUSTOMER_CONFIDENTIAL_AS_PREREQUISITE_DESIGN_ONLY
LABEL_ENABLEMENT_POLICY: DO_NOT_ENABLE_HIGH_CONFIDENTIAL_LABEL_YET
VIEW_PERMISSION_POLICY: TENANT_AND_KNOWLEDGE_UPDATE_AND_LABEL_ROLE_AND
ACCESS_LOG_POLICY: REQUIRE_WRITE_DATA_ACCESS_DESIGN
WRITE_AUDIT_POLICY: KEEP_WRITE_AUDIT_REQUIRED
PII_POLICY: PROHIBIT_PII_STORAGE_NOW
CUSTOMER_REFERENCE_POLICY: CUSTOMER_ID_REFERENCE_ONLY_LATER
AI_REFERENCE_POLICY: PROHIBIT_AI_REFERENCE_NOW
PUBLIC_USE_POLICY: PROHIBIT_PUBLIC_USE
SAFETY_GATE_POLICY: REQUIRE_SAFETY_GATE_DESIGN_BEFORE_IMPLEMENTATION
TEST_POLICY: REQUIRE_NEGATIVE_TEST_DESIGN_BEFORE_IMPLEMENTATION
IMPLEMENTATION_POLICY: DOCS_ONLY_NOW
```

本書はこのうち SAFETY_GATE_POLICY / TEST_POLICY / ACCESS_LOG_POLICY が要求する「実装前の詳細設計」を満たすための文書である。

## 3. 今回の設計が「解禁ではない」こと

- 本書は**設計のみ**であり、**解禁ではない**。高機密ラベル（CUSTOMER_CONFIDENTIAL）を実際に使い始める判断は、本書の後の**個別人間承認（重い判断）**として残る。
- Customer Pain のテーブル・画面・Server Action は一切作っていない（**Customer Pain 実装なし**・実装候補 grep 0件を §22 で実測）。
- **高機密ラベル解禁なし**・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・AI参照条件変更なし・company-brain-reference 変更なし。

## 4. 高機密ラベル運用の中心課題

- `CUSTOMER_CONFIDENTIAL` は `packages/shared/src/labels.ts` に**定義済み**でも、**label単独では不十分**。
- labels.ts の既存設計（CRM 用）には **AI_AGENT / AI_ASSISTANT / STAFF が含まれる**可能性があるため（doc103 で実測済み: 実際に含まれる）、Customer Pain では **label許可ロールだけに頼らない**。
- したがって Customer Pain では `knowledge:update` と `canAccessLabel` と `isHumanUser` を **AND で組み合わせる**。
- **AIには読ませない**。**company-brain-reference に Customer Pain を追加しない**。

## 5. 標準閲覧式

Customer Pain の高機密詳細閲覧は、将来実装する場合でも、以下の **AND 条件**をすべて満たす**人間ユーザーだけ**に限定する。

1. `tenantId` が一致する
2. `knowledge:update` 以上を持つ（`hasPermission(user, 'knowledge', 'update')`）
3. `canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL')` を満たす（label許可ロールに該当）
4. AIロールではない（**AIロール除外**＝`isHumanUser(user)`。AI_AGENT / AI_ASSISTANT を構造的に排除）
5. `archivedAt` が null（アーカイブ済みは閲覧対象外）
6. 参照時に writeDataAccess を記録できる（記録できない経路では表示しない）

## 6. 擬似コード

以下は設計上の標準式（**擬似コードであり実装しない**）。

```ts
const canViewCustomerPainDetail =
  sameTenant &&
  hasPermission(user, 'knowledge', 'update') &&
  canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL') &&
  isHumanUser(user) &&
  !archivedAt;
```

- `sameTenant` = 対象レコードの `tenantId` とログインユーザーの `tenantId` の一致（全モデル tenantId スコープの既存原則）。
- 判定に**1つでも欠けたら不許可**（OR での緩和は禁止）。
- 表示処理は「許可判定 → writeDataAccess 記録 → 本文取得・表示」の順を原則とする（§10）。

## 7. role / permission / label / tenantId / AIロール除外の関係

| 層 | 判定 | 根拠 | 単独で足りるか |
|---|---|---|---|
| テナント | `tenantId` 一致 | 全モデル tenantId スコープ（CLAUDE.md 原則） | 不足（同一テナント内の露出を防げない） |
| permission | `knowledge:update` 以上 | RBAC（`packages/shared/rbac.ts`・変更しない） | 不足（AIロールも knowledge 系権限を持ち得る） |
| label | `canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL')` | labels.ts（**label定義変更なし**） | 不足（既存許可ロールに AI_AGENT / AI_ASSISTANT / STAFF が含まれる） |
| 人間性 | `isHumanUser(user)`（**AIロール除外**） | doc103 §9〜10 の設計 | 不足（単独では権限過剰を防げない） |
| 状態 | `archivedAt` null | ソフトアーカイブの既存原則 | 不足 |

→ **5層の AND 交差で初めて閲覧可**。RBAC・label 定義そのものは変更せず（RBAC変更なし・label定義変更なし）、**利用側の条件式で守る**。

## 8. 一覧表示の設計

一覧は将来実装しても、最初は**最小表示**に限定する。

- **タイトルまたは概要も高機密の可能性がある**前提で扱う（タイトルに失注理由や顧客名が書かれ得るため）。
- 非許可ユーザー（標準閲覧式を満たさないユーザー）には**プレースホルダのみ**（例:「高機密案件（閲覧制限）」）。タイトル・本文・タグを出さない。
- **顧客名を一覧に出さない**。
- **失注理由やクレーム本文を一覧に出さない**。
- label badge（「顧客機密」「AI参照対象外」「外部公開不可」等）は表示候補（CaseStudy の badge_only 前例に倣う）。
- **詳細への導線は許可ユーザーのみ**に表示する。
- 一覧のプレースホルダ表示自体は writeDataAccess の対象外とする（doc103 の設計を維持。件数の存在は高機密本文ではない）。

## 9. 詳細表示の設計

詳細表示は**許可ユーザーのみ**。

- **許可判定前に本文を取得しない設計を候補**にする（select を段階化: まず id/tenantId/archivedAt/label 等のメタのみ取得 → 標準閲覧式判定 → 許可時のみ本文カラムを取得）。
- **詳細表示のたびに writeDataAccess を1件記録**する（同一ユーザーの再訪も毎回記録）。
- denied（不許可）も必要に応じて **reasonCode 付きで記録候補**とする（例: `denied:not_human` / `denied:label_role` / `denied:permission`。存在秘匿が必要な画面では 404 相当の見せ方とし、ログにのみ理由を残す）。
- **本文や PII はアクセスログに入れない**（§11・§13）。

## 10. writeDataAccess 記録粒度

高機密詳細の閲覧1回につき1件、以下のフィールド候補で記録する（既存 `writeDataAccess` helper=`apps/web/lib/db.ts` の流用を前提とし、helper 自体は変更しない）。

記録する候補:

| フィールド | 値の例 | 備考 |
|---|---|---|
| tenantId | ログインユーザーの tenantId | 必須 |
| actorUserId | 閲覧した人間ユーザーの id | 必須 |
| targetType | `CustomerPain` | 固定文字列 |
| targetId | 対象レコード id | 必須 |
| action | `view` | 詳細閲覧 |
| purpose | `customer_pain_internal_review` | 固定の内部レビュー目的 |
| label | `CUSTOMER_CONFIDENTIAL` | 対象の機密ラベル |
| route | 例: `/pain/[id]` | 参照経路 |
| result | `allowed` / `denied` | denied も記録候補 |
| reasonCode | 例: `denied:not_human` | 安全な列挙値のみ |
| timestamp | 記録時刻 | helper 既定 |

## 11. writeAudit 記録粒度

書き込みは、将来実装する場合でも **writeAudit を必須**にする（KEEP_WRITE_AUDIT_REQUIRED）。

対象操作の候補:

- `create`（作成）
- `update`（更新）
- `archive`（ソフトアーカイブ。物理削除は作らない）
- restore 候補がある場合は**別承認**（操作自体の追加が設計変更のため）
- **label 変更がある場合は別承認**（機密度の引き下げは特に重い判断）
- **customerId 紐づけ変更がある場合は別承認**（顧客との関連付けはリスクが変わるため）

writeAudit にも**本文・PII・顧客名・担当者名の生値を入れない**（差分要約やフィールド名レベルの記録に留める）。

## 12. 記録してはいけない情報

writeDataAccess / writeAudit のいずれにも、以下を**入れてはならない**:

- 本文
- PII
- 顧客名
- 担当者名
- 電話番号
- メールアドレス
- 住所
- 生のクレーム本文
- 失注理由本文
- 競合比較本文
- 成果未達の詳細本文
- 価格交渉の本文

ログは「誰が・いつ・どのレコードを・どの経路で・許可/不許可どちらで」だけを持ち、**中身は一切持たない**。

## 13. PII / 顧客名 / 担当者名 / 実顧客データの扱い

- **今は保存しない**（PROHIBIT_PII_STORAGE_NOW。PII・顧客名・担当者名・実顧客データのいずれも）。
- **将来も本文に顧客名・担当者名を複製しない方向**（本文はマスキング済み・一般化された記述のみを想定）。
- 顧客との紐づけは **customerId 参照のみ**候補（CUSTOMER_ID_REFERENCE_ONLY_LATER）。
- **customerId 参照自体も実装は別承認**（参照を付けた瞬間に結合リスクが生じるため）。
- **実顧客データ投入は、設計・実装・本番確認後のさらに別承認**（架空データでの検証が先）。

## 14. customerId 参照のみ方針

- Customer マスタへの join で氏名・連絡先を Customer Pain 画面に展開する実装は**禁止方向**（CaseStudy の「prisma.customer 参照で FAIL」ゲート前例に倣い、機械検査候補にする）。
- 参照が必要な場合も id の表示・リンクまでに留め、PII の解決は Customer 画面側（既存の権限・ラベル統治下）でのみ行う。

## 15. AI参照禁止設計

- **AIに読ませない**（PROHIBIT_AI_REFERENCE_NOW）。
- **AI参照条件変更なし**: AI が読む事例は匿名化済み CaseStudy のみ、という現行条件（anonymized=true CaseStudy の現行参照条件）は**不変**。
- **company-brain-reference 変更なし**: `apps/web/lib/company-brain-reference.ts` に CustomerPain を追加しない（追加されたら安全ゲートで FAIL・§17）。
- **CaseStudyConsent は AI 文脈へ注入しない**（現行の非注入ゲート維持）。
- 将来 AI に使う場合でも**匿名化要約など別設計・別承認**（生データの直接参照は将来も禁止方向）。

## 16. 公開禁止設計

- **外部公開なし**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・**顧客の声公開なし**・導入事例公開なし。
- **doc100 の PROHIBIT_NOW 方針を継続**する。**Customer Pain は公開活用に使わない**（許諾があっても、未解決の生データは公開素材にしない恒久方向）。
- publish 系のフィールド・画面・導線を Customer Pain に作らない（作られたら安全ゲートで FAIL・§17）。

## 17. 安全ゲート設計

将来の実装ミッションでは、`scripts/check-company-brain-safety.mjs` の前例に倣い、**以下が消えたり現れたりしたら FAIL** にする機械検査を実装前〜実装と同時に追加する（検査対象文字列は実装時の実コードに合わせて確定する）。

**「消えたら FAIL」（守りの条件が後退したら検知）:**

1. tenantId 条件（標準閲覧式から tenant スコープが消えたら FAIL）
2. knowledge:update 条件（`hasPermission(user, 'knowledge', 'update')` が消えたら FAIL）
3. canAccessLabel 条件（`canAccessLabel(user, 'CUSTOMER_CONFIDENTIAL')` が消えたら FAIL）
4. AIロール除外（`isHumanUser` が消えたら FAIL）
5. writeDataAccess（詳細表示経路から記録呼び出しが消えたら FAIL）
6. writeAudit（mutation から記録呼び出しが消えたら FAIL）

**「現れたら FAIL」（封印が破られたら検知）:**

7. company-brain-reference 非注入（`company-brain-reference.ts` に CustomerPain が現れたら FAIL）
8. Customer Pain AI参照禁止（AI タスク・プロンプト文脈に CustomerPain が現れたら FAIL）
9. public / publish / SEO / SNS / customer_voice 露出禁止（Pain 画面・actions に公開系導線が現れたら FAIL）
10. 本文への PII 混入禁止（本文保存経路にメール・電話番号形式の検知なしで保存する形が現れたら FAIL 候補）
11. audit / data access log に本文を入れないこと（記録呼び出しの引数に body/本文フィールドが現れたら FAIL）
12. Customer Pain 画面が Customer マスタの PII を直接表示しないこと（Pain 配下の page/actions に `prisma.customer` join で氏名・連絡先展開が現れたら FAIL）
13. externalAiAllowed true UI が出ないこと（`name="externalAiAllowed"` が現れたら FAIL）
14. publishStatus UI が出ないこと（`name="publishStatus"` が現れたら FAIL）

## 18. 否定系テスト設計

将来の実装前〜実装と同時に、以下の**否定系テスト**（わざと守りを破って失敗を確認するテスト）を用意する。

**アクセス制御（unit・shared の純粋関数として先行実装可能）:**

1. tenantId 不一致なら閲覧不可
2. knowledge:update なしなら閲覧不可
3. label許可ロールなしなら閲覧不可
4. AIロール（AI_AGENT / AI_ASSISTANT）なら、権限・ラベルを満たしても閲覧不可
5. archivedAt ありなら閲覧不可

**記録の保証:**

6. 閲覧時に writeDataAccess が無いなら失敗（記録なしで本文が返る経路をテストで検知）
7. denied の場合でも安全な reasonCode のみ（自由文・本文断片が reasonCode に入ったら失敗）
8. audit / data access log に本文・PII が入ったら失敗

**封印の保証:**

9. company-brain-reference に Customer Pain が入ったら失敗
10. externalAiAllowed UI が出たら失敗
11. publishStatus UI が出たら失敗
12. public / PR / SEO / SNS / customer_voice 導線が出たら失敗

**入力の保証（拒否候補・実装時に具体化）:**

13. 本文にメール・電話番号らしき値を保存しようとしたら拒否候補
14. 顧客名を本文へ複製しようとしたら拒否候補（customerId 参照実装後、参照先顧客名と本文の一致検知など）
15. customerId 参照のない自由記述だけで実顧客名を扱う設計は**停止候補**（テストではなく設計レビューの停止条件として扱う）

## 19. 実装時の承認ゲート

将来の実装ミッションで、以下に**1つでも該当したら実装せず停止**する（事前停止条件）:

- schema変更が必要
- migrationが必要
- RBAC変更が必要
- label定義変更が必要
- 高機密ラベルを実際に使い始める（＝解禁。個別人間承認が別途必要）
- Customer Pain の実データを保存する
- PII を保存する
- 顧客名・担当者名を保存する
- company-brain-reference を変更する
- AI参照条件を変更する
- 公開機能に触る
- externalAiAllowed / publishStatus UI を追加する
- 本番確認が必要
- 本番DBに触る
- 外部送信が発生する
- 実LLM / AIコストが発生する

## 20. 実装までの承認順序（再掲・doc103/104 と同一）

1. doc105（本書）の push（push-only・別承認）
2. **高機密ラベル実装・解禁の可否判断（個別人間承認・重い判断）**
3. 最小実装設計（§19 の事前停止条件つき・別承認）
4. 最小実装＋安全ゲート＋否定系テスト（別承認）
5. 本番確認（利用者実測）→ 実顧客データはさらに別承認

## 21. 今回やらなかったこと

- 実装（shared 関数・Server Action・画面・テストコードのいずれも書いていない）
- 高機密ラベル解禁（**高機密ラベル解禁なし**のまま）
- Customer Pain 実装（テーブル・画面・action 0件のまま）
- **DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし**
- **AI参照条件変更なし・company-brain-reference 変更なし**
- PII・顧客名・担当者名・実顧客データの保存
- 公開活用（外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし）
- **外部送信なし・実LLMなし・AIコストなし**・本番確認なし・push なし・doc14 追記なし

## 22. Evidence Map

- doc104 決定値: `docs/audit/104_customer_pain_data_classification_policy_decision.md` §2（read-only 監査で13語すべて存在を確認・本書 §2 に再掲）。
- 中心課題の実測: doc103 記録（labels.ts の CUSTOMER_CONFIDENTIAL 許可ロールに AI_AGENT・AI_ASSISTANT・STAFF が含まれる）＋今回監査で labels.ts CUSTOMER_CONFIDENTIAL 2件・schema 2件（定義不変）。
- 封印の現状: Customer Pain 実装らしき apps/packages 0件・AI文脈への CaseStudyConsent 注入 0・`anonymized: true` 条件 2・externalAiAllowed UI 0・publishStatus UI 0・公開系 tsx 0（本ミッション §6 監査・HEAD=`9f77e3a` 時点）。
- 前例: 安全ゲート=`scripts/check-company-brain-safety.mjs`（actions 4・ui 156 走査で green）・writeDataAccess helper=`apps/web/lib/db.ts`（9箇所の使用実績）・badge_only/プレースホルダ表示=CaseStudy 一覧の実装前例。

## 23. Assumption Log

- `isHumanUser` は doc103 で設計した「AI_AGENT / AI_ASSISTANT を除外する述語」の名称であり、実装時の関数名・置き場所（shared 候補）は最小実装設計で確定する（本書は設計名として使用）。
- writeDataAccess のフィールド候補（§10）は既存 helper のシグネチャに合わせて実装時に調整され得るが、「本文・PII を入れない」原則は調整対象外。
- 安全ゲートの検査文字列は実装時の実コードに合わせて確定する（§17 は検査意図の確定であり、文字列リテラルの最終確定は実装ミッション）。

## 24. Unknowns Log

- 高機密ラベル実装・解禁の可否判断の時期（個別人間承認・人間判断待ち）。
- Customer Pain のスキーマ形状（本書はスキーマを決めない。NO_SCHEMA_CHANGE のまま・将来の設計ミッション対象）。
- denied 記録の既定（全 denied を記録するか、攻撃兆候のみか）は最小実装設計で決定。

## 25. Risk Register

- **ラベル単独運用への後退リスク**: 実装者が canAccessLabel のみで判定する実装をしがち → 標準閲覧式（5層 AND）を本書で固定＋安全ゲート1〜4で機械検知。
- **ログへの機密混入リスク**: writeDataAccess/writeAudit に本文を入れると、ログ閲覧権限経由で高機密が漏れる → §12 の禁止リスト＋否定系テスト8＋安全ゲート11で三重に防ぐ。
- **一覧からの漏えいリスク**: タイトル・概要に失注理由や顧客名が書かれ得る → 一覧は非許可者にプレースホルダのみ（§8）。
- **未push commit の揮発リスク**: 次の push-only ミッション（別承認）で解消。

## 26. Definition of Done

- [x] doc104 決定値の再掲と、決定が要求する詳細設計（標準閲覧式・擬似コード・記録粒度・安全ゲート・否定系テスト・停止条件）の記録
- [x] 「解禁ではない」ことの明記（実装・解禁・実データはすべて別承認のまま）
- [x] 許可5ファイルのみの差分で Gate 全 green
- [x] commit 1件作成・push なし・未push1件・working tree clean で停止

## 27. 次回推奨プロンプト案

1. **doc105 push-only ミッション**（fast-forward のみ・force 禁止・状態分類 A/B/C・feature→main・Gate＋17項目報告）。
2. **高機密ラベル実装・解禁の可否判断**（個別人間承認・重い判断。承認する場合は「何をもって解禁とするか」の範囲を §0 で明示）。
3. **高機密ラベル運用の最小実装設計ミッション（docs-only・doc106 候補）**: §19 の事前停止条件（schema / RBAC / label定義変更の要否確認）を最初に判定し、変更不要の範囲でのみ最小実装の実装範囲を確定する。
4. CI / Test / Release Governance 等の品質基盤強化ミッション（別承認）。

## 28. 判定

**判定: READY / GO**（高機密ラベル運用の詳細設計は完了。ただし**解禁ではない**——**高機密ラベル解禁なし**・**Customer Pain 実装なし**・DB変更なし・schema変更なし・migrationなし・RBAC変更なし・label定義変更なし・**AI参照条件変更なし**・**company-brain-reference 変更なし**・PII/顧客名/担当者名/実顧客データ保存なし・外部公開なし・**外部送信なし**・**実LLMなし**・**AIコストなし**・push なし）。プロダクト基準は **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** のまま変わらない。
