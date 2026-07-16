import { APP_MAIN_SHA, SNAPSHOT_AS_OF, SNAPSHOT_EXPIRES_AT, VAULT_MAIN_SHA } from "./model.mjs";

const pr = (number, title, base, baseSha, head, headSha, updatedAt, changedFileCount, draft, classification, singletonOverlaps = [], evidenceBasis = "metadata / changed filenames / latest review and comment / head checks") => ({
  number,
  title,
  url: `https://github.com/DREEXY-git/369/pull/${number}`,
  base,
  baseSha,
  head,
  headSha,
  updatedAt,
  changedFileCount,
  changedFilesPaginationComplete: true,
  draft,
  classification,
  classificationStatus: "MACHINE_PROPOSED",
  candidatePathCollision: false,
  singletonOverlaps,
  reviewSnapshot: classification === "ACTIVE_REVIEW" ? "FIXED_HEAD_AWAITING_INDEPENDENT_REVIEW" : "METADATA_CAPTURED",
  checksSnapshot: [30, 36, 38].includes(number) ? "MIXED_OR_HISTORICAL_FAILURE_PRESENT" : "SUCCESS_OR_NO_BLOCKING_STATUS_OBSERVED",
  evidenceBasis,
});

export const openPullRequests = [
  pr(2, "chore: Vercel MCP を追加（.mcp.json）", "main", "60a202daaeb698059cddb78e6250d7c7cb7bb7e2", "chore/add-vercel-mcp", "449ee040693b7e0e8d1ef92b2b51b8f6bc9e6cb5", "2026-06-29T19:19:54Z", 1, false, "LEGACY_STALE", [], "oldest update in inventory; no V4 path overlap; human confirmation required before close"),
  pr(3, "Phase 3 クローズ準備: 閲覧境界クローズ4連WIP＋PII経路機械監査（オートパイロット v5.4・Draft）", "main", "ffd586b8cd87ec407aad6ecd3e0ea4394aee1978", "claude/ci-stage3-e2e-f1d-selectors-hikwbg", "24782cc933d0af4f532f3d897790cddc0b36c04b", "2026-07-11T14:17:06Z", 234, true, "UNKNOWN_REVIEW_REQUIRED", ["FUNCTION_MASTER", "CURRENT_STATE", "VAULT_INDEX"], "large legacy diff and stacked lineage; no V4 path overlap"),
  pr(12, "[Draft] v5.9 統合: integration-v59（feature ← A+B+C+D 全ストリーム統合・main非対象）", "claude/ci-stage3-e2e-f1d-selectors-hikwbg", "f45ad2fd7d1a5ae2b386f03060972a7158a7ed03", "claude/integration-v59", "7ef2d9f444a21273ce1070fa7a16ef6801c39e4c", "2026-07-11T15:11:38Z", 63, true, "UNKNOWN_REVIEW_REQUIRED", ["CI_WORKFLOW", "PACKAGE_LOCK"], "non-main stacked integration PR; no V4 path overlap"),
  pr(13, "[Draft][Codex] v6.1 完全復旧・AI社員開発環境・競合機能台帳・全体ロードマップ", "claude/integration-v59", "7ef2d9f444a21273ce1070fa7a16ef6801c39e4c", "codex/multi-feature-regression-audit-v1", "34bb08d186a6b34c4bbc0620af69ac7575a2164e", "2026-07-11T15:39:14Z", 4, true, "EVIDENCE_ONLY"),
  pr(14, "[Draft] v6.1/6.2 完全復旧: P1/High/P2セキュリティ・AI社員8名⇔3D統一・NAV契約・build識別（Codex Track B 対応）", "claude/integration-v59", "7ef2d9f444a21273ce1070fa7a16ef6801c39e4c", "claude/full-recovery-v61", "ba01244ae2fb6b75e1ae2b9a718ba4e629a54425", "2026-07-12T09:34:26Z", 29, true, "HOLD_CURRENT", ["CURRENT_STATE", "VAULT_INDEX"], "latest independent marker is CHANGES_REQUIRED; no V4 path overlap"),
  pr(15, "[Draft][Codex] Phase readiness matrix v2: 4-axis roadmap and critical path", "claude/full-recovery-v61", "e03c678d07b0df31bc2553af1ed2fd46695cb625", "codex/phase-roadmap-audit-v2", "553e4537a05ad0be726b5e16420da81e5b3c29b3", "2026-07-11T16:59:02Z", 2, true, "EVIDENCE_ONLY", ["FUNCTION_MASTER"]),
  pr(16, "[Draft][Codex] V64-V66 independent audit and sync manifest", "claude/full-recovery-v61", "ba4a696f0f405546c9e963be87c364d493d6b539", "codex/v64-independent-reaudit", "3ef2312b4a2ddb28e32638b32d9cb82d218be651", "2026-07-12T06:29:15Z", 13, true, "EVIDENCE_ONLY", ["VAULT_INDEX"]),
  pr(17, "[Draft][Codex] v6.5 close v6.4 release blockers", "claude/full-recovery-v61", "9e72958df31c8ee7f9a2636d1c817013c78ab882", "claude/codex-v65-release-blockers", "a6273838af09f88bf2ff145b0a73a00f5168f913", "2026-07-11T19:55:45Z", 14, true, "HOLD_CURRENT", [], "release-blocker remediation branch on older stacked base"),
  pr(18, "[Draft] Phase 3.5 承認ブリッジ: C21 コンテンツ review-only（原子的重複防止）／C19 は SCHEMA_CHANGE_APPROVAL_REQUIRED", "claude/full-recovery-v61", "ba01244ae2fb6b75e1ae2b9a718ba4e629a54425", "claude/p35-approval-bridges-v1", "d209d5da35fc24ac0c101145126d55850c001f93", "2026-07-12T21:22:52Z", 21, true, "HOLD_CURRENT", ["CURRENT_STATE"], "review conversation present; stacked base and no current fixed-head PASS"),
  pr(20, "[Draft] Phase 4 安全実行Bridge（人間approve→内部再開/reject）＋BullMQ実queue証拠＋C19 schema Gate材料", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "claude/p4-human-gate-resume-v1", "9080df1d4cafcee225775003700b219ac0522d64", "2026-07-12T16:41:14Z", 17, true, "HUMAN_GATE", ["PACKAGE_LOCK", "CURRENT_STATE"], "evidence sync marker exists; stacked integration remains human-controlled"),
  pr(21, "[Draft][Codex] V70独立再監査: C21/モバイル/C19/Phase 4 Evidence HOLD", "claude/p35-approval-bridges-v1", "c8b60651d058b867ba7ad5e07662d75a7f4f1947", "codex/v70-independent-reaudit", "7a2f6fad98673adb4199acd9d8986290b590db52", "2026-07-12T13:38:43Z", 8, true, "EVIDENCE_ONLY", ["FUNCTION_MASTER", "VAULT_INDEX"]),
  pr(22, "[Draft] C19 広告改善案 承認ブリッジ（roadmap83 案A・人間承認済み）— schema変更含む", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "claude/c19-approval-bridge-v1", "e3c410cdbc3fae7f43fac978ef9ff037ba8cd505", "2026-07-12T19:36:59Z", 16, true, "HUMAN_GATE", ["PRISMA_SCHEMA"], "schema singleton and human preview marker; no action authorized here"),
  pr(23, "[Draft] C22 紹介・リファラル read-only 縦切り v1（schema-free・分析＋Fake下書きプレビューまで）", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "claude/c22-readonly-analysis-v1", "2884949ceb7a018fa7dc4a27ae5d04b2f829a965", "2026-07-12T20:48:04Z", 8, true, "UNKNOWN_REVIEW_REQUIRED"),
  pr(24, "[Draft][Codex] V72独立再監査・Phase Matrix V3・Evidence同期", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "codex/v72-max-autonomous-reaudit", "8ef66885cc864c4b635516c1900561302b48fa8e", "2026-07-12T17:01:33Z", 16, true, "EVIDENCE_ONLY", ["FUNCTION_MASTER", "VAULT_INDEX"]),
  pr(25, "[Draft] Phase 4 AI Control Plane read-only v1（Inbox・Execution Receipt・AI社員別実測）", "claude/p4-human-gate-resume-v1", "9080df1d4cafcee225775003700b219ac0522d64", "claude/p4-control-plane-readonly-v1", "08e23bbe40435ddc836fb0ff5858103145bf9e5c", "2026-07-12T19:36:41Z", 8, true, "HUMAN_GATE", [], "human preview marker exists; merge remains human-controlled"),
  pr(26, "[Draft] Workflow Dry Run v1（フロー案生成＋仮想実行のみ・実行/保存/外部送信なし）", "claude/p4-control-plane-readonly-v1", "c28b9bf5eb0f43a54b55890d24bc95ed10ed218d", "claude/workflow-dry-run-v1", "ab7b21c968b15fc269626d6221f9b6f6f9e8c063", "2026-07-12T19:36:46Z", 8, true, "HUMAN_GATE", [], "human preview marker exists; stacked base"),
  pr(27, "[Draft] 機能消失防止 回帰ハードニング v1（route inventory・role差分・viewport・履歴/deep link）＋768px topbar実退行の修正", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "claude/release-regression-hardening-v1", "bc8fbef0899485c79e4fcd4e98c3e528e8d07f98", "2026-07-12T16:53:03Z", 2, true, "HOLD_CURRENT", [], "latest marker preserves evidence HOLD"),
  pr(28, "[Draft] 長期 Fit-Gap 正本 v1（Salesforce/MoneyForward/freee/人事労務/電子帳簿 × 完全機能台帳・docs-only）", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "claude/competitive-fit-gap-roadmap-v1", "a8685afc420ef7570abecafee4941efd564b998c", "2026-07-12T16:53:04Z", 3, true, "HOLD_CURRENT", ["VAULT_INDEX"], "latest marker preserves canonical evidence gap"),
  pr(29, "[Draft][RC] Phase 3 + Phase 3.5 C21 Release Candidate v70-r2（PR #14 ba01244 ← PR #18 fa04e74 のみ）", "claude/full-recovery-v61", "ba01244ae2fb6b75e1ae2b9a718ba4e629a54425", "claude/rc-phase3-p35-v70-r2", "96172e5d2eec623a514970992ff1afef9d2613a4", "2026-07-12T19:18:05Z", 20, true, "SUPERSEDED_CANDIDATE", ["CURRENT_STATE"], "explicit superseded marker"),
  pr(30, "[Draft] roadmap88: Phase 3-4 Completion Program v1（v7.4 WIP 正本）", "main", "ffd586b8cd87ec407aad6ecd3e0ea4394aee1978", "claude/phase34-program-v1", "6f91edb8c00db82285f5116b13ad64f225a2b36b", "2026-07-12T17:31:30Z", 1, true, "HOLD_CURRENT", [], "historical workflow failure present and base is old"),
  pr(31, "docs(codex): V74 Phase 3-4 completion gate evidence", "claude/p35-approval-bridges-v1", "fa04e7405cf3ab6cb56f329804fc778dde6470b0", "codex/v74-phase-completion-gate", "850e7af7004a404ba12eab7e25e8d900dda796e4", "2026-07-12T21:16:44Z", 24, true, "EVIDENCE_ONLY", ["FUNCTION_MASTER", "VAULT_INDEX"]),
  pr(36, "[Draft][Codex] V75 post-merge再監査: C22/C19/Phase4 Evidence HOLD", "main", "c8dc1f41658d467eeb9476c3da095142f6684df5", "codex/v75-post-merge-reaudit", "9d09e0c80a9a3b3419a96fea60dd30264a1c80dc", "2026-07-12T22:08:01Z", 4, true, "EVIDENCE_ONLY", ["VAULT_INDEX"]),
  pr(38, "[Draft][Codex] V75 Q2C post-merge audit HOLD", "main", "37096714882c79f0dd5a30728497c55d87ef06be", "codex/v75-q2c-post-merge-reaudit", "8c85f5984721ecb3ac69299c66a034edce01ac41", "2026-07-13T00:14:17Z", 4, true, "EVIDENCE_ONLY", ["VAULT_INDEX"]),
  pr(42, "[Draft][Codex] V76 current main re-audit HOLD", "main", "3ec15271b9186a9a10e229b5e564305130796e9e", "codex/v76-current-reaudit", "3f9ae4274c6a74f7b7f1a77e6a0e252aa21079e7", "2026-07-13T06:02:55Z", 4, true, "SUPERSEDED_CANDIDATE", ["VAULT_INDEX"], "explicit superseded marker"),
  pr(43, "docs(codex): 最新main(PR #41統合後)の独立再監査", "main", "a758d176155d2c27c7b50452e508e6e36d48c098", "codex/v77-current-reaudit", "75478ebdcefae16b3f6b840fe4405eedbcd707a4", "2026-07-13T13:02:58Z", 4, true, "EVIDENCE_ONLY", ["VAULT_INDEX"]),
  pr(54, "feat(Wave2/財務): 入金取消（payment reversal・承認必須・AI不可・単一transaction＋FOR UPDATE）", "main", "35b0640589cc68435212935c352743c3173d3a42", "claude/wave2-payment-reversal", "367025fc0b843a3fd8e78bb012e09b5411d398a1", "2026-07-14T02:50:59Z", 4, false, "HOLD_CURRENT", [], "latest independent marker is change request"),
  pr(56, "[Draft][Codex] V83 Phase Director execution queue", "main", "35b0640589cc68435212935c352743c3173d3a42", "codex/v83-phase-director", "355d09ad654f6c48b5ca1fe89e98958f8e1ccab2", "2026-07-14T21:38:17Z", 1, true, "SUPERSEDED_CANDIDATE", [], "explicit superseded by PR 59 marker"),
  pr(57, "fix(P3-Q2C/入金): 並行VOIDによる無効化済み請求書の入金復活を防止（STATE2 C1・原子性HIGH）", "main", "7e50a04df6dcc8043689958cbfd9be42e15e1af7", "claude/q2c-payment-void-race-fix-v1", "a7e38ae19db7f76486c28ecd67e5328e93117cc4", "2026-07-16T09:49:22Z", 11, true, "ACTIVE_REVIEW", [], "latest fixed-head marker; independent review still required"),
  pr(58, "fix(Wave1/在庫): received済み発注の差し戻しによる二重入庫を防止（STATE2 C2・原子性HIGH）", "main", "7e50a04df6dcc8043689958cbfd9be42e15e1af7", "claude/inventory-po-confirm-guard-v1", "1d1681a55b3b0b72365ce2d92a2a4c32aeb3c1c9", "2026-07-16T11:34:49Z", 10, true, "ACTIVE_REVIEW", [], "latest fixed-head marker; independent review still required"),
  pr(59, "[Draft][Codex] Reconcile v8.8 Phase 3 HOLD evidence", "main", "7e50a04df6dcc8043689958cbfd9be42e15e1af7", "codex/v87-governance-evidence", "17b1bd2828de192bfb8a70242f6437f2d5bcc827", "2026-07-16T12:28:15Z", 8, true, "EVIDENCE_ONLY", ["FUNCTION_MASTER"], "current governance evidence PR; Candidate avoids its singleton path"),
  pr(60, "fix(P3-CRM/商談化): AI実確定を拒否・既存linkのtenant整合をfail-closed化・真の並行/fault証拠（Codex LEAD_CONVERT R1）", "main", "7e50a04df6dcc8043689958cbfd9be42e15e1af7", "claude/crm-lead-convert-guard-v1", "4ae7b62a1b069c443deec85ec6322e7f233df42c", "2026-07-16T08:40:28Z", 5, true, "ACTIVE_REVIEW", [], "latest fixed-head marker; independent review still required"),
  pr(61, "fix(P3-MEETING): 会議アップロード guard先行＋単一transaction＋requestId冪等化（CR #4964764958）", "main", "7e50a04df6dcc8043689958cbfd9be42e15e1af7", "claude/meeting-upload-atomicity-v1", "1ec113ae414e3d329f7817dac22d82bc754ffcbb", "2026-07-16T12:21:43Z", 6, true, "ACTIVE_REVIEW", [], "latest fixed-head marker; independent review still required"),
];

export const classificationCounts = Object.fromEntries(
  [...new Set(openPullRequests.map((item) => item.classification))]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((classification) => [classification, openPullRequests.filter((item) => item.classification === classification).length]),
);

export const liveStateSnapshot = {
  schemaVersion: 1,
  asOf: SNAPSHOT_AS_OF,
  expiresAt: SNAPSHOT_EXPIRES_AT,
  sourceMainSha: APP_MAIN_SHA,
  repository: "DREEXY-git/369",
  sourceCheckout: { branch: "codex/f1d-e2e-locators", headSha: "bb3e74008ad4637b531ed1ca984e04a9e598253c", modifiedEntries: 1, untrackedEntries: 7, changedByCandidateWork: false },
  isolatedWorktree: { logicalId: "WT-GOV-V4-7E50A04", cleanAtStart: true, branch: "codex/gov-phase-multichat-v4-7e50a04", baseSha: APP_MAIN_SHA, localPathPersisted: false },
  vault: { repository: "DREEXY-git/369-vault", mainSha: VAULT_MAIN_SHA, openPullRequestCount: 3, writePerformed: false },
  githubCapabilities: { read: "READ_FULL", publish: "PUBLISH_PR_AND_COMMENT", ghCli: "MISSING_NOT_INSTALLED", inventoryMethod: "GitHub connector plus local git refs" },
  openPullRequests: { total: openPullRequests.length, queryLimit: 100, paginationComplete: true, changedFilenamePaginationComplete: true, classificationCounts },
  collision: { candidatePathExact: 0, candidateBranchRemote: 0, candidatePullRequest: 0, semanticSingletonOnCandidatePath: 0, existingSingletonOverlapsObserved: openPullRequests.filter((item) => item.singletonOverlaps.length > 0).map((item) => item.number) },
  b18: { sourceLabelsVerified: 21, mismatchCount: 0, c49DetailStatus: "SOURCE_DETAIL_MISSING" },
  scopeDeferred: ["workflow run wrapper is first-page only; head status was captured for all PRs", "formal close / supersession decisions require human review"],
};
