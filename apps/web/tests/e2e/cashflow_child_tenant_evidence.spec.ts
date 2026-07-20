import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';
import { formatJpy } from '@hokko/shared';

// WIP-PADN-B2-001（V90 FIN_CASHFLOW_FORECAST_LINE_TENANT_R1）実 route＋実 PostgreSQL 証拠。
// CashflowForecastLine は forecastId 単独FKで親子 tenant 一致が DB では強制されないため、
// 「tenant B の行が tenant A の forecast にぶら下がる」不整合データを fixture で実作成し、
//  (1) 旧 read 経路（tenant 条件なし include＝撤去済み barrier）では sentinel が親に同乗する RED を DB 実測
//  (2) 修正後の /finance/cashflow 実 route では A の DOM/KPI/警告に sentinel が 0 件（存在シグナルなし）
//  (3) 自 tenant の正常行は従来どおり表示される（無回帰）
//  (4) finance:read を持たない STAFF は権限メッセージのみで forecast/明細に到達しない
// を証明する。cleanup は本テストが作成した ID に限定（seed 非編集・共有データ非削除）。
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

// 集計・表・警告のどこに出ても一意に検出できる金額 sentinel（seed 金額と桁数から衝突しない値）。
const SENTINEL_INFLOW = 111_222_333;
const SENTINEL_OUTFLOW = 555_666_777;
const SENTINEL_BALANCE = -444_555_666;
const SENTINEL_STRINGS = ['111,222,333', '555,666,777', '444,555,666'];

let tenantA = '';
let foreignTenantId = '';
let targetForecastId = '';
let sentinelLineId = '';

test.describe('資金繰り予測明細の親子tenant境界（WIP-PADN-B2-001）', () => {
  test.beforeAll(async () => {
    assertLocalDatabaseUrl();
    const ceo = await prisma.user.findFirst({ where: { email: 'ceo@ikezaki.local' }, select: { tenantId: true } });
    if (!ceo) throw new Error('seed 未整備: ceo@ikezaki.local が存在しません');
    tenantA = ceo.tenantId;
    // 画面と同じ選択規則（tenant A の最新 forecast）で対象親を特定し、そこへ「tenant B 所属の子行」を接続する。
    const forecast = await prisma.cashflowForecast.findFirst({
      where: { tenantId: tenantA },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!forecast) throw new Error('seed 未整備: tenant A の CashflowForecast が存在しません');
    targetForecastId = forecast.id;
    const foreign = await prisma.tenant.create({ data: { name: `padn-b2-cashflow-foreign-${process.pid}-${Date.now()}` } });
    foreignTenantId = foreign.id;
    const sentinel = await prisma.cashflowForecastLine.create({
      data: {
        tenantId: foreignTenantId, // 親 forecast は tenant A・行は tenant B ＝ 越境した子
        forecastId: targetForecastId,
        date: new Date(),
        inflow: SENTINEL_INFLOW,
        outflow: SENTINEL_OUTFLOW,
        balance: SENTINEL_BALANCE,
        note: 'B2-SENTINEL 越境行（テスト fixture）',
      },
    });
    sentinelLineId = sentinel.id;
  });

  test.afterAll(async () => {
    // cleanup は作成 ID 限定（seed・他テストのデータへ deleteMany の広域条件を使わない）。
    if (sentinelLineId) await prisma.cashflowForecastLine.deleteMany({ where: { id: sentinelLineId } });
    if (foreignTenantId) await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
    await prisma.$disconnect();
  });

  test('RED実測: barrier（tenant 条件）の無い旧 include は越境 sentinel 行を親 forecast へ同乗させる', async () => {
    // 修正前の page.tsx と同一形（lines に tenant 条件なし）の query を DB へ直接発行し、
    // fixture が「旧経路なら漏洩していた」ことを実測で固定する（コード側の barrier は撤去せず DB 実測で再現）。
    const legacyShape = await prisma.cashflowForecast.findFirst({
      where: { tenantId: tenantA },
      include: { lines: { orderBy: { date: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(legacyShape!.id, '対象 forecast の同定').toBe(targetForecastId);
    const leaked = legacyShape!.lines.filter((l) => l.id === sentinelLineId);
    expect(leaked.length, '旧経路（tenant 条件なし）では sentinel が同乗する＝RED').toBe(1);
    expect(leaked[0]!.tenantId, '同乗行は tenant B 所属（親子不一致の実データ）').toBe(foreignTenantId);
  });

  test('OWNER の /finance/cashflow: 自 tenant 行は正常表示・sentinel は DOM/KPI/警告に 0 件', async ({ page }) => {
    const ownLines = await prisma.cashflowForecastLine.findMany({
      where: { forecastId: targetForecastId, tenantId: tenantA },
      orderBy: { date: 'asc' },
      select: { balance: true },
    });
    expect(ownLines.length, '自 tenant の正常行が存在する（seed）').toBeGreaterThan(0);
    const ownMinBalance = Math.min(...ownLines.map((l) => Number(l.balance)));
    const ownShortage = ownLines.some((l) => Number(l.balance) < 0);

    await login(page, 'ceo@ikezaki.local');
    await page.goto('/finance/cashflow');
    await expect(page.getByRole('heading', { name: '資金繰り予測' })).toBeVisible();

    // 正常系（無回帰）: 明細表は自 tenant の行数のまま・KPI は自 tenant 行のみから算出される。
    const forecastRows = page.locator('table').first().locator('tbody tr');
    await expect(forecastRows, '明細表は自 tenant 行のみ').toHaveCount(ownLines.length);
    const minBalanceStat = page.getByText('最低残高見込み').locator('xpath=following-sibling::div[1]');
    await expect(minBalanceStat, 'KPI 最低残高見込みは自 tenant 行のみの最小値').toHaveText(formatJpy(ownMinBalance));
    const shortageStat = page.getByText('資金ショート', { exact: true }).locator('xpath=following-sibling::div[1]');
    if (!ownShortage) {
      await expect(shortageStat, '自 tenant にショート行が無ければ sentinel の負残高でも「なし」のまま').toHaveText('なし');
    }
    await expect(page.getByText('予測期間').locator('xpath=following-sibling::div[1]'), '予測期間 KPI も自 tenant 行数').toHaveText(`${ownLines.length} 週`);

    // 漏洩 0 件: sentinel の金額（入金/出金/残高いずれの形でも）が body 全体に存在しない。
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    for (const s of SENTINEL_STRINGS) {
      expect(bodyText.includes(s), `sentinel 金額 ${s} が DOM に 0 件`).toBe(false);
    }
  });

  test('finance:read の無い STAFF は権限メッセージのみ（forecast 明細・sentinel へ到達しない）', async ({ page }) => {
    // page.tsx は hasPermission(user,'finance','read') 不成立時に forecast/明細 query より前に
    // early return するため、deny role では子 query 自体が発行されない（コード上の実行順で保証）。
    await login(page, 'sales@ikezaki.local');
    await page.goto('/finance/cashflow');
    await expect(page.getByText('閲覧権限がありません')).toBeVisible();
    await expect(page.locator('table'), '明細表が描画されない').toHaveCount(0);
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    for (const s of SENTINEL_STRINGS) {
      expect(bodyText.includes(s), `deny role でも sentinel 金額 ${s} は 0 件`).toBe(false);
    }
  });
});
