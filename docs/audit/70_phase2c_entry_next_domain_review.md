# 70. Phase 2-C-ENTRY — 次領域入口レビュー（docs-only・判定 READY / GO）

> Phase 2-B 正式完了（doc62）＋Phase X-05 第一波完了（doc63〜69）後の、次に進む候補の実装前比較レビュー（Mode B・doc50 と同じ型）。
> **docs-only・実装なし・code変更なし・DB操作なし・schema変更なし・migration変更なし・package変更なし・lock変更なし・workflow変更なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 品質基盤（CI・否定系テスト・静的安全ゲート）の主要な穴が塞がったので、**次の一手を選ぶための比較表**を作りました。
- 結論（推奨1位）: **事業価値側へ戻り、「顧客事例（Case Study）」か「顧客課題（Customer Pain）」のどちらへ進むかを1つに絞る詳細設計（docs-only）**。ただし両者は**顧客名・成果数値・顧客の声・許諾**が絡むため、**まだ実装しません**。設計から始めます。
- 判定: **READY / GO**（次の一歩へ進める状態。実装はすべて**別承認**）。

## 2. 現在地（read-only 監査に基づく）

- **Phase 2-B 正式完了**（doc62・営業プレイブック全5段が本番GO）。**Phase X-05 第一波完了**（CI Stage 1・AIロール拒否テスト・静的安全ゲート、すべて実装→main反映→CI実走確認GO）。
- 品質ゲート現状: push のたびに「**安全境界検査 → test 216 → typecheck → lint**」の4段が自動実行（doc69 で実走確認済み）。
- GO済み基準: **Phase 2-B-5 / `83d35bc`**（本レビューでは変更しない）。
- 重複確認: Case Study / Customer Pain の実装ファイル・schema model は**未存在**（git ls-files / schema grep 実測）→ 新規設計に重複リスクなし。docs/10_obsidian は**未存在**（関係設計は別承認のまま）。v5.1 / v5.2 Candidate（231〜252）は**正式昇格させない前提**で今回の比較対象外とし、整理自体を候補の1つとして扱う。

## 3. 候補比較（8候補）

| # | 候補 | 目的 | 期待価値 | リスク | PII/許諾/外部公開/外部送信/AIコスト/DB変更 | 先にdocs-only必要? | 今すぐ実装可? |
|---|---|---|---|---|---|---|---|
| 1 | **Case Study（顧客事例）** | 成功事例を会社の頭脳に蓄積 | 営業説得力・提案品質向上（高） | **顧客名・成果数値・顧客の声・許諾・外部公開に近接**（doc33/doc50 で2番目と評価） | PII近接・**許諾必須**・公開リスク有・DB変更要 | **必要**（許諾管理・匿名化・非公開前提の設計） | ❌ 設計から |
| 2 | **Customer Pain（顧客課題）** | 顧客の悩みを構造化 | 提案の的中率向上（高） | **顧客PII近接度が最も高い**（doc33 で最後と評価）・高機密ラベル対応が前提 | PII最近接・高機密要・DB変更要 | **必要**（高機密ラベル解禁の重い承認とセット） | ❌ 設計から |
| 3 | Stage 2（build の CI 追加） | ビルド破壊の自動検知 | 品質網の強化（中） | 低（workflow 数行・前例実証済み） | すべて無 | 不要（doc63 §4 設計済み） | ⭕（別承認で即可） |
| 4 | Stage 3（smoke on CI） | E2E 18本の自動実行 | 品質網の最強化（中） | 中（DB service・chromium 設計が必要） | CI内ダミーDBのみ | 一部必要（doc63 §4 の論点消化） | ❌ 設計消化から |
| 5 | ★2 権限拒否E2E | 権限のない人の拒否を自動検証 | 安全網の補完（中） | 低〜中（低権限ユーザーの seed/ログイン設計） | すべて無（テストのみ） | ほぼ不要 | ⭕（別承認で可） |
| 6 | UX改善（タブ導線・視認性・アーカイブ文言） | 本番利用者の使い勝手 | 利用定着（中） | 低（UI 小変更） | すべて無 | 不要 | ⭕（別承認で可） |
| 7 | GitHub / Obsidian 整備（docs/10_obsidian と 369-vault の関係設計） | ナレッジ運用の正式化 | 運用効率（中） | 低（docs-only）だが設計判断が必要 | すべて無 | **必要**（関係確定は別承認と明記済み） | ❌ 設計から |
| 8 | v5.1 / v5.2 Candidate 整理（231〜252） | 候補の棚卸し | 迷子防止（低〜中） | 低（docs-only・正式昇格はしない） | すべて無 | 不要 | ⭕（docs-onlyのみ） |

## 4. Case Study / Customer Pain の絶対条件（実装前から固定する安全境界）

- **顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない**。外部に**公開しない**・**SNS投稿しない**・**PR配信しない**・**SEOページ公開しない**（口コミ投稿もしない）。
- まず**非公開・架空データ・許諾前提の設計**から始める（Company Brain 3テーブルで実証済みの型: tenantId・label 制限・externalAiAllowed 封印・物理削除禁止・writeAudit・AI mutation禁止をそのまま流用）。
- Case Study は**許諾管理（ConsentRecord 連携等）・匿名化フラグ・公開前承認**の設計とセット。Customer Pain は**高機密ラベル対応（別の重い承認）**の後（doc33・doc50 の評価を維持。監査で矛盾なし）。

## 5. 推奨順序（判定 READY / GO）

1. **推奨1位: Phase 2-C-1 — Case Study / Customer Pain のどちらへ進むかを1つに絞る詳細設計 docs-only**。理由: 品質基盤は主要な穴が塞がり、事業価値側へ戻る好機。ただし個人情報・許諾・公開リスクがあるため**まだ実装しない**。doc50→doc51 の前例どおり「入口レビュー→詳細設計→schema→read-only→書き込み→AI参照」の三段承認型を踏襲。予想: doc33/50 の評価に従えば **Case Study 先行（許諾・匿名化設計とセット）**が有力だが、絞り込み自体を 2-C-1 の設計で確定する。
2. **推奨2位: Stage 2（build の CI 追加）**。理由: 軽量（workflow 数行）で品質基盤をさらに強化できるが、事業価値の前進は小さい。2-C-1 と並行承認も可能。
3. **推奨3位: ★2 権限拒否E2E**。理由: 安全性は上がるが E2E 設計コスト（低権限ユーザーの用意）がある。
4. 以降: Stage 3（設計論点の消化から）・UX改善・GitHub / Obsidian 整備・v5.1 / v5.2 Candidate 整理は、上記と独立に人間選択で随時。

- **実装は別承認**: **Phase 2-C は別承認・Case Study は別承認・Customer Pain は別承認・Stage 2 は別承認・Stage 3 は別承認・★2 は別承認**。
- 変更しないもの: **ENSHiN OS外部発信なし・Phase 8なし・MCP/API公開なし**・externalAiAllowed true UI なし・高機密ラベル解禁なし（2-C-1 設計の中で必要性を評価するのみ）。

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「Case/Pain 未実装・重複なし」→ git ls-files＋schema grep 実測 ②「評価順序の根拠」→ doc33 §33-49行・doc50 §比較表（実物確認・矛盾なし）③「品質ゲート4段稼働」→ doc69（利用者実測記録）④「docs/10_obsidian 未存在」→ ls 実測。
**Assumption Log**: 2-C-1 で Case Study 先行が有力という予想は doc33/50 の既存評価に基づく（確定は 2-C-1 の設計と人間判断）。
**Unknowns Log**: ①Case Study の許諾管理の粒度（既存 ConsentRecord をどこまで流用できるか＝2-C-1 で read-only 調査）②Customer Pain に必要な高機密ラベル対応の重さ（別の重い承認）。
**Risk Register**: 最大リスクは Case/Pain 領域の**PII・許諾・公開事故**（重大度高）→ 対応: 本レビューで「非公開・架空・許諾前提の設計から」を絶対条件として先に固定した（§4）。
**Definition of Done**: 現在地整理 ✅／8候補比較 ✅／推奨順序と1位明記 ✅／安全条件の固定 ✅／commit ✅／push ⏳（別承認）。

## 7. 次回Claude Codeに渡す推奨プロンプト案

> Phase 2-C-1 — Case Study / Customer Pain の絞り込み詳細設計（docs-only・doc71）。①既存 ConsentRecord・SuppressionList・labels の read-only 調査 ②Case Study 先行案の設計（許諾管理・匿名化フラグ・公開前承認・非公開/架空データ前提・Company Brain の安全の型を流用した field 案）③Customer Pain を後続に残す理由の明文化 ④三段承認計画（schema→read-only→書き込み→AI参照は各別承認）。実装なし・schema変更なし・commit-only・push別承認。
