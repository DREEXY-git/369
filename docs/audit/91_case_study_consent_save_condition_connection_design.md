# 91. CaseStudyConsent 保存条件接続設計 — anonymized=false の扱いと突合判定の接続方針（docs-only・判定 READY / GO）

> doc90（突合判定の純粋関数・正本反映済み）後の、**保存条件への接続**（doc89 §13 段階3）の実装前設計。Mode B＋Consent / CaseStudy Governance / AI Safety Overlay。
> **docs-only・実装なし・保存条件接続なし・code/schema/migration/seed/package 変更なし・doc14 追記なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent UI / `1913456`** のまま。

---

## 1. 非エンジニア向け要約

- 照合の頭脳（突合判定）はできましたが、**まだ保存条件には接続していません**。今の本番では、匿名化を外す保存は「許諾あり（granted）」の**申告だけ**で通ります（doc82 の方針どおり、これは暫定です: **consentStatus=granted だけでは真正な許諾証拠として扱わない**）。
- 次に決めるのは「**実名寄り保存（匿名化オフ）をどう扱うか**」: 照合を保存条件に**接続だけ先行**するか・実名運用の方針決定と**セット**にするか・いったん**封印寄り**に戻すか——の人間選択です。本書は3案を比較し、**接続だけ先行（案A）を推奨**として固定しました（**いきなり実装しない**・実装は §0 人間決定後の別承認）。
- 変わらないこと: **anonymized=false は未解禁**・**AI参照条件変更なし**（AIが読む事例は匿名化済みだけ）・**CaseStudyConsent は AI 文脈へ注入しない**・公開もなし。

## 2. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| CaseStudyConsent UI は本番確認 GO 済み（基準 **CaseStudyConsent UI / `1913456`**） | doc88・doc14 §58・CURRENT_STATE 実測 |
| doc90 の純粋関数（validateCaseStudyConsentReconciliation）は正本反映済み・**ただし未接続** | actions.ts / company-brain-reference の grep 0件（実測） |
| CaseStudy の既存保存処理には **validateCaseStudyConsent（匿名化の門番）**がある | actions.ts line 61 で稼働（granted 以外で anonymized=false を拒否・本番実証済み doc77） |
| **consentStatus=granted だけでは真正な許諾証拠として扱わない**（現状の granted は申告値） | doc82 §5・doc89 §4 |
| 段階分離の安全ゲートが CI で稼働中（接続・門番変更・AI参照接続の混入で FAIL） | scripts の grep 実測（段階分離 6・canDisableAnonymization 1） |
| 本番の CaseStudy / CaseStudyConsent に実顧客情報は無い（テストは架空のみ・片付け済み） | doc77 / doc80 / doc88 の本番確認記録 |

- `anonymized=false` の扱いには慎重な判断が必要（実名寄り保存の入口であるため）。

## 3. 論点

1. **保存条件接続とは何か**: 匿名化を外す保存（anonymized=false）の時に、申告値（granted）だけでなく**突合判定（有効な台帳行の機械確認）を必須化**すること。保存が今より**厳しくなる**変更であり、何も解禁しない。
2. **anonymized=false をどう扱うか**: 接続後も「保存できる」だけで、AI参照・公開には使われない（それぞれ別承認）。
3. **接続だけ先行か・方針決定とセットか**（§4 の3案比較）。
4. **どの purpose を保存条件に使うか**: 匿名化オフ＝社内で実名寄りを閲覧できる状態のため、最低 **internal_view** の許諾を要件とする案が基本（ai_reference まで求めるかは §0 で人間決定）。
5. **SuppressionList 照会をどの層で扱うか**: 純粋関数は suppressed boolean を受け取るだけ。呼び出し側（actions）が customerId → Customer → subject を解決して照会する案と、当面 suppressed=false 固定で開始し照会は後段とする案がある（§0 で人間決定）。
6. **既存の CaseStudy.consentRecordId をどう扱うか**: 据え置き（doc84 §0 KEEP）。突合は caseStudyId ベースの台帳検索で行い、consentRecordId は当面参照しない（改名・利用開始は別承認）。
7. **エラー時の UX**: 拒否理由（期限切れ・取り消し済み・用途なし等）を利用者に分かる形で返すか、一般的な拒否文言にするか（§0 で人間決定）。
8. **既存データへの影響を避ける**: 本番に anonymized=false の実データは無い（実測根拠あり）ため、**バックフィル不要・保存時判定のみ**で開始できる。既存行の書き換えはしない。

## 4. 選択肢比較（3案）

| 案 | 内容 | メリット | 注意 |
|---|---|---|---|
| **案A（推奨）: 接続だけ先行** | anonymized=false の**保存時**に突合判定を必須化（granted 申告＋**有効な台帳行**が無ければ保存拒否）。AI参照条件や公開は変えない | **申告値だけでの実名寄り保存を防げる**＝純粋に安全側へ強化・解禁ゼロ・最小差分・doc82 §6 の設計に直結 | 現行より保存が厳しくなる（許諾ありでも台帳未登録なら匿名のまま。ただし本番に実名寄りデータは無く影響ゼロ） |
| 案B: anonymized=false 方針決定とセット | 接続と同時に「実名寄り事例をどう運用するか」（登録フロー・閲覧範囲・表示方法）まで設計・実装 | 方針のズレが少ない・二度手間がない | 判断が重くなる（運用設計・UX・権限まで一括）＝承認が大きくなり過ぎ、段階承認の原則に反しやすい |
| 案C: いったん anonymized=false を封印寄りに戻す | 実名寄り保存自体を一時的に全面拒否（門番を「granted でも不可」へ強化） | 最も安全側 | 本番実証済みの現行 UX（granted で解除可）と矛盾し、既存 UI 文言・smoke・doc77 の記録との整合再確認が必要。台帳が既に本番稼働している今、案A で同等の安全性を得られる |

**推奨は案A（CONNECT_ONLY）**: 解禁を一切含まず、申告値依存という既知の弱点だけを塞ぐ最小の前進。ただし**推奨を出しても実装はしない**（§0 人間決定 → 実装承認 → 本番確認の段階承認）。

## 5. 次回 §0 人間決定候補

実装承認時に人間が選ぶ項目（候補形式・OTHER は詳細必須）:

```
SAVE_CONNECTION_POLICY: 【CONNECT_ONLY / CONNECT_WITH_ANONYMIZED_POLICY / SEAL_ANONYMIZED_FALSE_FIRST】（推奨: CONNECT_ONLY）
TARGET_PURPOSE_FOR_ANONYMIZED_FALSE: 【internal_view / internal_view_and_ai_reference / OTHER】（推奨: internal_view）
SUPPRESSION_CHECK_POLICY: 【CALLER_RESOLVES_SUPPRESSED_BOOLEAN / SERVICE_LAYER_LOOKUP / OTHER】
EXISTING_DATA_POLICY: 【NO_BACKFILL / READ_ONLY_AUDIT_FIRST / OTHER】（推奨: NO_BACKFILL・本番に実名寄りデータ無しの実測根拠あり）
ERROR_UX_POLICY: 【REDIRECT_WITH_REASON_CODE / GENERIC_DENIED_MESSAGE / OTHER】
```

## 6. 実装する場合の段階案（各段個別承認）

1. **docs-only 設計（今回 doc91）** ✅
2. **§0 人間決定**（§5 の5項目）
3. 接続の最小実装（actions の anonymized=false 分岐に突合判定を追加・台帳読み出しは actions 層）
4. 否定系テスト（接続層: 台帳なし/失効/用途なしで保存拒否）
5. safety gate 更新（段階分離ゲートの「接続禁止」検査を「承認済み接続の形」検査へ更新＝更新自体が承認の証跡になる）
6. 本番確認（利用者実測・§0）
7. anonymized=false の本格扱い判断（運用・表示・閲覧範囲）
8. AI参照条件の扱い判断（ai_reference purpose の使用）
9. 公開活用判断（ApprovalRequest・表現審査）

## 7. 今回やらなかったこと

- **保存条件接続なし**（validateCaseStudyConsentReconciliation は未接続のまま）・**anonymized=false は未解禁**・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。
- **company-brain-reference 変更なし**・**UI / Server Action 変更なし**・tests/safety gate 変更なし・**schema変更なし**・**migration変更なし**・seed/package/lockfile/doc14 変更なし。
- **外部送信なし・実LLMなし・AIコストなし**・PR / SEO / SNS / 顧客の声公開なし・高機密なし・本番DB接続なし・push なし。

## 8. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「現行門番の稼働位置」→ actions.ts line 61 の実測（validateCaseStudyConsent）②「未接続」→ actions/company-brain-reference の grep 0件 ③「granted=申告値」→ doc82 §5・doc89 §4 ④「段階分離ゲート稼働」→ scripts の grep 実測 ⑤「既存データ影響ゼロの根拠」→ doc77/doc80/doc88（本番は架空のみ・片付け済み）。
**Assumption Log**: ①案A は現行 UX の文言微修正（「許諾あり＋台帳登録が必要」）で収まる ②suppressed=false 固定開始でも安全性は現状比で純増（現状は照会ゼロのため）③FakeLLM 継続。
**Unknowns Log**: ①§0 の5決定（人間）②拒否理由の表示粒度（reason コード17種をどこまで見せるか）③案B へ進む場合の実名寄り運用設計（閲覧権限・表示形式）。
**Risk Register**: 最大=接続と解禁の混同 → 本書 §1/§7 と既存の段階分離ゲートで遮断。次点=保存が厳しくなることによる運用戸惑い → エラー文言と台帳登録導線（既存 UI）で吸収・本番に影響データ無し。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／事実整理・論点8・3案比較（**案A推奨**）・§0 候補5項目・段階9案・不変事項の固定 ✅／doc91 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 9. 次回推奨プロンプト案

> ①**doc91 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **保存条件接続の §0 人間決定**（§5 の5項目をチャット提出）→ **接続の最小実装承認**（doc92 候補・actions の anonymized=false 分岐＋否定系テスト＋ゲート更新のみ）→ 本番確認。③並行選択肢: Customer Pain の扱い判断／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別承認なしに進まない。

## 10. 判定

**判定: READY / GO**（保存条件接続の設計は固定完了・実装は §0 人間決定後の別承認）。**anonymized=false は未解禁・AI参照条件変更なし**・プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま変わらない。
