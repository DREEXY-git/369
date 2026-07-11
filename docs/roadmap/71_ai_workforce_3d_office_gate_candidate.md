# 71. AI Workforce read model＋3D バーチャルオフィス v0（Phase 4 Stream B・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/170_ai_workforce_3d_office.md`
- ブランチ: `claude/stream-b-ai-office-v55`（基準 6477279・Draft PR・merge しない）
- 上位: roadmap69 §3（Phase 4 Epic: C04/C28/USR-003）

## 1. 設計原則

- **証拠由来の状態導出・捏造しない**: 状態（idle/planning/working/waiting_approval/blocked/error/offline/unknown）は AIAgent.status・直近 AIAgentRun（RunStatus）・AIApprovalGate（PENDING/REJECTED）から純関数 `deriveAgentState`（shared・unit 7件）で導出。証拠がなければ **unknown（no telemetry）** と表示し、働いているように見せない。
- **PII・Secrets・プロンプト全文・承認 payload 本文を取得しない**: read model は AIAgentRun の input/output を select しない（task 名・status・時刻のみ）。
- **read-only**: 実行・承認・削除・外部送信の導線は 3D/2D いずれにも存在しない（リンクは /ai-agents・/approvals の閲覧画面のみ）。
- **色だけに依存しない**: 状態は色＋アイコン＋日本語ラベルで冗長表現。凡例を常設。

## 2. 実装

| 層 | 内容 |
|---|---|
| shared | `ai-workforce.ts`: 8状態・ラベル・色・`deriveAgentState`（優先順位 offline > waiting_approval > working > planning > blocked > error > idle > unknown・blocked は「承認却下＋再実行証拠なし」の証拠ベース）・`freshnessLabel`。unit 7件 |
| web read model | `lib/domains/ai-workforce/read-model.ts`: AIAgent/AIAgentRun（最新）/AIApprovalGate/実行回数を tenant スコープで集約。表示項目 = 名前/役割/部署/状態/根拠/現在タスク/最終活動/承認待ち/blocked理由/次の推奨/権限レベル（autonomy＋AI 共通制約の要約）/データ鮮度 |
| ページ | `/ai-office`（dashboard:read ゲート・データ取得前）＋nav 追加 |
| 3D | Three.js（`three@0.185.1` MIT・外部 texture/CDN 不使用・CanvasTexture のみ）。業務ゾーン（営業/経営管理・財務/運用・在庫/Growth/その他）＋**人間の承認デスク**。AI 社員は状態色カプセル＋アイコン付き名前ラベル。**waiting_approval は承認デスクへ破線接続**。OrbitControls（カメラ移動・ズーム・矢印キー）・raycaster クリック選択・部署/状態フィルタ（メッシュ可視切替のみ＝カメラ/レイアウトを動かさない）・preserveDrawingBuffer（ピクセル検査用）・resize 対応・unmount 時 dispose |
| フォールバック | 2D 一覧（常設・キーボード操作可）・詳細パネル（固定領域）・WebGL 失敗時は案内＋2D のみ・**モバイル（<768px）は 3D を構築せず操作可能な簡略表示**（計測完了後にのみ 3D をマウント） |
| 境界補正 | 既存 /ai-agents 一覧・詳細（requeireUser のみだった）に dashboard:read ゲートを追加（Scout 実測の無ゲートを補正） |
| e2e | `ai_office.spec.ts` 4件: canvas 非 blank（64x64 ピクセルサンプルで色数・非黒率を検査）＋コンソールエラー 0・詳細パネル/フィルタ操作・**モバイル簡略表示**（viewport 390x844・canvas 非マウント・一覧操作可）・担当者閲覧回帰。desktop/mobile スクリーンショットを test-results に保存 |

## 3. 依存追加（roadmap69 §4 の許可範囲内）

- `three@0.185.1`＋`@types/three@0.185.1`（dev）。MIT・フレームワーク非依存 client ライブラリ・React 19/Next 15 互換（プレーン three + useEffect。react-three-fiber は不採用＝React バージョン結合を避ける）。lockfile 差分は three 系のみ。

## 4. Gate 判定

- [x] schema/seed/RBAC/labels 変更なし・封印 env 不変・外部送信/実行導線なし
- [x] ローカル電池 green（unit 285/0・tsc 0・lint 0・build 0〔/ai-office 148kB〕・safety 0）
- [x] 敵対的レビュー → 指摘反映（§5 追補）
- [x] Draft PR #5 作成・CI green をログ本文で確認: run 29147684584（#174）・head 2e45721・`97 passed (1.5m)` / 0 failed（ai_office 4件 = canvas 非 blank ピクセル検査・コンソールエラー0・操作・モバイル簡略表示を CI 上で検証）→ **Stream B v0 クローズ**

## 5. 追補（敵対的レビューの結果と反映・2026-07-11）

独立レビュー（4204936 対象）: ブロッカーなし。「捏造しない」原則・情報境界・tenant スコープ・
read-only 性・依存最小性・SSR 安全性・クリーンアップ・e2e 検算（97=93+4）はすべて実読で確認済み。検出と反映:

| # | 深刻度 | 指摘 | 反映 |
|---|---|---|---|
| 1 | Medium | 直近 run の取得がテナント全体 take:200 ウィンドウのため、run が偏る運用（worker は chief_of_staff に集中）で「証拠はあるが取得ウィンドウ外」の偽 unknown（実行回数 N と自己矛盾） | **`distinct: ['agentId']`＋orderBy [startedAt desc, id desc]** に変更（同時刻 tiebreaker も解消） |
| 2 | Medium(latent) | REJECTED ゲートを時間条件なしで数え「直近 run 以降」のセマンティクスと矛盾（producer は現状 0 件で未発火） | REJECTED は **直近 run の gate のみ** blocked 根拠に採用（PENDING は従来どおり全件＝人間の判断待ち） |
| 3 | Low | CanvasTexture が dispose 漏れ（Material.dispose は map を解放しない） | traverse で map を明示 dispose |
| 4 | Low | ピクセル検査が背景単色でも通る閾値＋固定 sleep | 背景色 #0f172a からの乖離ピクセル > 200＋色数 > 12 に強化・expect.poll（10s）で条件待ち化 |
| 5 | Info | run.error を select するが未使用 | select から除去（最小取得） |
| 6 | Info | フィルタ検証が no-op でも通る | 厳密減少＋0件メッセージ表示を検証 |
| 7 | Info（記録のみ） | lockfile 差分に three 推移依存＋eslint 系 peer キー再解決を含む（バージョン変更なし）／working 系状態の producer 不在（接続線・アニメは前方互換コード・unit で担保）／webglcontextlost 未処理／nav の権限フィルタなし（既存パターン） | roadmap69 §4 の表現を本追補で補正。producer は Phase 4 の C04（Agent Control Plane）実装で接続 |
