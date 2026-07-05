# 86. CaseStudyConsent UI設計 — 許諾台帳の登録・閲覧・取り消しの安全設計（docs-only・判定 READY / GO）

> doc85（CaseStudyConsent schema 本番確認 GO・基準 `812ae69`）後の、台帳UI（doc83 §9 段階2）の実装前安全設計。Mode B＋Consent / Privacy / Legal Evidence / CaseStudy Governance / AI Safety / UI Safety Overlay。
> **docs-only・UI 未実装・Server Action 未実装・schema変更なし・migration変更なし・seed変更なし・DB操作なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent schema / `812ae69`** のまま（doc86 は設計記録）。

---

## 1. 非エンジニア向け要約

- 許諾台帳（CaseStudyConsent）の**画面を作る前に、安全ルールを固定**しました。まだ画面はありません（**UI 未実装**・書き込み経路ゼロのまま）。
- 決めたこと: 画面は「事例ごとの許諾一覧・新規登録・閲覧・取り消し」だけに絞る／登録できるのは**人間のみ**／証跡欄には所在の説明だけ（原本や個人情報を貼らない）／**期限は必須**／取り消しても履歴は消さない／すべて記録（writeAudit）を残す。
- 変わらないこと: **AI参照条件は変えない**（**ConsentRecord連携までは anonymized=true のみAI参照**・**CaseStudyConsent は AI 文脈へ注入しない**）・**anonymized=false は未解禁**・外部公開なし。

## 2. 今回の目的

- doc83 §9 段階2（台帳UI）の実装承認を最小審査にするため、表示範囲・入力項目・権限・writeAudit・禁止事項・テスト/安全ゲート案を実装前に固定する。
- 許諾台帳は法的証跡に近い台帳のため、「自由に編集できる画面」ではなく「登録と取り消しの記録台帳」として設計する。

## 3. read-only 監査結果（2026-07-05 実測）

| 対象 | 実測結果 |
|---|---|
| 正本状態 | doc82（連携設計）・doc83（案B確定）・doc84（schema）・doc85（本番確認GO）が正本反映済み。CURRENT_STATE 最新基準 = **CaseStudyConsent schema / `812ae69`**・doc14 §57 存在 |
| CaseStudyConsent model | 存在。**expiresAt は必須 DateTime**・evidence String・purpose String[]・status default "granted"・revokedAt DateTime?・**relation なし（ID 参照）**。CaseStudy.consentRecordId は無変更・既存 ConsentRecord（メール営業チャネル同意）とは別物 |
| 既存 CaseStudy UI/actions（2-C-4 の型） | 4ファイル（一覧・new・edit・actions）。requireUser → **isHumanUser**（AI mutation 禁止）→ hasPermission（knowledge:create/**knowledge:update**）→ 入力検証 → **tenantId** スコープ → prisma → **writeAudit**（4箇所）→ revalidatePath。delete/deleteMany **0件（物理削除なし）**・publishStatus 'private' 固定・externalAiAllowed UI なし |
| Customer / PII | Customer は name/email/phone 等の PII を持ち label は CUSTOMER_CONFIDENTIAL → 台帳UIでは **PII を複製しない**（ID 参照のみ） |
| AI参照層 | company-brain-reference は anonymized: true 条件維持・**CaseStudyConsent への参照 0件**（=注入なし）。安全ゲートが CaseStudy 参照条件を機械検査中 |

## 4. UIのスコープ（MVP UI案）

初期 UI は以下**のみ**（最小の記録台帳）:

1. **CaseStudyConsent の一覧**（対象事例の許諾だけを表示）
2. **新規登録**（create・status は granted 固定）
3. **閲覧**（詳細表示）
4. **取り消し（revoke）**（revokedAt をセット・行は残す）

- **物理削除禁止**（delete/deleteMany 不使用・既存 brain 系と同じ）。
- **原則として「自由な編集」は最小化**する（update は初期スコープに入れない）。証跡の修正が必要な場合は将来の別承認で扱う（誤登録は revoke → 正しい行を再登録、の運用を基本とする）。

### MVPルート案（比較と推奨）

| 案 | ルート | 評価 |
|---|---|---|
| **案1（推奨）** | `/brain/case-studies/[id]/consents` | 事例単位で許諾を見るため誤登録しにくい・caseStudyId を URL から固定できる・グローバル一覧より PII 露出が少ない・既存 CaseStudy 編集画面と文脈が近い |
| 案2 | `/brain/case-study-consents` | テナント全体の許諾を横断表示。初期には広すぎる（誤登録・閲覧範囲のリスク）。将来の監査ビュー候補として保留 |

**推奨は案1**（ただし今回は実装しない）。

## 5. 入力項目（初期 UI 案）

| 項目 | 形式 | ルール |
|---|---|---|
| **purpose** | checkbox 複数選択（6区分: **internal_view** / **ai_reference** / **external_publish** / **pr** / **seo** / **customer_voice**） | **空（未選択）は拒否**（用途未記載は不許可・doc82 §6） |
| **evidence** | textarea | **証跡の所在説明のみ**（**TEXT_POINTER_ONLY**・doc84 §0）。**原本本文・メール本文・個人情報を貼らない**旨のガイドを画面に明記。空は拒否 |
| grantedAt | date | 許諾日 |
| **expiresAt** | date | **expiresAt 必須**（NULL_NOT_ALLOWED・期限なし許諾は認めない）。**grantedAt 以前の日付は拒否** |
| note | textarea（optional） | 補足のみ・PII を書かないガイド |
| customerId | **初期 UI では自由入力させない** | **Customer picker は初期 UI では作らない**（PII 近接のため慎重扱い）。**CaseStudy.customerId があれば自動反映、無ければ null**。picker の追加は将来の別承認 |
| status | 非入力 | create 時は **granted 固定**。取り消し時に **revoke** 操作で revoked / **revokedAt** をセット |

### 表示してよいもの / 表示しないもの

- 表示してよい: purpose・grantedAt・expiresAt・status（granted/取り消し済み）・evidence（所在説明）・note・登録者・登録/取り消し日時。
- 表示しない: Customer の氏名・メール・電話等（**PII を複製しない**・customerId の ID 表示までに留める）・既存 ConsentRecord（メール営業同意）の内容・他事例の許諾（案1では構造的に出ない）。

## 6. 権限設計（固定）

- **人間のみ**: **AIロールは作成・更新・取り消し不可**（**isHumanUser** を必ず通す・rbac.ts 無変更・2-C-4 と同じ actions 層人間専用化）。
- 権限は **knowledge:update** を基本候補にする（台帳は事例の付随記録のため。最終確定は実装承認時）。
- **tenantId** スコープ必須・対象 CaseStudy は**同一 tenantId**・**archivedAt null**（アーカイブ済み事例には登録不可）・publishStatus private・label は NORMAL / INTERNAL の現行 CaseStudy 方針に合わせる。**高機密ラベルは別承認**。

## 7. Server Action 方針・writeAudit 方針（将来実装時に必須）

- Server Action は **createCaseStudyConsent / revokeCaseStudyConsent の2本のみ**（update は初期スコープ外・入れる場合は別途設計）。※現時点では **Server Action 未実装**。
- 各操作で **writeAudit** 必須。**audit には証跡本文や PII を入れない**（purpose / expiresAt / **revokedAt** / caseStudyId 程度の最小情報にする）。
- **物理削除禁止**（行は消さない・取り消し履歴も台帳の一部＝追記主義）。

## 8. 取り消し設計

- revoke は「status='revoked'＋revokedAt セット」のみ（行の削除・書き換えなし）。
- revoke 済みの行への再 revoke は拒否。revoke の取り消し（再有効化）は初期スコープ外（必要なら新しい許諾行を登録）。
- 将来の突合判定（doc83 §9 段階3）では revoked / expired（expiresAt 超過）/ suppressed（SuppressionList 照会）を「無効な許諾」として扱う。**validateCaseStudyConsent 拡張は未実装**（段階3の別承認）。

## 9. AI参照に与える影響なし（固定）

- 台帳UIを作っても **AI参照条件は変えない**: **ConsentRecord連携までは anonymized=true のみAI参照**・publishStatus private のみ・NORMAL/INTERNAL のみ。
- **CaseStudyConsent は AI 文脈へ注入しない**（consentRecordId / customerId / evidence / purpose も注入しない・company-brain-reference 無変更）。
- **anonymized=false は未解禁**・**externalAiAllowed true UI なし**・**publishStatus UI なし**。
- **外部公開なし**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・**顧客の声公開なし**・**実LLMなし**・**外部送信なし**・**AIコストなし**。

## 10. UI 実装時のテスト案・安全ゲート拡張案・smoke 案

**否定系テスト**（shared 純粋関数＋actions 検証・実装時に追加）:

- create validation: purpose 空拒否／evidence 空拒否／expiresAt 未入力拒否／**expiresAt が grantedAt 以前なら拒否**。
- AIロール拒否（isHumanUser）／権限なし拒否（knowledge:update なし）／tenantId 不一致拒否／archived CaseStudy への登録拒否／revoked 行への再 revoke 拒否。
- revoke 時に writeAudit が記録されること。

**安全ゲート**（scripts/check-company-brain-safety.mjs の拡張案）:

- consents actions に isHumanUser・writeAudit・delete/deleteMany 不使用（**物理削除禁止**）が存在すること。
- evidence ガイド文言（原本・PII を貼らない）が UI に存在すること。
- company-brain-reference に CaseStudyConsent の findMany が**存在しない**こと（AI 非注入の機械検査）。

**smoke 案**: CaseStudy 詳細/編集から許諾台帳画面へ行ける → 登録できる → 一覧に出る → 取り消せる（取り消し済み表示）→ externalAiAllowed / publishStatus UI が無いこと。既存 smoke 21本は無変更。

**実装時の停止条件**: 同一エラー2回・修正 Loop 3回で停止／ゲート・テスト・smoke のいずれかが green にならない場合は commit せず HOLD 記録／§0 承認テンプレート未記入なら実装開始しない。

## 11. 後続ステップ（すべて別承認）

1. **doc86 の push**（push-only・別承認）。
2. **台帳 UI 実装承認**（本設計準拠・2-C-4 の型・テスト/ゲート/smoke 同時・doc87 候補）→ push → 本番確認（§0・利用者実測）。
3. **突合判定**（doc83 §9 段階3・validateCaseStudyConsent 拡張＋否定系テスト＋安全ゲート）。
4. anonymized=false の解禁判断・公開活用（ApprovalRequest・表現審査）はさらに後続。

## 12. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「2-C-4 の型が流用可能」→ actions.ts 実測（isHumanUser・hasPermission・writeAudit 4箇所・delete 0）②「器の制約」→ schema 実測（expiresAt 必須・purpose String[]・relation なし）③「PII 近接」→ Customer model 実測（CUSTOMER_CONFIDENTIAL）＝picker を作らない根拠 ④「AI 非注入の現状」→ company-brain-reference に CaseStudyConsent 参照 0件の実測 ⑤「§0 決定の引き継ぎ」→ doc84 §2（TEXT_POINTER_ONLY・NULL_NOT_ALLOWED・HUMAN_KNOWLEDGE_UPDATE_ONLY）。
**Assumption Log**: ①権限は knowledge:update 流用が最小（新 permission 追加は不要の見込み・実装承認時に最終確定）②update なし（登録と取り消しのみ）で初期運用は成立する ③FakeLLM 運用継続。
**Unknowns Log**: ①一覧への導線（CaseStudy 編集画面のリンク位置）の細部 ②revoke 理由の入力欄の要否（初期は note で代替可）③案2（横断一覧）の将来要否 ④Customer picker の将来設計（PII 表示範囲・別承認）。
**Risk Register**: 最大=証跡欄への原本/PII 貼り付け → ガイド明記＋TEXT_POINTER_ONLY 方針＋audit 最小情報で抑止（機械的な PII 検査は誤判定が多いため行わず運用で担保・2-C-4 と同方針）。次点=自由編集による証跡改変 → update を初期スコープから外し revoke＋再登録の運用で抑止。次点=「台帳がある=実名解禁」の誤解 → §9 で AI 参照条件不変を明記。docs-only のため本番リスクは現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査5系統 ✅／UIスコープ・ルート比較（案1推奨）・入力項目・権限・writeAudit・取り消し・AI非影響・テスト/ゲート/smoke 案・停止条件の設計固定 ✅／doc86 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 13. 次回推奨プロンプト案

> ①**doc86 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **CaseStudyConsent 台帳UI 実装承認**（doc86 準拠・ルート案1・create/revoke の2 Server Action・否定系テスト＋安全ゲート拡張＋smoke 同時・doc87 候補）／**突合判定の設計・実装判断**（doc83 §9 段階3）／Customer Pain（高機密が先）／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別承認なしに進まない。

## 14. 判定

**判定: READY / GO**（台帳UIの安全設計は固定完了・**UI 未実装**・実装は次の別承認）。**anonymized=false は未解禁**・**ConsentRecord連携までは anonymized=true のみAI参照**・プロダクト基準は **CaseStudyConsent schema / `812ae69`** のまま変わらない。
