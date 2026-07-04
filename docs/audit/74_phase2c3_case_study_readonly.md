# 74. Phase 2-C-3 — CaseStudy read-only 画面＋架空 seed（判定 GO）

> Phase 2-C-2（CaseStudy schema・本番確認GO済み基準 `b012bd0`）の器に、**架空 seed デモデータと閲覧専用画面**を追加した記録。Mode E（最小実装）。
> **schema変更なし・migration変更なし・Server Actionなし・writeAuditなし・AI参照なし・外部送信なし・実LLMなし・AIコストなし・本番接触なし・push なし（commit-only）**。

---

## 1. 非エンジニア向け要約

- 顧客事例（Case Study）が初めて**画面で見える**ようになりました。ただし**閲覧のみ**です。作成も編集も削除もまだできません（次の段の別承認から）。
- 表示されているのは**すべて架空のデモデータ4件**（美容室・イベント主催・小売・飲食の匿名想定事例）。実在の顧客名・成果の数値・顧客の声は一切入っていません。
- 画面にも「社内参照専用・公開しない・外部AI送信禁止・架空デモデータ」の注意書きを明記し、**顧客名・成果数値・顧客の声は許諾なしに扱わない**運用を画面上でも見えるようにしました。
- 自動テスト216本・型・lint・ビルド・ブラウザテスト **smoke 19/19**（1本追加・既存18本回帰なし）すべて green。判定: **GO**（ローカル検証まで。本番確認は push 後の別手順）。

## 2. 実際の変更（4ファイル＋docs）

| ファイル | 内容 |
|---|---|
| `packages/db/prisma/seed.ts` | CaseStudy の**架空 seed 4件**を追加（追記のみ・既存 seed 無変更）＋counts に caseStudies 追加 |
| `apps/web/app/(app)/brain/case-studies/page.tsx` | **閲覧専用一覧（新規）**。requireUser → knowledge:read 判定 → tenantId スコープ → archivedAt:null・publishStatus='private'・label NORMAL/INTERNAL のみ表示 |
| `apps/web/components/shell/nav.ts` | ナビ「会議・ナレッジ」節に「顧客事例」1行追加（BookMarked アイコン import 含む・最小差分） |
| `apps/web/tests/e2e/smoke.spec.ts` | 19本目を追加（ナビ経由到達・架空タイトル表示・**作成ボタンなし・編集ボタンなし・削除ボタンなし**の確認） |

- **作らなかったもの（境界）**: actions.ts なし（Server Actionなし・書き込み経路ゼロのまま）／new・edit ページなし（**作成ボタンなし・編集ボタンなし・削除ボタンなし**・アーカイブボタンなし）／**AI参照なし**（company-brain-reference.ts 無変更）／**writeAuditなし**（書き込みが無いため対象操作が存在しない。2-C-4 で実装）／externalAiAllowed を true にする UI なし。
- **schema変更なし・migration変更なし**・CustomerPain なし・ConsentRecord/SuppressionList/Customer/labels.ts/RBAC/package/lock 無変更。

## 3. seed の安全条件（全4件共通・実測）

- タイトルに「（架空）」明記・本文に「この事例は架空のデモデータです」明記。実在企業名・実在顧客名・実成果数値・実際の顧客の声・口コミ文なし（結果は定性的表現のみ・「数値は許諾のある実事例ができるまで記載しない」と本文にも明記）。
- **anonymized: true（匿名化済み）／publishStatus: 'private'（非公開）／consentStatus: 'none'（許諾なし＝匿名のみ）／externalAiAllowed: false**／label は NORMAL 2件・INTERNAL 2件のみ／customerId・consentRecordId 未設定／archivedAt null。
- 既存 seed（policies 5・catalogItems 8・playbooks 6 ほか）は無変更。seed 実行結果: `caseStudies: 4`。
- 注記: Gate の seed 全文 grep で「口コミ」がヒットするが、**すべて既存の営業プレイブック/カタログ seed の既存行**（「口コミ評価が高い美容室…」等・2-B-3 以前から存在・今回 diff には含まれない）。今回追加した CaseStudy 行には口コミ・顧客の声・実数値は無い（追加行のみの grep で 0 件を確認）。同様に seed 全文 grep の TRUNCATE ヒット（line 35）は**既存のデモ再投入機構（CLAUDE.md 記載の仕様・今回 diff 外）**であり、追加行に破壊的パターンは 0 件。

## 4. 画面の安全条件（実測）

- 権限: requireUser＋`hasPermission(user, 'knowledge', 'read')`（既存 brain 3画面と同一の型）。tenantId スコープ必須。
- 表示対象: archivedAt null・**publishStatus 'private' のみ**・label NORMAL/INTERNAL のみ（高機密は表示対象にしない）。
- 注意書きを画面に明記: 「この画面は社内参照専用の閲覧のみ（read-only）」「架空デモデータ」「外部に**公開しない**・外部AI送信禁止」「顧客名・取引先名・成果数値・顧客の声は**許諾なしに扱わない**」。実名や公開を促す文言なし（**SNS投稿しない・PR配信しない・SEOページ公開しない**方針のまま・公開機能は存在しない）。
- 匿名化・許諾・公開状態を1事例ごとにバッジ表示（匿名化済み／許諾なし（匿名のみ）／非公開）。

## 5. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| pnpm db:generate | ✅ 成功 |
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 3, ui files scanned: **148**＝新画面1枚が走査対象に増え、externalAiAllowed UI なしを機械確認） |
| pnpm test | ✅ **test 216**/216 passed（23 files） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| ローカルPG＋seed | ✅ ローカル localhost:5432 のみ（値非表示確認済み・本番DB接続なし）・`caseStudies: 4` |
| E2E smoke | ✅ **smoke 19/19 green**（19本目=顧客事例 read-only・**既存18本回帰なし**） |
| 後片付け | ✅ server 停止（curl 000）・pg_ctl -m fast stop 完了 |

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「閲覧専用」→ 画面ファイルに Server Action import なし・actions.ts 不存在・smoke 19本目で作成/編集/アーカイブ UI の 0 件を機械確認 ②「架空のみ」→ seed 追加行の実測（（架空）prefix・匿名・定性的表現のみ）＋Gate の追加行 grep 0 件 ③「検証 green」→ §5 の実行出力 ④「既存回帰なし」→ smoke 既存18本 green＋既存 seed 無変更 diff ⑤「型の踏襲」→ brain/playbooks ページ（2-B-3/2-B-4）と同一構造。
**Assumption Log**: ①本番反映時も同じ表示になる（同一コード・本番確認は別手順）②seed は本番では自動実行されない既存前提（デモデータ投入は運用判断）。
**Unknowns Log**: ①本番での画面表示・ナビ表示の実測（push 後の利用者確認・2-B-3 のナビHOLD前例があるためハードリロード含む確認を推奨）②2-C-4 の書き込み設計詳細（匿名化解除の consentStatus=granted 前提条件・writeAudit・静的安全ゲートの CaseStudy 拡張）。
**Risk Register**: 最大リスクは引き続き**実顧客情報の混入**（低: 書き込み経路が存在しないため現段階では構造的に不可能。seed も架空固定）。次点はナビ表示のキャッシュ起因の一時的未表示（低・2-B-3 前例あり・ハードリロードで解消・コード起因ではない）。静的安全ゲートの CaseStudy 対応（actions 追加時の delete 禁止等の機械検査）は 2-C-4 の承認範囲に含める。
**Definition of Done**: Scout 一致 ✅／read-only 監査 ✅／架空 seed 4件 ✅／閲覧専用画面 ✅／ナビ1行 ✅／smoke 19本目 ✅／検証全green（test 216・typecheck・lint・build・smoke 19/19・安全ゲート）✅／doc74・CURRENT_STATE・PROGRESS・vault 記録 ✅／commit ✅／**push なし** ⏳（別承認）。

## 7. 次回Claude Codeに渡す推奨プロンプト案

> doc74 実装 commit の push-only（feature→main・fast-forward・別承認）。push 後、本番確認（利用者実測・§0 テンプレート: Vercel Ready/build green・ナビ「顧客事例」表示・一覧に架空4件・作成/編集ボタンなし・既存画面無回帰）。その後 **Phase 2-C-4 — CaseStudy 人間書き込み（作成・編集・アーカイブ＋AI mutation禁止＋writeAudit＋匿名化/許諾の前提条件制御＋静的安全ゲート拡張・doc76 候補）** の承認判断。

## 8. 判定

**GO**（Phase 2-C-3 実装・ローカル検証まで完了）。GO済みプロダクト基準は **Phase 2-C-2 / `b012bd0`** のまま（本番確認 GO までは昇格しない）。**push なし（commit-only）**・2-C-4 書き込み・2-C-5 AI参照・Customer Pain・高機密・公開機能はすべて別承認。
