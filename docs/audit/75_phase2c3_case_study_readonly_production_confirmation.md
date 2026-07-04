# 75. Phase 2-C-3-PROD — CaseStudy read-only 本番確認（利用者実測・判定 GO）

> Phase 2-C-3（CaseStudy read-only 画面＋架空 seed・doc74）の本番確認記録。対象 commit `408857ddd7f9e9d905933ea5edb1aef13a5bc6fa`。
> **docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLMなし・AIコストなし・Phase 8なし・ENSHiN OS外部発信なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例（Case Study）の閲覧専用画面が、**本番で正しく動いていることを利用者自身の画面実測で確認**しました。ナビに「顧客事例」が表示され、画面が開けます。
- 一覧は**空表示（EmptyState）でしたが、これは正常**です。本番にはデモデータを投入していないためで、架空4件はローカル検証用の seed だけに入っています（seed投入済みなら架空4件が正常であること も doc74 で定義済み）。
- **作成ボタンなし・編集ボタンなし・アーカイブボタンなし**も本番で確認済み＝**書き込み経路ゼロ**が本番でも成立。既存画面はすべて普段どおりでした。
- 判定: **GO**。本番確認GO済みプロダクト基準を **Phase 2-C-3 / `408857d`** へ昇格します。

## 2. §0 利用者実測値（2026-07-05・チャット提出・申告値そのまま記録）

| 項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人（**利用者実測**） |
| Vercel Production 最新 deploy | **Ready**（OK） |
| Vercel latest commit | **`408857d`**（一致） |
| Vercel build | **build green** |
| GitHub Actions / CI | **CI green**・最新 run（408857d）失敗なし |
| 本番ログイン | OK |
| ナビ「顧客事例」表示 | OK |
| `/brain/case-studies` 画面表示 | OK |
| 一覧表示 | **空表示（EmptyState）＝本番 seed 未投入のため正常**（初回提出で二択が未選択のため一度停止し、追補「一覧は空表示でした」で確定） |
| **作成ボタンなし** | OK |
| **編集ボタンなし** | OK |
| **アーカイブボタンなし** | OK |
| 既存主要画面無回帰 | OK |
| 利用者判定 | **GO** |

- **AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（上記はすべて利用者自身の画面実測の申告値）。

## 3. 判定と根拠

**判定: GO**（§0 の GO 条件をすべて充足）

1. Vercel Ready・latest commit `408857d`・build green ✅
2. CI green（安全境界検査→test 216→typecheck→lint の4段） ✅
3. ナビ「顧客事例」＋ `/brain/case-studies` が本番表示（2-B-3 のようなナビHOLDは今回発生せず） ✅
4. 一覧の **EmptyState** は本番 seed 未投入時の定義済み正常状態（doc74 §6 Assumption どおり） ✅
5. 作成/編集/アーカイブボタンなし＝**書き込み経路ゼロ**（**Server Actionなし・writeAuditなし・AI参照なし・externalAiAllowed true UIなし**）が本番でも成立 ✅
6. 既存主要画面に無回帰 ✅・利用者実測である ✅

- **本番確認GO済みプロダクト基準を Phase 2-C-2 / `b012bd0` から Phase 2-C-3 / `408857d` へ昇格**する。
- 本番の CaseStudy テーブルは空のまま＝実顧客情報は本番に1件も存在しない（顧客名・成果数値・顧客の声は許諾なしに扱わない運用が「データが無い」という最も強い形で成立）。

## 4. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番表示・ボタン不在・無回帰」→ §2 の利用者実測（2026-07-05 申告・チャット提出・1項目の追補込み）②「EmptyState が正常」→ doc74 §6 Assumption（seed は本番で自動実行されない）＋画面実装の EmptyState 分岐 ③「push 済み・3ref 一致」→ push-only ミッションの push後確認（3ref=`408857d`）④「書き込み経路ゼロ」→ doc74（actions.ts 不存在・smoke 19本目で UI 0件を機械確認）。
**Assumption Log**: 本番デモデータの投入は今後も運用判断（投入する場合も架空データのみ・実顧客情報は許諾と 2-C-4 の制御実装まで入れない）。
**Unknowns Log**: ①本番で架空デモ4件を表示した状態の見え方（投入は任意・必須ではない）②2-C-4 の書き込み設計詳細（consentStatus=granted を前提とする匿名化解除・writeAudit・静的安全ゲートの CaseStudy 拡張）。
**Risk Register**: 残リスクは極小。本番テーブルは空・書き込み経路ゼロで、実顧客情報の混入・公開事故は構造的に不可能。次段 2-C-4 で初めて書き込みが生まれるため、そこで許諾/匿名化の前提条件制御・writeAudit・否定系テスト・静的ゲート拡張をセットで設計する（別承認）。
**Definition of Done**: §0 実測値の受領と検証（1項目残存で一度停止→追補で確定）✅／Scout 一致 ✅／doc75 作成 ✅／doc14 §53 追記 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／基準昇格の記録 ✅／commit ✅／push ⏳（別承認）。

## 5. 次回Claude Codeに渡す推奨プロンプト案

> doc75 記録 commit の push-only（feature→main・fast-forward・別承認）。その後 **Phase 2-C-4 — CaseStudy 人間書き込み（doc76 候補）** の承認判断: 作成・編集・アーカイブの Server Action 3操作（2-A-3b/2-B-4 の実証済みの型を流用）＋AI mutation禁止（shared isHumanUser）＋writeAudit 3操作＋label 2択制限＋externalAiAllowed 封印＋**匿名化解除は consentStatus=granted を前提条件に機械拒否**＋入力ガイド（顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない）＋否定系テスト＋静的安全ゲートの CaseStudy 拡張＋smoke 追加。

## 6. 判定

**GO** — Phase 2-C-3 は本番確認まで完全クローズ。GO済み基準は **Phase 2-C-3 / `408857d`** へ昇格。2-C-4 書き込み・2-C-5 AI参照・Customer Pain・高機密・公開機能はすべて別承認。
