# Phase 4（AI Workforce）完遂 v1 — 証拠段階と担当分け

- Stream: **P4-WORKFORCE（AI社員 / Control Plane / Workflow / 承認再開）**
- Branch: `claude/p4-finalize-v1`（base = main `a758d17`）
- Evidence 段階目標: 安全スコープを **CI_VERIFIED**（MAIN_MERGED / PRODUCTION は人間 Gate）
- 外部作用: **なし**（外部送信・実支払・課金・実 LLM・削除ゼロ）。**DB スキーマ変更なし**。

## 1. 本番稼働中の Phase 4（安全スコープ・既に main）

| 機能 | 実体 | 段階 |
|---|---|---|
| AI Control Plane（read-only） | `/ai-control`・`packages/shared/src/control-plane.ts` | 本番（#35） |
| Workflow Dry Run（仮想実行のみ） | `/workflows`・`packages/shared/src/workflow-dryrun.ts` | 本番（#35） |
| 承認再開ブリッジ（人間approve→内部再開/reject） | `apps/web/lib/ai-gate-bridge.ts` | 本番（#35） |
| AI社員8名 parity（一覧/詳細/3D 同一正本） | `ai_agents_parity.spec.ts` | 本番 |

**安全設計（不変）**: approve の「再開」は内部処理のみ。AI は承認・削除・外部送信を持たない。
実行系（自動化の有効化・保存）は Draft PR #20/#25/#26 に実験 lane として残し、本番へは入れない。

## 2. 本 PR（`claude/p4-finalize-v1`）の変更 — 監査分類の正確性（Codex V77 継承候補）

Codex V77（PR #43）の最新main静的再監査で挙がった継承候補のうち、**コードで閉じられる監査の正確性**を修正。

- **`lib/domains/growth/control-tower.ts`**: finance 機密（原価・粗利・未回収の件数）に触れた閲覧の
  `DataAccessLog.label` を `INTERNAL`（社内）→ **`FINANCIAL_CONFIDENTIAL`（財務機密）** へ。機密度の過小評価を是正。
  財務非表示の閲覧は `read` / `INTERNAL` のまま（機密に触れていない＝過大評価もしない）。
- **`app/(app)/growth/referral/page.tsx`**: 候補一覧の監査 `actorType` を固定 `'user'` →
  **`user.isAi ? 'ai_agent' : 'user'`** へ。一覧は AI ロールも閲覧できるため、AI 閲覧を人間の記録として
  誤帰属しない（既存作法 `lib/security/policy.ts` に統一）。プレビュー分岐（人間のみ到達）も同作法で fail-safe 化。
- **E2E 追加**:
  - `growth_control_tower.spec.ts`: 財務権限者の閲覧＝`confidential_view` / `FINANCIAL_CONFIDENTIAL`、
    財務非表示の閲覧＝`read` / `INTERNAL` を実 DB で検証。
  - `referral_readonly.spec.ts`: AI 閲覧の一覧監査＝`actorType: 'ai_agent'`、人間閲覧＝`'user'` を実 DB で検証。

referral の候補選択（`classified.find`）は取得元 `customers` が既に自 tenant ＋可視ラベル限定
（`page.tsx:51-52`）のため tenant 安全。上記 E2E（別 tenant 非表示・sentinel 0）で担保済み。

## 3. 検証（ローカル・実 PostgreSQL / 実 Redis）

- **BullMQ 実 queue（実 Redis loopback）**: `bullmq_real_queue.itest.ts` **9/9 passed**
  （retry・attempts 上限・secret 走査 0・重複 jobId 収束・承認前実行禁止・reject 済み再開禁止・tenant 分離・worker 再起動整合）。
- **Phase 4 E2E（実 UI・実 PG・直列）**: control_plane / ai_gate_bridge / ai_agents_parity /
  workflow_dryrun / growth_control_tower / referral_readonly = **57/57 passed**。修正2 spec 単独も **20/20**。
- 単体 **568 passed** / typecheck clean / lint clean / build 成功。

### 既知のテスト観察（コード欠陥ではない）
`ai_agents_parity.spec.ts` は list→detail→3D の3画面で同一 agent 状態の一致を自己参照で検証する。
承認ゲートを触る別 spec と**並列**で回すと、読み取りの間に seed の承認状態が変わり不一致になり得る
（直列・単独・CI フルスイート 218/0 では顕在化しない）。本 PR は passing テストを不用意に触らず、
将来のハードニング候補として記録する（fixture 隔離 or 3状態の近接取得）。

## 4. 「やり切る」の境界 — 担当分け

### 私（Claude）が実施済み / 実施可能
- ✅ 最新 main 上での Phase 4 独立 E2E 再検証（証拠再取得）
- ✅ BullMQ 実 queue 証拠（ローカル実 Redis）
- ✅ Codex 継承候補の監査分類コード修正 ＋ E2E
- ✅ 全電池 green ／ PR 作成 → CI green → マージ待ち提示

### 人間（あなた）にしかできない Gate / 恒久封印
1. **CI に Redis service を追加**（`.github/workflows/ci.yml` は Claude 編集禁止領域）
   → BullMQ 実 queue 証拠を CI で常時化するには許可 or 直接編集が必要。現状はローカル実測が正本。
2. **本番 worker/Redis の実稼働・stalled recovery の本番証拠**（本番インフラ = 人間 Gate）。
3. **実 LLM 実行・外部送信・課金・実支払**（恒久 HUMAN_ONLY・「AI は外部送信を持たない」を崩さない）。
4. **main への merge 承認**（本番自動デプロイ）。
5. **Vercel Preview / Production の Ready 目視**。

## 5. 非対象（別 Gate）
実行系の有効化（自動化の保存・enqueue）、実送金・税務断定は HUMAN_ONLY。Production Verified への
格上げは人間の Preview lineage 照合後。「全機能完成」「脆弱性ゼロ」は宣言しない。
