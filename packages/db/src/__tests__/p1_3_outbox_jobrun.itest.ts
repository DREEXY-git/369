// Phase 1-3 統合テスト（要DB）: JobRun ライフサイクル / Outbox 配送・再試行 / 同意×ポリシー。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import { createJobRun, appendJobRunLog, finishJobRun, failJobRun } from '../jobrun';
import { processOutboxBatch } from '../outbox';
import { evaluatePolicy, evaluateConsent, makeIdempotencyKey } from '@hokko/shared';

const T = `itest-p13-${Date.now()}`;
const businessHours = new Date('2026-06-23T10:00:00');

afterAll(async () => {
  await prisma.webhookDelivery.deleteMany({ where: { tenantId: T } });
  await prisma.webhookSubscription.deleteMany({ where: { tenantId: T } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: T } });
  await prisma.domainEvent.deleteMany({ where: { tenantId: T } });
  await prisma.consentGrant.deleteMany({ where: { tenantId: T } });
  await prisma.jobRun.deleteMany({ where: { tenantId: T } });
  await prisma.$disconnect();
});

async function makeEventWithOutbox(eventType: string) {
  const key = makeIdempotencyKey({ tenantId: T, eventType, aggregateId: `agg-${Math.random()}` });
  const ev = await prisma.domainEvent.create({
    data: { tenantId: T, eventType, aggregateType: 'Test', aggregateId: key, idempotencyKey: key, status: 'pending' },
  });
  const ob = await prisma.outboxMessage.create({
    data: { tenantId: T, eventId: ev.id, eventType, status: 'pending', nextAttemptAt: new Date(Date.now() - 1000) },
  });
  return { ev, ob };
}

describe('JobRun lifecycle', () => {
  it('create → log → finish marks succeeded with logs', async () => {
    const id = await createJobRun({ jobType: 'TEST_JOB', tenantId: T });
    await appendJobRunLog(id, 'info', 'started');
    await finishJobRun(id, { ok: true });
    const run = await prisma.jobRun.findUnique({ where: { id }, include: { logs: true } });
    expect(run?.status).toBe('succeeded');
    expect(run?.startedAt).toBeTruthy();
    expect(run?.finishedAt).toBeTruthy();
    expect(run?.logs.length).toBeGreaterThanOrEqual(1);
  });

  it('failJobRun marks failed/dead', async () => {
    const id = await createJobRun({ jobType: 'TEST_JOB', tenantId: T });
    await failJobRun(id, 'boom', true);
    const run = await prisma.jobRun.findUnique({ where: { id } });
    expect(run?.status).toBe('dead');
    expect(run?.error).toBe('boom');
  });
});

describe('Outbox dispatch', () => {
  it('processes a pending message with no subscriptions → delivered', async () => {
    const { ob } = await makeEventWithOutbox('TASK_CREATED');
    const res = await processOutboxBatch({ limit: 100 });
    expect(res.jobRunId).toBeTruthy();
    const after = await prisma.outboxMessage.findUnique({ where: { id: ob.id } });
    expect(after?.status).toBe('delivered');
  });

  it('failed webhook delivery retries (attempts++) and records WebhookDelivery', async () => {
    await prisma.webhookSubscription.create({
      data: { tenantId: T, eventType: 'QUOTE_APPROVED', url: 'http://127.0.0.1:1/', secret: 'whsec_x', active: true },
    });
    const { ev, ob } = await makeEventWithOutbox('QUOTE_APPROVED');
    await processOutboxBatch({ limit: 100 });
    const after = await prisma.outboxMessage.findUnique({ where: { id: ob.id } });
    expect(after?.status).toBe('failed');
    expect(after?.attempts).toBeGreaterThanOrEqual(1);
    const deliveries = await prisma.webhookDelivery.count({ where: { tenantId: T, eventId: ev.id, status: 'failed' } });
    expect(deliveries).toBeGreaterThanOrEqual(1);
  });
});

describe('Consent × Policy (location)', () => {
  it('granted location consent allows view in business hours', async () => {
    await prisma.consentGrant.create({
      data: { tenantId: T, subjectType: 'employee', subjectUserId: 'emp1', policyKey: 'location_tracking', purpose: 'location_tracking', status: 'granted' },
    });
    const grants = await prisma.consentGrant.findMany({ where: { tenantId: T, subjectUserId: 'emp1' } });
    const consent = evaluateConsent(
      grants.map((g) => ({ purpose: g.purpose as any, status: g.status as any, grantedAt: g.grantedAt, withdrawnAt: g.withdrawnAt, expiresAt: g.expiresAt })),
      'location_tracking',
      businessHours,
    );
    expect(consent.status).toBe('granted');
    const decision = evaluatePolicy(
      { roles: ['DEPARTMENT_MANAGER'], actorType: 'user', userId: 'mgr' },
      { dataType: 'location', label: 'CONFIDENTIAL' },
      'view_location',
      { consentStatus: 'granted', now: businessHours },
    );
    expect(decision.allow).toBe(true);
  });

  it('missing consent denies location view', () => {
    const decision = evaluatePolicy(
      { roles: ['DEPARTMENT_MANAGER'], actorType: 'user', userId: 'mgr' },
      { dataType: 'location', label: 'CONFIDENTIAL' },
      'view_location',
      { consentStatus: 'missing', now: businessHours },
    );
    expect(decision.allow).toBe(false);
    expect(decision.reason).toBe('consent-required');
  });
});
