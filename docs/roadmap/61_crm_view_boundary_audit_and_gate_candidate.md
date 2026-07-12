# 61. CRM 閲覧境界クローズ（WIP 1）— Customer/Contact 全経路監査＋実装前 Gate（Candidate・docs-only）

- 日付: 2026-07-11
- 種別: docs-only（本書時点ではコード変更なし）。実装は同一オートパイロット（v5.2）内の次 commit。
- 対応 audit: `docs/audit/160_crm_view_boundary_audit_and_gate.md`
- 前段: doc124（高機密 runtime 統制監査・B: HOLD）／doc125（Customer/Contact 閲覧統制追加監査・B: HOLD）／roadmap58（台帳暫定正本）
- Function ID binding（本プロンプト固定・`ATOMIC_LEDGER_SYNC_PENDING`）: C08-001/004/019/020/023/024/025・C03-006/015・C39-003/004/038・C46-032/033/048・GAR-014/042/051

## 1. 目的

Customer / Contact の閲覧境界と PII・AI 外部送信境界を、schema/migration/seed/RBAC 定義/label 許可表を変えずに閉じる。doc125 の HOLD を新しい証拠で追記クローズする（「CRM 全体完成」とは呼ばない）。

## 2. 全経路監査結果（read-only 実測・2026-07-11）

| 経路 | RBAC (customer:*) | ABAC/label | 取得順序 | 拒否時 PII | AI 送信 | tenantId | ログ |
|---|---|---|---|---|---|---|---|
| `/customers` 一覧 | ❌なし（認証のみ） | ❌なし（全 label 全行取得・LabelBadge 表示のみ） | 全行フル | —（拒否なし） | なし | ✅ | ❌ |
| `/customers/new` | ❌ページは認証のみ（action 側は create ✅） | — | 取得なし | — | なし | ✅ | ✅(action) |
| `/customers/[id]` 詳細 | ❌なし | ✅ assertCanViewConfidential（**ただしフル取得後**） | ❌ フル取得→判定 | ❌ **拒否画面に customer.name 表示**（page.tsx:42） | なし（保存済み insight 表示のみ） | ✅ | ✅ |
| `/customers/[id]/edit` | △ update は UI disable のみ・**閲覧は素通し** | ❌なし | フル取得 | — | なし | ✅ | ❌ |
| `/customers/[id]/timeline` | ❌なし | ❌**なし**（詳細で拒否されても直URLで全履歴閲覧可） | フル取得 | — | なし | ✅ | ❌ |
| `/customers/[id]/insights` | ❌なし | ❌**なし** | フル取得 | — | ⚠️ **未保存時、page render で `extractCustomerInsights({customerName, history})` を呼ぶ**。`runStructured` は provider≠fake なら顧客名＋履歴をそのまま chat 送信（maskPii 未指定・externalAiAllowed ゲートなし・承認なし） | ✅ | ❌ |
| `customers/actions.ts` create | ✅ create | — | — | — | なし | ✅ | ✅ |
| `customers/actions.ts` update | ✅ update | ❌ **label 判定なし**（閲覧不可 label の顧客も編集可能） | 既存取得→更新 | — | なし | ✅ | ✅ |
| API/print/export | 該当なし（customer 系 API route なし・print/quotes は Quote 経由で顧客名表示＝quote 権限系・今回 scope 外として記録） | — | — | — | — | ✅ | — |
| join 経路（quotes/new・invoices/new・operations/events/new・dashboard・reports/morning・golden-path・control-tower） | 各画面の権限系に従属（顧客名 or count のみ・PII 列非取得） | — | select 最小 | — | なし | ✅ | 各画面に従う |
| **Contact**（model のみ・name/email/phone 保持・**独自 label なし**） | — | — | — | — | — | — | **runtime 参照ゼロ**（`prisma.contact`・contacts include とも 0 件） |

仮説検証: 一覧全行取得 ✅該当／詳細の取得後判定 ✅該当／拒否画面の顧客名表示 ✅該当／edit・timeline・insights の判定前 PII 取得 ✅該当／insights の LLM 送出可能性 ✅該当（構造上）／Contact 単体画面なし ✅該当（label は Customer 従属でのみ意味を持つ）。

## 3. 実装前 Gate（§6・全 PASS）

| 判定 | 結果 | 根拠 |
|---|---|---|
| resource permission を DB 読取前に適用可能 | PASS | 既存 `hasPermission(user,'customer','read'/'create')`＋`AccessDenied` |
| tenantId 維持 | PASS | 全クエリ既存どおり |
| 閲覧不可 label を query 段階で除外可能 | PASS | `CONFIDENTIALITY_LABELS.filter(l => canAccessLabel(user.roles, l))` → `label: { in: visible }`（shared 既存 export のみ・許可表不変） |
| 詳細系の二段階取得 | PASS | envelope `select:{id,label,ownerId}`（**name 非取得**）→ `assertCanViewConfidential` → 本体取得 |
| 拒否時に顧客名・PII・件数を漏らさない | PASS | 共通 `AccessDenied`（name 非表示）。※「存在有無」は拒否画面表示により id 単位で判別可能だが、cuid 列挙は非現実的・§7 が AccessDenied 使用を規定 → 残余リスクとして KNOWN 記録 |
| Contact 直接経路と label 継承の証明 | PASS | runtime 参照ゼロ＝`NO_DIRECT_RUNTIME_SURFACE`・Contact に独自 label なし（Customer 従属） |
| 顧客名・履歴の実 LLM 送信の構造的防止 | PASS | render 時生成を撤去し「保存済みなし＝未計測」表示へ（生成は将来の人間起点アクション・別承認） |
| schema/migration/seed/RBAC/label 定義変更なし | PASS | 変更は `apps/web/app/(app)/customers/**`＋e2e 新 spec のみ |

## 4. 実装計画（最小差分・コード7ファイル＋e2e 1）

1. `page.tsx`（一覧）: read ゲート＋label 可視集合で query 除外（不可視行は件数にも出さない）
2. `[id]/page.tsx`: read ゲート＋二段階取得＋拒否画面から name 撤去（AccessDenied）
3. `[id]/edit/page.tsx`: read ゲート＋二段階取得（update UI は既存のまま）
4. `[id]/timeline/page.tsx`・5. `[id]/insights/page.tsx`: read ゲート＋二段階取得＋ABAC 配線
6. `insights/page.tsx`: render 時 `extractCustomerInsights` 呼び出し撤去 → 「保存済みのインサイトはありません（未計測）」表示
7. `new/page.tsx`: create ゲート／`actions.ts` update: `canAccessLabel` ガード追加（閲覧不可 label は編集拒否）
8. e2e `customers_boundary.spec.ts` 新規（80→83 見込み）: ①社長 一覧→詳細 正常 ②担当者(STAFF) 一覧→NORMAL 顧客詳細 正常（query 除外の無回帰）③社長が新規顧客作成→insights で「未計測」表示＝AI 生成が走らない恒久監視

**e2e 未実施と理由（§8 規定の記録）**: label 拒否系・customer:read なしロール系の負系 e2e は、seed の全顧客が label 未指定（=NORMAL）かつ customer:read を欠くログイン可能ユーザー（EXTERNAL_PARTNER 等）が seed に存在せず、**seed 変更禁止の制約下では作成不能**。代替担保 = 純エンジン既存 unit（canAccessLabel / evaluatePolicy）＋本書の経路監査＋敵対的レビュー。

## 5. 触らないもの

schema.prisma・migrations・seed.ts・rbac.ts・labels.ts（許可表）・policy.ts・ai-safety-server.ts・packages/ai（tasks.ts 本体）・quotes/invoices/operations/dashboard/reports 等の join 経路（記録のみ・便乗リファクタ禁止）・ci.yml・playwright.config・package/lockfile・369-vault（同期は WIP 2 後の §12）。

## 6. Evidence / Assumption / Unknown / Risk

- Evidence: 本書 §2 の実測表（各ファイル実読）・`runStructured`（packages/ai/src/tasks.ts:44-70）・LABEL_ALLOWED_ROLES（labels.ts:4-43）・Contact schema（schema.prisma:527-539）・grep による Contact 参照ゼロ。
- Assumption: e2e ログインは ceo=OWNER・sales=STAFF（rbac 実読と既存 spec 実績）。
- Unknown: print/quotes 等 join 経路の閲覧統制の十分性（今回 scope 外・次 WIP 候補として記録）。
- Risk: R1 拒否画面による存在シグナル（KNOWN low・§3）／R2 一覧 label 除外による将来の「件数が合わない」問い合わせ → 仕様であることを本書に固定。

## 7. 判定

**Gate 全 PASS・STOP 非該当 → 実装フェーズへ続行**（設計/Gate と実装は別 commit・push は人間 GO 後のみ）。

## 8. 追補（push 前敵対的レビューによる訂正と強化・2026-07-11）

3視点（権限順序／PII・AI流出・tenant・Contact／E2E回帰）の独立レビューを実装 commit `e77870c` に対して実施した。**AI流出遮断・tenantId・Contact 参照ゼロは PASS 証明**。以下を push 前に修正した。

- **事実訂正（medium・2視点が独立検出＋自己検出）**: §2/§4 の「seed 顧客は NORMAL」は誤り。**Customer.label の schema default は `CUSTOMER_CONFIDENTIAL`** であり、seed 顧客9件は全て CUSTOMER_CONFIDENTIAL（STAFF/OWNER/ADMIN の全ログインユーザーが閲覧可・policy §7 の highLabel 非該当）。負系 e2e 不能の結論は不変だが、正しい理由は「**拒否を起こす高機密 label の顧客と権限なしログインが seed に存在しない**」である。§4 の該当記述は本追補で上書きする（本文は証跡として保存）。副作用の明記: **READ_ONLY（可視 = NORMAL/INTERNAL のみ）は現 seed では一覧が0件**になる（仕様・fail-closed）。
- **判定エンジン不一致の解消（medium）**: 一覧は `canAccessLabel` のみ・詳細は `evaluatePolicy` §7（非マネージャ×高機密×理由なし→拒否）のため、**AI_AGENT が CONFIDENTIAL 顧客を一覧でのみ閲覧できる**乖離があった。一覧に fail-closed の高機密除外（非マネージャには policy §7 の highLabel 6種を一覧にも出さない・所有者例外も一覧では出さない）を追加。定数は shared 非 export のため局所ミラー（コメントで両更新を明記）。
- **update action の対称化（low・2視点検出）**: 判定前フル取得＋拒否無痕跡だった `updateCustomerAction` を、ページ側と同じ **envelope→assertCanViewConfidential→本体取得**へ変更（拒否は PolicyDecisionLog/DataAccessLog に記録される）。
- **TOCTOU 窓の閉鎖（low）**: 詳細系4経路の二段目取得に `label: envelope.label` を固定し、判定と取得の間の label 変更で旧判定のまま表示される窓を閉じた。
- **e2e CRITICAL の修正**: 新テスト3の `waitForURL('**/customers/**')` が出発点 `/customers/new` に即時マッチし CI red となる Playwright 仕様（現在 URL が一致すると redirect を待たず解決）を、operations.spec.ts と同型の**負先読み regex＋Promise.all**へ修正。
- **記録（修正なし・KNOWN）**: 新設拒否分岐の e2e カバレッジはゼロ（seed 凍結による・恒久監視はテスト3の未計測表示のみ）／テスト3の副作用データ「境界テスト株式会社」は後片付けなし（既存 spec への汚染なしを机上全数確認済み）／NORMAL でも `confidential_view` 名義で記録される既存意味論／一覧ページは DataAccessLog なしのまま（変更前からの粒度差・次 WIP 候補）。
