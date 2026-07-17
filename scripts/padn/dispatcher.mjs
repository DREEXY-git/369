// PADN L2 — Dispatcher。イベント + L1 snapshot から role job 起動を決定する。
// §9: 前提条件が 1 件でも欠ければ write（= repository_dispatch / コメント投稿）しない。
// observe mode では決定を計算するが emit しない（would_dispatch としてログのみ）。
import { readFileSync } from 'node:fs';
import { appendFileSync } from 'node:fs';
import { GitHubClient } from './github.mjs';
import { buildSnapshot, prForWip } from './discover.mjs';
import { buildApprovalPacket } from './reports.mjs';
import { normalizeEvent, actorAllowed, isForkEvent, chainDepthExceeded, isStaleEvent, isProductionDeployment } from './events.mjs';
import { validateLeaseForWrite } from './leases.mjs';
import { loadStateMachine } from './state.mjs';
import { classifyPaths, tierAllowed, detectGateViolations, findRt2Approval } from './risk.mjs';
import { loadTaxonomy, laneConflicts } from './locks.mjs';
import { directorActive } from './state.mjs';
import { renderStepSummary, buildL2Event, buildSummaryJa, renderControlComment } from './reports.mjs';

const WRITE_EVENT_TYPES = ['padn_claude_implement', 'padn_claude_remediate', 'padn_claude_test'];
const REVIEW_EVENT_TYPES = ['padn_codex_arch', 'padn_codex_security', 'padn_codex_evidence'];

export function loadConfigs(rootDir = '.') {
  const load = (name) => JSON.parse(readFileSync(`${rootDir}/config/padn/${name}`, 'utf8'));
  return {
    roles: load('roles.json'),
    stateMachine: load('state-machine.json'),
    riskPolicy: load('risk-policy.json'),
    humanGates: load('human-gates.json'),
    policy: load('dispatch-policy.json'),
    taxonomy: load('resource-taxonomy.json'),
  };
}

export function contextFromEnv(env = process.env) {
  return {
    enabled: env.PADN_AUTONOMY_ENABLED === 'true',
    mode: env.PADN_MODE || 'observe',
    writeLanesVar: Number.isFinite(Number(env.PADN_WRITE_LANES)) ? Number(env.PADN_WRITE_LANES) : 0,
    reportsEnabled: env.PADN_REPORTS_ENABLED === 'true',
    allowlist: (env.PADN_ACTOR_ALLOWLIST ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    hasAppToken: env.PADN_HAS_APP_TOKEN === 'true',
    repo: env.GITHUB_REPOSITORY ?? 'DREEXY-git/369',
  };
}

/**
 * §9 の write 前提条件チェックリストを評価する。
 * 返り値 checks[] は監査ログとしてそのまま step summary に出す。
 */
export function evaluateWritePreconditions({ snapshot, wip, ctx, configs, rt2Approved = false, dispatchesToday = 0 }) {
  const checks = [];
  const push = (check, ok, detail = '') => checks.push({ check, ok, detail });
  const control = snapshot.control ?? {};
  const policy = configs.policy;

  push('autonomy_enabled', ctx.enabled, `PADN_AUTONOMY_ENABLED=${ctx.enabled}`);
  push('control_root_unique', snapshot.ok === true, snapshot.reason ?? `#${snapshot.controlRoot?.number}`);
  push('director_active', snapshot.control ? directorActive(control, snapshot.now, policy.director.heartbeat_ttl_hours) : false, `last=${control.lastDirectorActivityAt ?? 'n/a'}`);
  push('control_revision_known', control.controlRevision != null, `rev=${control.controlRevision}`);
  push('no_backpressure', control.backpressure !== true && control.incidentFreeze !== true, `backpressure=${control.backpressure} freeze=${control.incidentFreeze}`);
  push('wip_exists', Boolean(wip), wip?.wipId ?? 'no wip');
  if (!wip) return { ok: false, checks };

  push('prompt_dispatched', wip.state !== 'PROPOSED' && wip.promptSha256 != null, `state=${wip.state}`);
  const hashFull = typeof wip.promptSha256 === 'string' && /^[0-9a-f]{64}$/.test(wip.promptSha256);
  push('prompt_hash_full_length', hashFull, hashFull ? wip.promptSha256.slice(0, 12) : `truncated/absent: ${wip.promptSha256 ?? 'null'}`);

  const leaseCheck = validateLeaseForWrite(
    wip.lease,
    wip.lease?.fencingToken,
    { epoch: control.directorEpoch, baseSha: wip.lease?.baseSha ?? '' },
    snapshot.now,
    { ttlHours: policy.leases.ttl_hours, checkpointTtlHours: policy.leases.checkpoint_ttl_hours },
  );
  push('lease_and_fencing_valid', leaseCheck.valid, leaseCheck.reason ?? `lease=${wip.lease?.leaseId} rev=${wip.lease?.revision}`);

  const baseOk = Boolean(wip.lease?.baseSha);
  push('base_sha_known', baseOk, wip.lease?.baseSha ?? 'missing');
  const baseMatchesMain = baseOk && snapshot.mainSha != null && snapshot.mainSha === wip.lease.baseSha;
  push('base_matches_main', baseMatchesMain, `main=${snapshot.mainSha} base=${wip.lease?.baseSha}（drift は Director 再発行事項）`);

  push('allowed_paths_nonempty', (wip.allowedPaths ?? []).length > 0, `${(wip.allowedPaths ?? []).length} paths`);

  const taxonomy = loadTaxonomy(configs.taxonomy);
  const otherLanes = (snapshot.wips ?? [])
    .filter((w) => w !== wip && ['CLAIMED', 'IMPLEMENTING', 'FROZEN_FOR_REVIEW', 'CHANGES_REQUESTED'].includes(w.state))
    .map((w) => ({ holder: w.wipId ?? String(w.issueNumber), paths: w.allowedPaths ?? [], level: 'WRITE' }));
  const conflicts = laneConflicts(taxonomy, [
    ...otherLanes,
    { holder: wip.wipId ?? String(wip.issueNumber), paths: wip.allowedPaths ?? [], level: 'WRITE' },
  ]).filter((c) => c.holders.includes(wip.wipId ?? String(wip.issueNumber)));
  push('resource_locks_free', conflicts.length === 0, conflicts.length ? JSON.stringify(conflicts) : 'no conflicts');

  const { tier } = classifyPaths(wip.allowedPaths ?? [], configs.riskPolicy);
  const tierCheck = tierAllowed(tier, ctx.mode, configs.riskPolicy, { rt2Approved });
  push('risk_tier_allowed', tierCheck.allowed, `tier=${tier} mode=${ctx.mode} ${tierCheck.reason ?? ''}`);

  // 候補 WIP 自身のレーンは除外して数える（自レーンへの追加ジョブ＝padn_claude_test が
  // 1 レーン運用で永久に起動不能になる自己カウント問題の回避）
  const otherActive = (snapshot.wips ?? []).filter((w) => w !== wip && ['CLAIMED', 'IMPLEMENTING'].includes(w.state));
  const activeLanes = otherActive.length;
  const capacity = Math.min(
    control.writeCapacity ?? 0,
    ctx.writeLanesVar,
    configs.policy.capacity.max_total_write_lanes_hard,
    configs.riskPolicy.modes[ctx.mode]?.max_total_write_lanes ?? 0,
  );
  push('capacity_ok', activeLanes < capacity, `active_other=${activeLanes} capacity=${capacity}`);

  // tier 別レーン上限（§11: RT0 pilot 1 lane / RT1 pilot 1 lane）
  const perTierMax = configs.riskPolicy.modes[ctx.mode]?.max_lanes_per_tier ?? {};
  const tierCap = perTierMax[tier];
  const activeSameTier = otherActive.filter(
    (w) => classifyPaths(w.allowedPaths ?? [], configs.riskPolicy).tier === tier,
  ).length;
  push(
    'per_tier_capacity_ok',
    tierCap === undefined ? true : activeSameTier < tierCap,
    `tier=${tier} active_same_tier=${activeSameTier} cap=${tierCap ?? 'n/a'}`,
  );

  const reviewBacklog = (snapshot.wips ?? []).filter((w) => w.state === 'FROZEN_FOR_REVIEW').length;
  push('reviewer_capacity_ok', reviewBacklog <= policy.capacity.reviewer_backlog_max, `backlog=${reviewBacklog}`);

  const gateHits = detectGateViolations({ paths: wip.allowedPaths ?? [] }, configs.humanGates);
  push('human_gate_clear', gateHits.length === 0, gateHits.length ? JSON.stringify(gateHits.map((g) => g.gate)) : 'clear');

  push('budget_ok', dispatchesToday < policy.budget.max_role_dispatches_per_day, `today=${dispatchesToday}/${policy.budget.max_role_dispatches_per_day}`);

  return { ok: checks.every((c) => c.ok), checks, tier };
}

/** read-only role job（codex 監査等）の前提条件（write より緩いが autonomy / 一意性 / freeze は必須）。 */
export function evaluateReviewPreconditions({ snapshot, wip, ctx, configs }) {
  const checks = [];
  const push = (check, ok, detail = '') => checks.push({ check, ok, detail });
  const control = snapshot.control ?? {};
  push('autonomy_enabled', ctx.enabled, '');
  push('control_root_unique', snapshot.ok === true, snapshot.reason ?? '');
  push('no_incident_freeze', control.incidentFreeze !== true, '');
  push('wip_exists', Boolean(wip), wip?.wipId ?? '');
  if (wip) {
    push('frozen_head_known', Boolean(wip.frozenHead), wip.frozenHead ?? 'missing');
    const pr = prForWip(snapshot, wip);
    push('head_unmoved', !pr || !wip.frozenHead || pr.headSha === wip.frozenHead, pr ? `pr#${pr.number} head=${pr.headSha}` : 'no pr');
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * dispatch 決定の本体（純関数）。イベントゲート → WIP ごとの状態機械 → 前提条件。
 */
export function decide({ snapshot, event, ctx, configs, rt2Approvals = {}, dispatchesToday = 0 }) {
  const policy = configs.policy;
  const gates = [];
  const reject = (status, reason) => ({ status, reason, gates, decisions: [], checksByWip: {} });

  if (!ctx.enabled) return reject('DISABLED', 'PADN_AUTONOMY_ENABLED != true');
  const actor = actorAllowed(event, policy, ctx.allowlist);
  gates.push({ gate: 'actor', ...actor });
  if (!actor.allowed) return reject('IGNORED', actor.reason);
  if (isForkEvent(event)) return reject('IGNORED', 'fork PR イベントは処理しない（secrets 非公開・write なし）');
  if (chainDepthExceeded(event, policy)) return reject('IGNORED', 'chain depth 超過（bot ループ防止）');
  if (isProductionDeployment(event)) return reject('IGNORED', 'production deployment は監視対象外（操作もトリガもしない）');
  if (isStaleEvent(event, snapshot)) return reject('IGNORED', 'stale イベント（現在の head と不一致）');
  if (!snapshot.ok) return reject('HOLD', snapshot.reason ?? 'control root 不明');
  if (snapshot.control?.incidentFreeze) return reject('FROZEN', 'INCIDENT_FREEZE 中は新規 dispatch しない');
  if (snapshot.control?.backpressure) return reject('BACKPRESSURE', 'BACKPRESSURE_ON 中は新規 dispatch しない');

  const machine = loadStateMachine(configs.stateMachine);
  const decisions = [];
  const checksByWip = {};

  for (const wip of snapshot.wips ?? []) {
    for (const pair of machine.dispatchablePairs()) {
      if (pair.state !== wip.state) continue;
      const eventType = pair.event_type;
      // padn_claude_test は 1 WIP につき 1 回（TEST_JOB_STARTED marker で冪等化。
      // IMPLEMENTING が長時間続いても 30 分 tick ごとに重複 emit しない）
      if (eventType === 'padn_claude_test' && wip.testJobStarted) continue;
      const isWrite = WRITE_EVENT_TYPES.includes(eventType);
      const evalResult = isWrite
        ? evaluateWritePreconditions({
            snapshot,
            wip,
            ctx,
            configs,
            rt2Approved: rt2Approvals[wip.issueNumber] === true,
            dispatchesToday,
          })
        : evaluateReviewPreconditions({ snapshot, wip, ctx, configs });
      checksByWip[`${wip.issueNumber}:${eventType}`] = evalResult.checks;
      if (!evalResult.ok) continue;

      const head = wip.frozenHead ?? null;
      decisions.push({
        event_type: eventType,
        write: isWrite,
        payload: {
          schema: '369-l2-dispatch-v1',
          program_id: '369-PADN-L2-AUTONOMY-V11',
          wip_id: wip.wipId,
          wip_issue: wip.issueNumber,
          control_root: snapshot.controlRoot?.number ?? null,
          control_revision: snapshot.control?.controlRevision ?? null,
          director_epoch: snapshot.control?.directorEpoch ?? null,
          base_sha: wip.lease?.baseSha ?? null,
          head_sha: head,
          branch: wip.lease?.branch ?? null,
          lease_id: wip.lease?.leaseId ?? null,
          lease_revision: wip.lease?.revision ?? null,
          fencing_token: wip.lease?.fencingToken ?? null,
          prompt_sha256: wip.promptSha256 ?? null,
          packet_comment_id: wip.packetCommentId ?? null,
          risk_tier: evalResult.tier ?? null,
          rework_count: wip.reworkCount ?? 0,
          chain_depth: (event.type === 'padn' ? Number(event.clientPayload?.chain_depth ?? 0) : 0) + 1,
          idempotency_key: `${eventType}:${wip.wipId ?? wip.issueNumber}:${head ?? wip.lease?.baseSha ?? 'na'}:${snapshot.control?.controlRevision ?? 0}`,
          dispatched_by: '369-padn-l2-dispatcher',
        },
      });
    }
  }

  // 冪等性: 同じ snapshot からは同じ decisions が決定的に得られる。
  // 重複 webhook は同一 snapshot → 同一 idempotency_key → role workflow 側の concurrency group で直列化される。
  return { status: decisions.length ? 'DECIDED' : 'NO_ACTION', reason: null, gates, decisions, checksByWip };
}

/**
 * ランタイムシグナルの実測（§9 budget / §16 consecutive failures のライブ配線）。
 * 当日分の repository_dispatch 起点 PADN workflow run 数と、直近の連続失敗数を数える。
 * API 取得失敗時は 0 に縮退する（budget はソフトレールであり、transient な API 障害で
 * 全 dispatch を止めない。取得失敗は step summary のログで観測できる）。
 */
export async function collectRuntimeSignals(gh, snapshot) {
  let dispatchesToday = 0;
  let consecutiveFailures = 0;
  try {
    const today = String(snapshot.now).slice(0, 10);
    const res = await gh.listWorkflowRuns({ event: 'repository_dispatch', created: `>=${today}`, per_page: 100 });
    const runs = (res?.workflow_runs ?? []).filter((r) => String(r.name ?? '').startsWith('369 PADN L2'));
    dispatchesToday = runs.length;
    const done = runs
      .filter((r) => r.status === 'completed')
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    for (const r of done) {
      if (r.conclusion === 'failure') consecutiveFailures += 1;
      else break;
    }
  } catch {
    // 縮退（上記コメント参照）
  }
  return { dispatchesToday, consecutiveFailures };
}

/** decisions を repository_dispatch として emit する（App token 必須・observe では呼ばない）。 */
export async function emitDecisions(gh, decisions, ctx) {
  const results = [];
  for (const d of decisions) {
    if (!ctx.hasAppToken) {
      // GITHUB_TOKEN では repository_dispatch を送っても後続 workflow が起動しない（GitHub の
      // 再帰防止仕様）。誤って「送ったのに動かない」状態を作らないため、App token 無しでは emit しない。
      results.push({ ...d, emitted: false, note: 'app_token_missing' });
      continue;
    }
    await gh.repositoryDispatch(d.event_type, d.payload);
    results.push({ ...d, emitted: true });
  }
  return results;
}

// ---------------- CLI ----------------
export async function main(env = process.env) {
  const ctx = contextFromEnv(env);
  const configs = loadConfigs(env.PADN_ROOT ?? '.');
  const eventName = env.GITHUB_EVENT_NAME ?? 'workflow_dispatch';
  const payload = env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const event = normalizeEvent(eventName, payload);

  const gh = new GitHubClient({ token: env.GH_TOKEN || env.GITHUB_TOKEN, repo: ctx.repo });
  let summary;
  let exitCode = 0;

  if (!ctx.enabled) {
    summary = renderStepSummary({
      status: 'DISABLED（default-off: PADN_AUTONOMY_ENABLED が true ではないため観測のみ）',
      notes: ['人間が Actions Variables を設定するまで L2 は write を開始しません（§18）。'],
    });
  } else {
    const snapshot = await buildSnapshot(gh, configs.policy);
    // RT2 事前許可 marker と approval packet 冪等判定に使うため WIP コメントを保持する
    const rt2Approvals = {};
    const wipComments = {};
    for (const wip of snapshot.wips) {
      const comments = await gh.listIssueComments(wip.issueNumber);
      wipComments[wip.issueNumber] = comments;
      rt2Approvals[wip.issueNumber] = findRt2Approval(
        comments.map((c) => ({ user: c.user, body: c.body })),
        configs.riskPolicy,
      );
    }
    // §9 budget のライブ実測（当日の role dispatch 数）
    const signals = await collectRuntimeSignals(gh, snapshot);
    const result = decide({ snapshot, event, ctx, configs, rt2Approvals, dispatchesToday: signals.dispatchesToday });
    let emitted = result.decisions.map((d) => ({ ...d, emitted: false }));
    const observing = ctx.mode === 'observe';
    if (result.status === 'DECIDED' && !observing) {
      emitted = await emitDecisions(gh, result.decisions, ctx);
    }

    // §14: WIP dispatch / Human Gate 到達 / main への push CI 完了を oversight の起動事由として
    // padn_oversight を emit する（schedule 1日2回はこれと独立に走る）。GITHUB_TOKEN では
    // workflow が起動しないため App token がある場合のみ。
    const readyForGate = (snapshot.wips ?? []).filter((w) => w.state === 'READY_FOR_HUMAN_GATE');
    const mainCiCompleted = event.type === 'ci' && event.event === 'push' && event.branch === 'main';
    const oversightReason = emitted.some((d) => d.emitted)
      ? 'role_dispatch'
      : mainCiCompleted
        ? 'main_ci_completed'
        : null;
    if (!observing && ctx.hasAppToken && oversightReason) {
      await gh.repositoryDispatch('padn_oversight', {
        reason: oversightReason,
        chain_depth: (event.type === 'padn' ? Number(event.clientPayload?.chain_depth ?? 0) : 0) + 1,
        dispatched_by: '369-padn-l2-dispatcher',
      });
    }

    // §12: READY_FOR_HUMAN_GATE の WIP へ approval packet を append-only 投稿する
    //（冪等: 同じ frozen head の packet が既にあれば投稿しない。reports enabled 時のみ）。
    const postedPackets = [];
    if (ctx.reportsEnabled) {
      for (const wip of readyForGate) {
        const head = wip.frozenHead ?? '';
        const already = (wipComments[wip.issueNumber] ?? []).some(
          (c) => String(c.body ?? '').includes('369-l2-approval-packet-v1') && String(c.body ?? '').includes(head),
        );
        if (already) continue;
        const pr = prForWip(snapshot, wip);
        const packet = buildApprovalPacket({
          gateId: 'main_merge',
          wip,
          snapshot,
          evidence: {
            links: pr ? [`https://github.com/${ctx.repo}/pull/${pr.number}`] : [],
            verdicts: [],
            ciRun: null,
            vercelPreview: null,
          },
          rollbackJa: 'merge 実施時は該当 PR の revert 1 コミットで巻き戻す（詳細は WIP packet の rollback 節）',
          summaryJa: `${wip.wipId ?? wip.issueNumber} は review PASS 済み・fixed head ${head}。main merge の判断は人間のみが行えます。`,
        });
        const summaryJa = buildSummaryJa({
          hitokoto: 'Human Gate（main merge）の判断待ちです',
          genzaichi: `fixed head ${head}`,
          ningen_kakunin: 'この WIP を merge するかどうかの判断',
          tsugi: '人間の判断まで L2 はこの WIP に何もしません',
        });
        await gh.createIssueComment(
          wip.issueNumber,
          renderControlComment(`HUMAN_GATE_APPROVAL_PACKET — ${wip.wipId ?? wip.issueNumber}`, packet, summaryJa),
        );
        postedPackets.push(wip.issueNumber);
      }
    }
    const flatChecks = Object.entries(result.checksByWip).flatMap(([k, checks]) =>
      checks.map((c) => ({ ...c, check: `${k} ${c.check}` })),
    );
    summary = renderStepSummary({
      status: `${result.status}${observing ? '（observe mode: emit なし）' : ''}${result.reason ? ` — ${result.reason}` : ''}`,
      checks: flatChecks,
      decisions: emitted,
      notes: [
        `event=${eventName} type=${event.type} key=${event.key}`,
        `mode=${ctx.mode} write_lanes_var=${ctx.writeLanesVar} app_token=${ctx.hasAppToken}`,
        `dispatches_today=${signals.dispatchesToday} consecutive_failures=${signals.consecutiveFailures}`,
        `approval_packets_posted=${JSON.stringify(postedPackets)}`,
      ],
    });
    // Control Root への報告は reports enabled かつ実 emit があった場合のみ（コメントスパム防止）
    if (ctx.reportsEnabled && emitted.some((d) => d.emitted)) {
      const l2event = buildL2Event({
        eventType: 'L2_DISPATCHED',
        snapshot,
        details: { decisions: emitted.map((d) => ({ event_type: d.event_type, wip: d.payload.wip_id, emitted: d.emitted })) },
        now: snapshot.now,
      });
      const summaryJa = buildSummaryJa({
        hitokoto: `L2 が role job を ${emitted.filter((d) => d.emitted).length} 件起動しました`,
        genzaichi: `control_revision=${snapshot.control?.controlRevision} / mode=${ctx.mode}`,
        sagyochu: emitted.filter((d) => d.emitted).map((d) => `${d.event_type}(${d.payload.wip_id})`).join(', ') || '—',
        ningen_kakunin: 'Human Gate は L2 では解除されません',
        tsugi: 'role job の完了イベントを待機',
      });
      await gh.createIssueComment(
        snapshot.controlRoot.number,
        renderControlComment('L2_DISPATCHED — role job 起動', l2event, summaryJa),
      );
    }
  }

  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  else console.log(summary);
  return exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      // token 等を含み得る stack をそのまま出さない
      console.error(`padn dispatcher failed: ${err.message}`);
      process.exit(1);
    },
  );
}
