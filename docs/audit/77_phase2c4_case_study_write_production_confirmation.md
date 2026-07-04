# 77. Phase 2-C-4-PROD — CaseStudy 人間書き込み 本番確認（利用者実測・判定 GO）

> Phase 2-C-4（CaseStudy 人間書き込み・doc76）の本番確認記録。対象 commit `11e8f514664e1a1b27f40871b644ba6b036544bf`（=`11e8f51`）。
> **docs-only・code/schema/migration/seed 変更なし・本番DB直接接続なし・外部送信なし・実LLMなし・AIコストなし・外部公開なし・PR配信なし・SEOページ公開なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例の**書き込み（作成・編集・アーカイブ）が本番で動くことを、利用者自身が1周実測**しました。テストは架空・匿名の内容のみで行い、アーカイブで片付け済みです。
- いちばん重要な確認は**許諾の門番**: 許諾状態が「許諾あり」ではないまま匿名化チェックを外して保存したら、**本番でもきちんと拒否されました**。「許諾なしに顧客情報を扱わない」約束が、本番の機械制御として実際に働いています。
- 外部AI送信や公開を許可する入力欄が無いこと、既存画面が普段どおりであることも確認済みです。
- 判定: **GO**。本番確認GO済みプロダクト基準を **Phase 2-C-4 / `11e8f51`** へ昇格します。

## 2. §0 利用者実測値（2026-07-05・チャット提出・申告値そのまま記録）

| 項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人（**利用者実測**） |
| Vercel Production 最新 deploy | **Vercel Ready** |
| Vercel latest commit | **`11e8f51`**（一致） |
| Vercel build | **build green** |
| GitHub Actions / CI | **CI green**・最新 run `11e8f51`・失敗なし |
| 本番ログイン | **本番ログイン OK** |
| ナビ「顧客事例」表示 | OK |
| `/brain/case-studies` 表示 | OK |
| 新規作成画面 | OK |
| 作成テスト | **作成 OK**（内容は架空・匿名・実在顧客名なし・成果数値なし・顧客の声なし: はい） |
| 編集テスト | **編集 OK** |
| アーカイブテスト | **アーカイブ OK**（アーカイブ後に一覧から消えた: はい） |
| 匿名化解除拒否テスト | **許諾なし匿名化解除拒否 OK**（許諾状態が「許諾あり」ではない状態で匿名化チェックを外して保存し、拒否された: はい） |
| externalAiAllowed true UI | **なし** |
| publishStatus UI | **なし** |
| 既存主要画面無回帰 | OK |
| 利用者判定 | **GO** |
| 補足 | なし（任意欄・記入なし） |

- **AI が Vercel / GitHub Actions / 本番を直接確認したものではない**（上記はすべて利用者自身の画面実測の申告値）。

## 3. 判定と根拠

**判定: GO**（§0 の GO 条件をすべて充足）

1. Vercel Ready・latest commit `11e8f51`・build green・CI green（安全境界検査 4actions→test 222→typecheck→lint） ✅
2. 書き込み1周（作成→一覧反映→編集→アーカイブ→一覧から消える）が本番で成立 ✅ — 各操作は **writeAudit** で監査ログに記録され、**AI mutation禁止**・**tenantId スコープ**・**publishStatus private固定**・**externalAiAllowed false固定**・物理削除禁止（アーカイブのみ）の実装（doc76）がそのまま本番で稼働。
3. **許諾の門番が本番で実証**: consentStatus が granted でない状態での匿名化解除が拒否された ✅（doc76 の shared 純粋判定＋否定系テスト6本＋静的安全ゲートで恒久固定済みの挙動が、本番の実測でも確認された）。
4. externalAiAllowed true UI なし・publishStatus UI なし ✅（封印の実測確認）。
5. 既存主要画面に無回帰 ✅・テストデータは架空のみでアーカイブ済み（本番に実顧客情報は存在しないまま） ✅・利用者実測である ✅。

- **本番確認GO済みプロダクト基準を Phase 2-C-3 / `408857d` → Phase 2-C-4 / `11e8f51` へ昇格**する。
- これで**会社の頭脳4テーブル（会社方針・商品カタログ・営業プレイブック・顧客事例）すべてが「人間が書き・AIは書けない・消せない・記録が残る」体制で本番稼働**。顧客事例のみ「許諾なしに実名に近づけない」門番が追加で働く。

## 4. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番書き込み1周＋匿名化拒否」→ §2 の利用者実測（2026-07-05 申告・チャット提出。初回ミッションは §0 テンプレート未記入のため Scout のみで一度停止→記入済み提出で確定）②「拒否の実装根拠」→ doc76（validateCaseStudyConsent・否定系テスト6本・safety gate 4actions）③「push 済み 3ref 一致」→ 前 push-only ミッションの確認結果 ④「UI 封印」→ §2 実測＋safety gate の UI 走査（151ファイル）。
**Assumption Log**: consentStatus は当面 CaseStudy フィールド上の申告値（granted の真正性は運用依存。**ConsentRecord連携は後続別承認**）。
**Unknowns Log**: ①許諾取得・記録の運用フロー設計（後続別承認）②**Phase 2-C-5 は別承認**（AI参照時の anonymized/consentStatus 参照条件の設計を含む・安全側は「匿名化済みのみ参照」）③本番 writeAudit レコードの画面確認（今回未実測・任意。/admin/audit で確認可能）。
**Risk Register**: 残リスクは低。許諾なしの実顧客情報記入は「機械拒否＋入力ガイド＋非公開固定＋外部AI封印＋writeAudit」の多層防御が本番実証済み。granted の申告依存（中）→ ConsentRecord 連携設計を後続承認に明記済み。
**Definition of Done**: §0 実測値の受領と検証 ✅／Scout 一致（doc77 未存在・doc14 最新 §53）✅／doc77 作成 ✅／doc14 §54 追記 ✅／CURRENT_STATE・PROGRESS・vault 更新 ✅／基準昇格の記録 ✅／commit ✅／push ⏳（別承認）。

## 5. 次回Claude Codeに渡す推奨プロンプト案

> doc77 記録 commit の push-only（feature→main・fast-forward・別承認）。その後の人間選択: ①**Phase 2-C-5 — CaseStudy AI参照（doc78 候補・別承認）**: company-brain-reference の4テーブル目として設計から（NORMAL/INTERNAL のみ・externalAiAllowed ゲート・ai_reference 自動記録・**anonymized=true かつ consentStatus 安全側のみ参照**の条件を設計で確定）②ConsentRecord 連携設計（許諾の取得・記録・失効の運用フロー）③Stage 2 / Stage 3 / ★2 / UX改善（随時・並行可）。

## 6. 判定

**GO** — Phase 2-C-4 は本番確認まで完全クローズ。GO済み基準は **Phase 2-C-4 / `11e8f51`** へ昇格。**Phase 2-C-5 は別承認・ConsentRecord連携は後続別承認**・Customer Pain・高機密・**外部公開なし・PR配信なし・SEOページ公開なし**はすべて維持。
