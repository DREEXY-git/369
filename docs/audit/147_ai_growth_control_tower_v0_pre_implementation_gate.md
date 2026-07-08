# 147. AI Growth Control Tower v0 実装前 Gate / schema 影響判定 / 最小実装計画 — docs/roadmap/48 の記録（docs-only・369-vault非編集）

## 1. 非エンジニア向け要約

- これは「AI Growth Opportunity Control Tower v0」を**作り始める前の最終チェック（実装前 Gate）**の記録です。**まだ作っていません（実装未着手）**。コードも1行も書いていません。
- 一番大事な結論: **v0 は、今ある DB のまま・今ある権限のまま・今あるデモデータのままで作れる**と判定しました（見るだけの画面なので、新しいテーブル・新しい権限・新しいデモデータは要りません）。だから「いったん止めて別承認」には該当せず、次の read-only 画面づくりの計画（P3-CT-1）まで固めました。
- 調べたこと: 既存の /growth 画面の作り方（ログイン確認＋会社ごとのデータ読み取りで成立）、権限の一覧（deal・finance・marketing・leadmap などに「読む」権限が既にある）、財務の伏せ字（スタッフに金額を見せない仕組み）が使い回せること、対象データ（商談・リード・会社方針）がデモデータに入っていること、メニューに1行足せること——を実際のコードで確認しました。
- 「もし途中で保存機能（カードを既読にする・スヌーズする・並び順を固定する等）が必要になったら、その時点でいったん止めて別承認」というルールも明記しました。v0 では保存機能は作らないので、今回は該当しません。
- 安全面: スタッフには原価・粗利の金額を見せず伏せ字にし、顧客の個人情報は増やさず件数など匿名の指標を中心にします。AI はダミー（FakeLLM）で、外部送信・承認・削除・自動実行はしません。
- 外部送信・実 LLM・課金・本番反映は、これまでどおり1つずつ人間が承認するまで行いません。
- 今回はコードを変えず、記録（docs）だけを作り、commit のみで push はしません。
- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**。判定 **実装前 Gate PASS／既存 schema・RBAC・seed のみで成立／実装未着手／schema 等が必要になれば別承認**。

## 2. CI結果（read-only 実測・Gate の前提）

- run 28939408568（run_number 146・head_sha 39edd19）= completed / success・stage1 success・stage3_e2e success・Run E2E step success・Upload report on failure=skipped。
- stage3_e2e は run 28930122157/28934614261/28937029131/28938318122/28939408568 の **5 run 連続で完全 green（72/0）**。この緑の上で実装前 Gate を判定しました。

## 3. schema / RBAC / seed 影響判定（結論）

- **schema 影響**: なし（不要）。v0 は既存テーブル（商談 Deal・リード LocalBusinessLead・会社方針 CompanyPolicy/ProductCatalogItem・DX 改善機会・請求/資金繰り・利用/監査ログ）の**見るだけ集約**。新しいテーブル・カラムは要りません。
- **RBAC 影響**: なし（不要）。既存の「読む」権限（deal・finance・marketing・leadmap の read/ai_read）で画面のカード表示を制御できます。財務は canViewFinance、機密は canAccessLabel を使い回します。新しい権限・ロールは要りません。
- **seed 影響**: なし（不要）。対象データ（商談・リード・会社方針など）は既にデモデータに入っています（商談は seed で生成、e2e も緑）。
- **状態永続化（既読/スヌーズ/ピン留め/並び順固定）**: v0 では**作らない**。将来必要になれば、その時点で STOP して別承認（DB 設計変更が伴うため）。

## 4. 既存 schema のみで P3-CT-1 に進めるか

- **進めます**。上記のとおり schema/RBAC/seed いずれも変更不要のため、STOP には該当せず、P3-CT-1（見るだけ画面）の最小実装計画を確定しました。
- 計画の要点: URL は `/growth/control-tower`、追加は page.tsx＋純ロジック（`packages/shared`）＋データ整形層、メニューに1行、既存関数（requireUser・getGoldenPathExecutiveDashboardData・redactExecutiveFinance・writeAudit/writeDataAccess）を再利用、e2e は read-only smoke＋redaction を新規追加して既存 72/0 を壊さない。実装は別承認の次ミッション。

## 5. STOP 条件に該当したか

- **該当しません**（Gate PASS）。v0 は既存 schema・RBAC・seed のみで成立するため、今回は STOP せず計画まで進みました。ただし実装中に状態永続化・新規権限・新規 seed・redaction で塞げない機密表示・ci/config 変更が必要になったら、その時点で STOP して別承認します。

## 6. 今回やらなかったこと

- **app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし**。
- Control Tower v0 の**実装着手なし**（Gate と計画のみ・コードは書いていない）。runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番確認なし・本番deployなし・artifact download/git add なし・network policy 回避なし・main への push なし・force push/amend/rebase/reset/rerun/cancel/send_later/git config 変更なし・**369-vault非編集**・push なし（commit-only）。

## 7. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 実装前 CI 緑 | run 28939408568 conclusion success・stage1/stage3_e2e success（5 run 連続 72/0） | 緑 |
| read-only ページは requireUser で成立 | growth/page.tsx（requireUser＋tenantId 読み取り・mutation のみ hasPermission） | 新規権限不要 |
| 既存 read 権限あり | rbac.ts RESOURCES(deal/finance/marketing/leadmap)＋READ_ONLY=grant(RESOURCES,['read','ai_read']) | RBAC 変更不要 |
| finance redaction 再利用可 | golden-path-dashboard.ts＋redactExecutiveFinance/visibleGoldenPathActions | 新規 redact 不要 |
| 監査関数実在 | lib/db.ts writeAudit・writeDataAccess | 既存で配線可 |
| 対象データ seed 済み | seed.ts deal.create(237)・LocalBusinessLead(3)・CompanyPolicy(2)＋e2e 72/0 | seed 追加不要 |
| v0 は既存 schema のみ | 全カード read-only 集約・状態永続化は v0 非目標 | schema/migration 不要 |

## 8. Assumption Log

- v0 は見るだけ（read-only 集約）で状態を持たないため新規 schema 不要、と仮定（将来採用時は STOP・別承認）。
- 既存 getGoldenPathExecutiveDashboardData の redact 済みデータ＋prisma 読み取りで 9 カードの根拠を構成できると仮定。
- 既存 read 権限でカード表示ゲートが足りる（新規 action 不要）と仮定。

## 9. Unknowns Log

- 優先度スコアリングの具体式・「未追客/停滞」の閾値（実装時に純ロジックで確定・seed 影響が出れば STOP）。
- 「既存顧客追加提案候補」を PII を出さず有用化する指標粒度。
- Company Brain 改善提案の FakeLLM 下書き粒度。

## 10. Risk Register

| # | リスク | 重大度 | 状態 |
|---|---|---|---|
| R1 | 実装で状態永続化を安易に足し schema 影響 | 中 | STOP 条件で停止・別承認 |
| R2 | 高機密（PII・原価粗利実値）露出 | 高 | canViewFinance/redactExecutiveFinance/canAccessLabel 再利用・件数中心・e2e redaction で担保 |
| R3 | 既存 e2e 72/0 の回帰 | 中 | read-only 追加・既存 spec 不変・回帰ゲートで検知 |
| R4 | AI 提案が実LLM/外部送信に滑る | 中 | FakeLLM・下書きのみ・AI は送信/承認/削除なし |

## 11. Definition of Done

- 実装前 Gate（10 判定）・schema/RBAC/seed 影響判定（いずれも不要＝PASS）・P3-CT-1 最小実装計画を roadmap48＋doc147 に記録／CURRENT_STATE・PROGRESS・Obsidian Dashboard 反映／許可5ファイルのみ・369-vault非編集／git diff --check OK・secret NONE・safety exit 0／**app/tests/seed/schema/migration/RBAC/ci.yml/playwright.config.ts/package/lock 変更なし・runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし**／artifact 非 git add／commit-only（push なし）／**実装コードなし・実装未着手／schema/RBAC/seed が必要になれば実装前に別承認**。

## 12. 次回推奨プロンプト案

> 「（先に）doc147/roadmap48 push-only（別承認）→ CI read-only 確認。（その後）P3-CT-1 Control Tower v0 read-only 画面 実装ミッション（別承認・実装あり）: schema/migration/RBAC/seed 変更なしで /growth/control-tower を read-only 実装（page.tsx＋packages/shared 純ロジック＋データ整形層＋nav 1行）、既存関数（requireUser・getGoldenPathExecutiveDashboardData・redactExecutiveFinance・writeAudit/writeDataAccess）を再利用、e2e read-only smoke＋redaction を追加し既存 72/0 を壊さない。typecheck/lint/safety を通し commit-only。要 schema/RBAC/seed と判明したら STOP・別承認。runtime 解禁なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集。」

## 13. 判定

判定: **実装前 Gate PASS（STOP 非該当）／v0 は既存 schema・既存 RBAC・既存 seed のみで成立／P3-CT-1 最小実装計画を確定（実装は別承認）／Control Tower v0 は実装未着手**。実装前 CI run 28939408568=success（stage1/stage3_e2e success・5 run 連続 72/0）。**将来 状態永続化・新規権限・新規 seed が必要になれば実装前に STOP・別承認**。**外部送信・実LLM・課金・本番 deploy は個別承認制を維持**。**app変更なし・tests変更なし・seed変更なし・schema変更なし・migrationなし・RBAC変更なし・ci.yml変更なし・playwright.config.ts変更なし・package.json/lockfile変更なし・runtime 解禁なし・externalAiAllowed** true 解禁なし・**EXTERNAL_SEND_ENABLED** true 解禁なし・**外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・369-vault非編集**・push なし（commit-only）。次は doc147/roadmap48 push-only（別承認）→ P3-CT-1 read-only 画面 実装（別承認）。
