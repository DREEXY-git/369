# 93. CaseStudyConsent 保存条件接続-PROD — 保存条件接続 本番確認（利用者実測・判定 GO）

> doc92（保存条件接続の最小実装・CONNECT_ONLY）の本番確認記録。対象 commit `5e9461fa825ed033b57d081a090584b09742dc36`（短縮 `5e9461f`・feature/main 反映済み）。
> **docs-only・実装変更なし・本番確認の代行なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> 本番確認値はすべて**利用者実測**（2026-07-05・チャット提出・申告値をそのまま記録）。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。

---

## 1. 非エンジニア向け要約

- doc92 で入れた「匿名化を外す保存には、許諾台帳の有効な行（社内閲覧 internal_view・期限内・取り消しなし）が必要」という安全強化が、**本番で設計どおり動くことを利用者本人が一周実測**しました。
- 実測の型: **新規作成では匿名化を外せない**（拒否＋案内表示）→ 架空・匿名の事例を作成 → **台帳なしで拒否** → 台帳に internal_view の有効な許諾を登録 → **台帳登録後に通る** → 台帳を取り消し → **取り消し後に拒否** → **匿名化に戻す** → **アーカイブ片付け**。
- 判定は **GO**。本番確認GO済みプロダクト基準を **CaseStudyConsent UI / `1913456`** から **CaseStudyConsent 保存条件接続 / `5e9461f`** へ昇格します（前基準は歴史的基準として保持）。
- 変わらないこと: **anonymized=false は未解禁**（保存できるだけ・AI・公開には使われない）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。

## 2. §0 利用者実測値（2026-07-05・原文どおり記録）

| 確認項目 | 実測値 |
|---|---|
| 確認日 | 2026-07-05 |
| 確認者 | 利用者本人 |
| Vercel Production 最新 deploy | Ready（**Vercel Ready**） |
| Vercel latest commit | `5e9461f` |
| Vercel build | green（**build green**） |
| GitHub Actions / CI | green（**CI green**） |
| 本番ログイン | OK |
| 既存主要画面無回帰 | OK |
| 顧客事例画面 /brain/case-studies | OK |
| 新規作成で「許諾あり」でも匿名化オフの作成が拒否される | OK |
| 拒否時に「新規作成では匿名化を外せません」系の案内表示 | OK |
| 架空・匿名の顧客事例を1件作成 | OK |
| 実在顧客名・取引先名・成果数値・顧客の声・PII を入れていない | はい |
| 台帳なしの状態で匿名化オフ保存が拒否される | OK |
| 拒否時に台帳登録が必要である旨の案内表示 | OK |
| 編集画面の「許諾台帳」リンクから台帳画面へ遷移 | OK |
| internal_view を含む有効な許諾を登録できる | OK |
| 証跡は所在説明のみ（原本本文・メール本文・個人情報を貼っていない） | はい |
| 許諾日と有効期限を入力した | はい |
| 台帳登録後、匿名化オフ保存ができる | OK |
| 保存後、一覧で「実名寄り（許諾あり）」相当の表示になる | OK |
| 台帳の該当行を取り消しできる | OK |
| 取り消し後、行が残り「取り消し済み」表示になる（物理削除禁止が本番で成立） | OK |
| 取り消し後、再び匿名化オフ保存が拒否される | OK |
| テスト事例を匿名化ありに戻した | OK |
| テスト事例をアーカイブで片付けた | OK |
| externalAiAllowed true UI なし | 確認済み |
| publishStatus UI なし | 確認済み |
| 外部公開 / PR / SEO / SNS / 顧客の声公開 UI | なし |
| 本番DBを直接確認していない | はい（**本番DB直接接続なし**） |
| AI が直接確認したものではないことの理解 | はい |
| 利用者判定 | **GO** |
| 補足 | なし |

## 3. 判定と根拠

**判定: GO**。

- GO条件（Vercel Ready・latest commit `5e9461f`・build green・CI green・本番ログイン・無回帰・**新規作成では匿名化を外せない**・**台帳なしで拒否**・internal_view の**台帳登録後に通る**・**取り消し後に拒否**・**匿名化に戻す**＋**アーカイブ片付け**・封印 UI 3種なし・本番DB非接触・AI非確認理解）をすべて満たし、NG・不明は **0件**。
- **本番確認GO済みプロダクト基準を CaseStudyConsent UI / `1913456` → CaseStudyConsent 保存条件接続 / `5e9461f` へ昇格**（前基準は歴史的基準として保持・doc記録 commit は基準にしない）。
- これにより「granted 申告だけで実名寄り保存が通る」暫定状態（doc82 §5）は**本番でも解消済み**が実測確認された。拒否 UX（reason コード別の日本語・PII/抑止詳細なし）も本番で機能。

## 4. 今回やらなかったこと・変わらないこと

- **本番確認の代行なし**（すべて利用者実測の申告値）・実装変更なし・UI変更なし・shared/safety gate/schema/migration/seed/package/lockfile/company-brain-reference 変更なし。
- **anonymized=false は未解禁**（保存できるだけ。実名寄り運用の本格扱い＝表示・閲覧範囲・運用は doc91 §6 段階7 の別承認）。
- **AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**（AIが読む事例は匿名化済みのみ・安全ゲートで機械検査継続）。
- **externalAiAllowed true UI なし・publishStatus UI なし・外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。
- **外部送信なし・実LLMなし・AIコストなし**・Phase 8 実課金なし・ENSHiN OS 外部発信なし・push なし（commit-only・push は別承認）。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番で接続が機能」→ §2 の利用者実測（拒否→登録→通る→取り消し→拒否の1周）②「対象 commit が本番反映」→ 利用者実測の latest commit `5e9461f`＋push 記録（doc92 push-only 報告・3ref 一致）③「実装内容」→ doc92（ローカル検証 gate/test 256/smoke 22/22 green）④「暫定状態の解消」→ doc82 §5 の方針と §2 の「台帳なしで拒否」実測の突合 ⑤「封印維持」→ §2 の UI 3種なし実測＋安全ゲート稼働。
**Assumption Log**: ①利用者実測の申告値は正確（日付・値とも申告どおり記録・AI は検証できない）②本番の CaseStudyConsent / CaseStudy テスト行は片付け済み（匿名化あり＋アーカイブ・行は取り消し済みで残る=物理削除禁止どおり）③FakeLLM 継続。
**Unknowns Log**: ①suppressed（抑止）分岐の本番実測は未実施（customerId 連携事例が本番に無いため対象外・単体テストでカバー）②reason コード17種のうち本番で実測したのは台帳なし/取り消し/新規拒否系のみ（期限切れ等は単体テストでカバー）③実名寄り運用の本格設計（別承認）。
**Risk Register**: 本記録は docs-only で本番リスクなし。残余=実名寄りデータが今後初めて本番に入る際の運用（閲覧範囲・表示）→ doc91 §6 段階7 の別承認で扱う。接続の後退・解禁の混入は安全ゲートが常時 FAIL 検知。
**Definition of Done**: Scout 一致 ✅／§0 完全記入（NG・不明 0）✅／read-only 監査 ✅／doc93 作成 ✅／doc14 §59 追記 ✅／CURRENT_STATE 基準昇格（前基準保持）✅／PROGRESS・vault・index 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc93 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **anonymized=false の本格扱い判断**（運用・表示・閲覧範囲・doc91 §6 段階7）／**AI参照条件の扱い判断**（ai_reference purpose・段階8）／**Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2・3・★2・UX・品質基盤強化**。いずれも個別人間承認が前提。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。
