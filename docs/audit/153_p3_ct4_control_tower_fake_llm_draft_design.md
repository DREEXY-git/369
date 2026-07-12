# 153. P3-CT-4 Control Tower FakeLLM 下書き生成 設計 — docs/roadmap/54 の記録（docs-only・実装なし・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower（成長機会の見るだけ画面）の各カードから、**「次の一手のたたき台（下書きメモ）」を AI に作らせる段**を、実装する前に紙の上で設計した作業です。コードは1行も変えていません。
- 大原則: **AI は提案するだけ**。判断・承認・送信はすべて人間がします。AI は外部にメールを送らない・承認しない・削除しない・請求や契約を確定しません。
- 設計の要点:
  - 使う AI は **FakeLLM（無料の疑似 AI）または固定文言のみ**。実 AI・AI コスト・課金はありません。
  - 生成されたメモは **必ず下書き**として、既存の「AI 出力の帳簿（AIOutput）」に保存します。リード宛の営業文が必要なときは、既存の LeadMap の下書き機能（OutreachDraft・承認後のみ送信）へ**リンクで誘導するだけ**で、新しい送信経路は作りません。
  - **財務が伏せられた担当者のカード（金額系）からは生成できません**（ボタンを出さない＋サーバー側でも拒否の二重防御）。AI への入力にも金額実値・顧客の個人情報を渡しません。
  - 帳簿: 生成1回につき重要操作の帳簿（writeAudit・既存の ai_run）1件＋AI 出力の保存（既存の標準経路）＋利用量の帳簿（既存の ai.output.generated が自動で1件・課金はしない）。P3-CT-3 で作った閲覧の帳簿はそのまま維持します。
- 一番大事な判定: **この段は DB 設計・権限・デモデータを一切変えずに作れる**と実査で確認しました（AIOutput・OutreachDraft・ApprovalRequest・FakeLLM・安全検査・利用量計測がすべて既存）。新しいテーブルや権限が必要になったら即 STOP して人間の承認を仰ぐ条件も明文化しました。
- 外部送信・実 LLM・課金・本番反映・SNS/口コミ/Googleレビュー投稿はありません（レビュー量産・ステマは禁止側に固定）。
- 今回は commit のみで、push は別承認です。実装も別承認（次は push → 実装前 Gate）。
- **docs-only・実装なし・schema/migration/RBAC/seed 変更なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **P3-CT-4 設計完了／既存 schema のみで成立／次は doc153/roadmap54 push-only（別承認）**。

## 2. 設計の前提 CI

- P3-CT-3 実装 push 後 CI **run 28952843194 = success**・stage1/stage3_e2e success。stage3_e2e ログ本文で `LLM_PROVIDER: fake`／`MAIL_PROVIDER: log`／`EXTERNAL_SEND_ENABLED: false`／`Running 74 tests`／`74 passed (1.1m)`／growth_control_tower 2件（社長閲覧・担当者 redaction）✓ を直接確認済み。stage3_e2e は 10 run 連続 green。

## 3. 何を決めたか（要点）

- 生成物: ①汎用「次の一手ドラフト」= FakeLLM/deterministic → **AIOutput に保存**（採用・本命）②リード営業文 = **既存 OutreachDraft 導線へ deep link 委譲**（採用・二重実装しない）③deterministic 単独（不採用・fallback 文言に格下げ）④CT から ApprovalRequest 直作成（不採用・既存ドメイン導線に委譲）。
- 起点: **人間のボタン操作のみ**（AI 自動起動なし）。redacted カードは生成不可（ボタン非表示＋Server Action 拒否）。
- 帳簿: writeAudit=既存 `ai_run`／DataAccessLog=P3-CT-3 方針維持／UsageEvent=saveAIOutputStandard 経由の既存 `ai.output.generated` のみ（新 eventType・billable_candidate 不使用）。
- 実装候補（別承認）: `growth/control-tower/actions.ts` 新規＋page.tsx ボタン＋（必要なら）@hokko/ai タスク＋e2e 1〜2件。触らないファイルも列挙済み。

## 4. schema / RBAC / seed 影響（結論：いずれも変更不要）

- AIOutput・OutreachDraft・ApprovalRequest・AuditLog・DataAccessLog・UsageEvent と saveAIOutputStandard・safeAiInput・assertAiToolAllowed・guardDangerousAction・isSuppressed はすべて既存。新規 table/column/enum/migration・新 RBAC action/role・新 seed・新 package・新 UsageEvent eventType は**不要**。
- STOP 条件（実装段）: 上記のいずれかが必要になった場合／redaction で塞げない機密表示／Contact 生 PII／外部送信／実LLM／状態永続化 → 実装せず停止・別承認。

## 5. 検証結果（成功／失敗／未実施）

- 成功: read-only 実査（leadmap.ts generateOutreachForLead・ai-safety-server.ts・schema AIOutput/OutreachDraft/ApprovalRequest・approval.ts・outreach isSuppressed・CT 3ファイル）／`git diff --check` OK／secret NONE／`node scripts/check-company-brain-safety.mjs` exit 0／禁止領域差分なし／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: 実装・テスト（docs-only のため対象外。コード不変で直近の緑=run 28952843194 74/0 が有効）。

## 6. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| FakeLLM→DRAFT→AIOutput 完成形が既存 | generateOutreachForLead（leadmap.ts） | 型を踏襲 |
| UsageEvent 自動計測 | saveAIOutputStandard 内 recordUsageEvent | 新 eventType 不要 |
| AI は送信/承認/削除不可 | assertAiToolAllowed＋checkToolPermission | 多重防御既存 |
| 保存先 schema 既存 | AIOutput/OutreachDraft/ApprovalRequest | 新 schema 不要 |
| 回帰ゲート緑 | run 28952843194 = 74/0（ログ本文） | 10 run 連続 green |

## 7. Assumption / Unknowns / Risk（要約）

- 仮定: 既存 schema のみで成立・FakeLLM のみで価値が出る・入力を key/redact 済み件数/優先度に限れば PII/finance 混入は構造的に起きない。
- 未知: AIOutput 汎用メモと OutreachDraft deep link の UX 配分・@hokko/ai 専用タスクの要否・e2e 追加数（74→75〜76）。
- 主リスクと対応: 外部送信への滑り→送信ボタンを作らない＋HCG 不変／PII・finance 混入→入力制限＋redacted 生成拒否＋PII 自動フラグ／UsageEvent 誤分類→既存 eventType のみ・新設は STOP。

## 8. Definition of Done

- roadmap54＋本書＋CURRENT_STATE/PROGRESS/Dashboard の計5ファイルのみ変更／コード差分ゼロ／Gate 全緑／commit-only（push・実装は各別承認）。

## 9. 次回推奨プロンプト案

> 「doc153/roadmap54 push-only（別承認）: main へ push しない・force なし。push 後 CI を read-only 確認し 74/0 を確認。緑なら P3-CT-4 実装前 Gate ミッション（docs-only・別承認・roadmap54 §5.2/§6 の候補が既存 schema/RBAC/seed のみで成立するかの最終実査）へ。」

## 10. 判定

判定: **P3-CT-4 FakeLLM 下書き生成 設計完了（docs-only・実装なし）／既存 schema のみで成立／生成物は下書きのみ・人間起点・AI は送信/承認/削除しない・重要操作は ApprovalRequest／approvals 経由／redacted カードは生成拒否・FakeLLM に finance 実値と生 PII を渡さない／writeAudit=ai_run・DataAccessLog=P3-CT-3 方針維持・UsageEvent=ai.output.generated のみ／STOP 非該当**。**実装なし・コード変更なし・schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。前提 CI は run 28952843194（74/0）。次は doc153/roadmap54 push-only（別承認）。
