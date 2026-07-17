import test from 'node:test';
import assert from 'node:assert/strict';
import { buildL2Event, buildSummaryJa, renderControlComment, buildApprovalPacket, renderStepSummary, SUMMARY_SECTIONS } from '../reports.mjs';

const snapshot = {
  now: '2026-07-17T03:00:00Z',
  controlRoot: { number: 66 },
  control: { programId: '369-PADN-V5', controlRevision: 7, directorEpoch: 1 },
  mainSha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7',
};

test('L2 event: 機械 JSON の必須フィールド', () => {
  const ev = buildL2Event({ eventType: 'L2_DISPATCHED', snapshot, details: { a: 1 } });
  assert.equal(ev.schema, '369-l2-event-v1');
  assert.equal(ev.program_id, '369-PADN-L2-AUTONOMY-V11');
  assert.equal(ev.l1_program_id, '369-PADN-V5');
  assert.equal(ev.control_revision_observed, 7);
  assert.equal(ev.director_epoch_observed, 1);
  assert.equal(ev.base_sha, snapshot.mainSha);
});

test('非エンジニア要約: 8 セクション（ひとことで〜次）が必ず埋まる', () => {
  const s = buildSummaryJa({ hitokoto: 'テスト' });
  assert.equal(Object.keys(s).length, SUMMARY_SECTIONS.length);
  assert.equal(s.hitokoto, 'テスト');
  for (const [key] of SUMMARY_SECTIONS) assert.ok(s[key]);
  const comment = renderControlComment('TEST', buildL2Event({ eventType: 'X', snapshot }), s);
  for (const label of ['ひとことで', '現在地', '完了', '作業中', '監査中', '問題', '人間確認', '次']) {
    assert.ok(comment.includes(label), `missing ${label}`);
  }
  assert.ok(comment.includes('append-only'));
  assert.ok(comment.includes('```json'));
});

test('コメントは secret 様文字列を redact する', () => {
  const s = buildSummaryJa({ mondai: 'leak ghp_' + 'x'.repeat(36) });
  const comment = renderControlComment('T', buildL2Event({ eventType: 'X', snapshot }), s);
  assert.ok(!comment.includes('ghp_'));
});

test('approval packet: Human Gate 用の必須項目', () => {
  const p = buildApprovalPacket({
    gateId: 'main_merge',
    wip: { wipId: 'WIP-PADN-B2-001', issueNumber: 68, frozenHead: '95a05dd', lease: { baseSha: '7e50a04' } },
    snapshot,
    evidence: { links: ['x'], verdicts: [{ verdict: 'PASS' }], ciRun: '123', vercelPreview: 'Ready' },
    rollbackJa: 'revert 手順',
    summaryJa: '要約',
  });
  assert.equal(p.schema, '369-l2-approval-packet-v1');
  assert.equal(p.gate_id, 'main_merge');
  assert.equal(p.fixed_head_sha, '95a05dd');
  assert.equal(p.rollback_plan_ja, 'revert 手順');
});

test('step summary: checks / decisions / findings を表現', () => {
  const md = renderStepSummary({
    status: 'NO_ACTION',
    checks: [{ check: 'lease', ok: false, detail: 'expired' }],
    decisions: [{ event_type: 'padn_claude_implement', emitted: false, payload: { wip_id: 'W' } }],
    findings: [{ severity: 'freeze', id: 'x', detail: 'y' }],
    notes: ['note1'],
  });
  assert.ok(md.includes('❌'));
  assert.ok(md.includes('would dispatch'));
  assert.ok(md.includes('freeze'));
  assert.ok(md.includes('note1'));
});
