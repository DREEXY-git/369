# v5.8 Claude x Codex 独立再レビュー

- 実施日: 2026-07-11
- 対象: PR #3/#4/#5/#6/#9
- 制約: Claude管理コードはread-only。main merge、本番、DB、Secrets、外部送信、実LLM、課金への接触なし

## 固定SHA

| PR | head | CIログ本文 |
|---|---|---|
| #3 feature | `300443b2e7b13b75e2c1e7e8f2c8cb4ee62d55d8` | #222: unit 278 / E2E 93 |
| #4 Stream A | `95c89366c45d26abacae9ae6214819b8c4425974` | #212: E2E 99 |
| #5 Stream B | `4954e9b660a49b25353062e49f3f5b40c02faa23` | #214: unit 312 / E2E 100 |
| #6 Stream C | `188c44200b14b2bfb1e8076377d8b20d58eb1074` | #216: unit 318 / E2E 103 |
| #9 Stream D | `9e31bf9af775accc37949ee17fc84edba4179699` | #220: unit 322 / E2E 103 |

## 結論

- Critical: 0
- High: 1件未解消、1件はコード＋unitで修正候補だが統合証拠不足
- Draft/HOLD: 継続

High-2のworker例外握り潰しは、FAILED記録後にマスク済みの新規Errorを再throwし、`jobs.ts`もcatchしない構造へ修正された。unitとCIはgreen。ただしBullMQ実queueのretry/failed telemetryを観測する統合テストはない。

High-1のsecret maskは既知Bearer/JWT/Cookie通常header/JSON token/改行tokenを遮断するが、最新関数の独立実行で次の秘密値残存を再現した。

1. quoted JSON Authorization: `{"authorization":"ApiKey <secret>"}`
2. quoted JSON Cookie: `{"cookie":"sid=<secret>"}`
3. folded Cookie: `Cookie:\n sid=<secret>`

DBの`AIAgentRun.error`とaction summaryへ二次保存され得るため、High-1は未解消。

## Medium再判定

| Finding | v5.8判定 | 根拠・残件 |
|---|---|---|
| M1 二重Run atomicity | PARTIAL / HOLD | create後の全順序比較で収束を緩和。DB原子性・unique/idempotencyは未実装 |
| M2 AIApprovalGate人間判断 | PARTIAL / BLOCKED | `/approvals` read-only一覧は追加。判断・resume bridgeなし |
| M3 dealId直POST | IMPLEMENTATION_FIXED / EVIDENCE_GAP | customer label条件と拒否監査を確認。攻撃再現E2Eなし |
| M4 権限判定前customer取得 | FIXED | 3ページで権限判定後のlabel条件付き別queryを確認 |
| M5 SEO入力/output上限 | FIXED | action入力上限、既存title clamp、Zod output maxを確認 |
| M6 遷移とGate/Action整合 | PARTIAL | CAS失敗時のGate作成は遮断。run遷移とGate/Action全体はtransactionではない |
| M7 承認待ち二重計上 | OPEN | `runsNeedsApproval + gatesPending`が残存 |
| M8 異unit合算 | OPEN | `sumByEvidenceClass`がunitを見ず加算 |
| M9 profile視覚証拠 | PARTIAL | 4画像へ増加。mobile profileはsticky headerで人物ヘッダー上部が欠ける |
| M10 desktop初期空表示 | FIXED | 最初のAI社員を初期選択しfirst viewportへ表示 |
| M11 3D nameplate click | OPEN | nameLabelをgroupへ追加するだけでraycasterの`clickable`へ未登録 |

Lowのemoji依存はLucide/決定論的Canvas記号へ変更され、主要本文サイズも改善された。

## Artifact目視

CI #220 artifact `8248710661`の4画像を独立取得して確認した。

- desktop: 3D scene非blank、初期プロフィール表示あり
- desktop profile: 性格・スキル・特徴・ミス・評価を確認
- mobile: 一覧表示まで確認
- mobile profile: 内容は確認できるがsticky headerが人物ヘッダー/ポートレート上部へ重なる

CI greenはnameplate click、BullMQ retry、成果集計の意味整合を証明しない。

## 統合dry-run

最新refsで実mergeせず`git merge-tree`を実行した。

1. feature `300443b` + Stream A `95c8936`: clean
2. 上記合成 + Stream B `4954e9b`: content conflict 2件
   - `apps/web/components/shell/nav.ts`
   - `packages/shared/src/index.ts`
3. B -> C: ancestor（C ahead 3 / behind 0）
4. C -> D: ancestor（D ahead 5 / behind 0）

最新feature->AとA->Bはdivergedであり、「最新headがfeature->A->B->C->Dへ統合済み・競合ゼロ」とは記録できない。A/B競合で広告・SEO・3D導線と全shared exportを保持し、統合候補へC/Dを重ねて全CIを再実行する必要がある。

## 原典・台帳

Codex環境では期待raw SHAと一致する原典でgenerator `--check`が成功済み。50カテゴリ、2,553原子機能、7,485 Stable IDs、C49のみsource gapを確認した。`SOURCE_RECHECK_WAITING`は技術的には解消可能だが、High・Medium・統合競合・人間GOとは別Gateである。

## 次の必須順

1. High-1の追加3経路を修正し、否定テストを追加
2. PR #6のM7/M8を修正
3. PR #9のM11とmobile artifact重なりを修正
4. feature+A+B統合候補で2競合を全機能保持して解消
5. C/Dを重ね、unit/typecheck/lint/build/safety/E2Eとartifactを再取得
6. BullMQ実queue retryは統合テスト、または明示した`EVIDENCE_GAP`としてGate判断

「脆弱性ゼロ」「完全無欠」「全機能完成」は宣言しない。
