# 83. ConsentRecord連携器選択 — CaseStudyConsent 専用モデル推奨（docs-only・判定 READY / GO）

> doc82（ConsentRecord連携設計・READY / GO）の後続。許諾台帳の「器」を 案A / 案B で比較し、採用方針を docs-only で確定する記録。Mode B＋Consent / Privacy / Legal Evidence / AI Safety / CaseStudy Governance Overlay。
> **docs-only・実装なし・schema変更なし・migration変更なし・seed変更なし・DB操作なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト機能基準は本記録 commit ではなく **Phase 2-C-5 / `6d656a3`** のまま。

---

## 1. 非エンジニア向け要約

- 顧客事例の「許諾の台帳」をどの器で持つかを決めました。結論は **案B推奨 = CaseStudyConsent（事例許諾専用新モデル）** です。ただし**今回は設計確定まで**で、**schema実装は次の別承認**です（まだ何も実装していません）。
- 理由を一言で: **既存 ConsentRecord はメール営業チャネル同意用**（「このメールアドレスに送ってよいか」の台帳）であり、顧客事例の許諾に必要な「**何の用途で・いつまで・どんな証跡で・取り消されていないか**」を持っていないからです。無理に相乗りすると2つの意味が混ざり、将来のメール同意側の運用も壊しかねません。
- 安全状態は変わりません: **consentStatus=granted だけでは真正な許諾証拠として扱わない**・**ConsentRecord連携までは anonymized=true のみAI参照**・**anonymized=false は別承認**・外部公開/PR/SEO/顧客の声は禁止のまま。

## 2. なぜ今これを決めるのか

- doc82 で「granted の真正性は台帳突合で確認する」と決めたが、突合先の器（案A/案B）は人間選択として残っていた（doc82 §5-3）。
- 器が決まらないと、次の schema 実装承認・UI 承認・突合判定承認の**段階承認が始められない**。実装より先に器の設計を固定し、schema 承認時に迷いなく最小 migration だけを審査できる状態にする。

## 3. doc82 から引き継ぐ前提（変更なし）

- **consentStatus=granted だけでは真正な許諾証拠として扱わない**（申告値）。
- **ConsentRecord連携までは anonymized=true のみAI参照**を維持。実名寄り事例・成果数値・顧客の声は AI にも公開にも使わない。
- 匿名化解除の将来条件は doc82 §6 の全条件AND（granted＋有効な台帳レコード＋同一 tenantId＋revoked/expired/suppressed でない＋purpose 明示＋公開系は ApprovalRequest＋writeAudit）。
- **外部公開は別承認**・**PR配信なし**・**SEOページ公開なし**・SNS投稿なし・**顧客の声公開なし**・**Customer Painは別承認**・**高機密ラベルは別承認**・Phase 8 なし・ENSHiN OS 外部発信なし。

## 4. 案A: 既存 ConsentRecord 拡張

- 内容: 既存 ConsentRecord（subject=メール/電話・channel=email/line/sms・consent Boolean・source・note）に purpose / evidence / expiresAt / revokedAt / caseStudyId 等を**後付け**する。
- 利点: モデル数が増えない。既存の「同意」概念と1か所で管理できるように見える。
- 欠点（重大）: ①**既存 ConsentRecord はメール営業チャネル同意用**で、行の意味が「連絡先への配信可否」。事例公開許諾（法的証跡・用途・期限つき）と**意味が異なる2種類の行が同居**し、既存の参照箇所（同意管理画面・送信前チェック）に「事例許諾の行を誤って配信同意として数える」系の混入リスクが生まれる ②既存テーブルへの列追加は「追加のみ」でも**既存運用データと新用途の混在**を招き、監査時に行の種別判定が必要になる ③将来 ConsentRecord 側の仕様変更（メール同意の要件変化）が事例許諾に波及する。

## 5. 案B: 事例許諾専用新モデル（CaseStudyConsent）

- 内容: 顧客事例の許諾だけを扱う**事例許諾専用新モデル**を新設し、既存 ConsentRecord には一切触れない。CaseStudy.consentRecordId は将来この新モデルの ID を指す（フィールド名の扱いは実装承認時に確定・§9 Unknowns）。
- 利点: ①意味が単一（1行=1つの事例許諾）で監査が容易 ②**追加のみ migration**（CREATE TABLE＋INDEX のみ・**破壊的SQLなし**・既存 table/column 無変更）で、2-C-2 以来の前例と同じ最小審査で済む ③メール同意の運用・画面・送信前チェックに影響ゼロ ④用途・期限・証跡・失効を事例許諾の要件だけで設計できる。
- 欠点: モデルが1つ増える。「同意」が2系統になるため、README的な使い分けコメントを schema に書く必要がある（実装時の付帯作業）。

## 6. 比較表と判定

| 観点 | 案A: 既存拡張 | 案B: CaseStudyConsent 新設 |
|---|---|---|
| 行の意味の単一性 | ✗ 配信同意と事例許諾が同居 | ✅ 事例許諾のみ |
| 既存メール同意運用への影響 | ✗ 参照箇所すべてで種別判定が必要 | ✅ 影響ゼロ |
| migration | △ 既存テーブルへの列追加 | ✅ **追加のみ migration**・**破壊的SQLなし** |
| 監査・法的証跡の明瞭さ | △ 行種別の説明が常に必要 | ✅ 台帳そのものが証跡単位 |
| 将来拡張（用途追加・期限運用） | ✗ メール同意仕様と相互干渉 | ✅ 独立に拡張可能 |
| モデル数 | ✅ 増えない | △ 1つ増える（コメントで使い分け明記） |

**判定: 案B推奨**（CaseStudyConsent 専用モデル）。安全性・監査性・最小差分の3点で一貫して優位。案A の「モデル数が増えない」利点は、意味混在のリスクに見合わない。

## 7. 案Bのフィールド案（設計案・schema実装は次の別承認）

| フィールド | 型（案） | 意味 |
|---|---|---|
| id | String @id | 台帳レコードID |
| **tenantId** | String（index） | テナントスコープ必須（他 model と同じスカラ運用・Tenant への relation は張らない） |
| **caseStudyId** | String（index） | 対象の顧客事例（relation なし ID 参照・既存流儀） |
| **customerId** | String? | 許諾主体の顧客（CRM Customer への relation なし ID 参照。Customer は CUSTOMER_CONFIDENTIAL 既定のため **ID のみ持ち氏名等は複製しない**） |
| status | String @default("granted") | granted / **revoked** の2状態（**expired** は expiresAt から導出・**suppressed** は SuppressionList 照会で導出＝台帳に固定しない） |
| **purpose** | String[] | 許諾された用途の明示列挙: **internal_view** / **ai_reference** / **external_publish** / **pr** / **seo** / **customer_voice**。**用途未記載は不許可（安全側）** |
| **evidence** | String | 証跡の種別と所在の説明（書面/メール/フォーム等。原本ファイルの保管方式は実装承認時に確定・PII/原本を本文に貼らない） |
| grantedAt | DateTime | 許諾日 |
| **expiresAt** | DateTime? | 有効期限（null=期限なしの扱いは実装承認時に人間確定） |
| **revokedAt** | DateTime? | 取り消し日（取り消し時も行は削除しない＝追記主義） |
| grantedById | String? | 登録した人間（AI は登録不可・isHumanUser の流儀） |
| note / createdAt / updatedAt | — | 補足・監査時刻 |

- index 案: [tenantId]・[tenantId, caseStudyId]。
- 突合判定（doc82 §6）はこの器で機械判定可能になる: granted ＋ 同一 **tenantId** ＋ **revokedAt** なし（**revoked** でない）＋ **expiresAt** 未到来（**expired** でない）＋ 対象 subject が **SuppressionList** に不在（**suppressed** でない）＋ **purpose** に該当用途が含まれる。

## 8. 既存の仕組みへの影響（設計上の確認・今回は変更なし）

- **anonymized=false を将来許可する条件**: doc82 §6 のとおり。上記突合判定の全条件AND＋公開系用途は **ApprovalRequest** による公開前人間承認＋**writeAudit**。**anonymized=false は別承認**のまま。
- **ai_reference への影響**: なし（AI参照条件は anonymized=true のみを維持。CaseStudyConsent 自体は AI 文脈へ注入しない・AI の参照対象にもしない。将来 anonymized=false を解禁する場合も ai_reference 記録はレコード単位の既存 loop が自動追随）。
- **writeAudit への影響**: 台帳の登録・取り消しは人間のみ＋writeAudit 必須（実装時）。
- **ApprovalRequest との関係**: 公開系 purpose（external_publish / pr / seo / customer_voice）は台帳が有効でも1件ごとに ApprovalRequest を通す（doc82 §9）。
- **SuppressionList との関係**: suppressed は台帳に持たず判定時に照会（配信停止の単一情報源を維持）。subject が抑止対象なら許諾の再依頼連絡も抑止。

## 9. migration 方針と実装段階案（すべて次以降の別承認）

- migration 方針: **追加のみ migration**（CREATE TABLE＋INDEX のみ・**破壊的SQLなし**・既存 ConsentRecord/SuppressionList/CaseStudy 無変更）。
- 実装段階案（各段個別承認・各段本番確認は doc49 の型）:
  1. CaseStudyConsent schema 追加（schema-only）→ 本番確認
  2. 台帳の登録・閲覧 UI（人間のみ・writeAudit・label/PII ガイド付き）→ 本番確認
  3. 突合判定の実装（validateCaseStudyConsent 拡張＋否定系テスト＋safety gate 機械検査追加）→ 本番確認
  4. anonymized=false の解禁判断（別承認・§8）
  5. 公開活用（さらに別承認・ApprovalRequest＋表現審査＋取り下げ運用）

## 10. 今回やらなかったこと

- **実装なし**: **schema変更なし**・**migration変更なし**・seed変更なし・DB操作なし・CaseStudy actions 変更なし・ConsentRecord/CaseStudyConsent 実装なし・UI/API 実装なし。
- **外部送信なし**・**実LLMなし**・**AIコストなし**・本番接触なし・push なし。
- **外部公開は別承認**・**PR配信なし**・**SEOページ公開なし**・SNS投稿なし・口コミ投稿なし・**顧客の声公開なし**・**Customer Painは別承認**・**高機密ラベルは別承認**・Phase 8 なし・ENSHiN OS 外部発信なし・doc14 追記なし（設計記録のため）。

## 11. 後続承認ゲート

1. **doc83 の push**（push-only・別承認）。
2. **CaseStudyConsent schema 実装承認**（§9 段階1。器のフィールド最終確定＝§12 Unknowns の人間確定を含む）。
3. 以降、§9 の段階2〜5 を1段ずつ個別承認。
4. どの段でも: 外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS 外部発信には個別人間承認なしに進まない。

## 12. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「**既存 ConsentRecord はメール営業チャネル同意用**」→ schema.prisma line 432〜443 実測（subject/channel/consent Boolean のみ・doc82 §3 と一致）②「doc82 方針の引き継ぎ」→ doc82 §5〜§9 の grep 実測（granted 申告値・anonymized=true のみ参照・推奨案B）③「書き込み層/AI参照層の現状」→ actions/case-study.ts/company-brain-reference/safety gate の本セッション実測（validateCaseStudyConsent 稼働・anonymized: true 条件を gate が機械検査）④「Customer の PII 近接」→ Customer model 実測（CUSTOMER_CONFIDENTIAL 既定）＝ID 参照のみの根拠。
**Assumption Log**: ①status は granted/revoked の2状態で、expired/suppressed は導出とする案が最も単純（最終確定は schema 承認時）②purpose 6区分（internal_view / ai_reference / external_publish / pr / seo / customer_voice）は doc82 §6-5 を踏襲③FakeLLM 運用継続。
**Unknowns Log**（schema 承認時に人間確定）: ①CaseStudy.consentRecordId のフィールド名の扱い（そのまま CaseStudyConsent の ID を入れるか、caseStudyConsentId へ改名するか＝改名は既存列変更になるため慎重判断）②evidence 原本の保管方式（MinIO 等・アップロードの要否）③expiresAt null の意味（期限なし可否）④台帳を登録できる権限者の範囲（RBAC 上の action 設計）。
**Risk Register**: 最大=器の意味混在（案A を選んだ場合のリスク）→ 案B推奨で回避。次点=台帳レコードへの PII 過剰記載 → customerId は ID のみ・evidence は所在の説明のみ・原本を本文に貼らない設計で抑止。次点=「設計確定=実装してよい」の誤解 → 本書全体で「schema実装は次の別承認」を明記。docs-only のため本番リスクは現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（doc82 方針・schema 4 model・書き込み層・AI参照層）✅／案A/案B 比較と **案B推奨** の確定 ✅／フィールド案・突合判定・影響整理・migration 方針・実装段階案・後続ゲートの記録 ✅／doc83 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 13. 次回推奨プロンプト案

> ①**doc83 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **CaseStudyConsent schema 実装承認**（§12 Unknowns の4点を確定してから schema-only・追加のみ migration・本番確認は doc49 の型）／Customer Pain の扱い判断（高機密ラベル対応が先）／Stage 2 / Stage 3 / ★2 / UX改善／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS 外部発信には個別人間承認なしに進まない。

## 14. 判定

**判定: READY / GO** — 器は **案B推奨（CaseStudyConsent 事例許諾専用新モデル）**で設計確定。schema実装は次の別承認。**ConsentRecord連携までは anonymized=true のみAI参照**・**anonymized=false は別承認**・外部公開/PR/SEO/顧客の声公開は禁止のまま。プロダクト機能基準は **Phase 2-C-5 / `6d656a3`** のまま変わらない。
