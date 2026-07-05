# CaseStudyConsent schema 本番確認 — 許諾台帳の器が本番に入った（GO・画面なしが正常）

> 出典（正本）: `369` リポジトリ `docs/audit/85_case_study_consent_schema_production_confirmation.md`（判定 GO・doc14 §57）。本ノートはその要約。
> 関連: [[CaseStudyConsentSchema]] / [[ConsentRecord連携器選択]] / [[ConsentRecord連携設計]]

## 何を確認したか（利用者自身の画面実測・2026-07-05）

- Vercel Ready・対象コミット `812ae69`・build green（追加だけの変更なので build 成功＝データベース反映成功の判定枠組み）・CI green。
- 本番にログインして主要画面はふだんどおり・「顧客事例」も正常。
- **「許諾台帳/CaseStudyConsent」の画面や登録ボタンはどこにも無い＝正常**（今回はデータベースの器だけを足したため）。
- AI が Vercel / GitHub Actions / 本番を直接確認したものではない。

## 何が変わったか

- 判定 **GO**: 許諾台帳の器は本番確認まで完全クローズ。**GO済み基準は CaseStudyConsent schema / `812ae69` へ昇格**。
- ただし器だけ: **台帳UIと突合判定はまだ無い**＝誰も書き込めず、本番の台帳は空のまま。**anonymized=false は未解禁**で、AIが読む顧客事例は匿名化済みだけ（変わらず）。

## 次の一手（すべて別承認・人間判断）

1. この記録（doc85）の push
2. 台帳 UI の承認判断（人間のみ・記録つき）→ 突合判定の承認判断（「許諾あり」を台帳で本物と確認する仕組み）
3. Customer Pain / Stage 2・3・★2・UX / 品質基盤強化 は随時

## 現在地

現在地は `369` の `tasks/CURRENT_STATE.md`＋git refs を正とする。
