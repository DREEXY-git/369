# 96. CaseStudyConsent anonymized=false 本格扱い-PROD — 社内限定・制限表示 本番確認（利用者実測・判定 GO）

> doc95（anonymized=false 本格扱いの最小実装・GO）の本番確認記録。対象: doc95 実装 commit `611e51ea18b37f27f325f55224d59ada8a4367b3`（短縮 `611e51e`・feature/main 反映済み）。
> **docs-only・実装変更なし・本番確認の代行なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> 本番確認値はすべて**利用者実測**（2026-07-05・チャット提出・申告値をそのまま記録）。**AI が Vercel / GitHub Actions / 本番を直接確認したものではない**。

---

## 1. 非エンジニア向け要約

- doc95 で入れた「実名寄り事例の社内統治」（バッジ・閲覧制限・手動戻し注意）が、**本番で設計どおり動くことを利用者本人が一周実測**しました。
- 実測の型: **架空・匿名事例**を作成 → **internal_view の有効な台帳登録** → 許諾あり＋**匿名化オフ保存が通る** → 一覧に「**実名寄り（許諾あり）**」「**AI参照対象外**」「**外部公開不可**」バッジ → 編集画面に「**自動では匿名化に戻りません**」の注意 → **匿名化に戻す** → **アーカイブ片付け**。
- 判定は **GO**。本番確認GO済みプロダクト基準を **CaseStudyConsent 保存条件接続 / `5e9461f`** から **CaseStudyConsent anonymized=false 本格扱い / `611e51e`** へ昇格します（前基準は歴史的基準として保持）。
- 変わらないこと: **anonymized=false は未解禁**（表示統治のみ・AI・公開には使われない）・**AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**。

## 2. §0 利用者実測値（2026-07-05・原文どおり記録）

| 確認項目 | 実測値 |
|---|---|
| 確認日 / 確認者 | 2026-07-05 / 利用者本人 |
| Vercel Production 最新 deploy | Ready（**Vercel Ready**） |
| Vercel latest commit | `611e51e`（**latest commit 611e51e**） |
| Vercel build | green（**build green**） |
| GitHub Actions / CI | green（**CI green**） |
| 本番ログイン | OK（**本番ログイン OK**） |
| 既存主要画面無回帰 | OK |
| 顧客事例画面 /brain/case-studies | OK |
| 架空・匿名事例を1件作成 | OK（**架空・匿名事例**のみ） |
| 実在顧客名・取引先名・成果数値・顧客の声・PII なし | はい |
| **internal_view の有効な台帳登録** | OK |
| 証跡は所在説明のみ | はい |
| 許諾日と有効期限を入力 | はい |
| 許諾あり＋**匿名化オフ保存が通る** | OK |
| 一覧に「**実名寄り（許諾あり）**」表示 | OK |
| 一覧に「**AI参照対象外**」バッジ | OK |
| 一覧に「**外部公開不可**」バッジ | OK |
| 編集画面に「**自動では匿名化に戻りません**」系の注意 | OK |
| 編集権限なしユーザーで「閲覧制限」表示 | **確認用ユーザーなし**（GO 阻害ではない・§5 Unknowns に記録） |
| **匿名化に戻す**（匿名化ありに戻して保存） | OK |
| テスト事例の**アーカイブ片付け** | OK |
| **externalAiAllowed true UI なし** | 確認済み |
| **publishStatus UI なし** | 確認済み |
| 外部公開 / PR / SEO / SNS / 顧客の声公開 UI | なし |
| 本番DBを直接確認していない（**本番DB直接接続なし**） | はい |
| AI が直接確認したものではないことの理解 | はい |
| 利用者判定 | **GO** |
| 補足 | なし |

## 3. 判定と根拠

**判定: GO**。

- GO条件（Vercel Ready・latest commit 611e51e・build green・CI green・本番ログイン OK・既存主要画面無回帰・実名寄り1周＝台帳登録→匿名化オフ保存→3バッジ表示→手動戻し注意→匿名化に戻す→アーカイブ片付け・封印 UI 3種なし・本番DB非接触・AI非確認理解）をすべて満たし、NG・不明は **0件**（「確認用ユーザーなし」1件は §0 ルール上 GO 阻害ではなく Unknowns 記録）。
- **本番確認GO済みプロダクト基準を CaseStudyConsent 保存条件接続 / `5e9461f` → CaseStudyConsent anonymized=false 本格扱い / `611e51e` へ昇格**（前基準は歴史的基準として保持・doc記録 commit は基準にしない）。
- 基準表記（プレーン）: 新基準 = CaseStudyConsent anonymized=false 本格扱い / 611e51e ／ 前基準 = CaseStudyConsent 保存条件接続 / 5e9461f。
- これで ConsentRecord 連携ライン（doc82〜doc95）は「設計→器→台帳UI→突合→保存条件接続→表示統治」の全段が本番確認GOまで完了。**非 update ロール確認は未実施**（確認用ユーザーなし・下記 Unknowns）。

## 4. 今回やらなかったこと・変わらないこと

- **本番確認の代行なし**（すべて利用者実測の申告値）・実装/UI/Server Action/shared/safety gate/schema/migration/seed/package/lockfile/company-brain-reference 変更なし。
- **anonymized=false は未解禁**（表示統治まで。AI 参照・公開への使用はそれぞれ別承認のまま）。
- **AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**（AIが読む事例は匿名化済みのみ・安全ゲートで機械検査継続）。
- **externalAiAllowed true UI なし・publishStatus UI なし・外部公開なし・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし**。
- **外部送信なし・実LLMなし・AIコストなし**・Phase 8 実課金なし・ENSHiN OS 外部発信なし・push なし（commit-only・push は別承認）。

## 5. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「本番で表示統治が機能」→ §2 の利用者実測（実名寄り1周・3バッジ・手動戻し注意）②「対象 commit が本番反映」→ 実測 latest commit `611e51e`＋doc95 push-only 報告（3ref 一致）③「実装の裏付け」→ doc95（ローカル gate/test 256/smoke 23/23 green）④「封印維持」→ §2 の UI 3種なし実測＋安全ゲート稼働 ⑤「基準昇格の前提」→ doc93（保存条件接続 GO）＋本記録。
**Assumption Log**: ①利用者実測の申告値は正確（日付・値とも申告どおり記録・AI は検証できない）②テスト事例は匿名化に戻して片付け済み＝本番に実名寄りデータは残っていない ③FakeLLM 継続。
**Unknowns Log**: ①**非 update ロール確認は未実施**（編集権限なしユーザーでの「実名寄り事例（閲覧制限）」表示は確認用ユーザーなしのため本番未実測。実装ロジック `c.anonymized || canUpdate`＋安全ゲート検査＋smoke で担保・確認用ユーザー整備後の実測は任意の後続）②取り消し済み台帳のリアルタイム検知表示（注意文言のみ・拡張は別承認）③AI参照条件判断（doc91 §6 段階8）・公開活用判断（段階9）。
**Risk Register**: 本記録は docs-only で本番リスクなし。残余=非 update ロールの本番実測未（Unknowns ①・多層防御で緩和）・実名寄り実運用の開始判断（許諾取得フローの運用整備・人間側）。統治の後退は安全ゲートが常時 FAIL 検知。
**Definition of Done**: Scout 一致 ✅／§0 完全記入（NG・不明 0・利用者判定 GO）✅／read-only 監査 ✅／doc96 作成 ✅／doc14 §60 追記 ✅／CURRENT_STATE 基準昇格（前基準保持）✅／PROGRESS・vault・index 更新 ✅／commit ⏳（ゲート後）／push ⏳（別承認）。

## 6. 次回推奨プロンプト案

> ①**doc96 記録 commit の push-only**（feature→main・fast-forward・別承認）。②その後の人間判断: **AI参照条件の扱い判断**（ai_reference purpose・doc91 §6 段階8・keep_anonymized_true_only の維持または変更）／**公開活用判断**（ApprovalRequest・表現審査・段階9・今は進めない）／**Customer Pain の扱い判断**（高機密ラベル対応が先）／**Stage 2・3・★2・UX・品質基盤強化**。外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には個別承認なしに進まない。
