# 64. /growth・/growth/events 財務情報境界（WIP-3）— 設計＋Gate（Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/163_growth_finance_boundary_gate.md`
- 前提: **WIP1+WIP2 CI green 確認済み**（run 29136401842 #160・`85 passed / 0 failed`・env fake/log/false・head 3393b01 をログ本文で確認）
- 対応 commit: `f9907f2`（実装）
- Function ID binding（`ATOMIC_LEDGER_SYNC_PENDING`）: C18-001/031/037・C24-財務可視化系・C46-032/033/048

## 1. read-only 実査結果（実装前）

| 経路 | 実査時の状態 | 判定 |
|---|---|---|
| `/growth`（Growth OS ダッシュボード） | `requireUser` のみ。売上インパクト・削減コスト換算・DX 推定金額・イベント別 revenueImpact を全ロールに表示。`summarizeGrowthEvents` は金額列を常に取得 | **境界欠落（本 WIP の主対象）** |
| `/growth/events`（成長台帳） | `requireUser` のみ。`findMany` が select なし（payload/description 含む over-fetch）。売上影響列・finance カテゴリ行（title に請求・入金情報を含み得る）を全ロールに表示。`?cat=finance` 直接指定可 | **境界欠落＋over-fetch** |
| `/growth/control-tower` | WIP2 で金額は canViewFinance ゲート済みだが、集計関数は金額列を DB から取得していた | **取得段階の遮断が未達** |

- RBAC 事実（rbac.ts 実測）: STAFF は `dashboard:read` を保持、`finance:read` は非保持。EXTERNAL_EXPERT は finance:read 保持（会計顧問想定）・dashboard:read 非保持。AI ロールに変更なし。

## 2. 設計判断

1. **ページ基礎権限 = `dashboard:read`**（両ページとも経営ダッシュボードの一部）。非保持ロール（EXTERNAL_PARTNER 等）は `AccessDenied`（データ取得前・PII なし）。
2. **金額の定義**: revenueImpact・costSaving・DX 推定金額（estimatedCostSaving/estimatedRevenueImpact）・**工数×固定単価(3000円/h)の円換算**を含む。円換算も金額表示（換算値から工数単価既知のため金額が逆算可能）→ finance:read のみ。
3. **取得段階遮断**: 非財務閲覧者は金額列を **DB クエリ段階から select しない**（表示条件分岐だけにしない）。`summarizeGrowthEventCounts`（growth.ts 新設）= type/timeSavingMinutes のみ select し、金額 0 で `summarizeGrowth` に委譲。
4. **finance カテゴリの存在シグナル遮断**: 非財務閲覧者には finance カテゴリの行・件数・バッジを一切返さない（`category: { not: 'finance' }`）。件数合計も `total − byCategory['finance']` で表示し、**算術復元（total−Σ他カテゴリ）を成立させない**（WIP2 と同方針）。`?cat=finance` の直接指定も無効化。finance イベントの title は請求先・入金額を含み得るため行ごと遮断が必須。
5. **削減工数（分）は全員表示**: 分そのものは金額でなく、単価非既知なら金額に変換できない（円換算のみ遮断）。「自己申告値を含む集計」と明記し検証済み実績とは呼ばない。
6. **over-fetch 解消**: /growth/events は表示列のみ explicit select（payload/description は権限に関わらず非取得）。
7. **代替表示**: 非財務閲覧者には「削減工数(30日)」Stat と「金額の集計は財務閲覧権限のある人にのみ表示されます。」の案内（空画面・無言の欠落にしない）。
8. **quote ドメインの金額は scope 外**（roadmap65・WIP-4 で判断）: 見積の原価・粗利は quote:read 配下の既存業務フロー（値引き承認ルール）であり、本 WIP の finance:read 境界とは別軸。

## 3. 不変条件

- 新規発火（emitGrowthEvent）・状態変更・外部送信・AI 実行なし。read model と表示のみ変更。
- RBAC 定義・機密ラベル許可表・schema・seed 変更なし。
- e2e は件数・金額の値に依存しない（seed に GrowthEvent 0 件・実行時発火順が非決定）。

## 4. テスト

- e2e 追加 `growth_boundary.spec.ts` 3件: CEO=金額集計と売上影響列が見える / sales=金額系 toHaveCount(0)・削減工数と権限案内が見える / sales=/growth/events で売上影響 columnheader 0・「財務」exact バッジ 0（`?cat=finance` 直接指定も 0）。
- 既存 `growth_control_tower.spec.ts` 12件は counts 変種切替の影響なし（件数非依存設計のため）を机上確認。
- 期待 CI: `Running 88 tests` → `88 passed / 0 failed`。

## 5. Gate 判定

- [x] 金額列は finance:read のみ DB 取得・表示（counts 変種・DX select 分岐・イベント select 分岐）
- [x] finance カテゴリの存在シグナル遮断（行・件数・バッジ・cat 直接指定・算術復元）
- [x] ページ基礎権限 dashboard:read（AccessDenied は取得前）
- [x] over-fetch 解消（payload/description 常時非取得）
- [x] ローカル電池 green（tsc 0 / lint 0 / unit 278 / safety 0 / secret NONE）
- [x] 敵対的レビュー3視点（金額経路・存在シグナル・E2E回帰）→ 指摘反映（§6 追補）
- [ ] CI 88/0 をログ本文で確認（封印 env fake/log/false）

## 6. 追補（敵対的レビュー3視点の結果と反映・2026-07-11）

実装 f9907f2 に対し独立レビュー3件（①金額取得経路 ②存在シグナル・整合 ③E2E回帰）を実施。
③は「テストを壊す欠陥なし・総数 85+3=88 で正」。①②で以下を検出し、fix commit で反映した。

| # | 深刻度 | 指摘 | 反映 |
|---|---|---|---|
| 1 | High | `summarizeGrowthEventsAction`（growth/actions.ts）が権限検査なしで金額込み集計を返す未使用 Server Action（'use server' export = 公開エンドポイント）として残存 | **削除**（経緯コメントを残置） |
| 2 | High | /dx・/dx/opportunities（一覧/詳細）・/dx/assessments が requireUser のみで、DX 推定金額・工数円換算（3000円/h）が全ロールに露出（/growth から1クリック） | **設計判断＋ページゲート**: DXOpportunity の推定金額は担当者が自ら入力する**ドメインデータ**（実財務データの GrowthEvent 金額とは別軸・quote ドメイン金額と同型の判断）。therefore finance:read ではなく **DX アクション群と同じ資源 `marketing:read` でページ基礎権限**を適用（外部ロール EXTERNAL_PARTNER/EXPERT を遮断。内部ロールの業務フローは維持）。/growth 側の集計表示が finance:read でより厳しいのは経営ダッシュボードの保守的集計として意図的（片方向の厳格化であり漏えいではない） |
| 3 | Medium | control-tower にページ基礎権限がなく境界が非対称（EXTERNAL_EXPERT は finance:read 保持のため金額まで到達） | **dashboard:read ゲートを追加**（AccessDenied はデータ取得前）。EXTERNAL_EXPERT が管制塔に入れなくなるのは意図（同ロールの scope は contract/finance/hr 文書の参照であり経営管制塔ではない）。WIP-5 の残件は Topbar とロール別 e2e |
| 4 | Medium | counts 変種が finance 行を取得し timeSavingMinutes 合計に混入（可視行合計との差分から存在復元可能・現データでは latent） | **where に `category: { not: 'finance' }` を追加**（取得段階遮断がコミット主張どおりに）。/growth の `total − byCategory['finance']` 減算は二重防御として残置（減算値は 0 になる） |
| 5 | Low | `?cat=a&cat=b`（同キー複数指定）で string[] が Prisma に渡り 500（fail-closed だが未捕捉） | 先頭要素へ正規化（型注釈も `string | string[]`） |
| 6 | Low | STAFF が finance.* 種別を記録すると自分の一覧から消えるサイレント消失（読み書き非対称） | 記録フォームの選択肢から finance.* を除外＋Server Action 側でも `growthCategoryOf(type)==='finance' && !finance:read` を拒否 |
| 7 | Info | e2e「財務不在」検証が finance イベント不在時に空振り合格 | 社長で finance イベントを実作成→担当者で不在検証に強化（選択肢除外の検証も追加） |

### 記録のみ（scope 外・後続 WIP 候補）

- `/dashboard` 自体が requireUser のみで商談金額を全認証ロールに表示（規約2系統の不整合）→ **WIP-5 候補**。
- golden-path dashboard は fetch-then-redact 方式（表示漏えいなし・取得段階遮断は未達）→ **WIP-6 で再判定**。
- READ_ONLY は RESOURCES 全 read 設計のため金額可視（設計どおり・変更なし）。
- e2e に外部ロールのユーザーが seed されていないため、/dx・control-tower の外部ロール遮断は RBAC 単体テスト＋机上列挙で担保（e2e 化は外部ロール seed の追加とセットで別 WIP）。
