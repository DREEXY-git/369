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
- [ ] ローカル電池 green（unit/tsc/lint/safety）
- [ ] 敵対的レビュー → 指摘反映
- [ ] Draft PR 作成・CI green（96 = 93+3 見込み）をログ本文で確認
