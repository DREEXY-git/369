# 155. P3-CT-4 Control Tower FakeLLM 下書き生成 実装 — docs/roadmap/56 の記録（実装あり・369-vault非編集）

## 1. 非エンジニア向け要約

- これは Control Tower（成長機会の見るだけ画面）に、**「AI 下書きメモを作る」ボタン**を付けた作業です。社長など権限のある人がボタンを押すと、そのカードについて「次に何を考えるべきか」のたたき台メモを AI（無料の疑似 AI = FakeLLM）が作り、画面下に**下書きとして**表示します。
- 大原則はそのまま: **AI は提案するだけ**。メールは送りません・承認しません・削除しません・請求や契約を確定しません。メモ本文にも「送信・承認・実行は行いません」と明記されます。
- 安全の作り:
  - ボタンを押せるのは**人間だけ**（AI ロールは砦関数で拒否）。権限も既存の下書き生成権限で判定。
  - **財務が伏せられた担当者の金額系カードでは、ボタン自体が出ません**。仮に裏口からリクエストされてもサーバー側でもう一度拒否します（二重防御）。
  - AI への入力はカード名・優先度・件数などの安全な項目だけ。**金額実値・顧客の個人情報・秘密情報は渡しません**。
  - 帳簿: 生成1回につき重要操作の帳簿（ai_run）1件＋AI 出力の標準保存＋利用量の帳簿（ai.output.generated が自動1件・課金なし）。閲覧の帳簿は P3-CT-3 のまま。
- 変えたコードは3ファイルだけ（生成のサーバー処理を新規1・画面1・自動テスト1）。DB 設計・権限・デモデータ・パッケージは一切変えていません。
- 検証: 単体テスト 278 件全部合格・型チェック・lint・安全チェックすべて緑。画面の自動テストは2件追加（74→76件）し、実走は push 後の CI で確認します（このサンドボックスではブラウザが動かないため）。
- 今回は commit のみで、push は別承認です。
- **schema/migration/RBAC/seed 変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・redaction 不変・PII 非増加・369-vault非編集**。判定 **P3-CT-4 実装完了／次は P3-CT-4 実装 push-only（別承認）→ CI で 76/0 確認**。

## 2. できるようになったこと

- 社長が Control Tower のカードから「AI 下書きメモ」をワンクリック生成し、画面下の「AI 下書きメモ（最新・下書きのみ）」で確認できる。
- 担当者（財務権限なし）は金額系カードから生成できない（ボタン非表示＋サーバー拒否）。
- 生成メモは AIOutput に下書き保存され、監査ログ（ai_run）と利用量（ai.output.generated・非課金）が自動で残る。

## 3. 守った安全ルール

人間起点のみ（isHumanUser）・既存権限（leadmap:create）流用・card key allowlist・サーバー側再取得と redacted 二重拒否・safeAiInput 注入検査・FakeLLM のみ＋deterministic fallback・送信/承認/削除ボタンなし・外部送信導線なし・metadata/入力に金額/PII/secret/本文/scoreBreakdown なし・新 action/eventType なし・状態永続化なし。

## 4. 変更したファイル / 変更していない危険領域

- 変更（コード3）: `apps/web/app/(app)/growth/control-tower/actions.ts`（新規）・`page.tsx`・`apps/web/tests/e2e/growth_control_tower.spec.ts`（+2件）。docs/tasks 5: roadmap56・本書・CURRENT_STATE・PROGRESS・Dashboard。
- 非変更: schema.prisma・migrations・seed.ts・rbac.ts・labels.ts・db.ts・audit.ts・usage-events.ts・ai-safety-server.ts・leadmap/approvals/finance 配下・ci.yml・playwright.config.ts・package.json・pnpm-lock.yaml・369-vault・README/AGENTS/CLAUDE.md・docs/release。

## 5. 検証結果（成功／失敗／未実施）

- 成功: `pnpm test` 278 passed / 0 failed／web・shared typecheck exit 0／`pnpm lint` exit 0／`node scripts/check-company-brain-safety.mjs` exit 0（ui 157→158）／`git diff --check` OK／secret NONE／禁止領域差分 0／artifact なし／369-vault 差分 0。
- 失敗: なし。
- 未実施: e2e 実走（サンドボックスでブラウザ DL 不可）→ push 後 CI で **76 passed / 0 failed** を確認（push は別承認）。

## 6. 次の一手

1. P3-CT-4 実装 push-only（別承認・main へ push しない・force なし）→ push 後 CI を read-only 確認し 76/0 と growth_control_tower 4件 green をログ本文で確認。
2. 緑なら P3-CT-5 設計（別承認）。外部送信・実LLM・課金・本番・状態永続化は引き続き個別承認制。

## 7. 追補（push 前レビューによる修正・2026-07-10）

- push する前に、**6視点の独立 AI レビュー（15エージェント）**で commit を総点検したところ、**重要な見落としを1件発見**しました: 社長が金額系カード（未回収リスク等）の下書きメモを作ると、メモ本文に「未回収・延滞の案件が N 件」という**財務件数**が入り、それが**財務権限のない担当者にも表示されてしまう**（カード側では隠している数字がメモ経由で見える）。
- **push 前に修正済み**: 財務権限のない人には金額系カード由来のメモを表示しないフィルタを追加（見る側の二重防御）。あわせて、生成権限のない人にはボタン自体を出さない・拒否理由を画面に表示する、の2点も改善。この穴を CI で恒久的に見張る自動テストも1件追加（74→**77件**）。
- 再検証: 単体 278 件合格・型/lint/安全チェックすべて緑。未 push の段階で発見・修正したため、**外部への影響はゼロ**です。

## 8. 判定

判定: **P3-CT-4 実装完了（commit-only）／コード3ファイルのみ／AI は提案のみ・下書きのみ・二重防御・入力制限／writeAudit=ai_run・UsageEvent=ai.output.generated のみ／STOP 非該当**。**schema変更なし・migrationなし・seed変更なし・RBAC変更なし・ci.yml/playwright.config.ts/package.json/lockfile変更なし・外部送信なし・実LLMなし・AIコストなし・課金なし・本番なし・runtime 解禁なし・externalAiAllowed true 解禁なし・EXTERNAL_SEND_ENABLED true 解禁なし・状態永続化なし・redaction 不変・Customer/Contact 生 PII 非増加・369-vault非編集・push なし（commit-only）**。前提 CI は run 29116334142（74/0）。次は P3-CT-4 実装 push-only（別承認）。
