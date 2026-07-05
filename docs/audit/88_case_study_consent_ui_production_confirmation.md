# 88. CaseStudyConsent UI-PROD — 許諾台帳UI 本番確認（利用者実測・判定 GO）

> CaseStudyConsent 台帳UI（doc87・doc86 準拠実装）の本番確認記録。対象 commit `1913456e4ffd18fb6cd376cf500cd99fee720c4a`（=`1913456`）。
> **docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- **許諾台帳UIが本番で1周動くことを、利用者自身の画面実測で確認**しました。手順は「**架空・匿名**の顧客事例を1件作成 → 編集画面の「**許諾台帳**」→ 許諾の**登録**（用途1つ以上・証跡は所在説明のみ・許諾日と有効期限を入力）→ 一覧に反映 → 詳細表示 → **取り消し**（行が残って取り消し済み表示）→ テスト事例の**アーカイブ片付け**」です。
- 証跡ガイド（原本本文・メール本文・個人情報を貼らない）も本番画面で表示を確認。登録・取り消しは人間のみで **writeAudit** に記録され、**物理削除禁止**（取り消しても履歴が残る）が本番でも成立しています。
- 判定: **GO**。**本番確認GO済みプロダクト基準を CaseStudyConsent schema / `812ae69` → CaseStudyConsent UI / `1913456` へ昇格**します。
- 変わっていないこと: **CaseStudyConsent は AI 文脈へ注入しない**・**AI参照条件変更なし**（AIが読める顧客事例は匿名化済みだけ）・**anonymized=false は未解禁**・外部公開なし。突合判定（許諾の真正性確認）は次の別承認です。

## 2. §0 利用者実測値（2026-07-05・チャット提出・申告値そのまま記録）

| 項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人（**利用者実測**） |
| Vercel Production 最新 deploy | **Vercel Ready** |
| Vercel latest commit | **`1913456`**（一致） |
| Vercel build | **build green** |
| GitHub Actions / CI | **CI green**・最新 run `1913456` |
| 本番ログイン・既存主要画面無回帰 | OK |
| 顧客事例画面 `/brain/case-studies` | OK |
| **架空・匿名**の顧客事例を1件作成 | OK（実在顧客名なし・成果数値なし・顧客の声なし: はい） |
| 編集画面の「**許諾台帳**」リンク → 台帳画面 → 登録画面 | すべて OK |
| **証跡ガイド表示**（所在説明のみ・原本/PII を貼らない旨） | OK |
| 許諾**登録**テスト（用途1つ以上・証跡は所在説明のみ・許諾日・有効期限入力） | OK |
| 一覧への反映・詳細表示 | OK |
| **取り消し**テスト | OK（**行が残り取り消し済み表示: はい**＝物理削除禁止が本番で成立） |
| テスト事例の**アーカイブ片付け** | OK |
| **externalAiAllowed true UI なし** | 確認済み |
| **publishStatus UI なし** | 確認済み |
| 外部公開 / PR / SEO / SNS / 顧客の声公開 UI | なし |
| 本番DB直接確認なし・AI 非確認の理解 | はい / はい |
| 利用者判定 | **GO** |
| 補足 | なし |

- **AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（上記はすべて利用者自身の画面実測の申告値）。

## 3. 判定と根拠

**判定: GO**（§7 の GO 条件をすべて充足）

1. Vercel Ready・latest commit `1913456`・build green・CI green（安全ゲート=CaseStudyConsent 検査込み→test 230→typecheck→lint） ✅
2. **台帳の end-to-end が本番で成立**: 架空・匿名事例の作成 → 台帳リンク → 登録 → 一覧反映 → 詳細 → 取り消し（行が残る）→ アーカイブ片付け ✅
3. 安全境界が本番でも維持: 証跡ガイド表示・**writeAudit**（人間の操作のみ・記録つき）・**物理削除禁止**・externalAiAllowed true UI なし・publishStatus UI なし・公開系 UI なし ✅
4. テストデータは架空のみ・片付け済み＝**本番に実顧客情報は存在しないまま**（台帳の残行も架空事例の取り消し済み記録のみ） ✅
5. 利用者実測である・本番DB直接接続なし ✅

- **本番確認GO済みプロダクト基準を CaseStudyConsent schema / `812ae69` → CaseStudyConsent UI / `1913456` へ昇格**する（旧基準は歴史的基準として保持）。

## 4. できるようになったこと / 変わっていないこと / 後続送り

**できるようになったこと**: 本番で、許諾が取れた事例について「いつ・何の用途で・いつまで・証跡はどこにあるか」を人間だけが記録・取り消しでき、すべて監査ログに残せる。

**変わっていないこと**: **CaseStudyConsent は AI 文脈へ注入しない**（安全ゲートで恒久機械検査）・**AI参照条件変更なし**（**ConsentRecord連携までは anonymized=true のみAI参照**）・**anonymized=false は未解禁**・**外部公開なし**・**PR配信なし**・**SEOページ公開なし**・**SNS投稿なし**・**顧客の声公開なし**・**実LLMなし**・**外部送信なし**・**AIコストなし**。

**後続送り（いずれも別承認）**: 突合判定（doc83 §9 段階3・validateCaseStudyConsent 拡張＝granted の真正性を台帳で機械確認）→ その後に anonymized=false の解禁判断 → さらに後に公開活用（ApprovalRequest・表現審査）。Customer Pain・高機密ラベル・Stage 2・3・★2・UX も別承認。

**やらなかったこと**: 本番DB直接接続・本番deploy手動実行・UI追加修正・突合判定・doc14 以外の記録改変（追記のみ）。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番の台帳1周」→ §2 の利用者実測（2026-07-05 申告・チャット提出。初回ミッションは §0 未記入のため Scout のみで一度停止 → 完全記入の提出で確定）②「安全境界の実装根拠」→ doc87（actions 実装＋安全ゲート機械検査＋否定系テスト8本＋smoke 22/22）③「AI 非注入」→ 本ミッションの grep 再実測（company-brain-reference に CaseStudyConsent 参照 0件）④「push 済み 3ref 一致」→ 前 push-only ミッションの確認結果＋本 Scout。
**Assumption Log**: ①writeAudit の記録は実装＋ローカル実測（doc87）を根拠とし、本番の監査ログ画面の目視は §0 の必須項目に含めなかった（操作が全部成功したこと＝action 経由＝記録済み）②FakeLLM 運用継続。
**Unknowns Log**: ①突合判定の実装詳細（doc83 §9 段階3・別承認）②revoke 理由欄の要否（将来判断）③台帳の運用ルール文書化（人間判断）。
**Risk Register**: 残リスク低。本番の台帳には架空事例の取り消し済み行のみ・実顧客情報なし。証跡欄への PII 貼り付けはガイド表示を本番確認済み＋運用担保。「台帳=実名解禁」の誤解は本書 §4 で遮断。
**Definition of Done**: §0 実測値の受領と検証 ✅／Scout 一致（doc88 未存在・doc14 最新 §57）✅／read-only 監査 ✅／doc88 作成 ✅／doc14 §58 追記 ✅／CURRENT_STATE（基準昇格）・PROGRESS・vault 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc88 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断（いずれも別承認・いきなり実装しない）: **突合判定の設計・実装判断**（doc83 §9 段階3・validateCaseStudyConsent 拡張＋否定系テスト＋安全ゲート・granted＋有効な台帳行＋非失効＋用途明示の機械判定）／Customer Pain の扱い判断（高機密が先）／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別承認なしに進まない。

## 7. 判定

**判定: GO** — CaseStudyConsent UI は本番確認まで完全クローズ。**本番確認GO済みプロダクト基準は CaseStudyConsent UI / `1913456`**（前基準 CaseStudyConsent schema / `812ae69` は歴史的基準として保持）。突合判定・**anonymized=false は未解禁**・公開活用・高機密・実LLM・外部送信はすべて別承認のまま。
