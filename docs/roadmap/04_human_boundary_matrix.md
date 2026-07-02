# 04. Human Boundary Matrix（人間境界マトリクス） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。「人間とAIの境界」を分類として固定する。**この文書は分類であり、いかなる自動化の実行承認でもない。**
> Automation Level の定義詳細は `08_automation_level_taxonomy.md`。

---

## 1. Automation Level（L0〜L7）と現時点の方針

| Level | 名称 | 意味 | 現時点の方針 |
|---|---|---|---|
| L0 | Human Only | 人間だけが行う。AIは関与しない | 許可（人間専権） |
| L1 | AI Assist | AIが情報整理・要約で補助 | 許可 |
| L2 | AI Draft | AIが下書きを作り、人間が確定 | 許可（AI生成物は必ず下書き） |
| L3 | AI Recommend | AIが選択肢と推奨を提示、人間が選ぶ | 許可（根拠・信頼度の併記必須） |
| L4 | Approval Required | AIが実行案を作り、人間承認後にシステムが実行 | 許可（既存 承認→送信フロー等） |
| L5 | Approved Execution | 事前承認された種類の操作をAIが実行 | **future / blocked（実装しない）** |
| L6 | Bounded Autonomy | 予算・範囲・停止条件付きの限定自律 | **future / blocked（実装しない）** |
| L7 | Autonomous Operation | 自律運転 | **future / blocked（実装しない）** |

**現時点の実装上限は L4**。L5 以上は分類・設計・安全ルールの文書化のみ行い、解禁には Gateway・Receipt・Rollback・Kill Switch（doc03 §4）の実装と人間の明示判断を必要とする。

## 2. Human Boundary 分類（8区分）

| 区分 | 略号 | 意味 | 例 |
|---|---|---|---|
| Human-only | HO | 恒久的に人間だけが行う | 採否決定・解雇・給与決定 |
| Human decision required | HD | 最終判断は必ず人間（AIは材料提供まで） | Phase 進行判断・課金解禁判断 |
| Human approval required | HA | AI/システムが実行するが人間承認が前提 | 外部送信・請求発行 |
| AI assist only | AA | AIは補助（整理・検索・要約）まで | 監査ログの検索補助 |
| AI draft only | AD | AIは下書きまで（確定・送信は人間） | 営業メール文案・議事録案 |
| AI recommend only | AR | AIは推奨まで（選択は人間） | 商品推奨・Next Best Action |
| Approved execution future | AEF | 将来 L5 で検討（現在は L4 以下に格下げ運用） | 定型フォロー送信の自動化 |
| Prohibited / blocked | PB | 現時点で実行自体を禁止 | ロボット実行・MCP公開 |

## 3. 人間が最終責任を持つ領域（Human Decision Rights）

以下は **人間の決定権として恒久確保**し、AI・Workflow・Agent がどれだけ進化しても委譲しない。

1. **人事**: 採否決定・自動不採用・社員評価確定・給与・昇給・解雇・懲戒（HO）。AIは Interview Rubric / Candidate Summary / Bias Alert 等の補助まで。
2. **金銭**: 実課金の解禁・決済・資金移動・請求金額の確定（HD/HA）。
3. **契約**: 契約締結・重要条件の変更（HD/HA）。
4. **外部への意思表示**: 実メール送信・公開・広報（HA。下書きはAD）。
5. **Phase 進行・安全ルール変更**: ロードマップの進行判断・安全境界の緩和（HD）。
6. **物理世界**: ロボット・機器への実行指示（PB→将来もHA以上＋Human Override 常備）。
7. **緊急停止の権限**: Kill Switch / Emergency Stop は常に人間が握る（HO）。

## 4. AIが補助に留まる領域（現時点）

- 法務・税務・労務・財務の**断定助言**はしない（リスク・確認観点・専門家相談候補の提示まで）。
- 人物評価に見える出力（候補者比較・社員スキル分析）は「参考情報・根拠付き」の形式に限定し、確定評価に転用しない。
- 予測（Cash Forecast・解約予兆等）は信頼度と根拠を併記し、断定表示しない。

## 5. Human-only Task Registry（初版・Phase 2-C で正式化）

| タスク | 区分 | 理由 |
|---|---|---|
| 採用の最終判断・不採用通知の決定 | HO | 人の人生に関わる決定 |
| 社員評価の確定・給与/昇給/解雇 | HO | 同上＋法的リスク |
| 契約締結・押印・重要条件変更 | HO/HD | 法的拘束力 |
| 実課金・決済の解禁判断 | HD | 金銭事故は信頼を破壊する |
| 本番環境の変更承認 | HD | 本番事故防止 |
| 安全境界（本 Matrix・doc03）の緩和 | HD | ガードレール自体の保護 |
| 緊急停止の発動・解除 | HO | 最後の砦 |
| ロボット・物理操作の実行指示 | PB（現時点） | 物理的不可逆性 |

## 6. Human-front / AI-back Mode（将来構想の位置づけ）

- 顧客・社員に対する「前面」は人間、AIは背後で準備・下書き・分析を行うモード。
- Phase 2 の Sales AI（Account Brief / Talk Track 等）はこのモードの実装例（AIは商談に出ない。準備を作る）。
- 前面をAIにする（AI Native Inbox の対外応答等）は L5 相当として future 扱い。

## 7. 運用

- Feature Registry（doc02）の全 Feature に HB 区分と AL を付与済み。新機能追加時も必須。
- 区分の変更（特に HO/PB の緩和方向）は人間承認＋監査記録を必要とする。
