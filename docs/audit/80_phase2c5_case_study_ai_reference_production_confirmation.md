# 80. Phase 2-C-5-PROD — CaseStudy AI参照 本番確認（利用者実測・判定 GO）

> Phase 2-C-5（CaseStudy AI参照の最小実装・doc79）の本番確認記録。対象 commit `6d656a3323b4c6deee3eb5f2b27432c0b685c0b9`（=`6d656a3`）。
> **docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- **AI が本番で顧客事例を参照できることを、利用者自身の画面実測で確認**しました。手順は「架空・匿名の事例を1件作成 → そのタイトルでナレッジ検索 → AI の回答と参照元に事例タイトルが表示 → AI参照の記録（**entityType=CaseStudy**）を確認 → テスト事例を**アーカイブで片付け済み**」の1周です。
- 読めるのは設計どおり **anonymized=true のみ参照**（匿名化済みだけ）・**publishStatus private のみ**。**sourceNote/customerId/consentRecordId/consentStatus はAIに注入しない**・**外部LLM注入ゼロ**もコード・自動見張りで維持されています。
- 判定: **GO**。**本番確認GO済みプロダクト基準を Phase 2-C-4 / `11e8f51` → Phase 2-C-5 / `6d656a3` へ昇格**します。
- これで顧客事例も「人間が書き・AIが読み（匿名化済みのみ）・読んだら記録・外部AIには出ない」の完全な型に到達し、**会社の頭脳4テーブルの AI 参照体制が本番で確認済み**になりました。**Phase 2-C 完了判定は人間判断**（次の承認）です。

## 2. §0 利用者実測値（2026-07-05・チャット提出・申告値そのまま記録）

| 項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人（**利用者実測**） |
| Vercel Production 最新 deploy | **Vercel Ready** |
| Vercel latest commit | **`6d656a3`**（一致） |
| Vercel build | **build green** |
| GitHub Actions / CI | **CI green**・最新 run `6d656a3`・失敗なし |
| **本番ログイン** | OK |
| **架空・匿名**の顧客事例を1件作成 | OK（実在顧客名なし・成果数値なし・顧客の声なし） |
| そのタイトルで**ナレッジ検索** | OK・AIの回答表示 OK |
| 「**参照した会社の頭脳**」に **CaseStudyタイトル表示** | OK |
| /admin/data-access-logs に **ai_reference** 記録 | OK・**entityType=CaseStudy** |
| テスト事例の**アーカイブ**片付け | OK（**アーカイブで片付け済み**） |
| **externalAiAllowed true UI なし** | 確認済み |
| **publishStatus UI なし** | 確認済み |
| **既存主要画面無回帰** | OK |
| 利用者判定 | **GO** |
| 補足 | なし |

- **AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（上記はすべて利用者自身の画面実測の申告値）。

## 3. 判定と根拠

**判定: GO**（§0 の GO 条件をすべて充足）

1. Vercel Ready・latest commit `6d656a3`・build green・CI green（安全境界検査=CaseStudy 参照条件の機械検査込み→test 222→typecheck→lint） ✅
2. **AI 参照の end-to-end が本番で成立**: 作成（架空・匿名）→ 検索 → AI回答 → 参照元表示 → **ai_reference（entityType=CaseStudy）レコード記録** ✅
3. 参照条件は実装＋自動見張りで維持: **anonymized=true のみ参照・publishStatus private のみ**・NORMAL/INTERNAL のみ・**外部LLM注入ゼロ**（externalAiAllowed ゲート・全件 false=構造的ゼロ） ✅
4. externalAiAllowed true UI なし・publishStatus UI なし ✅・既存主要画面無回帰 ✅
5. テストデータは架空のみ・アーカイブ片付け済み＝**本番に実顧客情報は存在しないまま** ✅・利用者実測である ✅

- **本番確認GO済みプロダクト基準を Phase 2-C-4 / `11e8f51` → Phase 2-C-5 / `6d656a3` へ昇格**する。

## 4. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番 AI 参照1周」→ §2 の利用者実測（2026-07-05 申告・チャット提出。初回ミッションは §0 テンプレート未記入のため Scout のみで一度停止→記入済み提出で確定）②「参照条件の維持」→ doc79（実装 where 句＋safety gate 機械検査4件＋smoke 21/21）③「push 済み 3ref 一致」→ 前 push-only ミッションの確認結果 ④「記録の仕組み」→ doc44 以来の writeAIDataAccess／2-B-5・2-C-5 で entityType 拡張が自動追随。
**Assumption Log**: consentStatus は当面申告値（**ConsentRecord連携は別承認**・連携後に anonymized=false の参照可否を再設計=doc78 §4）。FakeLLM 運用継続（実LLM解禁は別の重い承認）。
**Unknowns Log**: ①ConsentRecord 連携の設計詳細（別承認）②**Customer Painは別承認**（高機密ラベル対応が先）③**Phase 2-C 完了判定は人間判断**（次の承認で doc81 候補）。
**Risk Register**: 残リスク低。実名寄り事例の AI 混入は「設計→実装→自動検証→本番実測」の全段で遮断確認済み。本番の CaseStudy テーブルは空のまま（テスト事例はアーカイブ済み・アーカイブは AI 参照対象外）。
**Definition of Done**: §0 実測値の受領と検証 ✅／Scout 一致（doc80 未存在・doc14 最新 §54）✅／doc80 作成 ✅／doc14 §55 追記 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／基準昇格の記録 ✅／commit ✅／push ⏳（別承認）。

## 5. 次回Claude Codeに渡す推奨プロンプト案

> doc80 記録 commit の push-only（feature→main・fast-forward・別承認）。その後の人間判断: ①**Phase 2-C 完了判定（Phase 2-C-CLOSE・doc81 候補）** — 2-C-1〜2-C-5 の全段本番GOを完了条件と照合して正式クローズ（2-B-CLOSE/doc62 と同じ型・doc14 追記の扱いは A案前例）②ConsentRecord 連携設計（別承認）③Stage 2 / Stage 3 / ★2 / UX改善（随時）。

## 6. 判定

**GO** — Phase 2-C-5 は本番確認まで完全クローズ。GO済み基準は **Phase 2-C-5 / `6d656a3`** へ昇格。**Phase 2-C 完了判定は人間判断**・**ConsentRecord連携は別承認**・**Customer Painは別承認**・高機密・実LLM・外部公開はすべて別承認のまま。
