# 94. CaseStudyConsent anonymized=false 本格扱い設計 — 実名寄り事例の運用・表示・閲覧範囲（docs-only・判定 READY / GO）

> doc93（保存条件接続の本番確認 GO・基準昇格）後の、**anonymized=false（匿名化オフ＝実名寄り）事例の本格扱い**（doc91 §6 段階7）の実装前設計。Mode B＋Consent / CaseStudy Governance / AI Safety Overlay。
> **docs-only・実装なし・UI変更なし・Server Action変更なし・code/schema/migration/seed/package/doc14 変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま。

---

## 1. 非エンジニア向け要約

- 保存条件接続は**本番確認GO済み**です（doc93・基準 `5e9461f`）。匿名化を外す保存には、許諾台帳の有効な行（社内閲覧 internal_view・期限内・取り消しなし）が必須になりました。
- ただし今の anonymized=false は「**保存できるだけ**」です。**AI参照・公開・PR・SEO・SNS・顧客の声にはまだ使いません**（それぞれ別承認）。
- 今回は「実名寄り事例を社内でどう表示するか・誰が見られるか・台帳が取り消されたらどうするか」を**実装前に設計するだけ**です。3案を比較し、**案A（社内限定・制限表示）を推奨**として固定しました。**いきなり実装しません**（§0 人間決定 → 実装承認 → 本番確認の段階承認）。
- 変わらないこと: **anonymized=false は未解禁**（本格扱いは §0 決定後）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。

## 2. 現在の事実整理（read-only 監査・2026-07-05 実測）

| 事実 | 根拠 |
|---|---|
| **CaseStudyConsent 保存条件接続 / `5e9461f`** が本番確認GO済みプロダクト基準 | doc93・doc14 §59・CURRENT_STATE 基準セクション（実測 grep 1件） |
| 新規作成では匿名化オフ不可（「許諾あり」でも拒否・案内表示） | doc93 §2 利用者実測 |
| 台帳なしでは匿名化オフ保存不可（台帳登録が必要の案内） | doc93 §2 利用者実測 |
| internal_view の有効台帳行があれば保存可能（実名寄り表示になる） | doc93 §2 利用者実測 |
| 台帳取り消し後は再び拒否（行は残り取り消し済み表示） | doc93 §2 利用者実測 |
| **anonymized=false は未解禁**（保存できるだけ・本格扱い未設計） | doc92 §6・doc93 §4 |
| **AI参照条件変更なし**（AIが読む事例は anonymized=true のみ） | company-brain-reference の grep 0件（実測）・doc78 §3 |
| **CaseStudyConsent は AI 文脈へ注入しない** | 安全ゲートの AI 非注入検査稼働（実測 6箇所参照）・doc86 §9 |
| 匿名化の門番（canDisableAnonymization）は既定実装のまま | `return consentStatus === 'granted';` grep 1件（実測） |
| 安全ゲートは「承認済み接続の形」を常時機械検査 | scripts の grep 1件（実測） |
| 本番に実名寄りの実顧客データは無い（テストは架空のみ・片付け済み） | doc93 §2（匿名化に戻す＋アーカイブ片付け実測） |

## 3. 論点（10）

1. **社内でどう表示するか**: 現状一覧に「実名寄り（許諾あり）」相当の表示はあるが、警告バッジ・注意文言の統一設計はない。実名寄りであることが一目で分かる表示（badge）が最低限必要。
2. **誰が閲覧できるべきか**: 現状は knowledge:read で一覧・詳細とも閲覧可能。実名寄りだけ knowledge:update 以上（書ける人＝運用責任を持つ人）に絞るかは §0 候補。
3. **通常の一覧でどこまで見せるか**: 一覧は badge のみで本文は詳細ページに限るか、一覧でも要約を出すか（badge_only / masked_summary / detail_page_only）。
4. **顧客名・成果数値・顧客の声をどこまで許可するか**: 台帳が有効でも、顧客名の本文記載・成果数値・顧客の声はそれぞれ重みが違う。顧客の声は customer_voice purpose・公開系は external_publish / pr / seo と別段の判断が必要。Customer マスタとの join 表示（PII 複製）はしない方針を維持。
5. **台帳取り消し時に既存の anonymized=false 事例をどう扱うか**: 現状は「次の保存で拒否」のみ（既存行は実名寄りのまま残る）。手動で匿名化へ戻す運用にするか・自動で匿名化候補に戻すか・将来保存のみブロックで維持か（§0 候補・自動書き換えは監査と本人予期の観点で慎重に）。
6. **AI参照条件へ入れるかどうか**: 入れない。AIが読むのは anonymized=true のみを維持（変更は doc91 §6 段階8 の別承認）。
7. **公開活用へ進めるかどうか**: 進めない。公開には ApprovalRequest・表現審査・公開前人間承認・取り下げ運用が前提（doc82 §7・doc91 §6 段階9 の別承認）。
8. **writeAudit / ai_reference 履歴をどう扱うか**: 既存の writeAudit（更新記録）と ai_reference 履歴は削除しない。実名寄り化・匿名化復帰の操作も従来どおり writeAudit に残る（追加の專用 audit イベントは実装時に検討）。
9. **本番データへのバックフィル要否**: 不要。本番に実名寄りの実データは無い（doc93 実測）。既存行の書き換えはしない（NO_BACKFILL 継続）。
10. **UX 文言と警告バッジ**: 実名寄り事例の編集・閲覧画面に「許諾台帳に基づく実名寄り事例・公開不可・AI参照対象外」を明示する文言/バッジを実装時に設計（PII を助長しない書き方）。

## 4. 選択肢比較（3案）

| 案 | 内容 | メリット | 注意 |
|---|---|---|---|
| **案A（推奨）: internal-only restricted display（社内限定・制限表示）** | anonymized=false は**社内限定表示のまま**とし、警告バッジ＋注意文言を付ける。閲覧権限（knowledge:read のままか knowledge:update 以上に絞るか）は §0 で人間決定。**AI参照には使わない・公開には使わない**。台帳が無効化された既存行は手動で匿名化へ戻す運用＋将来保存ブロック（自動書き換えはしない）を基本候補とする | 最小で安全・現行の本番確認済み UX と連続・解禁ゼロ・PII 露出面を増やさない | 表示の丁寧さは案Bに劣る（バッジと詳細ページ中心） |
| 案B: read-only expanded display（表示拡張） | 一覧や詳細で実名寄り表示を拡張（一覧に要約表示等）。AI/公開には使わない | 利用者には分かりやすい | 閲覧範囲・マスキング設計が重くなる＝承認が大きくなり段階承認の原則に反しやすい・PII 露出面が増える |
| 案C: seal until full governance（統治整備まで封印） | 本格扱いをまだ封印し、保存はできても通常表示・活用は最小限に留める | 最も安全 | 台帳接続（doc92/93）の価値が利用者に見えにくい・本番確認済みの「実名寄り（許諾あり）」表示との整合再設計が必要 |

**推奨は案A（INTERNAL_ONLY_RESTRICTED）**: 解禁を一切含まず、実名寄り事例の「見え方の統治」だけを最小で整える。ただし**推奨を出しても実装はしない**（§0 人間決定 → 実装承認 → 本番確認の段階承認）。

## 5. AI参照との関係（不変事項）

- **AI参照条件変更なし**: AIが読む顧客事例は **anonymized=true（匿名化済み）のみ**を維持。
- **CaseStudyConsent は AI 文脈へ注入しない**（台帳の行・証跡・用途を AI に読ませない。安全ゲートで機械検査継続）。
- **anonymized=false は AI に読ませない**（company-brain-reference の `anonymized: true` 条件は不変）。
- 台帳に **ai_reference** purpose があっても、**今回の設計だけでは AI参照に使わない**。
- AI参照条件の扱いは **doc91 §6 段階8 の別承認**。

## 6. 公開活用との関係（不変事項）

- **外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし・導入事例公開なし**。
- 台帳に **external_publish / pr / seo / customer_voice** の purpose があっても、**それだけでは公開できない**（台帳は必要条件の一つに過ぎない）。
- 公開活用には **ApprovalRequest**・表現審査・公開前人間承認・取り下げ運用が必要（doc82 §7 の5前提）。
- 公開活用は **doc91 §6 段階9 の別承認**。

## 7. 次回 §0 人間決定候補

実装承認時に人間が選ぶ項目（候補形式・OTHER は詳細必須・推奨は安全側）:

```
ANONYMIZED_FALSE_POLICY: 【INTERNAL_ONLY_RESTRICTED / READ_ONLY_EXPANDED / SEAL_UNTIL_FULL_GOVERNANCE】（推奨: INTERNAL_ONLY_RESTRICTED）
VIEW_PERMISSION_POLICY: 【knowledge_read / knowledge_update_only / OTHER】（推奨: knowledge_update_only＝実名寄りの詳細は書ける人に限定・一覧は badge のみ）
LIST_DISPLAY_POLICY: 【badge_only / masked_summary / detail_page_only / OTHER】（推奨: badge_only）
REVOCATION_POLICY: 【require_manual_reanonymize / auto_reanonymize_candidate / block_future_saves_only / OTHER】（推奨: require_manual_reanonymize＝取り消し検知時は手動で匿名化に戻す運用＋保存ブロックは現行どおり。自動書き換えはしない）
CUSTOMER_NAME_POLICY: 【allowed_if_ledger_valid / title_body_only_no_customer_master_join / prohibited_until_public_policy / OTHER】（推奨: title_body_only_no_customer_master_join＝本文表現のみ・Customer マスタ join 表示はしない）
OUTCOME_NUMBERS_POLICY: 【allowed_if_ledger_valid / separate_approval_required / prohibited / OTHER】（推奨: separate_approval_required）
CUSTOMER_VOICE_POLICY: 【separate_customer_voice_purpose_required / separate_approval_required / prohibited / OTHER】（推奨: separate_customer_voice_purpose_required＋公開は別承認）
AI_REFERENCE_POLICY: 【keep_anonymized_true_only / design_later / OTHER】（推奨: keep_anonymized_true_only）
PUBLIC_USE_POLICY: 【prohibit_now / approval_request_required_later / OTHER】（推奨: prohibit_now）
```

## 8. 実装する場合の段階案（各段個別承認）

1. **doc94 設計（今回）** ✅
2. **§0 人間決定**（§7 の9項目）
3. UI/表示方針の最小実装（badge・注意文言・閲覧権限。解禁ではない）
4. 否定系テスト（権限外閲覧・表示境界）
5. safety gate 更新（表示境界の機械検査追加＝更新自体が承認の証跡）
6. 本番確認（利用者実測・§0）
7. AI参照条件判断（doc91 §6 段階8・keep_anonymized_true_only の再確認または変更）
8. 公開活用判断（doc91 §6 段階9・ApprovalRequest・表現審査）
9. Customer Pain 判断（高機密ラベル対応が先）

## 9. 今回やらなかったこと

- **実装なし・UI変更なし・Server Action変更なし・DB変更なし・migrationなし**・shared/safety gate/test 変更なし。
- **company-brain-reference変更なし・anonymized=false本格解禁なし・AI参照条件変更なし・公開活用なし**。
- **doc14追記なし**（本番確認時のみ）・**pushなし**・本番確認なし・本番DB接続なし・本番deployなし。
- **外部送信なし・実LLMなし・AIコストなし**・externalAiAllowed true UI / publishStatus UI / ApprovalRequest 接続なし。

## 10. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「保存条件接続は本番確認GO済み」→ doc93 grep 実測（PROD 1・昇格文 1・未解禁 2・AI不変 2）②「基準=保存条件接続 / `5e9461f`」→ CURRENT_STATE 基準セクション grep 実測 ③「AI非注入・門番不変・ゲート稼働」→ company-brain-reference 0件・`return consentStatus === 'granted';` 1件・「承認済み接続の形」1件（いずれも実測）④「本番に実名寄り実データ無し」→ doc93 §2（片付け実測）⑤「実装9段階の親設計」→ doc91 §6・doc92 §8。
**Assumption Log**: ①案A は既存 UI（「実名寄り（許諾あり）」表示）に badge/文言/権限を足す最小差分で実装できる ②取り消し検知の自動書き換えをしない前提なら DB 変更は不要（表示と権限のみ）③FakeLLM 継続。
**Unknowns Log**: ①§0 の9決定（人間）②実名寄り事例の実運用開始時期（実顧客の許諾取得フローは運用側の整備待ち）③高機密ラベル（CUSTOMER_CONFIDENTIAL 等）との関係整理（Customer Pain 側の前提・別承認）④取り消し検知を UI 上でどう知らせるか（実装時に設計）。
**Risk Register**: 最大=「保存できる」と「本格運用してよい」の混同 → 本書 §1/§5/§6 と §0 候補で遮断。次点=閲覧範囲を広げ過ぎて PII 露出面が増える → 案A（推奨）は制限方向のみ・公開系は別承認のまま。docs-only のため本番リスク現時点ゼロ。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／事実整理・論点10・3案比較（**案A推奨**）・AI/公開との境界固定・§0 候補9項目・段階9案 ✅／doc94 作成 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 11. 次回推奨プロンプト案

> ①**doc94 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **anonymized=false 本格扱いの §0 人間決定**（§7 の9項目をチャット提出）→ UI/表示方針の最小実装承認（doc95 候補・badge/文言/権限のみ）→ 本番確認。③並行選択肢: AI参照条件判断（段階8）／公開活用判断（段階9）／Customer Pain／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。

## 12. 判定

**判定: READY / GO**（anonymized=false 本格扱いの設計は固定完了・**実装は未着手・§0 人間決定後の別承認**）。**anonymized=false は未解禁・AI参照条件変更なし・CaseStudyConsent は AI 文脈へ注入しない**。プロダクト基準は **CaseStudyConsent 保存条件接続 / `5e9461f`** のまま変わらない。
