# 69. B+ 並行前進ロードマップ正本化（v5.5 WIP-0/WIP-1・Candidate）

- 日付: 2026-07-11
- 対応 audit: `docs/audit/168_bplus_canonicalization.md`
- 人間 Phase Gate 決定（2026-07-11・利用者）: **案B+ を正式採用**。①Phase 3 を「AI Growth Engine v0」としてクローズ準備 ②C19/C21/C22 は削除・中止・完成扱いにせず「**Phase 3.5 Growth Channels**」として正本化 ③Phase 3.5 と Phase 4 を独立ストリームで並行前進 ④Phase 4 完了条件に主要 Growth Channel 接続を含める ⑤外部操作は封印のまま read-only 分析と AI 下書きから。
- 基準: feature HEAD `5a61345`（main `ffd586b` より 44 commit 先行・PR #3 open/draft/mergeable・CI #168 success）。

## 0. WIP-0: 完全機能台帳 Gate 補正（ATOMIC_LEDGER_SYNC 判定）

- 実測: `docs/function-master/` は **feature ブランチ・作業ツリーに不在**。原典・生成器・生成物のいずれも本リポジトリに存在しない。
- 判定: **`ATOMIC_LEDGER_SYNC = PENDING` を継続**（roadmap58 の 50 カテゴリ表を暫定正本とする従前判断を維持）。台帳を roadmap58 から再発明しない。
- 不足物と期待値（提供された正本仕様）:
  - 不足: `docs/function-master/`（原典 Markdown）＋生成器＋生成物（Stable IDs 7,485 件）。
  - 期待 raw SHA-256: `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667`
  - 期待 normalized SHA-256: `18e3cc79a80bc218b7a619b61b320b6a672ce958a348158efc6aa52f54165ad3`
  - 期待規模: 50 カテゴリ・原子機能 2,553 件・Global Rules 51 件・Stable IDs 7,485 件・C49 のみ `SOURCE_DETAIL_MISSING`。
- 統合手順（原典入手後）: ① `docs/function-master/` へ原典を配置 → ② raw/normalized SHA-256 を上記期待値と照合 → ③ 生成器 `--check` を通す → ④ GitHub 正本と Obsidian 鏡像（両 vault）を同期 → ⑤ 本書と CURRENT_STATE の PENDING を解除。
- 帰結: **Phase 3 の「正式完了」宣言と PR #3 の main 統合は HOLD**（PENDING 解除まで）。ただし安全な設計・read-only 実装・AI 下書き・3D 可視化の前進は継続する（人間 Gate 決定 §0 のとおり）。

### §0 追補（2026-07-11・v5.8: PR #7 統合による状態更新）

- Codex PR #7（head `a859d71`）を feature へ統合。`docs/function-master/`（正本 MD/JSON・SOURCE_MANIFEST・
  Evidence Ledger・生成器）＋Obsidian 鏡像（`369-vault/知識/完全機能台帳/`）が本リポジトリに存在するようになった。
- 照合結果（Claude 独立検証）: manifest の raw/normalized SHA-256 は上記期待値と**完全一致**。
  件数も JSON からの再集計で一致（50 カテゴリ・原子機能 2,553・Stable ID 7,485 = 末端 7,413＋カテゴリ 50＋候補群 22・
  ID 一意・C49 のみ SOURCE_DETAIL_MISSING）。secret 0・broken wiki link 0。
- ただし**原典（pasted-text.txt）は取得不能**のため生成器 `--check`（手順③）は未実行。
  → 状態を `ATOMIC_LEDGER_SYNC = GITHUB_CANONICAL_SYNCED / SOURCE_RECHECK_WAITING` に更新する。
  「独立再生成済み」とは記録しない。手順③（原典による --check）と人間 GO が完了するまで、
  **Phase 3 の正式完了宣言と PR #3 の main 統合は引き続き HOLD**。

### §0 追補2（2026-07-11・v5.9: PR #10 による SOURCE_RECHECK 検証記録）

- Codex PR #10（head `8e98cef`・feature へ統合済み merge `f45ad2f`）の
  `docs/function-master/V58_INDEPENDENT_REREVIEW_2026-07-11.md` に、**Codex 環境で期待 raw SHA-256 と
  一致する原典を用いた生成器 `--check` の成功**（50 カテゴリ・原子機能 2,553・Stable ID 7,485・
  C49 のみ SOURCE_DETAIL_MISSING）が記録された。手順③は Codex 側で実行済みとなった。
- 状態を `ATOMIC_LEDGER_SYNC = GITHUB_CANONICAL_SYNCED / SOURCE_RECHECK_VERIFIED_BY_CODEX` に更新する。
  Claude 環境では原典を保持しないため「Claude が独立再生成済み」とは記録しない（検証主体は Codex・証拠は PR #10）。
- **この更新は Phase 3 の正式完了宣言・PR #3 の main 統合・人間 GO とは分離**する。
  それらは引き続き HOLD（人間 Gate 待ち）。外部接続封印・表現規則（§1）も不変。

## 1. Phase 3 クローズ（名称: AI Growth Engine v0）

- **完了範囲**: Control Tower v0（CT-0〜5）／Growth Event Ledger 可視化／Email・DM 基盤（OutreachDraft→承認→送信ログ・Suppression）／承認導線（ApprovalRequest deep link）／Consent・Privacy（C38）／財務・PII 閲覧境界（v5.4 WIP1〜6・PII 29 経路台帳・0 Critical/0 High）。
- **未完範囲**: C19（Ads Management）・C21（SEO/Content/PR）・C22（Referral/Affiliate/Creator/Business Network）→ **Phase 3.5 へ移管（§2）**。
- 表現規則: 「Phase 3 全機能完成」とは**表現しない**。正式なクローズ宣言（基準 commit 固定）は ATOMIC_LEDGER_SYNC 解除＋人間 GO 後。
- 証拠: roadmap60/62-68・audit156-167・CI run #156/#160〜#164（すべてログ本文確認）。

## 2. Phase 3.5 Growth Channels（C19/C21/C22 の正本化）

実装実態（2026-07-11 実測）: 専用 schema・専用 AI タスク・専用 UI は未整備。既存資産 = MarketingCampaign（channel 文字列・budget/spent）＋CampaignMetric（cost/impressions/clicks/conversions・seed 1 件）＋ContentAsset（AI 生成マーケ資産）＋`apps/web/lib/ai-generate.ts` の fakeMarketingCopy（lp/sns/ad/mail 等 8 種・SEO 記事/PR/紹介なし）。C22 に流用可能な実装は無し（ExpertReferral は士業紹介で別物）。

共通規則（3 チャネル共通）:
- 段階: **read-only 分析 → AI 下書き → Human Certification Gate → 外部接続（封印解除は個別人間承認）**。
- 禁止（全段階）: 外部 API 呼び出し・広告費支出・公開・配信・投稿・報酬支払・実 LLM・課金。AI は下書きまで（外部送信・承認・削除なし）。
- AI 下書きの必須属性: 根拠・信頼度・データ不足の明示・次の人間確認事項。FakeLLM で決定論・Zod 検証。
- 表示規則: 接続済み／未接続／データ不足／封印中を区別し、実データがないチャネルを動作中に見せない。
- 外部接続再開条件（共通）: EXTERNAL_SEND_ENABLED 相当の個別封印解除＋人間承認フロー接続＋Consent/Suppression 接続＋監査ログ完備＋ATOMIC_LEDGER_SYNC 解除。

| 項目 | C19 Ads Management | C21 SEO/Content/PR | C22 Referral/Affiliate |
|---|---|---|---|
| Accountable Human | 利用者（オーナー） | 利用者（オーナー） | 利用者（オーナー） |
| Responsible Eng Owner | Claude（本セッション系） | Claude | Claude |
| Security Owner | Claude Security Architect 視点＋敵対的レビュー | 同左 | 同左 |
| QA Owner | Claude QA 視点（CI 必須） | 同左 | 同左 |
| 依存 | MarketingCampaign/CampaignMetric（既存・schema 変更なし） | ContentAsset＋ai-generate.ts（article/SEO brief 拡張） | **新規 schema が必要見込み（紹介報酬・パートナー台帳）→ 実装前 Gate 必須** |
| DoR | seed/実データで指標集計が空振りしない・境界設計（金額の扱い）記録済み | 生成種別と Zod schema 定義・PII 非混入設計 | schema Gate 文書＋Consent 設計 |
| DoD（read-only 段） | チャネル状態盤＋指標集計＋権限/監査＋e2e＋CI green | ブリーフ一覧＋下書き生成＋検証＋CI green | 台帳化のみ（実装は Gate 後） |
| Evidence ID | C19-RO-01（本 WIP: roadmap70） | C21-RO-01（DoR 固定・未着手） | C22-GATE-01（未着手） |
| Phase 4 接続条件 | AI 社員（marketing 系 agent）の活動として 3D Office に状態が現れる | 同左 | 同左 |

**Stream A の最初の縦切り = C19 Ads Management read model**（既存データが最も厚く schema 変更なしで成立）。C21/C22 は上表の DoR/DoD で台帳化し、着手は次ストリーム。

## 3. Phase 4 正式 Epic（AI Workforce / 3D Office）

追加 Epic（Feature Registry の AIOS-001〜005 と接続。USR-003〜009 の一部は台帳原典不在のため **本書を暫定定義の正本**とし、ATOMIC_LEDGER_SYNC 解除時に照合する）:

- **C04: AI Employee Registry / Agent Control Plane**（AIOS-001/002）— 既存 AIAgent（8体）＋AIAgentRun/Action を正とした登録・役割・状態・権限レベル管理。
- **C05: AI Safety / Evaluation / Kill Switch** — AISafetyLog/AIApprovalGate を正とした評価と停止導線（停止は人間のみ）。
- **C28: AI社員ダッシュボード** — 既存 /ai-agents を read-only 運用可視化へ拡張。
- **C30: AI Employee Platform** — AIOS-005（Human Work Inbox）への接続。
- **USR-003: 3D バーチャルオフィス** — Three.js 業務画面（本書 §4 Stream B が v0）。
- **USR-004: Outcome & Human Time Ledger** — 既存 Growth Event Ledger の継続。
- **USR-007: 既知 Critical/High 0 Gate** — 各リリース前提（v5.4 の台帳方式を標準化）。
- **USR-009: 完全機能台帳同期** — ATOMIC_LEDGER_SYNC 解除タスクそのもの。

**Phase 4 完了条件（必須項目）**:
1. AI Workforce read model＋3D Office が read-only 運用可視化として本番確認 GO。
2. **主要 Growth Channel（C19/C21/C22）のうち最低 1 つが read-only → AI 下書き → 人間承認まで接続済み**。
3. 既知 Critical/High = 0（機械監査台帳の更新つき）。
4. ATOMIC_LEDGER_SYNC 解除（USR-009）。
5. 外部操作封印（外部送信・実 LLM・課金・実広告・SNS 投稿・PR 公開）は Phase 4 中も不変。解除は個別人間承認。

## 4. 実行構造（ブランチ分離）

- 本書＋audit168 を **共通 B+ 正本化 commit** として feature ブランチ（PR #3）へ push。以後、PR #3 へ Phase 3.5/Phase 4 の大型実装を積み増さない。
- 同一基準 SHA から子ブランチ 2 本:
  - **Stream A**: `claude/stream-a-growth-channels-v55` — C19 read model＋AI 下書き（roadmap70）。
  - **Stream B**: `claude/stream-b-ai-office-v55` — AI Workforce read model＋3D Office v0（roadmap71）。
- 両ブランチとも Draft PR（merge しない）。共有正本（roadmap/audit/CURRENT_STATE/vault）の更新は統合担当（本セッション）が **直列処理**。実装も単一ワーカーの直列実行で同一ファイルへの並行書き込みを構造的に排除する（worktree 分離と同じ不変条件を、ディスク割当の制約下で直列化により担保。判断の記録）。
- 依存追加は Stream B の `three` のみ（v0.185.1・MIT・フレームワーク非依存の client-side ライブラリで React 19/Next 15 互換・既知の重大脆弱性報告なし〔npm registry 実測・rendering ライブラリで攻撃面は限定的〕）。lockfile 差分は three（＋@types/three dev）に限定する。

## 5. Gate 判定（WIP-0/WIP-1）

- [x] ATOMIC_LEDGER_SYNC=PENDING の明示（§0・CURRENT_STATE・PR #3 本文に反映）
- [x] Phase 3 クローズ範囲/未完範囲の正本化（§1・「全機能完成」と表現しない）
- [x] Phase 3.5 の C19/C21/C22 台帳化（§2・オーナー/DoR/DoD/段階/Gate/Evidence/接続条件）
- [x] Phase 4 Epic と完了条件の正本化（§3・Growth Channel 接続を必須化）
- [ ] 共通正本化 commit push・PR #3 本文更新・vault 同期
