import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { dispatchLeaseReservation, type LeaseActor } from '../../lib/domains/operations/lease';

// WIP-PADN-INV2（V90 P3-INV-2 LEASE_LINE_CHILD_TENANT_R1）実 route＋実 PostgreSQL 証拠。
// LeaseReservationLine は reservationId 単独FKで親子 tenant 一致が DB では強制されないため、
// 「tenant B の明細が tenant A の予約にぶら下がる」不整合データを fixture で実作成し、
//  (1) 旧 read 経路（tenant 条件なし include＝撤去済み barrier）では sentinel 明細が親予約に同乗する RED を DB 実測
//  (2) 修正後 include（lines に tenantId 条件）では sentinel が 0 件（GREEN を DB 実測）
//  (3) /inventory/lease 実 route の DOM/重複判定に sentinel が 0 件・自 tenant 明細は無回帰で表示
//  (4) lifecycle 遷移（dispatch）は越境明細検知で fail-closed＝書き込みゼロ・CAS rollback（status 不変）
//  (5) イベント案件化 route も越境明細検知で fail-closed＝EventProject を作らず error=state へ
// を証明する。CR は「越境明細を黙って除外して処理を続けない（fail-closed）」を要求するため、
// 単なる非表示ではなく遷移/案件化の**書き込みゼロ**を oracle で固定する。
// cleanup は本テストが作成した ID に限定（seed 非編集・共有データ非削除）。
// 実行前提は他 evidence spec と同一（seed 済みローカル/CI 使い捨て PostgreSQL・retries=0）。

function assertLocalDatabaseUrl(): void {
  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    host = '';
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `TEST_ENVIRONMENT_APPROVAL_REQUIRED: DATABASE_URL host="${host}" は使い捨てローカル/CI service と機械確認できません`,
    );
  }
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

const STAMP = `${process.pid}-${Date.now()}`;
// 越境明細の資産名＝DOM 全文検索の sentinel（seed と衝突しない一意名）。旧経路なら表に描画される。
const SENTINEL_ASSET_NAME = `XT-LEASE-SENTINEL-${STAMP}`;
const OWN_ASSET_NAME = `OWN-LEASE-${STAMP}`;
const EVENT_NAME = `LEASE-XT-RSV-${STAMP}`;

let tenantA = '';
let foreignTenantId = '';
let reservationId = '';
let ownAssetId = '';
let sentinelAssetId = '';
let ownLineId = '';
let sentinelLineId = '';

test.describe('リース予約明細の親子tenant境界（WIP-PADN-INV2 LEASE_LINE_CHILD_TENANT）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    const ceo = await prisma.user.findFirst({
      where: { email: 'ceo@ikezaki.local' },
      select: { tenantId: true },
    });
    if (!ceo) throw new Error('seed 未整備: ceo@ikezaki.local が存在しません');
    tenantA = ceo.tenantId;
    const foreign = await prisma.tenant.create({
      data: { name: `padn-inv2-lease-foreign-${STAMP}` },
    });
    foreignTenantId = foreign.id;

    // 自 tenant の正常明細（無回帰の対照）と、越境した子明細（tenant B 所属）を同一予約へ接続する。
    const ownAsset = await prisma.productAsset.create({
      data: {
        tenantId: tenantA,
        code: `OWN${STAMP}`.slice(0, 12),
        name: OWN_ASSET_NAME,
        quantity: 5,
        status: 'available',
        condition: 'good',
      },
      select: { id: true },
    });
    ownAssetId = ownAsset.id;
    const sentinelAsset = await prisma.productAsset.create({
      data: {
        tenantId: foreignTenantId,
        code: `XT${STAMP}`.slice(0, 12),
        name: SENTINEL_ASSET_NAME,
        quantity: 7,
        status: 'available',
        condition: 'good',
      },
      select: { id: true },
    });
    sentinelAssetId = sentinelAsset.id;

    // dispatch を有効遷移にするため confirmed で作る（confirmed→dispatched の CAS 対象）。
    const reservation = await prisma.leaseReservation.create({
      data: {
        tenantId: tenantA,
        eventName: EVENT_NAME,
        status: 'confirmed',
        startAt: new Date('2031-03-10T00:00:00Z'),
        endAt: new Date('2031-03-12T00:00:00Z'),
      },
      select: { id: true },
    });
    reservationId = reservation.id;

    const ownLine = await prisma.leaseReservationLine.create({
      data: { tenantId: tenantA, reservationId, assetId: ownAssetId, quantity: 2 },
      select: { id: true },
    });
    ownLineId = ownLine.id;
    const sentinelLine = await prisma.leaseReservationLine.create({
      // 親予約は tenant A・明細は tenant B ＝ 越境した子（DB では拒否できない不整合）。
      data: { tenantId: foreignTenantId, reservationId, assetId: sentinelAssetId, quantity: 1 },
      select: { id: true },
    });
    sentinelLineId = sentinelLine.id;
  });

  test.afterAll(async () => {
    // cleanup は作成 ID 限定（seed・他テストのデータへ広域 deleteMany を使わない）。
    if (reservationId) {
      await prisma.eventProductUsage.deleteMany({
        where: { assetId: { in: [ownAssetId, sentinelAssetId] } },
      });
      await prisma.eventProject.deleteMany({ where: { tenantId: tenantA, name: EVENT_NAME } });
      await prisma.inventoryMovement.deleteMany({ where: { reservationId } });
      if (sentinelLineId)
        await prisma.leaseReservationLine.deleteMany({ where: { id: sentinelLineId } });
      if (ownLineId) await prisma.leaseReservationLine.deleteMany({ where: { id: ownLineId } });
      await prisma.leaseReservation.deleteMany({ where: { id: reservationId } });
    }
    if (ownAssetId) await prisma.productAsset.deleteMany({ where: { id: ownAssetId } });
    if (sentinelAssetId) await prisma.productAsset.deleteMany({ where: { id: sentinelAssetId } });
    if (foreignTenantId) await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
    await prisma.$disconnect();
  });

  test('RED/GREEN実測: barrier無し旧includeは越境明細を同乗させ、tenant条件付きincludeは0件', async () => {
    // 旧 page.tsx と同一形（lines に tenant 条件なし）を DB へ直接発行＝fixture が旧経路で漏洩する RED を固定。
    const legacyShape = await prisma.leaseReservation.findFirst({
      where: { id: reservationId, tenantId: tenantA },
      include: { lines: { orderBy: { id: 'asc' } } },
    });
    const legacyLeaked = legacyShape!.lines.filter((l) => l.id === sentinelLineId);
    expect(legacyLeaked.length, '旧経路（tenant 条件なし）では越境明細が同乗する＝RED').toBe(1);
    expect(legacyLeaked[0]!.tenantId, '同乗行は tenant B 所属（親子不一致の実データ）').toBe(
      foreignTenantId,
    );

    // 修正後 page.tsx と同一形（lines に tenantId 条件）＝GREEN を DB 実測。
    const fixedShape = await prisma.leaseReservation.findFirst({
      where: { id: reservationId, tenantId: tenantA },
      include: { lines: { where: { tenantId: tenantA }, orderBy: { id: 'asc' } } },
    });
    expect(
      fixedShape!.lines.map((l) => l.id),
      'tenant 条件付き include は自 tenant 明細のみ',
    ).toEqual([ownLineId]);
  });

  test('OWNER の /inventory/lease: 自 tenant 明細は表示・越境 sentinel は DOM に 0 件（無回帰）', async ({
    page,
  }) => {
    await login(page, 'ceo@ikezaki.local');
    await page.goto('/inventory/lease');
    await expect(page.getByRole('heading', { name: 'リース・貸出管理' })).toBeVisible();
    // 対象予約カードが描画される（親は tenant A のため無回帰で表示）。
    await expect(page.getByText(EVENT_NAME, { exact: true })).toBeVisible();

    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    // 自 tenant 明細（資産名）は表示される＝正常系の無回帰。
    expect(bodyText.includes(OWN_ASSET_NAME), '自 tenant 明細の資産名が DOM に存在する').toBe(true);
    // 越境 sentinel 明細の資産名は DOM 全文に 0 件（表示・重複判定のどちらにも同乗しない）。
    expect(bodyText.includes(SENTINEL_ASSET_NAME), `越境 sentinel 資産名が DOM に 0 件`).toBe(
      false,
    );
  });

  test('lifecycle dispatch: 越境明細検知で fail-closed＝Movement/DomainEvent/Audit ゼロ・status 不変', async () => {
    const actor: LeaseActor = { tenantId: tenantA, userId: null };
    const before = {
      status: (await prisma.leaseReservation.findUnique({
        where: { id: reservationId },
        select: { status: true },
      }))!.status,
      movements: await prisma.inventoryMovement.count({ where: { reservationId } }),
      leaseEvents: await prisma.domainEvent.count({
        where: { aggregateType: 'LeaseReservation', aggregateId: reservationId },
      }),
      audit: await prisma.auditLog.count({
        where: { tenantId: tenantA, entityType: 'LeaseReservation', entityId: reservationId },
      }),
    };
    expect(before.status, '前提: 予約は confirmed（dispatch の有効遷移元）').toBe('confirmed');

    const result = await dispatchLeaseReservation(actor, reservationId);
    expect(result, '越境明細検知で fail-closed（黙って除外して続行しない）').toEqual({
      ok: false,
      reason: 'tenant-mismatch',
    });

    const after = {
      status: (await prisma.leaseReservation.findUnique({
        where: { id: reservationId },
        select: { status: true },
      }))!.status,
      movements: await prisma.inventoryMovement.count({ where: { reservationId } }),
      leaseEvents: await prisma.domainEvent.count({
        where: { aggregateType: 'LeaseReservation', aggregateId: reservationId },
      }),
      audit: await prisma.auditLog.count({
        where: { tenantId: tenantA, entityType: 'LeaseReservation', entityId: reservationId },
      }),
    };
    // throw による CAS rollback を実証: status も全書き込み面も遷移前と同一（書き込みゼロ）。
    expect(after.status, 'CAS が rollback され status は confirmed のまま').toBe('confirmed');
    expect(after.movements, 'InventoryMovement 不増').toBe(before.movements);
    expect(after.leaseEvents, 'LeaseReservation DomainEvent 不増').toBe(before.leaseEvents);
    expect(after.audit, 'LeaseReservation AuditLog 不増').toBe(before.audit);
  });

  test('イベント案件化 route: 越境明細検知で fail-closed＝EventProject を作らず error=state', async ({
    page,
  }) => {
    const before = await prisma.eventProject.count({
      where: { tenantId: tenantA, name: EVENT_NAME },
    });
    expect(before, '前提: 対象名の EventProject は未作成').toBe(0);

    await login(page, 'ceo@ikezaki.local');
    await page.goto('/inventory/lease');
    // 対象予約カード（Card=div.rounded-xl・eventName 一意）に限定してイベント案件化を実行する。
    const card = page.locator('div.rounded-xl').filter({ hasText: EVENT_NAME });
    await card.getByRole('button', { name: 'イベント案件化' }).click();
    await page.waitForURL('**/inventory/lease?error=state');

    const after = await prisma.eventProject.count({
      where: { tenantId: tenantA, name: EVENT_NAME },
    });
    expect(after, '越境明細検知で EventProject は 1 件も作られない（fail-closed）').toBe(0);
  });
});
