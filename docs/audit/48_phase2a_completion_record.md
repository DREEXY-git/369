# 48. Phase 2-A 完了記録 — Company Brain foundation（判定 GO）

> docs-only / Phase 2-A 全体クローズ判定の記録。**コード・DB・schema・migration の変更は一切なし。**
> フェーズ: Phase 2-A-CLOSE / 現在位置は git refs を正とする。
> **判定: Phase 2-A-CLOSE 判定 GO（2026-07-04）。**

---

## 1. 非エンジニア向け要約

- **Company Brain foundation（会社の頭脳の基盤）が完了しました。**
- できるようになったこと: **会社方針と商品カタログを人間が育てられる**（作成・編集・アーカイブ）。**AIが安全に読める**（ナレッジ検索で回答材料に使う）。**読んだ記録が残る**（レコードごとの ai_reference ログ）。
- これらすべてが**本番確認までGO済み**です（途中2回の HOLD も、消さずに追記で解消済み）。
- 当初スコープ（doc31 入口条件・doc33 設計の「先行2テーブル」）と照合し、矛盾はありません。**Phase 2-A はクローズ可能** — 判定 GO。

## 2. Phase 2-A の目的（当初スコープ）

- **Company Brain の器**を作る: 会社の方針・商品知識を「AIが読める形」で蓄積する基盤（doc31 §5・doc33）。
- 先行2テーブル: **CompanyPolicy（会社方針）／ProductCatalogItem（商品カタログ）**（PII近接度の低い順に薄く積む。Case Study 等の3テーブルは後続候補）。
- 段階: **read-only 可視化 → 人間書き込み → AI参照**の三段を、それぞれ個別人間承認＋本番確認で進める。
- 記録: AI が読んだら **ai_reference ログ**を残す。**外部送信しない安全境界**（externalAiAllowed=false 固定・外部LLMゲート）を保つ。

## 3. 実績一覧（doc33〜47）

| 段階 | 内容 | 実装/記録 | 本番確認 |
|---|---|---|---|
| 2-A-1 設計 | schema 設計案（2テーブル先行・三段承認） | doc33 | —（docs-only） |
| 2-A-2 schema | CompanyPolicy／ProductCatalogItem テーブル追加（`ca18450`） | doc34 | **GO**（doc35・§38） |
| 2-A-3a read-only | seed デモデータ＋一覧2画面＋ナビ（`9533488`） | doc36 | 一度 HOLD（doc37・§39）→ **再実測GO**（doc38・§40） |
| 2-A-3b-1 会社方針 write | 作成・編集・アーカイブ（`9eea086`）＋安全補正（`706358e`） | doc39・doc40 | **GO**（doc41・§41） |
| 2-A-3b-2 商品カタログ write | 同型の3操作・安全境界組み込み済み（`aa40f2f`） | doc42 | **GO**（doc43・§42） |
| 2-A-3c-1 AI参照設計 | 参照範囲・外部LLMゲート・ai_reference 粒度の設計 | doc44 | —（docs-only） |
| 2-A-3c-2 AI参照実装 | ナレッジ検索への参照注入＋レコードごと ai_reference（`85f1bf3`） | doc45 | 一度 HOLD（doc46・§43）→ **HOLD解消・再実測GO**（doc47・§44） |

- HOLD記録（doc37・doc46）は**消さず・上書きせず**、解消記録（doc38・doc47）の追記で閉じた（追記主義）。

## 4. 最新GO済み基準

- 最新の本番確認GO済みプロダクト基準: **Phase 2-A-3c-2 / `85f1bf3`**。
- `700f79e` は HOLD記録・`ce7b5e9` は **HOLD解消GO記録の docs commit**（アプリ実装基準ではない）。本 doc48 の commit も記録反映 commit であり、**アプリ実装基準は `85f1bf3`**。
- 現在の HEAD・origin/main 等の現在位置は **git refs を正**とする。

## 5. 安全境界（Phase 2-A 完了時点）

- **AI mutation なし**: AIロールは会社方針・商品カタログの作成・編集・アーカイブを actions 層で一律拒否（rbac.ts 無変更のまま人間専用化）。
- **物理削除なし**: delete/deleteMany 不使用。アーカイブは archivedAt のソフト処理のみ。
- **externalAiAllowed true UI なし**: create は false 固定・update 不変更 → **外部LLM送信解禁なし**（外部LLM時は externalAiAllowed=true＋maskText のみ注入＝現状構造的にゼロ）。
- **高機密ラベル未対応**: 扱えるのは **NORMAL / INTERNAL のみ**（高機密は後続の個別承認まで保留）。
- **writeDataAccess / ai_reference あり**: AI が参照したレコードごとに機密参照ログを記録。
- **tenantId スコープ**: 全クエリでテナント分離。
- **Phase 8（課金）なし・ENSHiN OS 外部発信なし・外部送信なし**。

## 6. HOLD からの学び

- **2-A-3a**: 本番反映/キャッシュ系の HOLD → ハードリロード再実測で GO（doc37→doc38）。
- **2-A-3c-2**: seed 前提のデータ差による HOLD → 本番UIでデータ作成後の再実測で GO（doc46→doc47）。コードのバグは1件もなかった。
- 教訓: **本番確認は本番に実在するデータで行う**（ローカルのデモデータ前提で確認項目を設計しない）。HOLD は失敗ではなく、慌てて修正して壊すことを防ぐ安全装置として機能した。

## 7. Phase 2-A でやっていないこと（後続送り・別承認）

以下は Phase 2-A の必須スコープ外として後続に送る（**いずれも個別人間承認なしに着手しない**）:

- 高機密ラベル解禁（CONFIDENTIAL 以上の Company Brain 取り扱い）
- externalAiAllowed true UI
- 外部LLM送信解禁（= 3c-5 の重い承認）
- 3c-5 そのもの（外部LLM・高機密の解禁判断）
- 後続3テーブル（Case Study / Customer Pain / Sales Playbook・doc33 の次段候補）
- **Phase 8（実課金・Stripe・usage billing）**
- MCP/API公開
- **ENSHiN OS 外部発信・口コミ投稿・SNS投稿・顧客の声公開・推薦コメント掲載・社長/会社ブランディング投稿・紹介依頼送信**

## 8. 判定

- **Phase 2-A-CLOSE 判定: GO（2026-07-04）。**
- 完了基準: 最新本番確認GO済みプロダクト基準 **Phase 2-A-3c-2 / `85f1bf3`**（前基準 Phase 2-A-3b-2 / `aa40f2f` は履歴として保持）。
- 判定根拠: doc31 入口条件・doc33 設計スコープとの照合で、先行2テーブルの「器 → 可視化 → 人間書き込み → AI参照 → 本番確認GO」がすべて証拠付きで完了（§3 の表）。未完了項目はすべて設計時点からのスコープ外（§7）として整理可能。

## 9. 次アクション候補（いずれも別承認・人間が選択）

1. 本 doc48 commit の main 反映（push-only・別承認）。
2. **Phase 2-B へ進む**（Company Brain 後続3テーブル等・要スコープ設計）。
3. **Phase X-04**: 本番スモーク定型化・検証準備 script 化（今回の「本番に実在するデータで確認する」教訓の反映先候補）。
4. **3c-5 を別承認で判断**（外部LLM送信解禁・高機密対応の重い承認）。
5. **ENSHiN OS 資料提供 / 設計統合**（外部発信はしない。下書き・承認フロー・許諾管理・ログの範囲）。
