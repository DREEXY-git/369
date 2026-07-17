// PADN L2 — watchdog 検出器（§16）。検出は read-only。
// 出力は BACKPRESSURE_ON / INCIDENT_FREEZE の推奨のみで、branch / PR / Evidence の削除は
// 一切行わない（推奨 action の語彙にも存在しない）。
import { isLeaseActive } from './leases.mjs';
import { prForWip } from './discover.mjs';

const SECRET_PATTERNS = [
  /gh[pousr]_[A-Za-z0-9]{20,}/, // GitHub tokens
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9_-]{20,}/, // OpenAI/Anthropic 形式
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/, // Slack
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9+/_-]{16,}['"]/i,
];

export function secretLike(text) {
  const t = String(text ?? '');
  return SECRET_PATTERNS.some((re) => re.test(t));
}

export function redactSecrets(text) {
  let t = String(text ?? '');
  for (const re of SECRET_PATTERNS) t = t.replace(new RegExp(re.source, `${re.flags.replace('g', '')}g`), '[REDACTED]');
  return t;
}

const FREEZE = 'freeze';
const BACKPRESSURE = 'backpressure';

/**
 * snapshot と補助シグナルから watchdog findings を計算する。
 * @param {object} snapshot buildSnapshot の結果
 * @param {object} policy dispatch-policy.json
 * @param {object} signals { promptHashMismatches?: string[], ciZeroTests?: boolean,
 *   consecutiveFailures?: number, dispatchesToday?: number, gateViolations?: array,
 *   scanTexts?: string[], vaultDrift?: boolean }
 */
export function runWatchdog(snapshot, policy, signals = {}, now = snapshot?.now) {
  const findings = [];
  const add = (id, severity, detail) => findings.push({ id, severity, detail });

  if (!snapshot.ok && snapshot.reason === 'DUPLICATE_CONTROL_ROOT') {
    add('duplicate_control_root', FREEZE, `Control Root が複数: ${JSON.stringify(snapshot.duplicates ?? [])}`);
  }
  if (snapshot.control) {
    const c = snapshot.control;
    if (c.incidentFreeze) add('incident_freeze_active', FREEZE, '既に INCIDENT_FREEZE が宣言済み');
    if (typeof c.activeWriteLanes === 'number' && typeof c.writeCapacity === 'number' && c.activeWriteLanes > c.writeCapacity) {
      add('write_capacity_exceeded', FREEZE, `active_write_lanes=${c.activeWriteLanes} > write_capacity=${c.writeCapacity}`);
    }
  }
  if ((snapshot.duplicateWips ?? []).length > 0) {
    add('duplicate_wip', FREEZE, `重複 WIP: ${JSON.stringify(snapshot.duplicateWips)}`);
  }

  for (const wip of snapshot.wips ?? []) {
    const inProgress = ['CLAIMED', 'IMPLEMENTING'].includes(wip.state);
    if (inProgress) {
      const activity = isLeaseActive(wip.lease, now, {
        ttlHours: policy.leases.ttl_hours,
        checkpointTtlHours: policy.leases.checkpoint_ttl_hours,
      });
      if (!activity.active) {
        add('stale_lease', BACKPRESSURE, `${wip.wipId ?? wip.issueNumber}: lease 失効 (${activity.reason})`);
      }
    }
    if (['REVIEW_PASSED', 'READY_FOR_HUMAN_GATE'].includes(wip.state) && wip.frozenHead) {
      const pr = prForWip(snapshot, wip);
      if (pr && pr.headSha && pr.headSha !== wip.frozenHead) {
        add('stale_pass_head_moved', FREEZE, `${wip.wipId}: PASS head=${wip.frozenHead} だが現 head=${pr.headSha}（fixed-SHA 失効規則違反）`);
      }
    }
    if ((wip.reworkCount ?? 0) > policy.rework_max) {
      add('rework_exceeded', BACKPRESSURE, `${wip.wipId}: rework ${wip.reworkCount} > ${policy.rework_max}（REPLAN_REQUIRED 相当）`);
    }
  }

  const reviewBacklog = (snapshot.wips ?? []).filter((w) => w.state === 'FROZEN_FOR_REVIEW').length;
  if (reviewBacklog > policy.capacity.reviewer_backlog_max) {
    add('review_backlog_exceeded', BACKPRESSURE, `review 待ち ${reviewBacklog} > ${policy.capacity.reviewer_backlog_max}`);
  }

  for (const mismatch of signals.promptHashMismatches ?? []) {
    add('prompt_hash_mismatch', FREEZE, `packet hash 不一致: ${mismatch}`);
  }
  if (signals.ciZeroTests) add('ci_zero_tests', BACKPRESSURE, 'CI green だが収集テスト 0 件（silent green）');
  if ((signals.consecutiveFailures ?? 0) >= policy.consecutive_failures_freeze) {
    add('consecutive_failures', BACKPRESSURE, `連続失敗 ${signals.consecutiveFailures} >= ${policy.consecutive_failures_freeze}`);
  }
  if ((signals.dispatchesToday ?? 0) > policy.budget.max_role_dispatches_per_day) {
    add('budget_threshold', BACKPRESSURE, `本日の role dispatch ${signals.dispatchesToday} > ${policy.budget.max_role_dispatches_per_day}`);
  }
  for (const v of signals.gateViolations ?? []) {
    add('human_gate_violation', FREEZE, `Human Gate 越境の疑い: ${JSON.stringify(v)}`);
  }
  for (const text of signals.scanTexts ?? []) {
    if (secretLike(text)) add('secret_like_value', FREEZE, 'secret 様の値を検出（本文は再掲しない）');
  }
  if (signals.vaultDrift) add('vault_drift', BACKPRESSURE, 'GitHub docs と 369-vault の drift を検出');

  const action = findings.some((f) => f.severity === FREEZE)
    ? 'INCIDENT_FREEZE'
    : findings.some((f) => f.severity === BACKPRESSURE)
      ? 'BACKPRESSURE_ON'
      : null;
  return { findings, action };
}

// ---------------- CLI ----------------
// read-only で snapshot を取り、findings を step summary に出す。
// PADN_REPORTS_ENABLED=true かつ autonomy 有効かつ action がある場合のみ Control Root へ
// append-only イベントを投稿する。既存 branch / PR / Evidence の削除は行わない。
export async function main(env = process.env) {
  const { appendFileSync } = await import('node:fs');
  const { GitHubClient } = await import('./github.mjs');
  const { buildSnapshot } = await import('./discover.mjs');
  const { loadConfigs, contextFromEnv } = await import('./dispatcher.mjs');
  const { renderStepSummary, buildL2Event, buildSummaryJa, renderControlComment } = await import('./reports.mjs');

  const ctx = contextFromEnv(env);
  const configs = loadConfigs(env.PADN_ROOT ?? '.');
  const gh = new GitHubClient({ token: env.GH_TOKEN || env.GITHUB_TOKEN, repo: ctx.repo });

  let summary;
  let exitCode = 0;
  if (!ctx.enabled) {
    summary = renderStepSummary({ status: 'WATCHDOG DISABLED（default-off）', notes: ['PADN_AUTONOMY_ENABLED != true'] });
  } else {
    const snapshot = await buildSnapshot(gh, configs.policy);
    const { findings, action } = runWatchdog(snapshot, configs.policy, {}, snapshot.now);
    summary = renderStepSummary({
      status: action ? `WATCHDOG: ${action}` : 'WATCHDOG: OK',
      findings,
      notes: [`control_revision=${snapshot.control?.controlRevision ?? 'n/a'}`],
    });
    if (action) exitCode = 1; // 検出時は run を fail させ、通知経路（Actions 失敗通知）にも乗せる
    if (action && ctx.reportsEnabled && snapshot.controlRoot) {
      const event = buildL2Event({ eventType: action, snapshot, details: { findings }, now: snapshot.now });
      const summaryJa = buildSummaryJa({
        hitokoto: action === 'INCIDENT_FREEZE' ? '重大な不整合を検出したため新規 dispatch を停止します' : '過負荷/異常兆候のため新規 dispatch を抑制します',
        mondai: findings.map((f) => `${f.id}`).join(', '),
        ningen_kakunin: 'findings を確認し、解除条件を判断してください（L2 は自動解除しません）',
        tsugi: '新規 dispatch 停止（既存 branch/PR/Evidence は削除しません）',
      });
      await gh.createIssueComment(snapshot.controlRoot.number, renderControlComment(`WATCHDOG — ${action}`, event, summaryJa));
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
      console.error(`padn watchdog failed: ${err.message}`);
      process.exit(1);
    },
  );
}
