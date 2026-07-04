# 57. Phase 2-B-4 — SalesPlaybookEntry 人間書き込み（作成・編集・アーカイブ）（判定 GO・commit-only）

> 実装ミッション（3操作＋writeAudit＋一覧ボタン＋smoke 17本目）。**schema・migration・seed・rbac・labels・package/lock は無変更。**
> フェーズ: Phase 2-B-4 / 現在位置は git refs を正とする。
> 前例: 2-A-3b-1（doc39＋doc40 安全補正）・2-A-3b-2（doc42）で実証済みの型を流用。設計の正: doc51。
> **本番確認は未実施**（push も未実施・commit-only）。GO済み基準は Phase 2-B-3 / `a2bb2b6` のまま。

---

## 1. 非エンジニア向け要約

- 営業プレイブックを**人間が本番UIで育てられる**ようになりました: 作成・編集・アーカイブの3操作です。
- 安全の型は会社方針・商品カタログと同じです: **AIは書き換えできません**・消せません（アーカイブのみ）・機密ラベルは2択のみ・外部AI送信の許可はこの画面からは変更できません。
- 画面には**入力ガイド**を明記: 「顧客名・会社名・個人名・成果数値・口コミ・顧客の声を書かない（事例は Case Study 領域で扱う）」「外部公開素材ではない」「実価格を書かない」。
- 検証はすべて green（テスト211・型・lint・build・**smoke 17/17**・既存回帰なし）。まだローカル commit のみで、push・本番確認はこれからです。

## 2. Phase 2-B-4 の目的

営業プレイブック（売り方の型）を実運用に乗せる第一歩として、人間による書き込み（create / update / archive）を、Phase 2-A-3b で確立した安全境界つきの型で実装する。

## 3. 変更内容

| # | ファイル | 内容 |
|---|---|---|
| 1 | `apps/web/app/(app)/brain/playbooks/actions.ts` 新規 | **3操作**: createSalesPlaybookEntryAction / updateSalesPlaybookEntryAction / archiveSalesPlaybookEntryAction。各 action は requireUser → **isHumanUser（AI mutation禁止: AIロールは権限にかかわらず一律拒否・rbac.ts 無変更）** → hasPermission（create=knowledge:create / update・archive=knowledge:update）→ 入力検証 → tenantId スコープ（update/archive は archivedAt:null の対象のみ）→ prisma → **writeAudit（3操作すべて記録）** → revalidatePath('/brain/playbooks')。**物理削除なし**（delete/deleteMany 不使用・archive は archivedAt 設定のみ）。**externalAiAllowed は create で false 固定・update で不変更**。**label は NORMAL / INTERNAL のみ**（ALLOWED_LABELS 2択）。playbookType は approach / objection / preparation / talk_track の4種のみ。relatedPolicyIds / relatedProductCatalogItemIds の**参照選択 UI は今回未実装**（作成時は空のまま・将来拡張候補）。sourceType は 'manual' 固定・sourceNote は任意入力 |
| 2 | `apps/web/app/(app)/brain/playbooks/new/page.tsx` 新規 | 作成フォーム（knowledge:create ガード・label 2択・externalAiAllowed 入力欄なし・**入力ガイド明記**・エラーメッセージ・キャンセル導線） |
| 3 | `apps/web/app/(app)/brain/playbooks/[id]/edit/page.tsx` 新規 | 編集フォーム（knowledge:update ガード・tenantId＋archivedAt:null のみ・高機密ラベルの場合は編集フォームを出さない・label 2択・externalAiAllowed 変更欄なし・**入力ガイド明記**） |
| 4 | `apps/web/app/(app)/brain/playbooks/page.tsx` 編集 | read-only 表示は維持しつつ、canCreate で「新規作成」リンク・canUpdate で「編集」「アーカイブ」導線（form action）・denied バナーを追加。説明文を仕様変更に合わせて更新: **「権限がある人間ユーザーのみ作成・編集・アーカイブできます。AIは書き換えできません。」**。タブ導線維持・物理削除ボタンなし・externalAiAllowed true 導線なし |
| 5 | `apps/web/tests/e2e/smoke.spec.ts` 編集 | **16本目を意図的に期待値更新**（削除ではない・doc57 §5 参照）＋**17本目を追加**（作成フロー）。skipなし |

## 4. 入力ガイド（運用上のルール・画面に明記）

- **顧客名・会社名・個人名・成果数値・口コミ・顧客の声・testimonial・SNS投稿文・外部公開素材を書かない**（事例は Case Study 領域＝許諾管理とセットの別承認）。
- **実価格・請求・見積・課金に接続する金額を書かない**。
- 機械的な禁止ワード検査は誤判定が多いため実装せず、**UI のガイド表示＋運用**で担保する（doc51 §4-3 の方針どおり。doNotSay 欄には No.1表記・効果保証・誇大広告の禁止例を蓄積できる）。

## 5. smoke の変更（意図的な期待値更新の記録）

- **16本目**: read-only 段階の期待値「新規作成リンク0件・アーカイブボタン0件」は Phase 2-B-4 の仕様変更（権限のある人間に作成導線が出るのが正常）に伴い成立しなくなるため、**意図的に更新**した（テスト削除ではない）。新しい16本目は**ナビHOLD（doc55→doc56）の教訓を反映し、URL直打ちではなくナビの「営業プレイブック」リンク経由で遷移**して一覧表示を確認する。
- **17本目（新規）**: 一覧の「新規作成」→ フォーム入力（架空データ・PII/実価格/口コミ/顧客の声なし・label INTERNAL）→ 作成 → 一覧に表示、を確認。
- 既存15本は無変更・skipなし。

## 6. 検証結果（全green）

| # | 検証 | 結果 |
|---|---|---|
| 1 | DB URL localhost 確認（値非表示） | ✅ |
| 2 | pnpm db:generate | ✅ |
| 3 | pnpm test | ✅ **211 passed（23 files）** |
| 4 | pnpm typecheck | ✅ exit 0 |
| 5 | pnpm lint | ✅ exit 0 |
| 6 | SKIP_DB_SETUP=1 pnpm build | ✅ Compiled successfully・/brain/playbooks・/new・/[id]/edit の3ルート生成確認 |
| 7 | PostgreSQL 起動 → pnpm db:migrate:deploy | ✅ **No pending migrations**（schema変更なしの裏付け） |
| 8 | pnpm db:seed（ローカルDBのみ・seed.ts は無変更） | ✅ playbooks: 6 |
| 9 | production server 起動 → /login HTTP 200 | ✅ 200 |
| 10 | Playwright smoke | ✅ **17/17 green（14.1s）・既存15本回帰なし・16本目更新後green・17本目green** |
| 11 | 後片付け（server・PostgreSQL 停止） | ✅ 完了 |

- 修正ループ: **0回**。
- **本番確認は未実施**。**AI が本番接続確認したものではない**（ローカルDBのみ・本番には一切触れていない）。

## 7. 安全境界の遵守（変更していないもの）

- **AI mutation禁止**（actions 層・rbac.ts 無変更）・**writeAudit** 3操作すべて・**物理削除なし**・**label 2択**・**externalAiAllowed封印**（true にする UI なし）。
- **writeDataAccess / ai_reference は未実装**: AI はまだ営業プレイブックを読まない（company-brain-reference 無変更）。AI参照は **2-B-5 の別承認**。
- **schema / migration なし・seed 変更なし・rbac / labels 変更なし**・package / lock / .env / vercel.json 無変更。
- 外部送信なし・SNS投稿なし・口コミ投稿なし・顧客の声公開なし・**ENSHiN OS 外部発信なし**・**Phase 8なし**・MCP/API公開なし・本番DB操作なし。
- **push なし（main も feature も未実施・commit-only）**。

## 8. 判定と次アクション

- **判定: GO（Phase 2-B-4 実装完了・smoke 17/17 green・commit-only）。**
- **GO済み基準は Phase 2-B-3 / `a2bb2b6` のまま**（本番確認前のため昇格しない）。
- 次アクション（いずれも別承認）:
  1. 本 commit の push-only（feature＋main）。
  2. 本番確認（doc49 の型・利用者実測・doc58 候補）: 作成→編集→アーカイブの1周・ラベル2択・監査ログ・既存画面無回帰（2-A-3b-1-PROD=doc41 と同じ形）。
  3. **Phase 2-B-5（AI参照追加）の承認判断**。
- **Phase 2-B-5 には勝手に進まない。** 将来拡張候補: relatedPolicyIds / relatedProductCatalogItemIds の参照選択 UI。
- 参照: 設計=doc51／read-only=doc54／本番確認の型=doc49／書き込みの前例=doc39・doc40・doc42。
