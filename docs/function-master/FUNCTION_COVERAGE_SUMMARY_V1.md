# 完全機能台帳 Evidence カバレッジ集計 v1

- Snapshot: 2026-07-11
- Ledger: `COMPLETE_FUNCTION_LEDGER_V1.json`
- Evidence: `FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md`
- Base: `f45ad2fd7d1a5ae2b386f03060972a7158a7ed03`
- 対象: 実装完成率ではなく Evidence カバレッジ

## 結論

| 指標 | 実測 | 意味 |
|---|---:|---|
| 正本 Stable ID | 7,485 | 生成器が収集する全ID系列。Appendix Bの節見出しIDは含まない |
| Appendix Aカテゴリ原子機能 | 2,553 | `Cxx-nnn`だけの分母 |
| 正式Evidence行 | 47 | 全行が正本Stable IDへ解決できる |
| Evidence ID重複 | 0 | 現Evidence台帳は1 IDにつき1行 |
| 未知Evidence ID | 0 | 存在しない正式IDの創作・誤記なし |
| 正式Evidence行のないStable ID | 7,438 | `IMPLEMENTATION_UNVERIFIED`。未実装の証明ではない |
| 正式Evidence行のないカテゴリ原子機能 | 2,516 | 2,553から対応済み`Cxx-nnn` 37行を除いた数 |
| 原典詳細欠落 | 1カテゴリ | C49のみ。抽出0件を完成と解釈しない |

意図的に「全体完成率」は出さない。7,485件にはカテゴリノード、原子機能、ルール、原典要件、Candidate群、ユーザー要件が混在し、Evidenceの存在も本番稼働を意味しないためである。

## ID系列別の分母

| ID系列 | 正本件数 | Evidence行 | 正式Evidence行なし | 注記 |
|---|---:|---:|---:|---|
| Category nodes `C01`-`C50` | 50 | 1 | 49 | The one row is `C49=SOURCE_DETAIL_MISSING`; these are structural grouping IDs |
| Category functions `Cxx-nnn` | 2,553 | 37 | 2,516 | This is the Appendix A atomic-function denominator |
| Global rules `GAR-nnn` | 51 | 0 | 51 | Requirements exist; implementation evidence is unmapped |
| Appendix A supplement `A-SUP-nnn` | 1,963 | 0 | 1,963 | Source records, not a claim of 1,963 implemented features |
| Function Master regions `FMR-*` | 126 | 0 | 126 | Region-level requirements |
| Candidate groups `FM231`-`FM252` | 22 | 0 | 22 | Candidate group IDs are not silently promoted |
| Candidate details `FMxxx-nnn` | 349 | 0 | 349 | Candidate details remain candidates until human governance |
| Appendix B records `Bxx-nnn` | 2,362 | 0 | 2,362 | The 45 Appendix B section headings are not Stable IDs |
| User requirements `USR-nnn` | 9 | 9 | 0 | Evidence status varies; two remain blocked/partial |
| **合計** | **7,485** | **47** | **7,438** | 全件一致 |

## 正式Evidence状態の内訳

| 状態 | 件数 | 解釈 |
|---|---:|---|
| `VERIFIED_REPOSITORY` | 21 | Repository evidence exists at the recorded scope; not main or production by default |
| `PARTIAL_PRODUCTION_EVIDENCE` | 9 | A specifically bounded production path was previously recorded; category completion is not implied |
| `PARTIAL_LOCAL` | 10 | Draft/local/repository proof is incomplete or bounded |
| `DOCS_DEFINED` | 4 | Requirement/governance document exists |
| `ROADMAP_ONLY` | 0 | Analytic status used by the Phase matrix; no formal Evidence row currently uses it |
| `BLOCKED` | 2 | A known defect, missing bridge, or release condition blocks promotion |
| `SOURCE_DETAIL_MISSING` | 1 | C49 detailed source section is absent |
| **Evidence行** | **47** | 正本ID 47件、重複なし |
| `IMPLEMENTATION_UNVERIFIED` | **7,438** | 正式Evidence行がない正本Stable IDの既定状態 |

## 機械検証

2026-07-11にCodex専用clean worktreeで次を再実行した。

| 検証 | 実測結果 |
|---|---|
| 原典generator `--check` | exit 0、raw SHA-256 `a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667` |
| 固定件数 | 50カテゴリ、2,553原子機能、126 FMR、22 Candidate群、349 Candidate詳細、7,485 Stable ID |
| 生成出力 | 60件 = GitHub生成正本3件 + Obsidian生成鏡像57件 |
| JSON / Stable ID | parse成功、7,485件一意 |
| Evidence参照 | 47件一意、未知ID 0、重複ID 0 |
| C49 | 唯一の`SOURCE_DETAIL_MISSING` |
| secret-shaped scan | 対象69ファイル、該当0（値は出力していない） |
| Obsidian生成鏡像 | 57件、関連broken wiki link 0、ルートからの孤児0 |
| Obsidian root index | `00_完全機能台帳インデックス`へ1行補正 |

## 50カテゴリ別カバレッジ

列は`Cxx-nnn`行だけを集計する。ただし`Source gap`は正式なカテゴリ階層C49の欠落を記録する。`PPE`は`PARTIAL_PRODUCTION_EVIDENCE`、`PL`は`PARTIAL_LOCAL`、`IU`は`IMPLEMENTATION_UNVERIFIED`である。

| Cat. | Category | Functions | Evidence | Verified | PPE | PL | Docs | Roadmap | Blocked | IU | Source gap | Main blocker / dependency / next candidate |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| C01 | Core OS / Tenant基盤 | 62 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 62 | 0 | Formal evidence unmapped / tenant-auth base / map one tenant-isolation slice with negative tests |
| C02 | Enterprise Identity / Admin | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 0 | SSO/SCIM evidence absent / C01 identity and secrets governance / perform read-only identity boundary audit |
| C03 | Permission / Approval / Audit | 73 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 72 | 0 | Only AI-reference access logging mapped / RBAC-label-approval stack / map fixed-SHA allow-and-deny paths |
| C04 | AI Governance / Agent Control Plane | 97 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 95 | 0 | Latest Claude head is moving / agent data and lifecycle / review only final integration SHA |
| C05 | AI Safety / Evaluation / Red Team | 60 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 60 | 0 | Safety and kill-switch IDs unmapped / C04 plus safety logs / map one human-only stop and red-team slice |
| C06 | Data Governance / Semantic Layer | 79 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 79 | 0 | Semantic evidence absent / governed data dictionary / inventory lineage and label enforcement first |
| C07 | Company Brain / Knowledge OS | 60 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 57 | 0 | Production evidence covers only narrow retrieval paths / C03+C06 / map remaining sources and role-negative cases |
| C08 | CRM / Customer 360 | 90 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 90 | 0 | Existing CRM claims lack formal rows / customer labels and PII gates / map one fixed-SHA read/write vertical slice |
| C09 | SFA / Sales OS | 62 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 62 | 0 | Sales workflow evidence unmapped / C08 and approval / map lead-to-deal scope without broad completion claim |
| C10 | Quote / Pricing / Product Master | 65 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 65 | 0 | Quote/price evidence unmapped / finance and label boundaries / map cost-redaction and approval tests |
| C11 | Contract / Legal Ops | 54 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 54 | 0 | Legal workflows unverified / approval and confidential labels / begin with read-only contract boundary evidence |
| C12 | Invoice / Billing | 56 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 56 | 0 | Invoice implementation not linked to IDs / finance RBAC and customer labels / map fetch-before-filter negatives |
| C13 | Payment / Reconciliation | 34 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 34 | 0 | High-risk money movement unverified / C12+C14 and human approval / design-only Gate before any execution evidence |
| C14 | Accounting / Finance | 49 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 49 | 0 | Finance claims unmapped / finance RBAC and audit / map read-only aggregate and unauthorized nonfetch |
| C15 | ERP / Operations | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 57 | 0 | Broad operations scope unverified / inventory-procurement masters / choose one bounded CRUD vertical slice |
| C16 | EC / POS / Reservation | 69 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 69 | 0 | Commerce/store paths unmapped / C15, consent, external systems / read-only evidence inventory first |
| C17 | Procurement / PLUG / Price Compare | 52 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52 | 0 | External price/affiliate behavior unverified / procurement and compliant providers / keep external calls sealed and map local logic |
| C18 | AD OS / Growth Engine | 71 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 71 | 0 | Roadmap claims lack formal C18 rows / Growth ledger and Control Tower / conservatively map proven v0 IDs |
| C19 | Ads Management | 53 | 6 | 3 | 0 | 3 | 0 | 0 | 0 | 47 | 0 | Draft-only and no human execution bridge / marketing data and approval / verify final integrated read-model-to-draft flow |
| C20 | SNS / LINE / Email / DM | 60 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 60 | 0 | Outreach path has no formal rows / consent, suppression, approval / map only proven draft/log behavior; do not claim delivery |
| C21 | SEO / Content / PR | 54 | 5 | 3 | 0 | 2 | 0 | 0 | 0 | 49 | 0 | Draft Stream A only / deterministic AI and claim controls / verify integrated negative tests and Preview |
| C22 | Referral / Affiliate / Creator | 54 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 54 | 0 | Roadmap Gate only / new schema, consent, anti-stealth-marketing / retain design Gate until human schema approval |
| C23 | HR / Recruiting | 38 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 38 | 0 | Candidate PII evidence absent / HR permissions and retention / threat-model a read-only slice first |
| C24 | Labor / People Ops | 49 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 49 | 0 | Highly sensitive people data unmapped / HR labels and audit / require human data-governance Gate before evidence promotion |
| C25 | Education / Academy | 39 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | 0 | Learning paths unverified / identity and content / map one enrollment-progress slice with tenant tests |
| C26 | Customer Support / CS | 53 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 53 | 0 | Ticket/portal evidence unmapped / CRM PII and knowledge / map read isolation before AI assistance |
| C27 | Project / Task / Workflow | 51 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 51 | 0 | Queue/retry/approval code not linked / lifecycle and audit / map final BullMQ and human-certification evidence |
| C28 | BI / Dashboard / Reporting | 52 | 3 | 2 | 0 | 1 | 0 | 0 | 0 | 49 | 0 | Only three dashboard/report IDs mapped / source systems and RBAC / update after final Growth/Office integration review |
| C29 | Business Simulator / Digital Twin | 36 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 36 | 0 | Simulation validity evidence absent / governed source metrics / define reproducible model and backtest Gate |
| C30 | AI Employee Platform | 57 | 4 | 2 | 0 | 1 | 0 | 0 | 1 | 53 | 0 | Approval/error evidence has known gaps / B+C integration and queue telemetry / resolve blocked rows on fixed SHA |
| C31 | AI Employee Development Environment | 52 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52 | 0 | Builder evidence absent / C04+C05 and sandboxing / define safe local-only creation Gate |
| C32 | AI Employee Marketplace | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 0 | Marketplace governance/source gaps / C31+C36+C49 / do not implement before C49 source and review Gate |
| C33 | Developer Platform | 38 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 38 | 0 | API/MCP exposure unverified / auth, rate limits, audit / keep external exposure sealed; map mock/local contracts |
| C34 | Integration Hub / Adapter | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 63 | 0 | Connectors unmapped / C33 and consent / inventory mock adapters without external calls |
| C35 | Browser Extension / Desktop / Mobile | 45 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 45 | 0 | Client surfaces unverified / auth and secure storage / map current web-mobile behavior before native expansion |
| C36 | Billing / Metering / FinOps | 50 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 50 | 0 | Real billing remains frozen / usage ledger, finance, human approval / design-only metering evidence until explicit Gate |
| C37 | Trust Center / Compliance Center | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 57 | 0 | Trust claims lack formal evidence / C38-C40 / map only verifiable controls and expiry dates |
| C38 | Consent / Privacy / Data Protection | 41 | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 36 | 0 | Evidence is CaseStudyConsent-specific / identity, suppression, audit / expand only with per-purpose consent tests |
| C39 | Security / Zero Trust | 45 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 45 | 0 | Broad security controls unmapped / tenant, secrets, identity / create control-to-test evidence map, not “zero vulnerability” claim |
| C40 | Observability / SRE / Incident | 43 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 43 | 0 | Runtime telemetry unverified / queue, logs, incident policy / map failure and retry observations first |
| C41 | Onboarding / Migration | 52 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 52 | 0 | Import/migration evidence absent / validation, tenant isolation, rollback / design nonproduction dry-run Gate |
| C42 | Vertical Template Factory | 40 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 40 | 0 | Templates depend on unverified core categories / C01-C41 / select one template only after base controls are evidenced |
| C43 | White-label / Embedded | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 | 0 | Embedded tenancy unverified / C01+C33+C37 / threat-model origin, auth, and data isolation first |
| C44 | International / Multi-region | 24 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 24 | 0 | Regional/legal evidence absent / data residency and locale / docs-only jurisdiction Gate before implementation |
| C45 | Physical AI / IoT / Robotics | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | Safety-critical future scope / C05+C33+C40 / keep roadmap-only until a separate physical-safety Gate |
| C46 | Governance Docs / GitHub / Obsidian | 49 | 8 | 8 | 0 | 0 | 0 | 0 | 0 | 41 | 0 | Governance evidence is partial / GitHub, generator, vault / keep CI, links, and handoff evidence current |
| C47 | Sales / Partner / Go-to-market Ops | 36 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 36 | 0 | GTM process evidence unmapped / CRM, referral, consent / map one internal read-only partner workflow |
| C48 | Risk / Insurance / Liability | 39 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | 0 | Liability evidence absent / safety, incident, legal / define incident-to-human-review records before automation |
| C49 | App Review / Marketplace Governance | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | Appendix A detail source is missing / authoritative source supplement / create v2 delta only after human source review |
| C50 | Community / Ecosystem Analytics | 36 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 36 | 0 | Ecosystem metrics unverified / marketplace and privacy / define aggregate-only metrics after C32/C49 governance |
| **Total** | **50 categories** | **2,553** | **37** | **19** | **9** | **8** | **0** | **0** | **1** | **2,516** | **1** | Category-function counts reconcile; C49 source gap is outside its zero function denominator |

## 優先Evidenceバックログ

1. `C18` and `C20`: map the already-claimed Phase 3 v0 scope to exact formal IDs at a fixed integration SHA. Until then the roadmap claim and Function Evidence ledger remain disconnected.
2. `C04`, `C27`, `C28`, `C30`: review Claude's final integration head for lifecycle, approval counting, units, 3D interaction, and mobile evidence before changing status.
3. `C22`: retain `ROADMAP_ONLY`; implementation needs a separate schema/consent/human Gate.
4. `C49`: obtain an authoritative source supplement and create a reviewed v2 delta. Do not fill the gap from Candidate series.
5. All other zero-row categories: start with a read-only evidence inventory. Zero rows mean `IMPLEMENTATION_UNVERIFIED`, not “not built.”

## 状態昇格規則

- Add or raise an Evidence row only with a formal canonical ID, fixed SHA, bounded behavior, test/CI evidence, and explicit remaining gaps.
- Keep Draft, CI, Preview, main, and production as separate facts.
- A category may contain verified rows while the category remains incomplete and mostly unverified.
- A regression lowers the status with a reason; history is not erased.
- `ROADMAP_ONLY` and `UNMAPPED_CANDIDATE` are never silently promoted to a formal implemented Function ID.
