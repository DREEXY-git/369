# CURRENT_STATE — IKEZAKI OS

> 現在地の「1枚サマリー」。今の真実だけを書きます。長い経緯は `tasks/PROGRESS.md`、詳細監査は `docs/audit/` を参照。

## 状態管理ルール

- このファイルは**現在地の1枚サマリー**であり、履歴の集積ではありません。
- **push 反映状態は git refs（`git rev-parse HEAD` / `git rev-parse origin/main` / `git log origin/main`）を正**とします。
- `PROGRESS.md` は**履歴・判断メモ**であり、現在地の唯一の正ではありません（現在地はこのファイルと git refs）。
- 一時的な状態（未push・承認待ち 等）は**原則として永続表現に残しません**。必要なときは最終報告で扱います。
- このファイルは**大きな節目ごと**に更新します（毎コミットでは更新しません）。

## Git 反映状態の扱い

- **現在の HEAD ／ origin/main ／ 未push有無 ／ 作業ツリー状態は、常に git コマンドの結果を正**とします。このファイルには、コミットごとに変わる現在値を固定しません（このファイル自身を更新すると位置が変わるため、固定値を書くと即座に古くなります）。
- 反映状態を確認するコマンド:
  - `git rev-parse --short HEAD`
  - `git rev-parse --short origin/main`
  - `git log --oneline origin/main..HEAD`（未pushの一覧。空なら未pushなし）
  - `git status --short`（作業ツリー。空なら clean）
- 現在の作業ブランチも `git branch --show-current` を正とし、このファイルには固定しません。
- **このファイルに固定してよい commit は、「Phase 完了基準」と「最新の本番確認GO済みプロダクト基準」の基準 commit だけ**です。現在 HEAD・origin/main・作業ブランチ・未push などの現在位置は git を参照してください。

## Phase の現在地

- **Phase 1: 正式完了（Phase 1-50・判定根拠は doc24 の GO）。完了基準 commit: `e95f887`**（※現在 HEAD ではなく完了基準。詳細 `docs/audit/25_phase1_completion_record.md`）。
- **Phase X: 完了済み（Phase X-CLOSE-01・判定 GO）。完了基準 commit: `70d4d06`**（※現在 HEAD ではなく完了基準。詳細 `docs/audit/32_phase_x_completion_record.md`）。恒久資産=E2E smoke green 回帰ゲート（11/11）＋roadmap 9本＋Feature Registry＋各種 Matrix＋Phase 2 entry review。
- **Phase 2-A: 正式完了（Phase 2-A-CLOSE・判定 GO・2026-07-04）。完了対象の最新本番確認GO済みプロダクト基準: Phase 2-A-3c-2 / `85f1bf3`**（詳細 `docs/audit/48_phase2a_completion_record.md`・doc14 §45）。Company Brain foundation＝「器（schema）→ read-only 可視化 → 人間書き込み2テーブル → AI参照＋ai_reference ログ」がすべて本番確認GOまで完了。HOLD 2件は追記主義で解消済み。高機密・外部LLM解禁・3c-5・後続3テーブル・Phase 8・ENSHiN OS外部発信は後続別承認。以下は Phase 2-A 各段の当時記録。
- 2-A-3a（Company Brain read-only 可視化）: seed に架空デモデータ（CompanyPolicy 5件＋ProductCatalogItem 8件・全件 externalAiAllowed=false・PII/secret/実価格なし）が入り、read-only 一覧2画面（`/brain/policies`・`/brain/catalog`・knowledge:read＋tenantId スコープ）とナビ1行（会社の頭脳）が実装済み（記録: doc36）。**smoke は12本体制で 12/12 green（既存11本回帰なし）**。schema・migration・RBAC・labels は 2-A-2 から無変更。**作成・編集・Server Action・writeAudit/writeDataAccess の本実装は 2-A-3b の個別人間承認まで行わない**（read-only 可視化完了、作成/編集は 2-A-3b 承認待ち）。前段: 2-A-2 schema 変更＋本番確認 GO（doc34・doc35・doc14 §38）。
- **2-A-3a の本番確認は 一度 HOLD → 再実測 GO で解消済み（利用者実測・2026-07-03・記録: doc38＋doc14 §40）**: 初回実測ではナビ「会社の頭脳」と `/brain/*` 2画面が本番未確認/NG で HOLD（doc37＋doc14 §39・記録として保持）。ハードリロード/開き直し後の再実測で、ナビ・2画面・作成/編集/削除ボタン無し・既存画面すべて GO を確認し解消。前回NGの原因はキャッシュ/反映タイミングの可能性が高いが断定しない。**Phase 2-A-3a は本番確認まで完全クローズ**。
- **2-A-3b-1（CompanyPolicy 書き込み最小実装）＋安全補正＋本番確認GO 完了（記録: doc39＋doc40＋doc41）**: 会社方針のみに作成・編集・アーカイブの3操作を実装（Server Action＋入力検証＋writeAudit・物理削除なし・externalAiAllowed は UI で変更不可）。安全補正で **AIロールは権限にかかわらず会社方針の mutation を一律拒否（rbac 無変更・actions 側で人間専用化）**・**扱える label は NORMAL / INTERNAL のみ（高機密ラベルは writeDataAccess 実装時まで保留）**。**本番確認も利用者実測で GO（2026-07-04・doc41＋doc14 §41）＝書き込み第一段は完全クローズ**。
- **2-A-3b-2（ProductCatalogItem 書き込み最小実装）＋本番確認GO 完了（記録: doc42＋doc43＋doc14 §42）**: 商品カタログに同じ型で3操作を実装。**安全境界（AI mutation禁止・label 2択・externalAiAllowed 封印・ソフトアーカイブ）を最初から組み込み、修正ループ0回で完走**。**priceNote は説明テキストのみで請求・課金・見積・会計に接続しない**。**smoke は14本体制で 14/14 green（既存13本回帰なし）**。**本番確認も利用者実測で GO（2026-07-04）＝Company Brain の2テーブルの人間書き込みは本番確認まで完了**。
- **2-A-3c-1（AI参照経路＋writeDataAccess 設計・docs-only）完了（記録: doc44）**: AI が Company Brain を読む段の設計を固定。参照範囲=tenantId・archivedAt:null・NORMAL/INTERNAL のみ／外部LLM送信は externalAiAllowed=true＋maskText 済みのみ（true UI 無し＝構造的にゼロ）／記録は ai_reference をレコードごと1件／第一接続タスクはナレッジ検索。
- **2-A-3c-2（Company Brain AI参照の最小実装）完了 — 一度 HOLD → 再実測 GO で解消済み（実装: doc45／HOLD: doc46＋doc14 §43／解消GO: doc47＋doc14 §44）**: ナレッジ検索のみに Company Brain 参照を注入（read-only・NORMAL/INTERNAL・canAccessLabel・外部LLM時は externalAiAllowed ゲートで注入ゼロの安全側デフォルト）。初回本番確認（2026-07-04）は「値引き承認ルール」の AI回答・参照セクション未確認で HOLD。read-only 原因調査と利用者再実測（2026-07-04）により、**原因は本番データ前提差（対象 CompanyPolicy が本番に不在）でありコードのバグではない**と確定。本番UIで会社方針を作成後、AI回答・「参照した会社の頭脳」・参照元タイトル・CompanyPolicy の ai_reference ログすべて GO。**Phase 2-A-3c-2 は本番確認まで完全クローズ**。高機密ラベル・externalAiAllowed true UI・外部LLM送信の解禁は 3c-5 の個別人間承認まで行わない。ENSHiN OS の外部発信・口コミ・SNS・顧客の声公開・許諾管理実装は未着手。
- **CaseStudyConsent UI: 本番確認 GO（実装: doc87／本番確認: doc88＋doc14 §58・2026-07-05）。CaseStudyConsent UI は本番確認まで完全クローズ**。利用者実測で Vercel Ready・`1913456`・build green・CI green・**架空・匿名事例で台帳1周**（作成→許諾台帳→登録（証跡ガイド表示確認・所在説明のみ・期限必須）→一覧→詳細→取り消し（行が残り取り消し済み表示=物理削除禁止が本番で成立）→アーカイブ片付け）・externalAiAllowed/publishStatus/公開系 UI なし・既存画面無回帰を確認。**本番確認GO済みプロダクト基準は CaseStudyConsent UI / `1913456` へ昇格**。**CaseStudyConsent は AI 文脈へ注入しない・AI参照条件変更なし・anonymized=false 未解禁**のまま。次: doc88 push（別承認）→ **突合判定（doc83 §9 段階3）承認判断**。以下は実装時の記録。
- **CaseStudyConsent UI実装: 完了・ローカル検証全green（判定 GO・2026-07-05・記録: doc87）／本番確認はこれから（push・本番確認とも別承認）**。doc86 準拠で許諾台帳UIを最小実装: `/brain/case-studies/[id]/consents`（一覧・登録・閲覧・revoke の**4操作のみ**・自由編集なし・**物理削除禁止**）＋Server Action 2本（create/revoke・**人間のみ**=isHumanUser・knowledge:update・tenantId・**writeAudit（audit に証跡本文/PII を入れない）**）＋shared 純粋関数 validateCaseStudyConsentInput（**用途未記載不許可・evidence 空拒否・expiresAt 必須・期限逆転拒否**・否定系テスト8本=test 230）＋**安全ゲート拡張**（consents actions の isHumanUser/writeAudit/物理削除禁止/入力検証・登録画面の証跡ガイド文言・**company-brain-reference に CaseStudyConsent 非存在=AI 非注入の機械検査**）＋**smoke 22本目**（事例作成→台帳登録→取り消し→片付けの1周・22/22 green・既存21本回帰なし）。**Customer picker なし（CaseStudy.customerId 自動反映・PII 非複製）・status は granted 固定・AI参照条件変更なし・anonymized=false 未解禁・連携までは anonymized=true のみAI参照**。schema/migration/seed/package/company-brain-reference 無変更。プロダクト基準は **CaseStudyConsent schema / `812ae69`** のまま。次: doc87 push（別承認）→ 本番確認（架空事例で1周→片付け）→ 突合判定（doc83 §9 段階3）承認判断。
- **CaseStudyConsent UI設計: docs-only 完了（判定 READY / GO・2026-07-05・記録: doc86）／UI 実装は未着手・別承認待ち**。台帳UI（doc83 §9 段階2）の実装前安全設計を固定: 推奨スコープ=**事例単位の一覧・新規登録・閲覧・取り消し（revoke）のみ**（ルート案1 `/brain/case-studies/[id]/consents`・自由な編集なし・物理削除禁止・誤登録は revoke→再登録の運用）。**人間のみ**（isHumanUser・AIロールは作成/取り消し不可）・knowledge:update 基本候補・tenantId スコープ・**writeAudit 必須（audit に証跡本文/PII を入れない最小情報）**。入力: purpose 6区分 checkbox（空拒否）・**evidence は所在説明のみ**（原本/PII を貼らないガイド明記）・**expiresAt 必須**（grantedAt 以前は拒否）・customerId は自由入力させず CaseStudy.customerId 自動反映（Customer picker は作らない=PII 近接）。**AI参照条件変更なし**（CaseStudyConsent は AI 文脈へ注入しない・**anonymized=false 未解禁**・連携までは anonymized=true のみAI参照）。実装時のテスト/安全ゲート/smoke 案・停止条件も doc86 に固定。次: doc86 push（別承認）→ **台帳UI 実装承認判断（doc87 候補）**。
- **CaseStudyConsent schema: 本番確認 GO（実装: doc84／本番確認: doc85＋doc14 §57・2026-07-05）。CaseStudyConsent schema は本番確認まで完全クローズ**。利用者実測で Vercel Ready・`812ae69`・build green（追加のみ migration のため build 成功=migrate deploy 成功の前例枠組み）・CI green・既存主要画面無回帰・**CaseStudyConsent 画面なし=schema-only のため正常**を確認。**本番確認GO済みプロダクト基準は CaseStudyConsent schema / `812ae69` へ昇格**。**UI 未実装・writeAudit 未実装・突合判定未実装・anonymized=false 未解禁・ConsentRecord連携までは anonymized=true のみAI参照**＝書き込み経路ゼロで本番の台帳テーブルは空のまま。次: doc85 push（別承認）→ 台帳UI（doc83 §9 段階2）/ 突合判定（段階3）の承認判断。以下は実装時の記録。
- **CaseStudyConsent schema: 追加完了（schema-only・判定 GO・2026-07-05・記録: doc84）／UI・突合判定は未実装・別承認待ち**。§0 人間決定4点（consentRecordId 据え置き・evidence は所在説明のみ TEXT_POINTER_ONLY・**expiresAt 必須=NULL_NOT_ALLOWED（期限なし許諾は認めない）**・登録は人間のみ）に基づき、doc83 案B の器 **CaseStudyConsent model 1件のみ**を schema に追加＋migration `20260705002819_phase2c_consent_case_study_consent`（**追加のみ・破壊的SQLなし**: CREATE TABLE＋INDEX 2本のみ・機械確認済み）。**既存 ConsentRecord/CaseStudy/SuppressionList/Customer 無変更・relation 追加なし・PII 複製なし**。検証全green（validate・migrate dev＋status・test 222・typecheck・lint・build。smoke は schema-only のため未実施=成功扱いしない）。**書き込み経路ゼロ（UI なし）＝本番テーブルは空のまま・writeAudit/validateCaseStudyConsent 拡張/突合判定は未実装（doc83 §9 の段階2〜3・別承認）**。**ConsentRecord連携までは anonymized=true のみAI参照・anonymized=false は未解禁**。次: doc84 push（別承認）→ 本番確認（schema-only・画面なしが正常）→ 台帳UI/突合判定の承認判断。
- **ConsentRecord連携器選択: docs-only 完了（判定 READY / GO・2026-07-05・記録: doc83）／schema実装は未着手・別承認待ち**。doc82 の人間選択事項だった許諾台帳の器を確定: **案B推奨 = CaseStudyConsent（事例許諾専用新モデル）**。理由: 既存 ConsentRecord はメール営業チャネル同意用で意味が異なり、相乗り（案A）は配信同意と事例許諾の行が混在して監査・運用リスクになる。案B は**追加のみ migration・破壊的SQLなし・既存テーブル無変更**で前例どおりの最小審査。フィールド案（tenantId/caseStudyId/customerId=ID参照のみ/status granted・revoked/purpose 6区分明示・用途未記載は不許可/evidence/grantedAt/expiresAt/revokedAt）と突合判定・実装5段階（schema→UI→突合判定→匿名化解除判断→公開活用、各段個別承認）を doc83 に固定。**ConsentRecord連携までは anonymized=true のみAI参照維持・anonymized=false は別承認**・外部公開/PR/SEO/顧客の声公開は禁止のまま。schema 承認前に人間確定する Unknowns 4点（consentRecordId の扱い・evidence 保管・expiresAt null の意味・登録権限者）も記録。次: doc83 push（別承認）→ CaseStudyConsent schema 実装承認判断。
- **ConsentRecord連携設計: docs-only 完了（判定 READY / GO・2026-07-05・記録: doc82）／実装は未着手・別承認待ち**。Phase 2-C クローズ後の後続設計第一弾。**consentStatus=granted だけでは真正な許諾証拠として扱わない**ことを固定し、真正な許諾は将来 ConsentRecord 突合（誰が・何の用途で・いつまで・どんな証跡で）で確認する方針を設計。**ConsentRecord連携までは anonymized=true のみ参照を維持**・実名寄り事例/成果数値/顧客の声は AI にも公開にも使わない。read-only 監査の発見: **既存 ConsentRecord はメール営業のチャネル同意用で、用途・失効・期限・証跡を持たない**→ 連携の器は（案A）既存拡張 /（案B）事例許諾専用新モデルの人間選択（**推奨は案B**=追加のみ migration）。匿名化解除の将来条件（granted＋有効な consentRecordId＋同一tenant＋revoked/expired/suppressed でない＋用途明示＋公開系は ApprovalRequest）・取り消し時の安全側挙動（anonymized=true へ戻す・AI参照除外・非公開化・writeAudit・ai_reference 履歴保持）・公開活用の5前提（連携・表現審査・公開前人間承認・取り下げ・証跡）を doc82 に固定。**schema/コード変更なし・anonymized=false 解禁なし・外部公開/PR/SEO/SNS/顧客の声公開は禁止のまま**。次: doc82 push（別承認）→ ConsentRecord連携の実装判断（段階承認）。
- **Phase 2-C: 正式完了（Phase 2-C-CLOSE・判定 GO・2026-07-05）。完了対象の最新の本番確認GO済みプロダクト基準: Phase 2-C-5 / `6d656a3`**（詳細 `docs/audit/81_phase2c_close.md`・doc14 §56）。CaseStudy 領域（顧客事例）＝「入口レビュー（doc70）→ 絞り込み設計（doc71・Case Study 先行/Customer Pain 後続）→ schema（doc72/73）→ read-only（doc74/75）→ 人間書き込み（doc76/77・許諾の門番本番実証）→ AI参照（doc78/79/80）」の全段が本番確認GOまで完了。**Company Brain AI参照4テーブル体制（会社方針・商品カタログ・営業プレイブック・顧客事例）が本番確認済み**・AIが読める顧客事例は匿名化済み（anonymized=true）のみ・外部LLM注入ゼロ・未解消HOLDなし。後続送り（いずれも別承認・後続課題ゼロではない）: ConsentRecord連携・Customer Pain（高機密ラベル対応が先）・公開活用（PR配信/SEO/SNS/口コミ/顧客の声公開）・Stage 2・Stage 3・★2・UX改善・品質基盤強化。以下は Phase 2-C 各段の当時記録。
- **Phase 2-C-5: CaseStudy AI参照 — 完了。本番確認 GO（設計: doc78／実装: doc79／本番確認: doc80＋doc14 §55・2026-07-05）。Phase 2-C-5 は本番確認まで完全クローズ**。利用者実測で「架空・匿名の事例1件作成 → タイトルでナレッジ検索 → AIの回答＋参照した会社の頭脳に表示 → **ai_reference（entityType=CaseStudy）記録** → テスト事例アーカイブ片付け」の end-to-end を本番確認（Vercel Ready・`6d656a3`・build green・CI green・既存画面無回帰）。**本番確認GO済みプロダクト基準は Phase 2-C-5 / `6d656a3` へ昇格**。**Company Brain AI参照4テーブル体制（会社方針・商品カタログ・営業プレイブック・顧客事例）が本番確認済み**・AIが読める CaseStudy は匿名化済み（anonymized=true）のみ・外部LLM注入ゼロ。次: doc80 push（別承認）→ **Phase 2-C 完了判定（人間判断・doc81 候補）** / ConsentRecord 連携設計 / Customer Pain / Stage 2・3・★2・UX の人間選択。以下は実装時の記録。doc78 §3/§5 どおり company-brain-reference に**4テーブル目**として追加（既存3テーブル無変更）: where = tenantId・archivedAt:null・**publishStatus 'private' のみ・anonymized=true（匿名化済み）のみ**・NORMAL/INTERNAL のみ。**sourceNote/customerId/consentRecordId/consentStatus は select せず注入しない**（granted を参照根拠にしない）。【顧客事例/業種】prefix 文脈化・**MAX_TOTAL=5 据え置き**・externalAiAllowed ゲート維持（外部LLM時は構造的ゼロ）・ai_reference は既存ループでレコード単位自動記録（knowledge/search・audit・db 無変更）。**安全ゲートに「匿名化済みのみ参照」等の機械検査4件を追加**。検証全green（gate actions4/ui151・test 222・typecheck・lint・build・**smoke 21/21**・既存20本回帰なし・ローカルのみ）。schema/migration/seed/package/lock 無変更。GO済み基準は Phase 2-C-4 / `11e8f51` のまま（本番確認前のため昇格しない）。次: doc79 push（別承認）→ 本番確認 → 2-C-5-PROD（doc80 候補）。以下は設計時の記録。AI が顧客事例を読む条件を設計固定: **anonymized=true（匿名化済み）のみ参照・publishStatus 'private' のみ・NORMAL/INTERNAL のみ・tenantId/archivedAt:null 必須・consentStatus は参照条件に使わない（granted でも ConsentRecord 未連携のため慎重扱い）**。company-brain-reference の4テーブル目候補として既存の型に追加するだけ（MAX_TOTAL=5 据え置き候補・sourceNote/customerId/consentRecordId は注入しない・ai_reference はレコード単位で自動記録・外部LLM時は externalAiAllowed ゲートで構造的ゼロ）。**実装・company-brain-reference.ts 変更・ConsentRecord 連携はいずれも別承認**。GO済み基準は Phase 2-C-4 / `11e8f51` のまま。
- **Phase 2-C-4: CaseStudy 人間書き込み（作成・編集・アーカイブ）— 完了。本番確認 GO（実装: doc76／本番確認: doc77＋doc14 §54・2026-07-05）。Phase 2-C-4 は本番確認まで完全クローズ**。利用者実測で Vercel Ready・`11e8f51`・build green・CI green・**作成→編集→アーカイブの1周（架空・匿名のみ・片付け済み）・許諾なしでの匿名化解除が本番で拒否されること・externalAiAllowed/publishStatus UI なし**・既存画面無回帰を確認。**本番確認GO済みプロダクト基準は Phase 2-C-4 / `11e8f51` へ昇格**。**会社の頭脳4テーブルすべてが「人間が書き・AIは書けない・消せない・writeAudit が残る」体制で本番稼働**（顧客事例のみ許諾の門番つき）。次: doc77 push（別承認）→ Phase 2-C-5（AI参照・別承認）/ ConsentRecord 連携設計 / Stage 2・3・★2・UX の人間選択。以下は実装時の記録。2-B-4 の型を流用した Server Action 3操作＋**AI mutation禁止（shared isHumanUser・actions 4本目）**＋**writeAudit 3操作**＋tenantId スコープ＋label 2択＋externalAiAllowed false 固定＋**publishStatus 'private' 固定（公開機能なし）**＋物理削除禁止＋**匿名化解除は consentStatus='granted' のときだけ許可（shared validateCaseStudyConsent で機械拒否・否定系テスト6本・安全ゲートで常時検査）**＋入力ガイド（顧客名・取引先名・成果数値・顧客の声は許諾なしに書かない）。**静的安全ゲートは 4actions 体制へ拡張**（CaseStudy の非公開固定・許諾判定使用も機械検査）。検証全green（安全ゲート actions4/ui151・**test 222**・typecheck・lint・build・**smoke 20/20**・既存回帰なし・ローカルのみ）。schema/migration/seed/labels/RBAC/company-brain-reference/package/lock 無変更。**AI参照は 2-C-5 の別承認・ConsentRecord 連携は後続別承認**。GO済み基準は Phase 2-C-3 / `408857d` のまま（本番確認前のため昇格しない）。次: doc76 push（別承認）→ 本番確認 → 2-C-4-PROD（doc77 候補）。
- **Phase 2-C-3: CaseStudy read-only 画面＋架空 seed — 完了。本番確認 GO（実装: doc74／本番確認: doc75＋doc14 §53・2026-07-05）。Phase 2-C-3 は本番確認まで完全クローズ**。利用者実測で Vercel Ready・`408857d`・build green・CI green・**ナビ「顧客事例」表示・`/brain/case-studies` 表示・一覧は EmptyState（本番 seed 未投入のため正常）・作成/編集/アーカイブボタンなし**・既存画面無回帰を確認。**本番確認GO済みプロダクト基準は Phase 2-C-3 / `408857d` へ昇格**。本番の CaseStudy テーブルは空のまま＝書き込み経路ゼロが本番でも成立し、実顧客情報は本番に存在しない。次: doc75 push（別承認）→ Phase 2-C-4（人間書き込み・doc76 候補）承認判断。以下は実装時の記録。2-A-3a/2-B-3 の型で閲覧専用一覧 `/brain/case-studies`（requireUser→knowledge:read→tenantId・archivedAt:null・**publishStatus='private' のみ・label NORMAL/INTERNAL のみ**）＋ナビ「顧客事例」1行＋**架空 seed 4件**（全件「（架空）」明記・anonymized=true・consentStatus='none'・externalAiAllowed=false・実在顧客名/実成果数値/顧客の声なし）＋smoke 19本目（作成/編集/アーカイブ UI が無いことも機械確認）。**作成・編集・削除・Server Action・writeAudit・AI参照は未実装＝書き込み経路ゼロのまま**（2-C-4/2-C-5 の別承認）。検証全green（安全ゲート ui 148・test 216・typecheck・lint・build・**smoke 19/19**・既存18本回帰なし・ローカルのみ）。schema/migration/labels/RBAC/package/lock 無変更。GO済み基準は Phase 2-C-2 / `b012bd0` のまま（本番確認前のため昇格しない）。次: doc74 push（別承認）→ 本番確認 → 2-C-4 承認判断。
- **Phase 2-C-2: CaseStudy schema 追加 — 完了。本番確認 GO（実装: doc72／本番確認: doc73＋doc14 §52・2026-07-05）。Phase 2-C-2 は本番確認まで完全クローズ**。利用者実測で Vercel Production Ready・対象 commit `b012bd0`・build green（migrate ログは直接未確認＝build 成功で判定・前例どおり）・CI green・既存主要画面無回帰・**CaseStudy 画面なし=schema-only のため正常**を確認。**本番確認GO済みプロダクト基準は Phase 2-C-2 / `b012bd0` へ昇格**。本番DBには CaseStudy テーブルが追加のみ（破壊的SQLなし）・書き込み経路ゼロで実データ混入は構造的に不可能。次: doc73 push（別承認）→ Phase 2-C-3（read-only 画面＋架空 seed・doc74 候補）承認判断。以下は実装時の記録。doc71 §6-2 準拠で schema.prisma に **CaseStudy model 1件のみ追加**＋migration `20260704160836_phase2c2_case_study`（**追加のみ・破壊的SQLなし**・CREATE TABLE＋INDEX 3本）。安全 default を器に固定: **anonymized=true・publishStatus='private'・consentStatus='none'・externalAiAllowed=false・label INTERNAL（UI/action 側で NORMAL/INTERNAL 2択に制限予定）**・customerId/consentRecordId は relation なし ID 参照。**CustomerPain model なし・ConsentRecord/SuppressionList/Customer/ConfidentialityLabel enum/labels.ts/RBAC/company-brain-reference.ts 無変更**。検証全green（ローカルのみ: migrate dev＋status・安全ゲート・test 216・typecheck・lint・build。smoke は schema-only のため未実施=成功扱いしない）。**seed/UI/Server Action/writeAudit/AI参照は 2-C-3〜2-C-5 の別承認**。GO済み基準は Phase 2-B-5 / `83d35bc` のまま（本番確認前のため昇格しない）。
- **Phase 2-C-1: Case Study / Customer Pain 絞り込み詳細設計 — 完了（docs-only・判定 READY / GO・記録: doc71）／実装は未着手・別承認待ち**。read-only 監査（doc33・doc50・doc70・schema・labels・ConsentRecord/SuppressionList 実測）に基づき、**Case Study（顧客事例）先行・Customer Pain（顧客課題）後続で確定**（doc33 以来の評価と矛盾なし。Customer Pain は高機密ラベル解禁という別の重い承認が先）。絶対条件を設計に固定: **顧客名・取引先名・成果数値・顧客の声は許諾なしに扱わない・公開/SNS/PR配信/SEO公開しない・初期スコープに公開機能を作らない・非公開/架空データ/匿名化 default true・label 2択（高機密ラベル解禁なし）・externalAiAllowed false 固定・AI mutation禁止・物理削除禁止・writeAudit**。段階計画 = 2-C-2 schema → 2-C-3 read-only 画面 → 2-C-4 人間書き込み → 2-C-5 AI参照（各段別承認）。**外部送信なし・DB操作なし・schema変更なし**。**Phase 2-C実装・Case Study実装・Customer Pain実装は別承認**。**Phase 8 / ENSHiN OS外部発信なし**。GO済み基準は **Phase 2-B-5 / `83d35bc`** のまま。
- **Phase 2-C-ENTRY: 次領域入口レビュー — 完了（判定 READY / GO・記録: doc70）／実装は未着手・別承認待ち**。Phase 2-B 正式完了＋Phase X-05 第一波完了後の8候補（Case Study / Customer Pain / Stage 2 / Stage 3 / ★2 / UX改善 / GitHub・Obsidian整備 / Candidate整理）を比較。**推奨1位 = Phase 2-C-1: Case Study / Customer Pain の絞り込み詳細設計 docs-only**（品質基盤の主要な穴が塞がったため事業価値側へ戻る。ただし顧客名・成果数値・顧客の声・許諾・公開リスクがあるため**まだ実装しない**・非公開/架空/許諾前提の設計から）。推奨2位=Stage 2・3位=★2。**Phase 2-C実装・Case Study実装・Customer Pain実装・Stage 2・Stage 3・★2 はいずれも別承認**。
- **Phase X-05-3: Company Brain 静的安全ゲート第一弾 — 完了。CI実走確認 GO（実装: doc68／実走確認: doc69・確認日 2026-07-04 申告）。X-05-3 は完全クローズ**。利用者実測で、CI 最新 run（commit `58be7c7`）が **green・失敗なし・step 一覧に「Company Brain safety checks」があり緑で成功**を確認（AI が直接確認したものではない）。**静的安全ゲートが本稼働**＝push のたびに「安全境界の存在検査→test 216→typecheck→lint」が自動実行される。doc63 §5 の ★1/★3/★4/★5 が CI実走まで完了。残: ★2・Stage 2/3 は別承認。以下は実装時の記録。`scripts/check-company-brain-safety.mjs`（Node標準のみ・package/lock無変更）で ★3 label 2択・★4 externalAiAllowed 封印（UI 147ファイル走査）・★5 物理削除禁止・isHumanUser 共通化維持を機械検査し、**CI Stage 1 に step 追加（db:generate → 安全ゲート → test → typecheck → lint）**。検証全green（script exit 0・test 216・typecheck・lint・build。smoke は app 挙動不変のため未実施＝成功扱いしない）。doc63 §5 の ★1/★3/★4/★5 が自動検証化済み。残: ★2 権限拒否 E2E・Stage 2/3 は別承認。
- **Phase X-05-2: 否定系テスト第一弾（AIロール拒否）— 完了。CI実走確認 GO（実装: doc66／実走確認: doc67・確認日 2026-07-04 申告）。X-05-2 は完全クローズ**。利用者実測で、push 後の GitHub Actions CI 最新 run（commit `b27a979`）が **green・失敗なし**を確認（AI が直接確認したものではない）。**test 216（否定系5本含む）が CI で自動実行される品質ゲートとして本稼働**＝「AIは会社の頭脳を書き換えられない」が push のたびに自動検証され続ける。残: ★2〜★5・Stage 2 は別承認。以下は実装時の記録。A案採用: brain 3actions に3重複していた isHumanUser を packages/shared の純粋関数へ抽出し、**否定系テスト5本を追加（test 211→216）**。「rbac 上 AI_AGENT は knowledge:create を持つが actions 層で書き込み拒否」という前提自体もテストで恒久固定。**挙動不変（smoke 18/18 green で実証）・RBAC変更なし・schema/seed/package/lock/workflow 無変更**。doc63 の最大の穴（AI書き込み禁止層のテストゼロ）が解消。残: ★2〜★5（権限拒否・label制限・封印・物理削除の各テスト）と Stage 2 は別承認。
- **Phase X-05-1: CI Stage 1 — 完了。実走確認 GO（実装: doc64／実走確認: doc65・確認日 2026-07-04 申告）。Phase X-05-1 は完全クローズ**。`.github/workflows/ci.yml`（push/PR 時に install→db:generate→test→typecheck→lint を自動実行・secrets不使用・DB不要）が main 反映済みで、**利用者実測により GitHub Actions の最新 run（commit `116efd6`）が green・失敗なしを確認**。AI が実走を直接確認したものではない。**品質ゲートが自動で常時稼働する状態になった**。Stage 2 build・Stage 3 smoke・否定系テスト（X-05-2）は別承認。
- **Phase X-05: CI・否定系テスト — 設計確認済み（Phase X-05-ENTRY・判定 READY / GO・記録: doc63）／実装は X-05-1 で CI Stage 1 のみ着手済み**。要点: CI は3段階導入（Stage 1=test/typecheck/lint・Stage 2=build・Stage 3=smoke on CI は後日判断）・否定系テストは8対象（最優先=**actions 層 isHumanUser の無テスト状態**: rbac 上 AI_AGENT は knowledge:create を持つため actions 層が唯一の砦なのにテストゼロ、と read-only 調査で特定）。実装方式 A（shared へ純粋関数抽出＋単体テスト・推奨）/ B（E2E＋静的チェックのみ）は実装ミッションで人間判断。**workflow作成・テスト実装・package/lock 変更は次ミッションの別承認**。**Phase 2-C実装・Case Study実装・Customer Pain実装にも個別人間承認なしに進まない**。
- **Phase 2-B: 正式完了（Phase 2-B-CLOSE・判定 GO）。完了対象の最新本番確認GO済みプロダクト基準: Phase 2-B-5 / `83d35bc`**（詳細 `docs/audit/62_phase2b_completion_record.md`・doc14 §51）。営業プレイブック（SalesPlaybookEntry）＝「設計（doc51）→ schema（doc52/53）→ read-only（doc54〜56）→ 人間書き込み（doc57/58）→ AI参照（doc59〜61）」の全5段が本番確認GOまで完了。**会社の頭脳3テーブル（会社方針・商品カタログ・営業プレイブック）すべてが「人間が書き・AIが読み・読んだら記録・外部AIには出さない」体制で本番稼働**。HOLD 2件（2-B-3 ナビ／2-B-5 ai_reference 表示場所）は追記主義で解消済み・未解消HOLDなし。後続送り（別承認）: 頭脳2画面→プレイブックのタブ導線・アーカイブ文言/視認性・実LLMキー設定（外部送信解禁とセット）・CI導入・否定系テスト・doc49 script化・Case Study / Customer Pain・次領域入口レビュー。以下は Phase 2-B 各段の当時記録。
- **Phase 2-B-5: SalesPlaybookEntry AI参照追加 — 完了。本番確認 GO（設計: doc59／実装: doc60／本番確認: doc61＋doc14 §50・2026-07-04）。Phase 2-B-5 は本番確認まで完全クローズ**。利用者実測で、本番UIで作成した営業プレイブック（未アーカイブ・架空内容）→ ナレッジ検索 → 「参照した会社の頭脳」にタイトル表示 → **`/admin/data-access-logs` に ai_reference（entityType=SalesPlaybookEntry）** の end-to-end を確認。初回報告の「ai_reference 見当たらず」は表示場所の違い（監査ログ本体ではなく機密参照ログ）で、68点表示は FakeLLM 仕様（信頼度0.68固定）と切り分け済み。改善候補（別承認）: 頭脳2画面→プレイブックのタブ導線・アーカイブ文言/視認性・実LLMキー設定。以下は実装時の記録。doc59 どおり company-brain-reference.ts に3テーブル目として追加（read-only・tenantId・archivedAt:null・NORMAL/INTERNAL のみ・canAccessLabel・**MAX_TOTAL=5 据え置き**・doNotSay は「言わない:」プレフィックス・related IDs 未展開・**外部LLM時は externalAiAllowed=true＋maskText のみ＝全件 false のため構造的にゼロ**）。ai_reference は既存 writeAIDataAccess の流用でレコードごと自動記録（knowledge/search・audit.ts・db.ts は無変更）。smoke は18本体制で **18/18 green**（18本目=参照元表示・既存17本回帰なし）。schema/migration/seed/rbac/labels/package/lock 無変更。**GO済み基準は Phase 2-B-4 / `26a7a30` のまま**（本番確認 GO までは昇格しない）。**Phase 2-B 全体クローズ判定は本番確認後**。外部LLM送信解禁・高機密・Phase 8・ENSHiN OS外部発信には進まない。
- **Phase 2-B-4: SalesPlaybookEntry 人間書き込み（作成・編集・アーカイブ）— 完了。本番確認 GO（実装: doc57／本番確認: doc58＋doc14 §49・2026-07-04）。Phase 2-B-4 は本番確認まで完全クローズ**。利用者実測で作成→編集→アーカイブの1周・ラベル2択・externalAiAllowed UIなし・入力ガイド表示・writeAudit 3操作の監査ログ・既存画面無回帰をすべて確認（テストデータは架空内容のみ・アーカイブで片付け済み）。以下は実装時の記録。2-A-3b-1/3b-2 の型を流用: Server Action 3操作（create/update/archive）＋**AI mutation禁止（actions 層で AIロール一律拒否・rbac.ts 無変更）**＋writeAudit 3操作＋物理削除なし（archivedAt のソフトアーカイブのみ）＋**label 2択（NORMAL/INTERNAL）**＋**externalAiAllowed 封印（create=false 固定・update 不変更・true UI なし）**＋**入力ガイド画面明記（顧客名・会社名・成果数値・口コミ・顧客の声・実価格を書かない）**。smoke は17本体制で **17/17 green**（16本目はナビ経由確認へ意図的に期待値更新=doc57 §5・17本目=作成フロー追加・既存15本回帰なし）。schema・migration・seed・rbac・labels・package/lock 無変更。AI参照（writeDataAccess/ai_reference）は未実装=2-B-5 の別承認。**GO済み基準は Phase 2-B-3 / `a2bb2b6` のまま**（本番確認前のため昇格しない）。次: push-only（別承認）→ 本番確認（doc49 の型・doc58 候補）→ 2-B-5 承認判断。
- **Phase 2-B-3: SalesPlaybookEntry read-only 可視化 — 完了。一度 HOLD → 再実測 GO で解消済み（実装: doc54／HOLD経緯: doc55＋doc14 §47／解消GO: doc56＋doc14 §48・2026-07-06）。Phase 2-B-3 は本番確認まで完全クローズ**。HOLD の唯一のNG（ナビ表示）はハードリロードで解消＝ブラウザキャッシュ起因の可能性が高く、read-only 調査どおり repo 側は潔白・**コード修正は不要だった**。教訓: NG時の一次対処はハードリロード／smoke のナビ表示検証追加は改善候補（別承認）。書き込み（2-B-4）・AI参照（2-B-5）は別承認。seed デモデータ6件（playbookType 4種網羅・PII/実価格/口コミ/顧客の声ゼロ・全件 externalAiAllowed=false・NORMAL/INTERNAL のみ）＋read-only 一覧 `/brain/playbooks`（knowledge:read＋tenantId・作成/編集/削除/Server Action なし）＋ナビ1行＋**smoke 16/16 green（既存15本回帰なし）**。書き込み（2-B-4）・AI参照（2-B-5）は別承認。本番は seed 未実行のため一覧が空で正常（doc49 原則で本番確認条件を事前定義済み）。
- **Phase 2-B-2: SalesPlaybookEntry schema変更 — main反映済み・本番確認GO（実装記録: doc52／本番確認: doc53＋doc14 §46・2026-07-05）。Phase 2-B-2 は完全クローズ**。§0 人間承認（APPROVED・呼称=Phase 2-B のまま・参照構造=ID配列・playbookType=approach/objection/preparation/talk_track）に基づき、doc51 §4 どおり model 追加＋migration 1つ（CREATE TABLE＋INDEX 3本のみ・destructive 0・既存model無変更）。検証: validate/migrate dev(ローカル)/status/test 211/typecheck/lint/build 全green。次は push-only（別承認）→ 本番確認（doc49 の型・既存画面無回帰が主眼）→ Phase 2-B-3 承認判断。
- **Phase 2-B-1: SalesPlaybookEntry 設計 docs-only 完了（判定 GO・記録: doc51）／schema変更は 2-B-2 で実施済み**。設計の柱: 顧客名・事例・顧客の声を最初から扱わない「売り方の型」専用・既存2モデルの流儀を踏襲（tenantId スカラ・label 2択・externalAiAllowed false 封印・ソフトアーカイブ・関連参照は ID 配列案を推奨）・AI mutation禁止を actions 層で最初から・AI参照追加は 2-B-5 の別承認・三段承認計画（2-B-2 schema → 2-B-3 read-only → 2-B-4 書き込み → 2-B-5 AI参照 → 各段 PROD は doc49 の型）。
- **Phase 2-B: 入口レビュー完了（Phase 2-B-ENTRY・判定 READY / GO・記録: doc50）／実装・schema変更・migration は未着手・次は人間判断**。doc33 の後続3領域を再評価し、**推奨 = Phase 2-B-1: SalesPlaybookEntry の設計 docs-only**（PII最遠・2-Aの安全境界を流用可）。Case Study は許諾管理・公開前承認・広告表現チェックの設計とセットで後続、Customer Pain は高機密ラベル対応（別の重い承認）の後で最後。呼称注意: roadmap 01 の「2-B」は CRM/Sales AI を指す（呼び分けは人間判断）。ENSHiN OS 詳細仕様は未提供のまま（証拠不足・doc07 方針維持）。
- **Phase X-04（本番スモーク定型化）: docs-only 完了（判定 GO・2026-07-04・記録: doc49）**。Phase 2-A の HOLD 2件の教訓を「本番確認プレイブック」として固定（利用者実測のみ・§0 テンプレート・GO/HOLD/STOP 判定・**本番に実在するデータで確認**・ENSHiN OS 追加停止条件・標準プロンプト骨子）。以後の本番確認は doc49 の型に従う。**script化・E2E拡張・本番自動監視は未実装・後続別承認**。
- **Phase 8（実課金・Stripe・usage billing・credits・cap/alert）には進まない**（別設計・別承認が前提）。

## 最新の本番確認GO済みプロダクト基準

- 最新の本番確認 GO 済みプロダクト基準: **CaseStudyConsent UI**
- 内容: **許諾台帳UI（一覧・登録・閲覧・取り消しの4操作のみ・人間のみ・writeAudit・物理削除禁止・証跡は所在説明のみ・期限必須）の本番確認 GO 記録。CaseStudyConsent は AI 文脈へ注入しない・AI参照条件変更なし・anonymized=false 未解禁・突合判定は別承認**
- CaseStudyConsent UI 基準 commit（本番確認 GO 済み基準）: `1913456`（※現在 HEAD ではなく基準 commit。現在位置は git を参照。昇格記録: doc88＋doc14 §58・2026-07-05）
- 詳細: `docs/audit/88_case_study_consent_ui_production_confirmation.md`・doc14 §58
- （前基準: CaseStudyConsent schema = 許諾台帳の器の本番反映 GO。以下は当時の記録として保持）
- CaseStudyConsent schema 基準 commit（本番確認 GO 済み基準）: `812ae69`（昇格記録: doc85＋doc14 §57・2026-07-05）
- 詳細: `docs/audit/85_case_study_consent_schema_production_confirmation.md`・doc14 §57
- （前基準: Phase 2-C-5 = CaseStudy AI参照の本番確認 GO。以下は当時の記録として保持）
- 内容: **CaseStudy AI参照（ナレッジ検索での顧客事例参照＝匿名化済み anonymized=true のみ＋ai_reference（entityType=CaseStudy）監査ログ）の本番確認 GO 記録。Company Brain AI参照4テーブル体制が本番確認済み**
- Phase 2-C-5 基準 commit（本番確認 GO 済み基準）: `6d656a3`（※現在 HEAD ではなく基準 commit。現在位置は git を参照。昇格記録: doc80＋doc14 §55・2026-07-05）
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-05 申告・実測値はチャット提出・実測日は利用者申告値をそのまま記録）**。AI が本番接続確認したものではない。架空・匿名の事例1件作成→タイトルでナレッジ検索→「参照した会社の頭脳」に表示→`/admin/data-access-logs` に ai_reference（entityType=CaseStudy）→テスト事例アーカイブ片付け・既存画面無回帰・外部送信/SNS/口コミ/顧客の声公開なし。
- 詳細: `docs/audit/80_phase2c5_case_study_ai_reference_production_confirmation.md`・doc14 §55
- **Phase 2-C は完了判定済み（Phase 2-C-CLOSE・判定 GO・doc81＋doc14 §56・2026-07-05）**。ただし **ConsentRecord連携 / Customer Pain / Stage 2 / Stage 3 / ★2 / UX改善 は別承認**。
- Phase 2-C-4 基準 commit: `11e8f51`
- Phase 2-C-3 基準 commit: `408857d`
- Phase 2-C-2 基準 commit: `b012bd0`
- （前基準: Phase 2-B-5 = SalesPlaybookEntry AI参照の本番確認 GO。以下は当時の記録として保持）
- Phase 2-B-5 基準 commit: `83d35bc`
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-04 申告・実測値はチャット提出・実測日は利用者申告値をそのまま記録）**。AI が本番接続確認したものではない。本番UIで作成した「テスト1」→検索「test1」→「参照した会社の頭脳」表示→`/admin/data-access-logs` に AI参照（SalesPlaybookEntry）・既存画面無回帰・エラー/外部送信/SNS/口コミ/顧客の声公開なし。68点=FakeLLM 仕様・Supabase dashboard ログは無関係の可能性大（断定しない）。
- 詳細: `docs/audit/61_phase2b5_production_confirmation.md`・`docs/audit/14_release_stabilization.md` §50
- （前基準: Phase 2-B-4 = SalesPlaybookEntry 人間書き込みの本番確認 GO。以下は当時の記録として保持）
- Phase 2-B-4 基準 commit: `26a7a30`
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-04・実測値はチャット提出・実測日は利用者申告値をそのまま記録）**。AI が本番接続確認したものではない。作成→編集→アーカイブの1周 OK・機密ラベル2択のみ・外部AI送信を許可するUIなし・入力ガイド表示・監査ログに3操作すべて記録・既存画面無回帰・エラーなし・外部送信/SNS/口コミ/顧客の声公開なし。
- 詳細: `docs/audit/58_phase2b4_production_confirmation.md`・`docs/audit/14_release_stabilization.md` §49
- （前基準: Phase 2-B-3 = SalesPlaybookEntry read-only 可視化の本番確認 GO（一度 HOLD → 再実測で解消）。以下は当時の記録として保持）
- Phase 2-B-3 基準 commit: `a2bb2b6`
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-06・HOLD解消の再実測）**。AI が本番接続確認したものではない。HOLD の唯一のNG（ナビに「営業プレイブック」が出ない）は**ハードリロードで解消**（ブラウザキャッシュ起因の可能性が高い・repo側潔白確認済み・コード修正不要だった）。直打ちOK・空一覧=正常・ボタンなし・既存画面無回帰・エラーなし・外部送信なし。
- 詳細: `docs/audit/56_phase2b3_prod2_nav_recheck.md`・`docs/audit/14_release_stabilization.md` §48（HOLD の経緯は doc55・§47）
- （前々基準: Phase 2-B-2 = SalesPlaybookEntry schema変更の本番確認 GO。以下は当時の記録として保持）
- Phase 2-B-2 基準 commit: `811b8c6`
- 本番確認: 利用者実測による **GO（2026-07-05）**。詳細: `docs/audit/53_phase2b2_production_confirmation.md`・doc14 §46
- （前々基準: Phase 2-A-3c-2 = Company Brain AI参照の本番確認 GO（一度 HOLD → 再実測で解消）。以下は当時の記録として保持）
- Phase 2-A-3c-2 基準 commit: `85f1bf3`（`700f79e` は HOLD記録の docs commit）
- 本番確認: 利用者実測による **GO（2026-07-04・HOLD解消の再実測）**。詳細: `docs/audit/47_phase2a3c2_hold_resolution_go.md`・doc14 §44（HOLD の経緯は doc46・§43）
- （前々基準: Phase 2-A-3b-2 = ProductCatalogItem 書き込みの本番確認 GO。以下は当時の記録として保持）
- Phase 2-A-3b-2 基準 commit: `aa40f2f`
- 本番確認: 利用者実測による **GO（2026-07-04）**。詳細: `docs/audit/43_phase2a3b2_production_confirmation.md`・doc14 §42
- （前々基準: Phase 2-A-3b-1 = CompanyPolicy 書き込み＋安全補正の本番確認 GO。以下は当時の記録として保持）
- Phase 2-A-3b-1 基準 commit: `706358e`（実装 `9eea086`＋安全補正）
- 本番確認: 利用者実測による **GO（2026-07-04）**。詳細: `docs/audit/41_phase2a3b1_production_confirmation.md`・doc14 §41
- （前々基準: Phase 2-A-3a = Company Brain read-only 可視化の本番確認 GO（一度 HOLD → 再実測で解消）。以下は当時の記録として保持）
- Phase 2-A-3a 実装 commit: `9533488`
- 本番確認: 利用者実測による **GO（2026-07-03・HOLD解消の再実測）**。詳細: `docs/audit/38_phase2a3a_hold_resolution_go.md`・doc14 §40（HOLD の経緯は doc37・§39）
- （前々基準: Phase 2-A-2 = Company Brain schema 変更の本番確認 GO。以下は当時の記録として保持）
- Phase 2-A-2 実装 commit: `ca18450`
- 本番確認: 利用者の Vercel Production / 本番画面実測による **GO（2026-07-02）**。AI が本番接続確認したものではない。
- 詳細: `docs/audit/35_phase2a2_production_confirmation.md`・`docs/audit/14_release_stabilization.md` §38
- （前々基準: Phase 1-44 = Phase 1-43 `/admin/usage` の本番確認 GO。以下は当時の記録として保持）
- Phase 1-43 実装 commit: `ce858c7`
- Phase 1-44 完了基準 commit（本番確認 GO 記録）: `3e3409f`（※これは「現在 HEAD」ではなく Phase 1-44 の完了基準 commit。現在位置は git を参照）
- 本番確認: 利用者の Vercel Production `main` / CI / 本番画面確認による **GO（2026-07-01）**。AI が本番接続確認したものではない。
- 詳細:
  - `docs/audit/14_release_stabilization.md` §37
  - `docs/audit/15_monetization_usage_design.md` §33.1
  - `tasks/PROGRESS.md` Phase 1-43

## UsageEvent emit 対象（8種類・すべて本番 GO）

| # | 対象 | eventType | category | 本番GO |
|---|------|-----------|----------|--------|
| 1 | LeadMap export | `export.generated` | export | GO |
| 2 | AIOutput（apps/web） | `ai.output.generated` | ai | GO |
| 3 | admin danger-actions export | `export.generated` | export | GO |
| 4 | approvals outreach | `external_send.outreach` | external_send | GO |
| 5 | invoice-send | `external_send.invoice` | external_send | GO |
| 6 | dunning | `external_send.dunning` | external_send | GO |
| 7 | Webhook success | `webhook.delivered` | webhook | GO |
| 8 | worker 朝礼AI出力 | `ai.output.generated` | ai | GO |

- billing は全件 `usage_only`（**非課金記録**）。金額カラムなし。metadata は固定の非PIIキーのみ。
- 可視化は `/admin/usage`（read-only・audit:read ガード・tenantId スコープ・件数と quantity 合計のみ）。

## 現在の安全境界

- 課金なし
- 決済なし
- サブスクなし
- billable_candidate runtime 使用なし
- never_billable runtime 使用なし
- schema / migration / package / lock 変更なし
- 本番DB操作なし
- Prisma migrate 手動実行なし
- 外部送信なし
- 実メール送信なし
- Webhook 実送信なし
- worker / queue / outbox dispatch 手動実行なし

## Phase X（短期品質フェーズ）のタスク一覧（クローズ済み）

> **Phase X の残タスク表はクローズ**（完了記録は `docs/audit/32_phase_x_completion_record.md`・履歴は `tasks/PROGRESS.md`）。以下は完了実績の一覧。X-04 のみ任意候補として残る。

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase X-01 | 本番スモーク / E2E / 検証基盤整理（`docs/audit/26_phase_x01_verification_baseline.md`・GO） | 棚卸し完了（反映状態は git refs を正とする） |
| Phase X-02 | E2E smoke 実行の実証（`docs/audit/27_phase_x02_e2e_smoke_result.md`・環境GREEN／smoke 11本RED・原因特定済み） | 実証完了（反映状態は git refs を正とする） |
| Phase X-RM-01 | 長期構想17領域の非破壊統合＋Phase 2 ロードマップ／Feature Registry／各種 Matrix 作成（`docs/roadmap/00〜08`・`docs/audit/28_long_term_strategy_integration.md`） | 統合完了（反映状態は git refs を正とする） |
| Phase X-RM-02 | Roadmap Review / Gap Reconciliation（追加構想リストとの突合・IKEZAKI MCP/API Gateway 表記統一・分類23項目と Enshin OS 表記ルールの明文化。`docs/audit/29_phase_x_rm_02_roadmap_review.md`） | レビュー完了（反映状態は git refs を正とする） |
| Phase X-03 | E2E smoke green 化（X-03: label関連付け＋X-03b: セレクタ明確化。`docs/audit/30_phase_x03_e2e_green.md`・**smoke 11/11 green**） | green化完了（反映状態は git refs を正とする） |
| Phase X-RM-03 | Phase 2 入口条件の最終確定（`docs/audit/31_phase_x_rm_03_phase2_entry_review.md`・**入口レビュー READY/GO・Phase 2-A 実装は人間承認待ち HOLD**） | 判定完了（反映状態は git refs を正とする） |
| Phase X-CLOSE | Phase X 完了記録（`docs/audit/32_phase_x_completion_record.md`・**Phase X 完了 GO**） | 記録完了（反映状態は git refs を正とする） |
| Phase 2-A | Company Brain foundation の設計準備（doc31 §5 準備メモあり。三段承認: 設計docs→schema→実装） | 候補（**人間の個別承認待ち**） |
| Phase X-04 | 本番スモーク定型化／検証準備 script 化／残り E2E 11スペックの段階実行 | プレイブック docs-only 完了（doc49・判定 GO）。script化・E2E拡張は別承認の残候補 |

## 次にやること（人間が選択）

1. **CaseStudyConsent UI 本番確認記録（doc88）の push（push-only・別承認。feature＋main）**。
2. **突合判定の設計・実装判断（doc83 §9 段階3・validateCaseStudyConsent 拡張・否定系テスト・安全ゲート・別承認）**。
3. **Customer Pain の扱い判断（高機密ラベル対応が先・別承認）**。
4. **Stage 2 / Stage 3 / ★2 / UX改善（随時・別承認）**。
5. **CI / Test / Release Governance 等の品質基盤強化（別承認）**。
- いずれの場合も **3c-5 の解禁・外部LLM送信・高機密ラベル解禁・Phase 8 実課金・ENSHiN OS 外部発信には、個別人間承認なしに進まない**。

## 今は絶対にやらないこと

- 実課金
- Stripe 等の決済連携
- billable_candidate / never_billable の runtime 使用
- usage cap / alert
- tenant 横断 usage dashboard
- raw metadata viewer
- 個人情報・本文・金額の表示
- schema / migration
- 外部送信
- AI 自動実行範囲の拡張
