# 146. AI Growth Opportunity Control Tower v0 設計 — docs/roadmap/47 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Phase 3（AI 成長エンジン）の最初の一歩「AI Growth Opportunity Control Tower v0」の**設計図**です。**設計だけで、まだ作っていません（実装未着手）**。
- 何を作るか: 会社の既存データ（新規開拓リード・商談・会社の頭脳・Golden Path・資金繰り・利用/監査ログ）から「次に手を打つべき成長機会」を1画面に集めて、社長が次の一手を選べる**見るだけ中心の管制塔**です。
- どこに置くか: 既にある「Growth・DX OS」メニューの隣に `/growth/control-tower` という新しい画面を足す想定です。
- 出すカードの例: 未追客リード、停滞商談、高機会リード、会社の頭脳の改善提案、低粗利の改善候補、未回収リスク、次回接触推奨、既存顧客への追加提案候補、社長が見るべき成長機会。
- 安全面: スタッフには原価・粗利などの金額を見せず「財務閲覧権限が必要です」というメッセージだけを出す仕組み（既存）を踏襲します。顧客の個人情報（PII）は増やさず、件数など匿名の指標を中心にします。AI はダミー（FakeLLM）で、外部送信・承認・削除・自動実行はしません。提案は「下書き」まで。
- 大事な前提: v0 は**今ある DB のまま（新しいテーブルを足さず）見るだけで作る**方針です。もし「カードを既読にする」等で保存が必要になったら、実装前にいったん止めて別途承認を取ります（DB 設計変更・権限変更・デモデータ追加が必要になった場合も同じ）。
- 外部送信・実 LLM・課金・本番反映は、これまでどおり1つずつ人間が承認するまで行いません。
- 今回はコードを1行も変えていません。設計文書（docs）だけを作り、commit のみで push はしません。
- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**。判定 **Control Tower v0 設計完了／実装未着手／schema 影響があれば別承認**。

## 2. CI結果（read-only 実測・設計着手の前提）

- run 28938318122（run_number 145・head_sha d36887d）= completed / success・stage1 success・stage3_e2e success・Run E2E step success・Upload report on failure=skipped。
- これで stage3_e2e は run 28930122157（142）・28934614261（143）・28937029131（144）・28938318122（145）の **4 run 連続で完全 green（72/0）**。回帰ゲート（e2e 含む）は安定して緑で、この上に Phase 3 の最初の縦切りを設計しました。

## 3. 何を設計したか（要点）

- 目的: 既存データから成長機会を1画面に集約し、社長が次の一手を判断する read-only 中心の Control Tower。
- 非目標: 外部送信自動化・実LLM・課金・本番 deploy・runtime 解禁・externalAiAllowed true・EXTERNAL_SEND_ENABLED true・新規 schema 先行追加・AI の自動承認/削除/送信は**しない**。
- 対象データ: LeadMap リード（LocalBusinessLead）・商談（Deal）・Company Brain・Golden Path・Finance Bridge・Usage/Audit。顧客・Contact は高機密方針に従い慎重に扱う（据え置き・生 PII を足さない）。
- 画面: `/growth/control-tower`・優先度順カード・根拠表示・既存導線への deep link・staff/CEO の表示差・redaction 踏襲。
- 権限/監査/AI 境界: tenantId スコープ・hasPermission・canViewFinance・canAccessLabel・writeAudit・writeDataAccess・FakeLLM・生成物は下書き・重要操作は ApprovalRequest。
- schema 影響判定: v0 は既存 schema のみで成立する見込み。状態永続化・新規権限・新規 seed が要れば**実装前に STOP して別承認**。
- 実装フェーズ案: P3-CT-0 設計 → CT-1 read-only 画面 → CT-2 優先度ロジック → CT-3 監査 → CT-4 AI 下書き → CT-5 承認導線 → CT-6 e2e → CT-7 push/CI/Gate（各段別承認・stop 条件つき）。

## 4. 今回やらなかったこと

- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし**。
- Control Tower v0 の**実装着手なし**（設計のみ）。runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番確認なし・本番deployなし・artifact download/git add なし・network policy 回避なし・main への push なし・force push/amend/rebase/reset/rerun/cancel/send_later/git config 変更なし・**369-vault非編集**・push なし（commit-only）。

## 5. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| Phase 3 GO 済み | doc145／roadmap46 | GO |
| 回帰ゲート緑（4 run 連続） | run 28930122157/28934614261/28937029131/28938318122 conclusion success・72/0・Upload on failure=skipped | 緑 |
| /growth 既存 | growth/page.tsx・growth/events・nav.ts「Growth・DX OS」 | 隣接サブルートで v0 実装可 |
| 権限/機密/監査の既存経路 | rbac.ts・policy.ts・lib/db.ts | 既存で踏襲可 |
| 対象データ実在 | schema: Deal(622)・LocalBusinessLead(2756)・OutreachDraft(2931)・Customer(494)・Contact(527) | read-only 集約可 |
| 設計のみ・実装なし | 変更5ファイルは docs/tasks のみ | 実装未着手 |

## 6. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 高機密（顧客 PII・原価粗利実値）が非権限者に露出 | 高 | canViewFinance/canAccessLabel/redaction 踏襲・件数中心・生 PII を足さない・e2e redaction で担保 |
| R2 | 状態永続化/新規権限で schema/RBAC 影響 | 中 | 事前停止条件で STOP→別承認 |
| R3 | 既存 e2e 72/0 の回帰 | 中 | read-only 中心・追加は smoke 相当・回帰ゲートで検知 |
| R4 | AI 提案が実LLM/外部送信に滑る | 中 | FakeLLM・下書きのみ・AI は外部送信/承認/削除なし |

## 7. Assumption Log

- v0 は既存 schema のみで read-only 集約が成立する（新規テーブル不要）と仮定。状態永続化が必要なら STOP・別承認。
- 既存 Golden Path / Finance Bridge の集計を再利用でき、財務値は canViewFinance で権限どおり出し分けられると仮定。
- Control Tower は既存の下書き→承認へ委譲し、新規送信経路を持たないと仮定。

## 8. Unknowns Log

- 優先度スコアリングの具体式・「未追客/停滞」の閾値（実装時に確定・seed 影響が出れば別承認）。
- 既存顧客追加提案候補を高機密を出さずに有用化する指標設計。
- Company Brain 改善提案の下書き粒度（FakeLLM 決定論の範囲）。

## 9. Definition of Done

- Control Tower v0 の設計（目的・非目標・対象データ・カード案・画面・権限・監査・AI 境界・schema 影響判定・テスト方針・実装フェーズ案・Matrix・Evidence/Assumption/Unknowns/Risk・次回プロンプト）を roadmap47＋doc146 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／許可ファイルのみ・369-vault非編集／git diff --check OK・secret NONE・safety exit 0／**app/tests/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package/lock 変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし**／artifact 非 git add／commit-only（push なし）／**設計のみ・実装未着手／schema/migration/RBAC 影響があれば実装前に別承認を明記**。

## 10. 次回推奨プロンプト案

> 「AI Growth Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画ミッション（docs-only・commit-only）: 本設計（roadmap47/doc146）を受け、実装前に v0 が既存 schema・RBAC・seed のみで成立するかを read-only で最終判定し、要る場合は STOP して別承認事項に、要らない場合は P3-CT-1（read-only 画面）の最小実装計画（対象ファイル・既存関数再利用・権限/redaction/監査配線・e2e 追加案）を docs 化する。実装コードは書かない。app/tests/seed/schema/ci.yml/playwright.config.ts/package/lock 変更なし・369-vault 非編集・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし。commit-only。docs/roadmap/48＋docs/audit/147 に記録。」

## 11. 判定

判定: **AI Growth Opportunity Control Tower v0 設計完了（docs-only・実装未着手）**。CI run 28938318122=success（stage1/stage3_e2e success・72/0・4 run 連続）を受けて設計。**v0 は既存 schema のみで read-only 集約する方針**で、schema/migration/RBAC/seed 影響が生じる場合は**実装前に STOP して別承認**。**外部送信・実LLM・課金・本番 deploy は個別承認制を維持**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画（docs-only）、または doc146/roadmap47 push-only（別承認）。
