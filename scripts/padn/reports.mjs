// PADN L2 — Control Root への append-only イベントと非エンジニア向け要約（§15）。
import { redactSecrets } from './watchdog.mjs';

export const SUMMARY_SECTIONS = [
  ['hitokoto', 'ひとことで'],
  ['genzaichi', '現在地'],
  ['kanryo', '完了'],
  ['sagyochu', '作業中'],
  ['kansachu', '監査中'],
  ['mondai', '問題'],
  ['ningen_kakunin', '人間確認'],
  ['tsugi', '次'],
];

export function buildL2Event({ eventType, snapshot, details = {}, now }) {
  return {
    schema: '369-l2-event-v1',
    program_id: '369-PADN-L2-AUTONOMY-V11',
    l1_program_id: snapshot?.control?.programId ?? '369-PADN-V5',
    event_type: eventType,
    ts: now ?? snapshot?.now ?? null,
    control_root: snapshot?.controlRoot?.number ?? null,
    control_revision_observed: snapshot?.control?.controlRevision ?? null,
    director_epoch_observed: snapshot?.control?.directorEpoch ?? null,
    base_sha: snapshot?.mainSha ?? null,
    details,
  };
}

export function buildSummaryJa(partial = {}) {
  const summary = {};
  for (const [key] of SUMMARY_SECTIONS) summary[key] = partial[key] ?? '—';
  return summary;
}

/** 人間向け要約 + 機械 JSON を併記した append-only コメント本文を作る。 */
export function renderControlComment(title, event, summaryJa) {
  const lines = [`## ${title}`, ''];
  for (const [key, label] of SUMMARY_SECTIONS) {
    lines.push(`- **${label}**: ${summaryJa[key] ?? '—'}`);
  }
  lines.push('', '```json', JSON.stringify(event, null, 2), '```', '');
  lines.push('_この投稿は PADN L2 orchestrator による append-only イベントです。既存コメントの編集は行いません。_');
  return redactSecrets(lines.join('\n'));
}

/** Human Gate 到達時の approval packet（人間が判断できる単位）を組み立てる。 */
export function buildApprovalPacket({ gateId, wip, snapshot, evidence = {}, rollbackJa, summaryJa }) {
  return {
    schema: '369-l2-approval-packet-v1',
    gate_id: gateId,
    wip_id: wip?.wipId ?? null,
    wip_issue: wip?.issueNumber ?? null,
    fixed_head_sha: wip?.frozenHead ?? null,
    base_sha: wip?.lease?.baseSha ?? snapshot?.mainSha ?? null,
    evidence_links: evidence.links ?? [],
    review_verdicts: evidence.verdicts ?? [],
    ci_run: evidence.ciRun ?? null,
    vercel_preview_status: evidence.vercelPreview ?? null,
    rollback_plan_ja: rollbackJa ?? null,
    summary_ja: summaryJa ?? null,
  };
}

/** GITHUB_STEP_SUMMARY 向け markdown。 */
export function renderStepSummary({ status, checks = [], decisions = [], findings = [], notes = [] }) {
  const lines = [`# PADN L2 — ${status}`, ''];
  if (checks.length) {
    lines.push('## Preconditions (§9)', '', '| check | ok | detail |', '|---|---|---|');
    for (const c of checks) lines.push(`| ${c.check} | ${c.ok ? '✅' : '❌'} | ${c.detail ?? ''} |`);
    lines.push('');
  }
  if (decisions.length) {
    lines.push('## Decisions', '');
    for (const d of decisions) {
      lines.push(`- ${d.emitted ? '🚀 dispatched' : '📝 would dispatch (not emitted)'}: \`${d.event_type}\` → ${d.payload?.wip_id ?? ''}`);
    }
    lines.push('');
  }
  if (findings.length) {
    lines.push('## Watchdog findings', '');
    for (const f of findings) lines.push(`- [${f.severity}] ${f.id}: ${f.detail}`);
    lines.push('');
  }
  for (const n of notes) lines.push(`> ${n}`);
  return redactSecrets(lines.join('\n'));
}
