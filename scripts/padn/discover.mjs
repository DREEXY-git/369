// PADN L2 — 既存 L1 状態の discovery / import（read-only）。
// L2 は WIP / Issue / branch / PR / Lease を新規作成しない。既存状態を発見して採用する。
import { parseControlState, parseWipBody, foldWipState, extractJsonBlocks } from './state.mjs';

/**
 * Control Root を title marker + schema marker で発見する。
 * Issue 番号は入口であり固定前提ではない（known_issue_hint は探索の優先順にのみ使う）。
 * 0 件 → NO_CONTROL_ROOT、2 件以上 → DUPLICATE_CONTROL_ROOT（どちらも dispatch 不可）。
 */
export async function discoverControlRoot(gh, policy) {
  const issues = await gh.listOpenIssues();
  const candidates = issues.filter(
    (i) =>
      !i.pull_request &&
      String(i.title ?? '').includes(policy.control_root.title_marker) &&
      String(i.body ?? '').includes(policy.control_root.schema_marker),
  );
  if (candidates.length === 0) return { ok: false, reason: 'NO_CONTROL_ROOT', issue: null };
  if (candidates.length > 1) {
    return {
      ok: false,
      reason: 'DUPLICATE_CONTROL_ROOT',
      issue: null,
      duplicates: candidates.map((c) => c.number),
    };
  }
  return { ok: true, issue: candidates[0] };
}

/** 開いている WIP Issue（[WIP] marker + Control Root 参照）を列挙する。 */
export function findWipIssues(issues, policy, controlRootNumber) {
  return issues.filter(
    (i) =>
      !i.pull_request &&
      String(i.title ?? '').includes(policy.wip.title_marker) &&
      (controlRootNumber == null || String(i.body ?? '').includes(`#${controlRootNumber}`)),
  );
}

/** 1 つの WIP Issue を import（本文 lease + コメント fold + packet hash）。 */
export async function importWip(gh, issue) {
  const comments = await gh.listIssueComments(issue.number);
  const body = parseWipBody(issue.body ?? '');
  const fold = foldWipState(comments);
  // PROMPT_DISPATCHED コメントの packet（json block）から prompt_sha256 と packet 位置を拾う
  let promptSha256 = null;
  let packetCommentId = null;
  let leaseFromEvents = {};
  for (const c of comments) {
    const blocks = extractJsonBlocks(c.body ?? '');
    for (const b of blocks) {
      if (b.prompt_sha256 || b.PROMPT_SHA256) {
        promptSha256 = b.prompt_sha256 ?? b.PROMPT_SHA256;
        packetCommentId = c.id;
      }
      if (b.lease_id) leaseFromEvents.leaseId = b.lease_id;
      if (b.lease_revision) leaseFromEvents.revision = Number(b.lease_revision);
      if (b.fencing_token) leaseFromEvents.fencingToken = b.fencing_token;
      if (b.base_sha) leaseFromEvents.baseSha = b.base_sha;
    }
    // 本文中の PROMPT_SHA256: `hex` 形式
    const m = /PROMPT_SHA256[^0-9a-f]*([0-9a-f]{16,64})/i.exec(String(c.body ?? ''));
    if (m && !promptSha256) {
      promptSha256 = m[1];
      packetCommentId = c.id;
    }
  }
  // WIP 本文の lease table を正とし、イベント由来の値は欠損補完にのみ使う
  //（本文と packet の不一致は watchdog/guard 側の検出対象であり、上書きで隠さない）。
  const lease = {
    ...Object.fromEntries(Object.entries(leaseFromEvents).filter(([, v]) => v != null)),
    ...Object.fromEntries(Object.entries(body.lease).filter(([, v]) => v != null)),
    issuedAt: fold.dispatchedAt ?? issue.created_at,
    lastCheckpointAt: fold.lastCheckpointAt,
  };
  return {
    issueNumber: issue.number,
    title: issue.title,
    wipId: body.wipId,
    state: fold.state,
    reworkCount: fold.reworkCount,
    frozenHead: fold.frozenHead,
    claimedAt: fold.claimedAt,
    dispatchedAt: fold.dispatchedAt,
    testJobStarted: fold.testJobStarted,
    lease,
    allowedPaths: body.allowedPaths,
    promptSha256,
    packetCommentId,
  };
}

/**
 * L1 全体 snapshot を構築する（read-only）。
 * - Control Root（一意）と control state
 * - WIP 一覧（lease / 状態 / packet hash）
 * - open PR（number / head / draft / branch）
 * - main SHA
 */
export async function buildSnapshot(gh, policy, { now = new Date().toISOString() } = {}) {
  const rootResult = await discoverControlRoot(gh, policy);
  const issues = await gh.listOpenIssues();
  const snapshot = {
    now,
    ok: rootResult.ok,
    reason: rootResult.ok ? null : rootResult.reason,
    controlRoot: null,
    control: null,
    wips: [],
    prs: [],
    mainSha: null,
  };
  snapshot.mainSha = await gh.getBranchSha('main').catch(() => null);
  const pulls = await gh.listOpenPulls();
  snapshot.prs = pulls.map((p) => ({
    number: p.number,
    title: p.title,
    draft: p.draft === true,
    headRef: p.head?.ref ?? null,
    headSha: p.head?.sha ?? null,
    baseRef: p.base?.ref ?? null,
    fork: p.head?.repo?.full_name !== p.base?.repo?.full_name,
    updatedAt: p.updated_at,
  }));
  if (!rootResult.ok) return snapshot;

  snapshot.controlRoot = { number: rootResult.issue.number, title: rootResult.issue.title };
  const rootComments = await gh.listIssueComments(rootResult.issue.number);
  snapshot.control = parseControlState(rootResult.issue, rootComments);

  const wipIssues = findWipIssues(issues, policy, rootResult.issue.number);
  for (const wi of wipIssues) {
    snapshot.wips.push(await importWip(gh, wi));
  }
  // 重複 WIP（同じ wipId / 同じ branch）を検出して snapshot に記録（作成はしない）
  const seen = new Map();
  snapshot.duplicateWips = [];
  for (const w of snapshot.wips) {
    const key = w.wipId ?? `issue-${w.issueNumber}`;
    if (seen.has(key)) snapshot.duplicateWips.push({ key, issues: [seen.get(key), w.issueNumber] });
    else seen.set(key, w.issueNumber);
  }
  return snapshot;
}

/** WIP に対応する PR（lease.branch と headRef が一致する open PR）を探す。 */
export function prForWip(snapshot, wip) {
  if (!wip.lease?.branch) return null;
  return snapshot.prs.find((p) => p.headRef === wip.lease.branch) ?? null;
}
