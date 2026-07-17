// PADN L2 — L1（Issue コメント）からの状態 fold と WIP 状態機械。
// 正本は GitHub。ここは read-only の解釈器であり、書き込みは行わない。

const MARKERS = [
  'PROMPT_DISPATCHED',
  'WIP_CLAIMED',
  'IMPLEMENTATION_STARTED',
  'IMPLEMENTATION_FREEZE',
  'READY_FOR_HUMAN_GATE',
  'REVIEW_PASS',
  'CHANGES_REQUIRED',
  'REPLAN_REQUIRED',
  'WIP_CLOSED',
  'CHECKPOINT',
  'SESSION_ONLINE',
  'HEARTBEAT',
  'BACKPRESSURE_ON',
  'INCIDENT_FREEZE',
  'HOLD',
  'RESUME',
  'LEASE_GRANTED',
  'QUEUE_UPDATE',
  'POST_MERGE_VERIFIED',
  'TEST_EVIDENCE_ADDED',
  'REWORK_STARTED',
  'TEST_JOB_STARTED',
];

const DIRECTOR_MARKERS = ['PROMPT_DISPATCHED', 'QUEUE_UPDATE', 'HEARTBEAT', 'READY_FOR_HUMAN_GATE', 'LEASE_GRANTED', 'CHECKPOINT', 'SESSION_ONLINE', 'HOLD'];

function decodeEntities(text) {
  return String(text ?? '')
    .replaceAll('&#34;', '"')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

/** ```json fenced block をすべて parse して返す（壊れた block は無視して継続）。 */
export function extractJsonBlocks(text) {
  const blocks = [];
  const re = /```json\s*\n([\s\S]*?)```/g;
  let m;
  const decoded = decodeEntities(text);
  while ((m = re.exec(decoded)) !== null) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      // 解析不能 block は evidence として無視（fail-open にしない: 判断材料に使わないだけ）
    }
  }
  return blocks;
}

export function markersIn(text) {
  const t = String(text ?? '');
  return MARKERS.filter((mk) => t.includes(mk));
}

/**
 * Control Root の状態 fold。
 * body の 369-control-root-v1 record を初期値に、コメント中の 369-control-event-v1 /
 * 369-l2-event-v1 block を時系列に適用する。
 */
export function parseControlState(issue, comments, { directorMarkers = DIRECTOR_MARKERS } = {}) {
  const bodyBlocks = extractJsonBlocks(issue.body).filter((b) => b.schema === '369-control-root-v1');
  const state = {
    programId: bodyBlocks[0]?.program_id ?? null,
    directorEpoch: bodyBlocks[0]?.director_epoch ?? null,
    controlRevision: bodyBlocks[0]?.control_revision ?? null,
    writeCapacity: bodyBlocks[0]?.write_capacity ?? null,
    activeWriteLanes: bodyBlocks[0]?.active_write_lanes ?? 0,
    backpressure: bodyBlocks[0]?.backpressure ?? false,
    appMainBase: bodyBlocks[0]?.app_main_base ?? null,
    releaseHold: bodyBlocks[0]?.release_hold ?? null,
    incidentFreeze: false,
    lastDirectorActivityAt: issue.created_at ?? null,
    lastEventAt: issue.created_at ?? null,
    events: [],
  };
  const sorted = [...comments].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const c of sorted) {
    const body = decodeEntities(c.body);
    const marks = markersIn(body);
    const blocks = extractJsonBlocks(body).filter(
      (b) => b.schema === '369-control-event-v1' || b.schema === '369-l2-event-v1',
    );
    for (const b of blocks) {
      if (typeof b.control_revision === 'number' && b.control_revision > (state.controlRevision ?? 0)) {
        state.controlRevision = b.control_revision;
      }
      if (typeof b.director_epoch === 'number') state.directorEpoch = b.director_epoch;
      if (typeof b.write_capacity === 'number') state.writeCapacity = b.write_capacity;
      if (typeof b.active_write_lanes === 'number') state.activeWriteLanes = b.active_write_lanes;
      if (typeof b.backpressure === 'boolean') state.backpressure = b.backpressure;
      if (typeof b.base_sha === 'string') state.appMainBase = b.base_sha;
    }
    if (marks.includes('BACKPRESSURE_ON')) state.backpressure = true;
    if (marks.includes('INCIDENT_FREEZE')) state.incidentFreeze = true;
    if (marks.some((mk) => directorMarkers.includes(mk))) state.lastDirectorActivityAt = c.created_at;
    state.lastEventAt = c.created_at;
    state.events.push({ at: c.created_at, markers: marks, author: c.user?.login ?? null });
  }
  return state;
}

/** Director が TTL 内に活動しているか（active Director 1件の必要条件）。 */
export function directorActive(controlState, now, ttlHours) {
  if (!controlState.lastDirectorActivityAt) return false;
  return Date.parse(now) - Date.parse(controlState.lastDirectorActivityAt) <= ttlHours * 3600_000;
}

/** WIP Issue 本文の lease table / ALLOWED_PATHS を parse する（#67/#68 実フォーマット準拠）。 */
export function parseWipBody(body) {
  const text = decodeEntities(body);
  const lease = {};
  const tableRow = (label) => {
    // セル内の backtick や注記（例: `sha`（main））に耐えるため、セル全体を取って後処理する
    const re = new RegExp(`\\|\\s*${label}\\s*\\|([^|\\n]+)\\|`);
    const m = re.exec(text);
    if (!m) return null;
    const cell = m[1].replaceAll('`', '').trim();
    return cell || null;
  };
  lease.leaseId = tableRow('LEASE_ID');
  lease.revision = Number(tableRow('LEASE_REVISION') ?? '') || null;
  lease.fencingToken = tableRow('FENCING_TOKEN');
  const baseRaw = tableRow('BASE_SHA');
  lease.baseSha = baseRaw ? (baseRaw.match(/[0-9a-f]{7,40}/) ?? [null])[0] : null;
  const branchRaw = tableRow('BRANCH');
  lease.branch = branchRaw ? (branchRaw.match(/[\w./-]+/) ?? [null])[0] : null;

  const allowed = [];
  const sec = /##\s*ALLOWED_PATHS[^\n]*\n([\s\S]*?)(\n##|$)/.exec(text);
  if (sec) {
    for (const line of sec[1].split('\n')) {
      const m = /^\s*[-*]\s*`([^`]+)`/.exec(line);
      if (m) allowed.push(m[1].replace(/（[^）]*）/g, '').trim());
    }
  }
  const wipId = (/WIP-[A-Z0-9-]+/.exec(text) ?? [null])[0];
  return { wipId, lease, allowedPaths: allowed };
}

/**
 * REVIEW_PASSED へ進むために PASS が揃っていなければならない監査レーン
 * （roles.json reviewer_independence.review_event_types と validate.mjs で整合検査される）。
 */
export const REQUIRED_REVIEW_LANES = ['padn_codex_arch', 'padn_codex_security', 'padn_codex_evidence'];

/** WIP コメント列から現在状態を fold する。 */
export function foldWipState(comments, { requiredReviewLanes = REQUIRED_REVIEW_LANES } = {}) {
  let state = 'PROPOSED';
  let reworkCount = 0;
  let frozenHead = null;
  let lastCheckpointAt = null;
  let claimedAt = null;
  let dispatchedAt = null;
  let testJobStarted = false;
  // freeze サイクルごとの role 別 verdict（head 一致のもののみ）。部分 PASS では進めない。
  let verdictsByLane = {};
  const sorted = [...comments].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const c of sorted) {
    const body = decodeEntities(c.body);
    const marks = markersIn(body);
    if (marks.includes('PROMPT_DISPATCHED')) {
      state = 'DISPATCHED';
      dispatchedAt = c.created_at;
      testJobStarted = false; // 新 packet サイクルで dedupe をリセット
      verdictsByLane = {};
    }
    if (marks.includes('WIP_CLAIMED')) {
      state = 'CLAIMED';
      claimedAt = c.created_at;
    }
    if (marks.includes('IMPLEMENTATION_STARTED')) state = 'IMPLEMENTING';
    if (marks.includes('REWORK_STARTED')) {
      state = 'IMPLEMENTING';
      testJobStarted = false; // rework サイクルは新たにテスト/証拠ジョブを要する
    }
    if (marks.includes('TEST_JOB_STARTED')) testJobStarted = true;
    if (marks.includes('CHECKPOINT')) lastCheckpointAt = c.created_at;
    if (marks.includes('IMPLEMENTATION_FREEZE')) {
      state = 'FROZEN_FOR_REVIEW';
      const sha = /(?:head|HEAD)[^0-9a-f]*([0-9a-f]{7,40})/.exec(body);
      if (sha) frozenHead = sha[1];
      verdictsByLane = {}; // 新 freeze サイクル: 旧 verdict は無効
    }
    if (marks.includes('CHANGES_REQUIRED')) {
      state = 'CHANGES_REQUESTED';
      reworkCount += 1;
      verdictsByLane = {};
    }
    // role 別 verdict の収集（L2 の codex report job が投稿する
    // 369-padn-l2-review-verdict-v1 block）。frozen head と不一致の verdict は stale として無視。
    for (const b of extractJsonBlocks(body)) {
      if (b.schema !== '369-padn-l2-review-verdict-v1') continue;
      const lane = b.role_event_type ?? (/CODEX_VERDICT — (padn_[a-z_]+)/.exec(body)?.[1] ?? null);
      if (!lane) continue;
      if (frozenHead && b.head_sha && !String(frozenHead).startsWith(String(b.head_sha)) && !String(b.head_sha).startsWith(String(frozenHead))) {
        continue;
      }
      verdictsByLane[lane] = b.verdict;
    }
    // REVIEW_PASSED へ進めるのは:
    // (a) L1 の明示的な集約イベント REVIEW_PASS marker（Director/正式 verdict の互換経路）、または
    // (b) 必須監査レーン全てが current head で PASS（部分 PASS では進まない — Codex review P1）
    const allLanesPass =
      requiredReviewLanes.length > 0 && requiredReviewLanes.every((lane) => verdictsByLane[lane] === 'PASS');
    if (marks.includes('REVIEW_PASS') || allLanesPass) {
      if (state === 'FROZEN_FOR_REVIEW') state = 'REVIEW_PASSED';
    }
    if (marks.includes('READY_FOR_HUMAN_GATE')) state = 'READY_FOR_HUMAN_GATE';
    if (marks.includes('REPLAN_REQUIRED')) state = 'REPLAN_REQUIRED';
    if (marks.includes('POST_MERGE_VERIFIED')) state = 'POST_MERGE_VERIFIED';
    if (marks.includes('WIP_CLOSED')) state = 'CLOSED';
    if (marks.includes('HOLD') && !marks.includes('READY_FOR_HUMAN_GATE')) {
      // HOLD 単独 marker のみ（QUEUE_UPDATE/HOLD イベント等）は WIP 状態を HOLD にする
      if (!['CLOSED', 'POST_MERGE_VERIFIED'].includes(state)) state = 'HOLD';
    }
  }
  return { state, reworkCount, frozenHead, lastCheckpointAt, claimedAt, dispatchedAt, testJobStarted, verdictsByLane };
}

/** state-machine.json を実行可能な形にする。 */
export function loadStateMachine(config) {
  return {
    config,
    next(fromState, eventName) {
      const t = config.transitions.find((tr) => tr.from === fromState && tr.event === eventName);
      if (t) return { ok: true, to: t.to, humanOnly: t.human_only === true, transition: t };
      const w = (config.wildcard_transitions ?? []).find(
        (tr) => tr.event === eventName && !(tr.except ?? []).includes(fromState),
      );
      if (w) return { ok: true, to: w.to, humanOnly: w.human_only === true, transition: w };
      return { ok: false, error: `invalid_transition:${fromState}:${eventName}` };
    },
    dispatchablePairs() {
      return config.l2_dispatchable.pairs;
    },
    canDispatch(state, eventType) {
      return config.l2_dispatchable.pairs.some((p) => p.state === state && p.event_type === eventType);
    },
  };
}
