# 70. C19 Ads Management read model＋AI 下書き（Phase 3.5 Stream A・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/169_c19_ads_read_model.md`
- ブランチ: `claude/stream-a-growth-channels-v55`（基準 6477279・Draft PR・merge しない）
- 上位: roadmap69 §2（Phase 3.5 Growth Channels）・Evidence ID: **C19-RO-01**

## 1. 実装（schema 変更なし・既存モデルのみ）

| 層 | 内容 |
|---|---|
| shared 純ロジック | `packages/shared/src/ads.ts`: `summarizeAdsMetrics`（率・単価は分母0で null＝0% と未計測を混同しない・負値は防御的に0丸め）・`channelDataState`（記録あり/データ不足/未接続）・既知6チャネル定義。unit 8件 |
| AI タスク | `packages/ai`: `AdsImprovementSchema`（Zod・根拠/データ不足/次の人間確認/信頼度を必須構造化）・`fakeAdsImprovement`（決定論）・`generateAdsImprovement`（実 LLM 失敗時 fake フォールバック）・PROMPT_TEMPLATES `ads_improvement`。unit 2件 |
| web オーケストレーション | `apps/web/lib/ads-insight.ts`: 注入検出（AISafetyLog）→生成→AIOutput（task='ads_improvement'）→writeAIDataAccess。外部送信なし |
| Server Action | `generateAdsImprovementDraftAction`: marketing:create＋**人間のみ**（user.isAi 拒否）＋checkToolPermission('generate')＋tenant スコープ検証＋writeAudit（ai_run） |
| ページ | `/marketing/ads`（marketing:read ゲート・データ取得前）: ①チャネル状態盤（接続済み記録/データ不足/未接続を区別・**外部連携は全チャネル常時「封印中」表示**・実データがないチャネルを動作中に見せない）②Ads 集計（予算=計画値・消化=自己申告値と明記）③キャンペーン表④下書き一覧（根拠・信頼度・データ不足・次の人間確認・「実行はされません」） |
| e2e | `ads_read_model.spec.ts` 3件（状態盤と封印表示・下書き生成と必須属性・担当者の閲覧と注記） |

## 2. 境界判断（記録）

- **広告予算・消化は marketing ドメインの計画値/自己申告値**（マーケ担当が入力・会計実績ではない）→ marketing:read 配下。DX 推定値（roadmap64 §6-2）と同型の判断。**会計実績（FinanceEvent 等）と接続する時点で finance 境界の再判定を必須とする**。
- 既存 /marketing ホーム・campaigns 系は requireUser のみ（ページ基礎権限なし・予算表示あり）— **本縦切りでは新ページのみゲートし、既存ページの補正は Stream A 次 WIP に記録**（v5.4 の /dashboard と同じ「規約2系統」状態。同時修正は縦切りの範囲を超えるため）。

## 3. 禁止事項の遵守（C19 共通規則・roadmap69 §2）

- 外部広告 API 呼び出しなし・広告費支出なし・出稿変更なし・自動最適化なし・実 LLM なし（FakeLLM 決定論）・外部送信なし。AI は下書きのみ（採否・実行は人間）。
- AI ロールは生成ボタン非表示＋action 側でも拒否（再帰生成を作らない・P3-CT-4 と同方針）。

## 4. C21/C22 の台帳（本縦切りでは着手しない）

roadmap69 §2 の表が正。C21 は ContentAsset＋ai-generate.ts の拡張で schema 変更なしの見込み（DoR: 生成種別と Zod schema 定義）。C22 は**新規 schema が必要見込みのため実装前 Gate 必須**。

## 5. Gate 判定

- [x] schema/seed/RBAC/labels 変更なし・封印 env 不変
- [x] ローカル電池 green（unit 288/0・tsc 0・lint 0・safety 0）
- [x] 敵対的レビュー → 指摘反映（§6 追補）
- [x] Draft PR #4 作成・CI green をログ本文で確認: run 29146968424（#172）・head ecb07c6・`96 passed (1.4m)` / 0 failed（ads_read_model 3件 ✓）→ **Stream A 縦切り（C19-RO-01）クローズ**

## 6. 追補（敵対的レビューの結果と反映・2026-07-11）

独立レビュー（6761d2c 対象・封印/権限/tenant/E2E/表示誠実性は全て健全と確認・96=93+3 検算一致）。検出と反映:

| # | 深刻度 | 指摘 | 反映 |
|---|---|---|---|
| 1 | Medium×2 | 生成が runStructured 経由のため env（LLM_PROVIDER）設定時に実 LLM 経路が存在し「実 LLM 封印」がコード担保でない＋その場合 AIOutput.model='fake' が虚偽記録になる | **web 側は `fakeAdsImprovement` 直呼びに変更**（ai-generate.ts と同型・実 LLM 経路が構造的に不在＝封印をコードで担保・model='fake' が常に真）。`generateAdsImprovement`（実 LLM＋fake フォールバック）は packages/ai に残し、**Human Certification Gate 後の実 LLM 化 WIP でのみ接続する** |
| 2 | Low | 注入検出が campaignName のみ（channel は自由文字列で未検査）・AIOutput.safetyFlags が常に [] | channel を検査対象に追加・flagged 時は safetyFlags に記録 |
| 3 | Low | 既知6チャネル外の channel 値の記録が状態盤から無言で消える | 「その他（値）」行として表示 |
| 4 | Info | e2e テスト3の名称が実カバレッジ（ボタン可視のみ）を過大表示 | 名称を「生成ボタンが表示され」に修正 |
| 5 | Info（記録のみ） | EXECUTIVE/ADMIN/READ_ONLY は marketing:create 非保持で下書き生成不可（「権限者のみ」表示）。役員に生成権を与えるかは未決 → Phase 3.5 の DoR 論点として記録。ads-insight の3書込は非トランザクション（既存 ai-generate と同型）。toLocaleString のロケール依存は同一ランタイム内決定論で十分 | — |
