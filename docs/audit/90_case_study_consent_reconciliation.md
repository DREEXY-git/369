# 90. CaseStudyConsent 突合判定実装 — validateCaseStudyConsentReconciliation（純粋関数のみ・判定 GO）

> doc89（突合判定設計・READY / GO）準拠の最小実装記録。実装範囲は **純粋関数＋否定系テスト＋安全ゲート**のみ（doc89 §13 の段階2＋4に相当）。
> **DB 読み出しなし・CaseStudy 保存条件への接続なし・actions/company-brain-reference/UI 変更なし・schema/migration/seed/package 変更なし・doc14 追記なし・本番接触なし・外部送信なし・実LLMなし・AIコストなし・push なし（commit-only）**。
> プロダクト基準は本記録 commit ではなく **CaseStudyConsent UI / `1913456`** のまま。

---

## 1. 非エンジニア向け要約

- 「許諾あり（granted）」を本物とみなす前の**照合の頭脳（突合判定の純粋関数）**ができました。名前は **validateCaseStudyConsentReconciliation**。台帳の行・現在時刻・対象用途を渡すと「有効な許諾があるか」を理由つきで返します。
- ただし**まだどこにも接続していません**: 事例の保存条件にも・AI参照にも・画面にも使われていない＝**今日の挙動は何も変わりません**。接続（保存条件・AI参照・実名解禁）はそれぞれ別の人間承認です。
- 「接続や解禁がこっそり混ざらない」ことを**自動見張り（安全ゲート）が機械検査**するようにしました: 保存条件への接続・匿名化の門番の変更・AI参照への接続が同じ変更に入ったら CI が FAIL します（**段階分離**）。
- 検証: 安全ゲート・**test 250**（+20本）・型・lint・ビルド すべて green。判定: GO。

## 2. 実装内容と変更ファイル

| ファイル | 内容 |
|---|---|
| `packages/shared/src/case-study-consent.ts` | **validateCaseStudyConsentReconciliation を追加**（既存の validateCaseStudyConsent / validateCaseStudyConsentInput は無変更）。**純粋関数**: **DB 読み出しなし**・Prisma import なし・非同期なし・now は引数・suppressed は boolean 引数（SuppressionList 照会は呼び出し層の責務）・evidence は存在確認のみ（本文は判定に使わない）。入力型（CaseStudyReconciliationCaseStudy / ConsentRow）と安定した理由コード17種を定義 |
| `packages/shared/src/__tests__/case-study-consent.test.ts` | **突合判定テスト20本追加（test 230→250）**: 肯定系1本＋**否定系**18本（doc89 §11 の17本案＋unknown status を分離して18本）＋混在行1本（無効行と有効行の混在は有効行で OK）。既存の入力検証テストは無変更 |
| `scripts/check-company-brain-safety.mjs` | **段階分離の機械検査を追加**: ①関数と否定系テストの存在 ②shared に Prisma 非混入（純粋関数の境界）③**case-studies/actions.ts に接続が混ざったら FAIL**（保存条件接続は別承認）④**canDisableAnonymization の既定実装が変わったら FAIL**（anonymized=false 解禁は別承認）⑤**company-brain-reference に突合/台帳参照が混ざったら FAIL**（AI参照条件変更は別承認）。既存検査は全維持 |

## 3. 判定条件（doc89 §5 の15条件を実装）

- 事前条件: targetPurpose が6区分のいずれか／consentStatus=granted／archivedAt null／publishStatus private／label NORMAL・INTERNAL／suppressed=false。
- 台帳行の照合: 行が存在／tenantId 一致／caseStudyId 一致／status granted（revoked・unknown は拒否）／revokedAt null／expiresAt が now より未来／purpose に対象用途（空・未知値・不一致は拒否）／evidence 非空／grantedById 非空。
- **1行でも全条件を満たせば ok**。満たす行が無ければ最初の照合行の最初の不成立条件を理由として返す（決定的）。
- 戻り値: `{ ok: true }` / `{ ok: false, reason: '...' }`（reason はテスト可能な安定文字列17種）。

## 4. 接続していないこと（段階分離・機械検査つき）

- **CaseStudy 保存条件への接続なし**（anonymized=false 保存時の突合必須化は doc89 §13 段階3・別承認。ゲートが混入を FAIL で検知）。
- **anonymized=false は未解禁**（匿名化の門番 canDisableAnonymization は無変更。実装が変わったらゲートが FAIL）。
- **AI参照条件変更なし**・**CaseStudyConsent は AI 文脈へ注入しない**（company-brain-reference 無変更・接続が混ざったらゲートが FAIL）。
- externalAiAllowed true UI なし・publishStatus UI なし・物理削除禁止（既存検査を全維持）。
- **外部送信なし・実LLMなし・AIコストなし**・PR配信なし・SEOページ公開なし・SNS投稿なし・顧客の声公開なし。

## 5. 検証結果（ローカルのみ・本番接触なし）

| 検証 | 結果 |
|---|---|
| node scripts/check-company-brain-safety.mjs | ✅ passed（actions: 4, ui files scanned: 156・**段階分離検査込み**） |
| pnpm test | ✅ **250/250 passed**（230→250・突合判定20本追加・既存無変更） |
| pnpm typecheck | ✅ 全 workspace green |
| pnpm lint | ✅ green |
| SKIP_DB_SETUP=1 pnpm build | ✅ 本番ビルド成功 |
| E2E smoke | 未実施（UI 変更なし・app 挙動不変のため。**未実施のものを成功扱いしない**） |
| prisma migrate | 不要（schema/migration 無変更） |

## 6. Evidence Map / Assumption Log / Unknowns Log / Risk Register / Definition of Done

**Evidence Map**: ①「設計準拠」→ doc89 §5/§10/§11/§12 との対応（本書 §2〜§4）②「純粋関数の境界」→ 実装（Prisma import なし・now/suppressed 引数）＋ゲートの機械検査 ③「reject 条件を落とさない」→ 否定系テスト18本の実行 green ④「接続ゼロ」→ 本ミッションの grep 実測（actions/company-brain-reference に参照 0件）＋ゲートの段階分離検査 ⑤「既存回帰なし」→ test 250（既存230本無変更）・build green。
**Assumption Log**: ①reason は最初の照合行の最初の不成立条件（複数行時の優先順位は実装承認時に必要なら再設計）②suppressed の照会（customerId → Customer → subject 解決）は接続時の呼び出し層で設計（doc89 Assumption 踏襲）③FakeLLM 継続。
**Unknowns Log**: ①保存条件への接続の §0 承認形式（doc89 §13 段階3）②anonymized=false の扱い判断（段階6・人間）③reason コードを UI 表示に使うか（接続時判断）。
**Risk Register**: 最大=接続・解禁の同時混入 → ゲート3種（保存条件・門番・AI参照）で機械遮断済み。次点=純粋関数への DB 依存混入 → Prisma import 検査で遮断。関数は未接続のため本番挙動への影響はゼロ。
**Definition of Done**: Scout ✅／read-only 監査 ✅／純粋関数（15条件・理由コード）✅／否定系テスト20本 ✅／安全ゲート（段階分離3種込み）✅／検証全green（gate・test 250・typecheck・lint・build）✅／doc90・CURRENT_STATE・PROGRESS・vault ✅／commit ⏳（ゲート後）／**push なし** ⏳（別承認）。

## 7. 次回推奨プロンプト案

> ①**doc90 commit の push-only**（feature→main・fast-forward・別承認）。②push 後の人間判断（いずれも別承認・いきなり実装しない）: **保存条件への接続の承認判断**（doc89 §13 段階3。anonymized=false の扱い（段階6）とセットで設計するか、接続だけ先行するかの人間選択から）／Customer Pain の扱い判断（高機密が先）／Stage 2・3・★2・UX／品質基盤強化。外部LLM送信・高機密ラベル解禁・Phase 8・ENSHiN OS外部発信には個別承認なしに進まない。

## 8. 判定

**判定: GO**（突合判定の純粋関数・テスト・ゲートまで完了・接続ゼロ）。**anonymized=false は未解禁・AI参照条件変更なし**・プロダクト基準は **CaseStudyConsent UI / `1913456`** のまま（本記録は本番確認記録ではないため昇格しない）。
