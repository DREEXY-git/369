// P0基盤の統合テスト（要DB）。`pnpm --filter @hokko/db test:integration` で実行。
// 独立した一時テナントを作成し、最後に後始末する（既存データに非干渉）。
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../client';
import {
  evaluatePolicy,
  evaluateConsent,
  makeIdempotencyKey,
  type ConsentGrantLike,
} from '@hokko/shared';

const A = `itest-A-${Date.now()}`;
const B = `itest-B-${Date.now()}`;

afterAll(async () => {
  await prisma.domainEvent.deleteMany({ where: { tenantId: { in: [A, B] } } });
  await prisma.outboxMessage.deleteMany({ where: { tenantId: { in: [A, B] } } });
  await prisma.policyDecisionLog.deleteMany({ where: { tenantId: { in: [A, B] } } });
  await prisma.consentGrant.deleteMany({ where: { tenantId: { in: [A, B] } } });
  await prisma.dataAccessLog.deleteMany({ where: { tenantId: { in: [A, B] } } });
  await prisma.$disconnect();
});

describe('P0 foundations (integration)', () => {
  it('DomainEvent unique(tenantId, idempotencyKey) prevents duplicate events (idempotency)', async () => {
    const key = makeIdempotencyKey({ tenantId: A, eventType: 'QUOTE_APPROVED', aggregateId: 'q1' });
    await prisma.domainEvent.create({
      data: { tenantId: A, eventType: 'QUOTE_APPROVED', aggregateType: 'Quote', aggregateId: 'q1', idempotencyKey: key },
    });
    await expect(
      prisma.domainEvent.create({
        data: { tenantId: A, eventType: 'QUOTE_APPROVED', aggregateType: 'Quote', aggregateId: 'q1', idempotencyKey: key },
      }),
    ).rejects.toThrow();
    // 別テナントでは同じ aggregateId でも別キーなので作成できる
    const keyB = makeIdempotencyKey({ tenantId: B, eventType: 'QUOTE_APPROVED', aggregateId: 'q1' });
    const evB = await prisma.domainEvent.create({
      data: { tenantId: B, eventType: 'QUOTE_APPROVED', aggregateType: 'Quote', aggregateId: 'q1', idempotencyKey: keyB },
    });
    expect(evB.id).toBeTruthy();
  });

  it('cross-tenant query scoping: tenant B cannot see tenant A events', async () => {
    const aEvents = await prisma.domainEvent.findMany({ where: { tenantId: A } });
    const seenFromB = await prisma.domainEvent.findFirst({ where: { tenantId: B, aggregateId: 'q1', eventType: 'QUOTE_APPROVED', id: aEvents[0]?.id } });
    expect(seenFromB).toBeNull(); // A のイベントIDを B スコープで引いても取得不可
  });

  it('consent grant→withdraw flow reflects in evaluateConsent', async () => {
    await prisma.consentGrant.create({
      data: { tenantId: A, subjectType: 'employee', subjectUserId: 'u1', policyKey: 'location_tracking', purpose: 'location_tracking', status: 'granted' },
    });
    let grants = await loadGrants(A, 'u1');
    expect(evaluateConsent(grants, 'location_tracking').status).toBe('granted');

    await prisma.consentGrant.updateMany({
      where: { tenantId: A, subjectUserId: 'u1', purpose: 'location_tracking' },
      data: { status: 'withdrawn', withdrawnAt: new Date() },
    });
    grants = await loadGrants(A, 'u1');
    expect(evaluateConsent(grants, 'location_tracking').status).toBe('withdrawn');
  });

  it('PolicyDecisionLog records a deny for staff viewing HR confidential', async () => {
    const decision = evaluatePolicy(
      { roles: ['STAFF'], actorType: 'user', userId: 's1' },
      { dataType: 'hr', label: 'HR_CONFIDENTIAL' },
      'view_confidential',
    );
    expect(decision.allow).toBe(false);
    await prisma.policyDecisionLog.create({
      data: {
        tenantId: A,
        actorId: 's1',
        resource: 'hr',
        action: 'view_confidential',
        label: 'HR_CONFIDENTIAL',
        decision: decision.allow ? 'allow' : 'deny',
        reason: decision.reason,
        matchedRules: decision.matchedRules,
      },
    });
    const denies = await prisma.policyDecisionLog.count({ where: { tenantId: A, decision: 'deny' } });
    expect(denies).toBeGreaterThanOrEqual(1);
  });
});

async function loadGrants(tenantId: string, userId: string): Promise<ConsentGrantLike[]> {
  const rows = await prisma.consentGrant.findMany({ where: { tenantId, subjectUserId: userId } });
  return rows.map((g) => ({
    purpose: g.purpose as ConsentGrantLike['purpose'],
    status: g.status as 'granted' | 'withdrawn',
    grantedAt: g.grantedAt,
    withdrawnAt: g.withdrawnAt,
    expiresAt: g.expiresAt,
  }));
}
