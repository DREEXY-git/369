# Codex V74 Phase 3-4 Completion Independent Gate

- 監査日時: 2026-07-13 02:35 JST
- 監査者: Codex independent QA
- 対象: `P3-GROWTH`、`P3-Q2C`、`P35-CHANNELS`、`P4-WORKFORCE`
- 判定: **全workstream machine complete未到達 / HOLD**
- 初回監査時app main: `ffd586b8cd87ec407aad6ecd3e0ea4394aee1978`
- 最新追補時app main: `7efb22b43b781e485a4759fab4145792eeabe92e`
- 最新判定: PR #32/#33はmainへ統合済みだが、post-release P2 3件によりcompletion HOLD
- Production: Codex未接触。owner申告のReady/env安全確認は`V74_POST_RELEASE_REAUDIT_2026-07-13.md`で証拠範囲を分離

> この文書の第1〜7節は2026-07-13 02:35 JSTの初回固定監査である。その後のmain統合とP2再監査は`V74_POST_RELEASE_REAUDIT_2026-07-13.md`を最新正本とする。

## 1. 固定したGitHub実態

| 対象 | 固定SHA | tree | 状態 |
|---|---|---|---|
| PR #14 Phase 3 base | `ba01244ae2fb6b75e1ae2b9a718ba4e629a54425` | `2fa9c381ee28d694fedc9a6943701c1f997be701` | Draft |
| PR #18 C21 / release path | `fa04e7405cf3ab6cb56f329804fc778dde6470b0` | `e0ef935e7aa1075d8a371590c729bef14da5f842` | Human Preview済み、後継修正待ち |
| PR #20 Phase 4 Human Gate | `9080df1d4cafcee225775003700b219ac0522d64` | `3f2eb59bc43f2c67429ec3359426b72f3a63031c` | Human Preview済み、実queueはGap |
| PR #22 C19 | `e3c410cdbc3fae7f43fac978ef9ff037ba8cd505` | `4baa4284cc7f1e961d476863d8920ecd9a3a67b7` | `CHANGES_REQUIRED` |
| PR #23 C22 | `9209ef856523ae2e10a303849dc13a088e1f426c` | `98a6b63b59c3f7e8eecee80864257b771a11ca9a` | `CHANGES_REQUIRED` |
| PR #25 Control Plane | `c28b9bf5eb0f43a54b55890d24bc95ed10ed218d` | `29467f53e80ba3462a46eafe409e6ea06620ec3d` | `CHANGES_REQUIRED` |
| PR #26 Workflow Dry Run | `45bde82bc24b61ddcc76de74d2a4c8400468f6c0` | `c19b505cfa0a1deb94b84e85748f75694280e11b` | `CHANGES_REQUIRED` |
| PR #27 regression hardening | `bc8fbef0899485c79e4fcd4e98c3e528e8d07f98` | `e828152906cfa4b24a438e79307dc9f398239f8a` | 2ファイル修正、PR #18未伝播 |
| 旧RC #29 | `96172e5d2eec623a514970992ff1afef9d2613a4` | `e0ef935e7aa1075d8a371590c729bef14da5f842` | PR #18と同一tree、HOLD |

`CLAUDE_WIP_READY_*`または`CLAUDE_FIXED_*`の新しい固定headはScout時点で未受領。moving headへ最終判定は付けていない。

## 2. WIP判定

| WIP ID | workstream | 独立判定 | GitHub記録 | 再開条件 |
|---|---|---|---|---|
| `P3-R01` | P3-GROWTH | `CHANGES_REQUIRED / HOLD` | PR #29 comment `4952109079` | PR #27の限定伝播、20回以上の非弱体化反復、exact-head CI/artifact、後継RC |
| `P3-Q2C-01` | P3-Q2C | `CHANGES_REQUIRED / HOLD` | PR #18 comment `4952119286` | 契約RBAC、請求/入金/正式化の原子性、採番競合を実PGで修正 |
| `P35-C19-01` | P35-CHANNELS | `CHANGES_REQUIRED / HOLD` | PR #22 review `4680464389`、comment `4952103318` | P2002対象限定、業務意図の安定key、生成全体の監査原子性 |
| `P35-C22-01` | P35-CHANNELS | `CHANGES_REQUIRED / HOLD` | PR #23 comments `4951991026`、`4952108925` | 顧客名取得・link・監査・実在別tenant否定証拠 |
| `P4-CP-01` | P4-WORKFORCE | `CHANGES_REQUIRED / HOLD` | PR #25 comments `4951990981`、`4952108983` | reverse tenant、receipt状態、payload最小化、DataAccessLog |
| `P4-WF-01` | P4-WORKFORCE | `CHANGES_REQUIRED / HOLD` | PR #26 comments `4951991086`、`4952109025` | 未知危険操作fail-closed、否定文、URL/history入力0 |

## 3. 独立再現の要点

### P3-GROWTH

- PR #27の変更はtopbarと回帰testの2ファイルに限定されるが、PR #18および旧RC #29へ未伝播。
- 旧RC #29のtreeはPR #18と同一で、768px回帰修正を含まない。
- 後継固定head、20回以上の反復、exact-head artifactがないためmachine completeへ進めない。
- PR #18のHuman Preview証拠は固定SHA `fa04e74`の範囲で有効だが、後継headへ流用しない。

### P3-Q2C

固定head `fa04e74`でfinance純粋ロジック32/32はgreen。ただし次のDB・権限境界は未証明または欠陥を確認した。

1. `/contracts`は`requireUser()`後に`contract:read`またはpolicy guardを通さず、契約、金額、期間、条項、リスクを取得する。
2. 請求発行のInvoice更新、Receivable upsert、Auditが単一transactionではない。
3. 入金記録のPayment、Invoice、Receivable、FinanceEvent、Audit/GrowthEventが単一transactionではなく、並行入金はlost updateの可能性がある。
4. 仕訳候補・請求候補の正式化も正式データ作成、候補status、必須監査が単一transactionではない。
5. 見積/請求番号がtenant内count由来で、並行採番の一意性証拠がない。

見積、請求、入金、仕訳候補、督促下書きの限定実装は存在するが、Function ID単位で部分証拠とGapを分離する。実契約、実送金、実支払、自動仕訳確定、外部送信は実行していない。

### P35-CHANNELS C19

- exact-head CI run `29200855770`: unit 484、E2E 161、failed 0、typecheck/lint/build/safety成功。
- sealed envはFake LLM、mail log、`EXTERNAL_SEND_ENABLED=false`。
- artifact `8262397756`: 25 PNG、digest `f5e071f967ba0140395a505311aacdaccec2e9ae0ba0cabf2d2d3a2012c7fbcc`。C19 desktop/mobile画像に空画面や重大overflowは見当たらない。
- 独立mock oracleで、無関係な一意制約の`P2002`でも`already`として成功扱いになる。
- 同一業務意図へ異なるkeyを与えると`created/created`になり、reload、back、別tab、応答消失の重複防止にならない。
- AI safety/output/access logはmaterialize transactionより前に個別保存され、生成全体のall-or-nothing主張は成立しない。

### P35-CHANNELS C22

- 純粋ロジック11/11はgreen。
- 一覧queryがcustomer権限に関係なく`name`を取得し、detail linkも権限非依存で表示する。
- satisfaction、churnRisk、dealsを読む一覧経路のmetadata-only DataAccessLogと、実在別tenant fixtureが不足する。
- exact-head GitHub Actions runは取得できず、CI証拠もGap。

### P4-WORKFORCE Control Plane

- 純粋ロジック9/9はgreen。
- `PENDING`と`CANCELLED`をどちらもrejected/却下へ写像する独立probeを再現。
- runはtenant scopedでも関連agent自身のtenant一致がなく、Approval payload全体と未使用action summaryを取得する。
- metadata-only DataAccessLogとexact-head CIが不足する。

### P4-WORKFORCE Workflow Dry Run

- 純粋ロジック13/13はgreen。
- `個人情報を第三者へ提供する`、`支 払を実行する`、`pay customer`、`顧客データを外部へ転送する`がunknown/skippedのままoverall completedになる。
- `支払いを実行しない`、`メールを送信しない`も否定文として扱えない。
- 業務入力をGET query/historyへ残す設計とexact-head CI不足を維持する。

### P4の未着手範囲

Agent Development Console、Skill Registry、Tool Registry、Prompt Registry、Evaluation Center、Sandbox、Release Stage、詳細なUsage/Budget/Observabilityは、固定実装headと受入証拠がないため`ROADMAP_ONLY`または`IMPLEMENTATION_UNVERIFIED`。AI社員一覧・詳細・3D、Human Gate Resumeの限定証拠をPhase 4全体完成へ一般化しない。

## 4. CIとartifactの扱い

CI greenはそのテストが検査した範囲だけの証拠である。PR #23/#25/#26/#27/#28および旧RC #29の各固定headには、Scout時点でpull-request workflow runが紐づかなかった。ローカル純粋テストgreenをexact-head CIへ格上げしない。

## 5. Phase判定

| workstream | 現在地 | machine completeを止めるもの |
|---|---|---|
| P3-GROWTH | v0はHuman Preview済み、後継RC未成立 | PR #27未伝播、反復/CI/artifact不足 |
| P3-Q2C | 限定縦切りは存在、独立初回監査でHOLD | RBAC、原子性、並行冪等性、採番 |
| P35-CHANNELS | C21限定合格、C19/C22 HOLD | C19 P2、C22 P2、C22 schema/human Gate |
| P4-WORKFORCE | AI社員/Human Gate限定合格 | Control Plane、Workflow、実queue、未着手registry群 |

Critical 0を確認したという意味ではない。今回の監査範囲では新規P2を確認し、blocking P2が残るため全workstreamをHOLDとする。

## 6. 人間Gate

現時点で新たなHuman Previewを依頼しない。まずClaudeの固定修正headとCodex再監査が必要。次の人間作業はmachine blockerが0になった後に限定して提示する。

- P3-GROWTH後継RCの768px Preview
- C22 schema変更の明示判断（必要な場合）
- Phase 4 Production queue/worker
- app main merge、Production、本番migration、Secrets/OAuth、実LLM、外部送信、広告変更、課金・支払

## 7. 安全境界

app main、Production、本番DB、migration、Secrets、実LLM、外部送信、広告変更、課金、支払には接触していない。「脆弱性ゼロ」「完全無欠」「全機能完成」「競合同等以上」は宣言しない。

## 8. Post-release追補

- PR #32 RC `8d3ae36`はCI 472/151、artifact 25 PNG、Human Previewを確認後、merge commit `71e0b426`でmainへ統合された。
- C22 `2884949`はPR #33 integration `0d6de21`を経て、現行main `7efb22b`へ統合された。
- 独立再監査でControl Tower監査label 1件、C22 preview eligibility / AI actorType 2件のP2を確認した。
- Phase 3/3.5のmain統合事実は記録するが、P2修正固定SHAと再監査前にmachine completeへ格上げしない。
- 詳細は`V74_POST_RELEASE_REAUDIT_2026-07-13.md`を参照する。
