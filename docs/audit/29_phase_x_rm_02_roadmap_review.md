# 29. Phase X-RM-02 Roadmap Review / Gap Reconciliation の監査記録

> docs-only / roadmap review / gap reconciliation。**コード・DB・schema・package・lock の変更は一切なし。**
> フェーズ: Phase X-RM-02 / 現在位置は git refs を正とする。

---

## 1. 非エンジニア向け要約

- Phase X-RM-01 で main に反映した roadmap 一式（9本＋doc28＋vault）を、**ユーザーが提示した追加構想リスト（17領域・§1-1〜1-18）と1件ずつ照合**しました。
- 結果: **17領域のうち16領域・代表機能名37個のうち36個は既に完全に反映済み**。唯一の差分は Gateway の名称で、旧表記「369 MCP/API Gateway」が6箇所に残っていたため、**正式表記「IKEZAKI MCP/API Gateway」へ統一**しました（旧表記は「旧表記・内部名」として履歴を保持）。
- あわせて、**Enshin OS の表記ルール**（大文字ENSHINにOSを続けない）と、**今後の Claude Code プロンプトに必ず入れる分類23項目の正式名称**を文書に固定しました。
- コード実装・DB変更・課金・外部送信は一切していません。

## 2. 前回結果の要約（事実整理）

- Phase X-RM-01（コミット `a9accae`・main 反映済み）で、追加構想17領域を docs/roadmap 9本＋doc28＋tasks/vault に非破壊統合済み。
- 本レビューはその成果物と、今回ユーザーが再提示した詳細リストとの**突合監査**である。

## 3. 17領域チェック結果

| 検査 | 結果 |
|---|---|
| 17領域キーワード（IKEZAKI MCP/API Gateway 表記で検査） | 修正前 16/17（Gateway のみ旧表記）→ **修正後 17/17 OK** |
| 代表機能名37個（Agent Workforce Manager〜Human Override） | 修正前 36/37 → **修正後 37/37 OK** |
| 個別機能名（§1-1〜1-17 の全列挙） | doc02 の各領域「個別機能（全採用・名称保持）」行に保持済み・欠落なし |

## 4. 表記統一の結果

### 4-1. IKEZAKI MCP/API Gateway（正式表記）

- 旧表記「369 MCP/API Gateway」が **6箇所**（doc00×1・doc01×1・doc02×3・doc06×1）に存在 → すべて **IKEZAKI MCP/API Gateway** へ統一。
- 履歴の連続性のため、doc01（2-G）・doc02（狙い・個別機能一覧）・doc06（対象別分類表）に「旧表記: 369 MCP/API Gateway」を併記し、旧表記は**内部名・別名**として整理（置換ではなく統一＋別名保持）。

### 4-2. Enshin OS 表記ルール

- **大文字「ENSHIN」に「OS」を続ける表記: 検出ゼロ**（case-sensitive 検査 `grep -Rn` で docs/roadmap・docs/audit・tasks・369-vault を全走査）。
- 本文表記は **Enshin OS** で統一済み。Feature ID プレフィックス `ENSHIN-`（ENSHIN-001 等）は ID 体系であり本文表記ではないため対象外——このルールを doc07 §1 に明文化した。
- **検査コマンドに関する注意（今後のプロンプトへ）**: 大文字小文字を無視する `grep -i` でこのルールを検査すると、正しい表記「Enshin OS」まで誤検出する（本レビューの必須表記「Enshin OS」と矛盾する）。**このルールの検査は case-sensitive（`grep` に `-i` を付けない）で行うこと。**

## 5. Phase X / Phase 2 / Phase 8 境界チェック結果（全項目明記済み）

| 項目 | 記載場所 | 結果 |
|---|---|---|
| Phase X では新規構想をいきなり実装しない | doc00 §1・doc02（全行「今回実装しない」）| OK |
| Phase X は Registry / Roadmap / Matrix 整理優先 | doc00 §1・CURRENT_STATE | OK |
| Phase 2 は read-only / draft / recommend / approval-required 中心 | doc01 §1・§4 | OK |
| Phase 2 は Company Brain / Sales AI / Human Boundary / Safety設計中心 | doc01 §4・§6 | OK |
| Phase 8 まで実課金しない | doc05 §3・§5 | OK |
| MCP/API 公開しない | doc06 §1・§4 | OK |
| L5 以上の実行系自動化をしない | doc08 §2 | OK |
| ロボット/物理操作をしない | doc02 ROBOT・doc03 §3・doc08 §4 | OK |
| 採否決定・社員評価・給与・解雇を AI にさせない | doc03 §3・doc04 §3（HO 恒久） | OK |

## 6. 今後の Claude Code プロンプト分類項目（23項目）

- ユーザー指定の23分類（Feature ID〜残リスク）の**正式名称と doc02 の表の列との対応**を `docs/roadmap/02_feature_registry.md` §0.1 に明文化した。
- 今後、新規機能・設計追加のプロンプトにはこの23項目を必ず含める（本書と doc02 §0.1 が正）。

## 7. 不足補完一覧（今回の変更）

| # | ファイル | 補完内容 |
|---|---|---|
| 1 | doc00 §3 表 | 領域8の表記を IKEZAKI MCP/API Gateway へ |
| 2 | doc01 2-G | 正式表記＋旧表記併記 |
| 3 | doc02 領域8 | 狙い・個別機能一覧・API-001 行を正式表記へ（旧表記は別名保持） |
| 4 | doc02 §0.1 | 必須分類23項目の正式名称⇔列対応を新設 |
| 5 | doc06 §2 | Gateway 行を正式表記＋旧表記併記へ |
| 6 | doc07 §1 | Enshin OS 表記ルールを明文化 |
| 7 | doc29（本書）・PROGRESS・CURRENT_STATE・vault ノート＋index | レビュー記録と現在地更新 |

## 8. 未補完・証拠不足一覧

- **Enshin OS の個別機能インベントリ**: 引き続き「詳細未確認（証拠不足・Level 0）」。ユーザーからの機能一覧・仕様の提供待ち（doc07 §3〜4 の計画どおり。推測での断定はしない）。
- 上記以外の不足は検出されなかった。

## 9. してはいけないことの遵守

- 既存プロンプト・CLAUDE.md・既存 docs/audit（doc14/15/22〜28・matrix）: **無変更**。
- コード実装・DB・schema・migration・認証/RBAC・課金・決済・MCP/API公開・外部送信・package/lock・dependency install: **すべてなし**。
- 既存方針の置換・削除・安全境界の緩和: **なし**（表記統一と分類の明文化のみ）。

## 10. GO / HOLD / NG 判定

- **判定: GO**（roadmap 一式はユーザーの追加構想リストと整合。差分は表記1件のみで補完済み）。
- Phase 2 入口レビューの材料は揃った。次候補は Phase X-03（E2E red 最小修正）または Phase X-RM-03（Phase 2 入口条件の最終確定・2-A 準備）——選択は人間判断・別承認。
