# 151. P3-CT-3 Control Tower 監査ログ配線設計 — docs/roadmap/52 の記録（docs-only・実装なし・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower（成長機会の見るだけ画面）について、**「誰が・いつ・何の目的で見たか」をどの帳簿に残すか**を、実装する前に紙の上で決めた作業です。コードは1行も変えていません。
- 会社には3種類の帳簿があります:
  - **重要操作の帳簿（AuditLog）**: 作成・承認・送信など「何かを変えた」記録。
  - **機密閲覧の帳簿（DataAccessLog）**: 機密や業務データを「見た」記録。
  - **利用量の帳簿（UsageEvent）**: AI出力やエクスポートなど「資源を使った」記録（課金はしない・記録だけ）。
- 決めたこと:
  - **重要操作の帳簿は使わない**。Control Tower は見るだけの画面で「変える操作」が無いためです（将来 AI 下書き生成などが入る段で、そのとき改めて配線します）。
  - **機密閲覧の帳簿を使う**。今は「財務が見える人が見たとき」だけ1件記録しています。これに加えて、**財務が伏せられた人（担当者）が見たときも「閲覧」として1件記録する**設計にしました。「担当者には金額が出ていない」ことを帳簿だけで説明できるようになります。
  - **利用量の帳簿は使わない**。画面を見ることは AI やエクスポートのような資源消費ではなく、記録すると帳簿がノイズで埋まるためです。
- 帳簿に添えるメモ（metadata）は「財務表示の有無・カード枚数・要対応数」の3つだけに固定し、**金額・カード別の件数・顧客の個人情報・秘密情報は絶対に書かない**リストを決めました。
- 大事な安全: 担当者に原価・粗利・未回収の実値を見せない方針は**まったく変わりません**（今回の設計は帳簿の話だけで、画面表示は不変）。顧客の個人情報も増やしません。
- DB 設計・権限・デモデータの変更は**不要**と確認済み（既存の仕組みだけで足りる）。外部送信・実 LLM・課金・本番反映もありません。
- 今回は commit のみで、push は別承認です。実装も別承認です。
- **docs-only・実装なし・schema/migration/RBAC/seed 変更なし・外部送信なし・実LLMなし・課金なし・本番なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **P3-CT-3 設計完了／Gate PASS（既存基盤のみで成立）／次は doc151/roadmap52 push-only（別承認）**。

## 2. 設計の前提 CI

- P3-CT-1 push 後 CI run 28944487139（head_sha `664546c`）= success・stage1/stage3_e2e success・Run E2E 74 passed / 0 failed。
- P3-CT-2 push 後 CI run 28946738844（head_sha `83bd185`）= success・stage1/stage3_e2e success・Run E2E 74 passed / 0 failed（growth_control_tower の社長閲覧・担当者 redaction 2件 green）。
- stage3_e2e は 8 run 連続 green。本設計はコード挙動を変えないため、この緑を壊さない。

## 3. 何を決めたか（要点）

- writeAudit（重要操作）: **不採用**。閲覧に使う前例がリポジトリにゼロで、CT v0 に mutation が無い。将来の P3-CT-4（AI下書き）で別途配線。
- writeDataAccess（機密閲覧）: **採用・拡張案確定**。finance 閲覧時の confidential_view 1件（既存）は据え置き＋policyDecision/metadata 付与、redacted 閲覧にも action:'read' を1閲覧=1件追加。粒度は1閲覧=1件（カード別9件にしない）。
- UsageEvent（利用量）: **不採用**。既存 emit 8種はすべて資源消費で、画面閲覧の前例なし。CT 起点の AI 生成が入っても既存 `ai.output.generated` 配線で自動計測されるため CT 側の新配線は不要。
- metadata 境界: allowlist=financeVisible/cardCount/actionableCount の3項目のみ。denylist=金額・カード別件数・生PII・placeId・secret・本文・scoreBreakdown。

## 4. schema / RBAC / seed 影響（結論：いずれも変更不要）

- AuditLog/DataAccessLog/UsageEvent テーブル・`writeAudit`/`writeDataAccess`/`recordUsageEvent` 関数・action 値 `read`/`confidential_view` はすべて既存。新規 enum・カラム・migration・権限・seed は不要（Gate PASS・STOP 非該当）。
- STOP 条件（実装段で該当したら停止・別承認）: 新 action 値・新テーブル/カラム・metadata に PII/finance 実値・状態永続化・writeAudit の閲覧流用。

## 5. 検証結果（成功／失敗／未実施）

- 成功: read-only 実査（control-tower lib/page・db.ts・audit.ts・usage-events.ts・schema.prisma・既存呼び出し全 grep）／`git diff --check` OK／secret scan NONE／`node scripts/check-company-brain-safety.mjs` exit 0／禁止領域差分なし／artifact なし／369-vault 差分なし。
- 失敗: なし。
- 未実施: 実装・テスト実行（docs-only のため対象外。単体/型/lint は前 commit 83bd185 時点の緑が最新＝コード不変で有効）。

## 6. Evidence Map

| 主張 | 証跡 | 結果 |
|---|---|---|
| 現状 CT は finance 閲覧時のみ confidential_view 1件 | control-tower.ts 87-96行 実査 | 確定 |
| writeAudit は mutation 専用運用 | apps/web 全 grep（view 系前例ゼロ） | 不採用の根拠 |
| read/confidential_view は既存 action | db.ts 33-40行・schema コメント | 新 enum 不要 |
| UsageEvent は資源消費 emit のみ | 既存 8 emit の実査 | 不採用の根拠 |
| 回帰ゲート緑 | run 28944487139・28946738844 = 74/0 | 8 run 連続 green |

## 7. Assumption / Unknowns / Risk（要約）

- 仮定: CT v0 は read-only 維持・1閲覧=1件で統制説明に足りる。
- 未知: 実運用ログ量と保持期間／閲覧回数の利用量可視化の要否（要望が出たら別承認で設計）。
- 主リスクと対応: metadata 経由の漏えい→denylist 固定（カード別件数も禁止）／過大記録→redacted は read に分離／実装時回帰→lib 1ファイルのみ・push 後 CI 74/0 で確認。

## 8. Definition of Done

- roadmap52＋本書＋CURRENT_STATE/PROGRESS/Obsidian Dashboard の計5ファイルのみ変更／コード差分ゼロ／Gate 全緑／commit-only（push・実装は各別承認）。

## 9. 次回推奨プロンプト案

> 「doc151/roadmap52 push-only（別承認）: main へ push しない・force なし。push 後 CI を read-only 確認し 74/0 を確認。緑なら P3-CT-3 実装ミッション（別承認・`apps/web/lib/domains/growth/control-tower.ts` 1ファイルのみ・roadmap52 §6.2/§8 のとおり）へ。」

## 10. 判定

判定: **P3-CT-3 監査ログ配線設計 完了（docs-only・実装なし）／Gate PASS（既存 schema・関数のみで成立・STOP 非該当）／writeAudit 不採用・writeDataAccess 採用拡張・UsageEvent 不採用・metadata allowlist 3項目固定**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・redaction 不変（担当者に原価・粗利・未回収の実値なし）・Customer/Contact 生 PII 非増加・状態永続化なし・369-vault非編集・push なし（commit-only）**。前提 CI は run 28946738844（74/0）。次は doc151/roadmap52 push-only（別承認）。
