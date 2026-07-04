# 82. ConsentRecord連携設計 — CaseStudy 許諾真正性・匿名化解除・公開活用ゲート（docs-only・判定 READY / GO）

> Phase 2-C 正式クローズ（doc81・doc14 §56）後の後続設計。Mode B＋Consent / Privacy / Legal Evidence / AI Safety / CaseStudy Governance Overlay。
> **docs-only・アプリコード変更なし・schema/migration/seed 変更なし・DB操作なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト機能基準は本記録 commit ではなく **Phase 2-C-5 / `6d656a3`** のまま。

---

## 1. 非エンジニア向け要約

- 顧客事例（CaseStudy）の「許諾あり」という記録を、**本当に信用してよい証拠（許諾真正性）にするための設計**を固定しました。まだ実装はしていません（**ConsentRecord連携は別承認**）。
- 今の安全状態はそのまま: 顧客事例の匿名化を外せるのは「許諾あり」と記録されたときだけ・AIが読むのは匿名化済みだけ・外部AIには出ない・公開機能はそもそも無い。
- 今回決めた核心: **consentStatus=granted だけでは真正な許諾証拠として扱わない**（画面で選んだ自己申告に過ぎないため）。本当の許諾は、将来 ConsentRecord（許諾の台帳）と突合して「誰が・何の用途で・いつまで・どんな証跡で」を確認できたときだけ認める。**ConsentRecord連携までは anonymized=true のみ参照**を維持し、実名寄り事例・成果数値・顧客の声は AI にも公開にも使いません。
- 重要な発見: **既存の ConsentRecord はメール営業の同意管理用**（メール/電話・チャネル同意の Boolean）で、事例公開の許諾に必要な「用途・失効・期限・証跡」を持っていません。連携には器の拡張（schema 追加＝別承認）が必要です。

## 2. 今回の目的

- Phase 2-C で完成した「許諾の門番」（validateCaseStudyConsent）の**次の段**として、granted の真正性を担保する接続条件・失効条件・監査条件を docs-only で固定する。
- 実名寄り事例・顧客名・取引先名・成果数値・顧客の声・公開活用（PR/SEO/顧客の声掲載）に将来進む場合の**前提条件と承認ゲート**を、実装より先に決めておく（doc78 §4 の宿題の回収）。

## 3. read-only 監査結果（2026-07-05 実測）

| 対象 | 実測結果 |
|---|---|
| Phase 2-C 完了状態 | doc81・doc14 §56・CURRENT_STATE・PROGRESS すべてに Phase 2-C-CLOSE（GO）が正本反映済み（3ref=`637e016`）。最新基準は Phase 2-C-5 / `6d656a3` |
| CaseStudy model | `consentStatus`（String・default "none"）・`consentRecordId`（String?・**relation なしの ID 参照**）・`customerId`（String?・CRM の Customer への relation なし ID 参照）・`anonymized`（default true）・`publishStatus`（default "private"）・`externalAiAllowed`（default false）・`label`・`archivedAt`。index 3本（tenantId / label / publishStatus） |
| ConsentRecord model | **存在するが用途がメール営業のチャネル同意**: `subject`（メール/電話）・`channel`（email/line/sms）・`consent`（Boolean）・`source`・`note`・`createdAt`。**用途（purpose/scope）・granted/revoked/expired の状態・expiresAt・revokedAt・証跡（evidence）・Customer への参照を持たない**。CaseStudy との relation なし |
| SuppressionList | `channel`・`value`・`reason`。`isSuppressed`（shared）が approvals / outreach の送信前抑止で稼働中 |
| 書き込み層 | actions は isHumanUser（AI mutation 禁止）→ hasPermission → `validateCaseStudyConsent`（granted 以外で anonymized=false を機械拒否・大文字揺れも拒否・否定系テスト6本）→ writeAudit。publishStatus 'private' 固定・externalAiAllowed は UI から変更不可。customerId / consentRecordId の入力 UI は未実装 |
| AI参照層 | where = tenantId・archivedAt:null・publishStatus 'private'・anonymized:true・NORMAL/INTERNAL。**consentStatus は参照条件に使わない**・sourceNote/customerId/consentRecordId/consentStatus は select せず注入しない・ai_reference 自動記録・externalAiAllowed ゲート維持。安全ゲート（CI）が全条件を機械検査 |

## 4. 現在の安全状態（この設計の出発点・実装まで維持）

- AI が読める顧客事例は **anonymized=true のみ**（**ConsentRecord連携までは anonymized=true のみ参照**）。
- **externalAiAllowed false** 維持（true にする UI なし＝外部LLM注入は構造的ゼロ）。**publishStatus private** 維持（公開機能なし）。
- 匿名化解除は consentStatus='granted' のときだけ（本番実証済み・doc77）。ただし granted は現状**申告値**。
- 変更は人間のみ・**writeAudit** 3操作・AI参照は **ai_reference** でレコード単位に自動記録・物理削除なし。

## 5. ConsentRecord 連携の基本方針（今回固定）

1. **consentStatus=granted だけでは真正な許諾証拠として扱わない**。granted は「許諾があると人間が申告した」印であり、証拠は ConsentRecord 側に置く。
2. 真正な許諾と認める条件（将来の突合）: 有効な `consentRecordId` が指す許諾レコードが「**誰が（subject/Customer）・何の用途で（purpose）・いつ（grantedAt）・いつまで（expiresAt）・どんな証跡で（evidence）**」を持ち、失効していないこと。
3. **既存 ConsentRecord（メール営業のチャネル同意）とは意味が異なるため、そのまま流用しない**。連携の器は（案A）既存 ConsentRecord へのフィールド追加、（案B）事例許諾専用の新モデル（例: CaseStudyConsent）の**どちらかを実装承認時に人間が選択**する。**推奨は案B**（追加のみの migration で既存メール同意の意味を壊さない・本プロジェクトの「破壊的SQLなし」前例に合致）。いずれも schema 変更＝**ConsentRecord連携は別承認**。
4. 連携実装までの間は現行の安全状態（§4）を一切緩めない。実名寄り事例・成果数値・顧客の声は AI 参照にも公開にも使わない。

## 6. 匿名化解除の将来条件（anonymized=false を認める条件・今回は設計のみ）

**anonymized=false は別承認**。解禁時は以下の**全条件 AND** を機械判定にする（validateCaseStudyConsent の拡張として実装・否定系テスト＋安全ゲート拡張とセット）:

1. `consentStatus = 'granted'` であること（現行条件・維持）。
2. 有効な `consentRecordId` が存在し、突合先レコードが実在すること。
3. 突合先が **同一 tenantId** であること（テナント越え参照の禁止）。
4. 突合先が **revoked / expired / suppressed のいずれでもない**こと（revokedAt なし・expiresAt 未到来・subject が SuppressionList に載っていない）。
5. 許諾範囲（purpose）に**該当用途が明示的に含まれる**こと。用途は最低限次の区分を明示: `internal_view`（社内閲覧）/ `ai_reference`（AI参照）/ `external_publish`（外部公開）/ `pr`（PR配信）/ `seo`（SEO掲載）/ `customer_voice`（顧客の声掲載）。**用途未記載は不許可（安全側）**。
6. 公開系用途（external_publish / pr / seo / customer_voice）は、フィールド条件を満たしても**さらに ApprovalRequest による公開前人間承認が別途必要**（既存 requiresApproval の流儀）。
7. 解除操作は人間のみ（AI mutation 禁止維持）・**writeAudit** 必須・実名寄り事例の閲覧/AI参照は writeDataAccess / **ai_reference** で記録が残ること。

## 7. 許諾取り消し時の安全側挙動（revoked / expired / suppressed・今回は設計のみ）

- **revoked**（取り消し）・**expired**（期限切れ）・**suppressed**（配信停止/接触拒否）のいずれかを検知したら:
  1. CaseStudy を **anonymized=true に戻す**（自動 or 運用手順で。戻すまでの間も次項で遮断）。
  2. **AI参照対象から即時除外**（AI参照条件は anonymized=true のみ、かつ将来 anonymized=false 参照を解禁していた場合はその解禁条件（§6-4）が自動で不成立になる設計＝二重遮断）。
  3. **externalAiAllowed false** を維持・**publishStatus private** を維持。将来公開ページがある場合は**非公開化（取り下げ）**を即時実施。
  4. 取り消し処理自体を **writeAudit** に記録する。
  5. **既存 ai_reference の履歴は消さない**（「取り消し前に AI が読んだ」事実は監査記録として保持・追記主義）。
- SuppressionList に subject が載っている場合は、許諾の再依頼などの**連絡自体も抑止**する（既存 isSuppressed の流儀を流用）。

## 8. AI参照条件の将来変更方針

- **ConsentRecord 連携後も、まずは anonymized=true のみ参照を維持する**（連携＝即解禁ではない）。
- anonymized=false の事例を AI 参照対象へ加えるのは**別承認**とし、その際も §6 の全条件＋用途 `ai_reference` の許諾明示が前提。sourceNote / customerId / consentRecordId / consentStatus を AI 文脈へ注入しない方針は維持。
- **実LLMなし**の現状から実LLMへ進むのはさらに別の重い承認。外部LLM送信時は externalAiAllowed=true（現状 UI なし）＋ maskText ＋ PII検査 ＋ ConsentRecord の用途確認の**4条件が揃うまで構造的ゼロ**を維持する。
- 参照条件を変えるときは、安全ゲート（scripts/check-company-brain-safety.mjs）の機械検査・否定系テスト・smoke を**同じ commit で**更新する（検査だけ後回しにしない）。

## 9. 公開・PR・SEO・顧客の声活用のゲート

以下は**現時点ではすべて禁止のまま**（今回の設計でも解禁しない）: **外部公開は別承認**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・口コミ投稿なし・**顧客の声公開なし**・導入企業名掲載なし・成果数値掲載なし・取引先名掲載なし。

将来解禁する場合の前提（全部そろって初めて着手可・それでも公開1件ごとに人間承認）:

1. ConsentRecord 連携が実装済みで、該当用途（external_publish / pr / seo / customer_voice）の許諾が突合で確認できる。
2. 表現審査（広告表現・誇大表示・比較表現のチェック）を通過している。
3. **公開前人間承認**（ApprovalRequest）を通過している。
4. **取り下げ対応**が用意されている（revoked / expired / suppressed 検知で §7 の非公開化が即時実行できる）。
5. **証跡保存**: 許諾証跡・承認記録・公開/取り下げの writeAudit が残る。

## 10. 実装時の付帯作業（実装承認が出たときに同時に行うこと）

- schema 追加（案A/案B の人間選択・**追加のみの migration**・破壊的SQLなし）→ 本番確認は §0 テンプレートの利用者実測（doc49 の型）。
- validateCaseStudyConsent の拡張＋**否定系テストの追加**（revoked/expired/suppressed/用途なし/テナント不一致の各拒否）。
- 安全ゲートへの機械検査追加（突合条件が壊れたら CI が検知）。
- CaseStudy 編集画面への consentRecordId / customerId 参照 UI（人間のみ・writeAudit）。
- seed は架空データのみ・doc14 追記は本番確認時のみ。

## 11. 今回やらなかったこと

- ConsentRecord 実装・schema 変更・migration・seed 変更・CaseStudy actions 変更・company-brain-reference 変更（すべて別承認）。
- **Customer Painは別承認**（高機密ラベル対応が先）・**高機密ラベルは別承認**・externalAiAllowed true UI なし。
- **外部送信なし**・**実LLMなし**・**AIコストなし**・本番確認なし・本番DB接続なし・push なし。
- **Phase 8なし**（実課金に進まない）・**ENSHiN OS外部発信なし**・docs/10_obsidian との関係は今回も確定しない。

## 12. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「granted が申告値である」→ actions.ts / case-study.ts の実装コメントと doc78 §4・doc80 Assumption（本ミッション read-only 実測）②「既存 ConsentRecord が用途・失効・証跡を持たない」→ schema.prisma line 432〜443 の実測（subject/channel/consent Boolean のみ）③「現在の安全状態」→ company-brain-reference の where 句・安全ゲート検査・doc77/doc80 の本番実測記録 ④「SuppressionList の抑止流儀」→ isSuppressed の approvals/outreach 使用実測。
**Assumption Log**: ①事例許諾の器は案B（専用新モデル）が本プロジェクトの「追加のみ migration」前例に最も適合する（最終選択は実装承認時の人間判断）②FakeLLM 運用継続③公開活用は当面着手しない前提で設計だけ先に固定。
**Unknowns Log**: ①案A/案B の最終選択と器のフィールド確定（証跡 evidence の形式=書面/メール/フォームの別、expiresAt の既定、許諾を登録できる権限者の範囲）②customerId と Customer（CRM）の連携 UI の要否③revoked/expired の検知方式（保存時判定のみか、定期チェックか）④公開活用の要否そのもの（人間の事業判断）。
**Risk Register**: 最大リスク=granted の誤信（申告値を証拠と誤解して実名解禁）→ 本設計の §5-1 と「**ConsentRecord連携までは anonymized=true のみ参照**」の維持で遮断。次点=既存メール同意との意味混線 → 案B 推奨と §5-3 で分離。次点=取り消し後の残存公開 → §7 の即時非公開化と ai_reference 履歴保持で対応。設計のみのため本番リスクは現時点でゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査（Phase 2-C 完了状態・CaseStudy・ConsentRecord・SuppressionList・書き込み層・AI参照層）✅／基本方針・匿名化解除条件・取り消し時挙動・AI参照将来方針・公開ゲートの5点を設計固定 ✅／doc82 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 13. 次回推奨プロンプト案

> ①**doc82 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **ConsentRecord連携の実装判断**（案A=既存拡張 / 案B=事例許諾専用新モデル の選択から。schema 追加を含むため段階承認: 設計確定→schema→UI→突合判定の順）／**Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2 / Stage 3 / ★2 / UX改善**／**品質基盤強化**。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別人間承認なしに進まない。

## 14. 判定

**判定: READY / GO**（ConsentRecord 連携の設計は固定完了・実装は未着手）。**ConsentRecord連携は別承認**・**anonymized=false は別承認**・**外部公開は別承認**。プロダクト機能基準は **Phase 2-C-5 / `6d656a3`** のまま変わらない。
