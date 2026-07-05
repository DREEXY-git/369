# 85. Phase 2-C-Consent-Schema-PROD — CaseStudyConsent schema 本番確認（利用者実測・判定 GO）

> CaseStudyConsent schema 追加（doc84・schema-only）の本番確認記録。対象 commit `812ae6972576137e33aee642418ebdd00e737a60`（=`812ae69`）。
> **docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例の**許諾台帳の器（CaseStudyConsent schema）が本番に問題なく反映**されたことを、利用者自身の画面実測で確認しました。Vercel Ready・build green（=**追加のみ migration** の適用成功を build 成功で判定する前例の枠組み）・CI green・既存画面ふだんどおり。
- **CaseStudyConsent の画面や登録ボタンはどこにも無い＝正常**です（**schema-only のため画面なしが正常**。器だけを足したので、UI 未実装・書き込み経路ゼロ・本番の台帳テーブルは空のまま）。
- 判定: **GO**。**本番確認GO済みプロダクト基準を Phase 2-C-5 / `6d656a3` → CaseStudyConsent schema / `812ae69` へ昇格**します。
- 安全状態は不変: **anonymized=false は未解禁**・**ConsentRecord連携までは anonymized=true のみAI参照**・外部公開なし。次の台帳UI・突合判定は人間の別承認です。

## 2. §0 利用者実測値（2026-07-05・チャット提出・申告値そのまま記録）

| 項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人（**利用者実測**） |
| Vercel Production 最新 deploy | **Vercel Ready** |
| Vercel latest commit | **`812ae69`**（一致） |
| Vercel build | **build green** |
| GitHub Actions / CI | **CI green**（最新 run green） |
| 本番ログイン〜主要画面 | ふだんどおり（**既存主要画面無回帰**） |
| 顧客事例画面 `/brain/case-studies` | 開く（OK） |
| **CaseStudyConsent 画面なし** | OK（「許諾台帳/CaseStudyConsent」の画面・登録ボタンがどこにも無い） |
| CaseStudyConsent 登録画面なし・登録/編集/削除 UI なし | OK |
| **schema-only のため画面なしが正常**であることの理解 | はい |
| **externalAiAllowed true UI なし** | 確認済み |
| **publishStatus UI なし** | 確認済み |
| 外部公開 / PR / SEO / SNS / 顧客の声公開 UI | なし |
| **本番DB直接接続なし**（本番DBを直接確認していない） | はい |
| 利用者判定 | **GO** |
| 補足 | なし（提出は2通のチャットに分割・内容に矛盾なし） |

- **AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（上記はすべて利用者自身の画面実測の申告値）。

## 3. 判定と根拠

**判定: GO**（§6 の GO 条件をすべて充足）

1. Vercel Ready・latest commit `812ae69`・build green（**追加のみ migration**=CREATE TABLE＋INDEX 2本・**破壊的SQLなし**のため、build 成功=migrate deploy 成功の前例枠組み）・CI green ✅
2. 既存主要画面無回帰・`/brain/case-studies` 正常 ✅
3. **CaseStudyConsent 画面なし**・登録画面なし・登録/編集/削除 UI なし＝**UI 未実装**どおりで正常（書き込み経路ゼロ＝本番の台帳テーブルは空のまま） ✅
4. externalAiAllowed true UI なし・publishStatus UI なし・公開系 UI なし ✅
5. 利用者実測である・本番DB直接接続なし ✅

- **本番確認GO済みプロダクト基準を Phase 2-C-5 / `6d656a3` → CaseStudyConsent schema / `812ae69` へ昇格**する（Phase 2-C-5 基準は歴史的基準として保持）。

## 4. 変わらないこと（安全状態の維持）

- **UI 未実装**・**writeAudit は未実装**・**validateCaseStudyConsent 拡張は未実装**（突合判定なし）＝台帳は器だけで誰も書き込めない。
- **anonymized=false は未解禁**・**ConsentRecord連携までは anonymized=true のみAI参照**（AIが読める顧客事例は匿名化済みだけ）。
- **外部公開なし**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・**顧客の声公開なし**・**実LLMなし**・**外部送信なし**・**AIコストなし**・高機密ラベルなし・Customer Pain なし・Phase 8 なし・ENSHiN OS 外部発信なし。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番反映 OK」→ §2 の利用者実測（2026-07-05 申告・チャット2通で提出。初回・再送はテンプレート未記入のため Scout のみで2度停止 → 分割提出で全項目確定）②「追加のみで安全」→ doc84＋migration.sql の destructive grep 0（本ミッションでも再実測）③「画面なしが正常」→ doc84 §5（UI 未実装・書き込み経路ゼロ）④「push 済み 3ref 一致」→ 前 push-only ミッションの確認結果＋本 Scout。
**Assumption Log**: ①build green=migrate deploy 成功の前例枠組み（migrate ログ自体は直接未確認・2-C-2-PROD 以来の扱い）②FakeLLM 運用継続。
**Unknowns Log**: ①台帳 UI の権限 action 具体設計（UI 承認時）②突合判定の実装詳細（doc83 §9 段階3）③台帳運用ルールの文書化要否（人間判断）。
**Risk Register**: 残リスク低。器のみ・書き込み経路ゼロ・破壊的SQLゼロ・既存テーブル無変更のため、本番挙動への影響は構造的に無い。次点=「器=連携済み」の誤解 → 本書 §4 で「未実装・未解禁」を明記。
**Definition of Done**: §0 実測値の受領と検証 ✅／Scout 一致（doc85 未存在・doc14 最新 §56）✅／read-only 監査（doc84・migration・schema・CURRENT_STATE）✅／doc85 作成 ✅／doc14 §57 追記 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／基準昇格の記録 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc85 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **台帳 UI の承認判断**（doc83 §9 段階2・人間のみ・writeAudit・REGISTRATION_PERMISSION_POLICY=HUMAN_KNOWLEDGE_UPDATE_ONLY）／**突合判定の承認判断**（段階3・validateCaseStudyConsent 拡張＋否定系テスト＋安全ゲート）／Customer Pain（高機密が先）／Stage 2・3・★2・UX／品質基盤強化。

## 7. 判定

**判定: GO** — CaseStudyConsent schema は本番確認まで完全クローズ。**本番確認GO済みプロダクト基準は CaseStudyConsent schema / `812ae69`**（前基準 Phase 2-C-5 / `6d656a3` は歴史的基準として保持）。台帳UI・突合判定・**anonymized=false は未解禁**のまま、すべて後続の個別人間承認。
