# 08. Automation Level Taxonomy（自動化レベル分類） — Phase X-RM-01

> 既存プロンプト非破壊・docs-only。自動化の「段階」を L0〜L7 で定義し、**現時点の許可上限を L4 に固定**する。
> 関連: `04_human_boundary_matrix.md`（人間境界）・`03_safety_boundary_matrix.md`（安全境界）。

---

## 1. L0〜L7 の定義と例

| Level | 名称 | 定義 | 369 での例 | 現時点 |
|---|---|---|---|---|
| **L0** | Human Only | AIが関与しない人間専権 | 採否決定・解雇・給与・緊急停止の発動・Robot 実行判断 | 許可（人間のみ） |
| **L1** | AI Assist | AIが検索・整理・要約で補助。成果物は情報 | 監査ログ検索補助・ナレッジ検索・用語説明 | 許可 |
| **L2** | AI Draft | AIが下書きを作成。確定・使用は人間 | OutreachDraft・議事録案・求人票案・督促文案 | 許可（AI生成物は必ず下書き） |
| **L3** | AI Recommend | AIが選択肢＋推奨＋根拠を提示。選択は人間 | 商品推奨・Next Best Action・Lead Scoring | 許可（根拠・信頼度併記） |
| **L4** | Approval Required | AI/システムが実行案を用意し、人間承認後に**システムが**実行 | 承認後の外部送信（decideApprovalAction）・invoice-send・dunning | 許可（既存の承認フロー） |
| **L5** | Approved Execution | 事前承認された**種類**の操作をAIがその都度承認なしで実行 | （例）定型フォローの自動送信 | **future / blocked** |
| **L6** | Bounded Autonomy | 予算・範囲・停止条件・エスカレーション付きの限定自律 | （例）Agent Budget 内での一連の業務遂行 | **future / blocked** |
| **L7** | Autonomous Operation | 目標を与えれば自律的に運転 | （例）AI社員の完全自律運用 | **future / blocked** |

## 2. 現時点の許可範囲（固定）

- **実装してよい上限: L4**（人間承認後のシステム実行。既存の承認→送信フローが該当）。
- **L5 / L6 / L7 は future / blocked**。分類・設計・安全ルールの文書化のみ許可。実装は行わない。
- 「分類上 L5 目標」とラベル付けされた Feature（doc02 の AEF 区分）も、実装時は L4 以下に格下げして設計する。

## 3. L5 以上の解禁条件（将来・すべて必須）

L5 以上を1つでも実装する前に、以下がすべて揃っていること:

1. **Decision & Action Gateway 2.0 実装済み**（承認・分類・実行の単一門）。
2. **Execution Receipt**（全実行の証跡）と **Audit Ledger** が機能している。
3. **Duplicate Guard**（二重実行防止）と **Dry Run**（乾式実行）が使える。
4. **Kill Switch / Emergency Stop**（人間による即時停止・L0 権限）が動作検証済み。
5. **Rollback Plan**（巻き戻し手順）が操作種類ごとに定義済み。
6. **AI Action Limit / Agent Budget**（上限）が強制される。
7. 対象操作の Human Boundary 区分が AEF であり、**人間の明示承認（HD）**がある。
8. 検証記録（docs/audit）が存在する（Level 3〜4 の証拠レベル）。

## 4. Robot / 物理操作の特別扱い

- **Robot / External Tool Gateway 経由の物理操作は、本分類上 L0（人間専権）または L4（承認必須）としてのみ将来検討し、現時点は実行自体を blocked とする。**
- 物理操作に L5 以上（自動実行）を適用することは、本 taxonomy の改訂＋人間承認なしにあり得ない（事実上の恒久禁止に近い扱い）。
- Human Override（人間の物理的介入・緊急停止）が保証されない構成は設計段階で却下する。

## 5. Human-front / AI-back Mode と Bounded Autonomy の条件

- **Human-front / AI-back Mode**: 対外的な前面は人間、AIは背後の準備・分析・下書き（L1〜L3）。Phase 2 の Sales AI はこのモード。
- **Bounded Autonomy（L6）の将来条件**: ①明示的な予算（Agent Budget） ②操作範囲のホワイトリスト ③停止条件（時間・回数・金額・エラー率） ④放置時エスカレーション ⑤全行動の Receipt。1つでも欠ければ L6 と呼ばない。

## 6. Human Decision Rights Engine の方針

- 「この判断は誰のものか」を機械可読にする台帳（doc04 §3/§5 が初版）。
- 将来、Gateway が操作実行前に Human Decision Rights を照会し、HO/HD 区分の操作を**構造的に**AIから遮断する。
- 台帳の緩和方向の変更は人間承認＋監査記録＋二人承認（将来）を必要とする。

## 7. 運用

- Feature Registry（doc02）の全 Feature に AL を付与済み。新機能も分類なしで実装に入らない。
- 本 taxonomy の変更（特に L5 以上の解禁）は roadmap 改訂として人間承認を必要とする。
