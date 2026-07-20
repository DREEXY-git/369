import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFencingToken, parseFencingToken, validateFencingToken, isLeaseActive, validateLeaseForWrite } from '../leases.mjs';

const BASE = '7e50a04df6dcc8043689958cbfd9be42e15e1af7';

test('fencing token: L1 実績値を parse できる', () => {
  assert.deepEqual(parseFencingToken('FT-369PADN-E1-B2-L1-7e50a04'), {
    epoch: 1,
    lane: 'B2',
    leaseRevision: 1,
    shortSha: '7e50a04',
  });
  // G1 の lease revision 2（L2 は lease revision の意）
  assert.equal(parseFencingToken('FT-369PADN-E1-G1-L2-7e50a04').leaseRevision, 2);
});

test('fencing token: build → validate 往復', () => {
  const token = buildFencingToken({ epoch: 1, lane: 'B1', leaseRevision: 1, baseSha: BASE });
  assert.equal(token, 'FT-369PADN-E1-B1-L1-7e50a04');
  assert.equal(validateFencingToken(token, { epoch: 1, leaseRevision: 1, baseSha: BASE }).valid, true);
});

test('fencing token: stale token（epoch / revision / base 不一致）は無効', () => {
  const token = 'FT-369PADN-E1-B1-L1-7e50a04';
  assert.equal(validateFencingToken(token, { epoch: 2, leaseRevision: 1, baseSha: BASE }).reason, 'epoch_mismatch');
  assert.equal(validateFencingToken(token, { epoch: 1, leaseRevision: 2, baseSha: BASE }).reason, 'lease_revision_mismatch');
  assert.equal(validateFencingToken(token, { epoch: 1, leaseRevision: 1, baseSha: 'deadbeef123456' }).reason, 'base_sha_mismatch');
  assert.equal(validateFencingToken('garbage', { epoch: 1, leaseRevision: 1, baseSha: BASE }).reason, 'token_format_invalid');
});

test('lease expiry: 発行 48h 超で失効', () => {
  const lease = { issuedAt: '2026-07-16T00:00:00Z' };
  assert.equal(isLeaseActive(lease, '2026-07-16T12:00:00Z').active, true);
  const expired = isLeaseActive(lease, '2026-07-18T00:00:01Z');
  assert.equal(expired.active, false);
  assert.equal(expired.reason, 'ttl_expired');
});

test('lease expiry: CHECKPOINT 無しの 24h 経過で失効・CHECKPOINT で延命', () => {
  const lease = { issuedAt: '2026-07-16T00:00:00Z' };
  const stale = isLeaseActive(lease, '2026-07-17T00:00:01Z');
  assert.equal(stale.active, false);
  assert.equal(stale.reason, 'checkpoint_ttl_expired');
  const refreshed = isLeaseActive({ ...lease, lastCheckpointAt: '2026-07-16T20:00:00Z' }, '2026-07-17T00:00:01Z');
  assert.equal(refreshed.active, true);
});

test('validateLeaseForWrite: 失効 lease / stale token では write 不可', () => {
  const lease = { issuedAt: '2026-07-16T00:00:00Z', revision: 1 };
  const token = 'FT-369PADN-E1-B1-L1-7e50a04';
  const ctx = { epoch: 1, baseSha: BASE };
  assert.equal(validateLeaseForWrite(lease, token, ctx, '2026-07-16T10:00:00Z').valid, true);
  assert.match(validateLeaseForWrite(lease, token, ctx, '2026-07-19T00:00:00Z').reason, /lease_inactive/);
  assert.match(
    validateLeaseForWrite(lease, token, { epoch: 2, baseSha: BASE }, '2026-07-16T10:00:00Z').reason,
    /fencing:epoch_mismatch/,
  );
});
