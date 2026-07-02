import bcrypt from 'bcryptjs';
import { PrismaClient, type RoleKey } from '@prisma/client';
import {
  ROLE_PERMISSIONS,
  computeLeadScore,
  computeQuoteTotals,
  detectProfitLeaks,
  type LeadStage,
} from '@hokko/shared';
import {
  fakeLeadAnalysis,
  fakeReviewAnalysis,
  fakeWebsiteAnalysis,
  fakeOutreachDraft,
  fakeMeetingMinutes,
  fakeClassifyReply,
  FakeEmbeddingProvider,
  PROMPT_TEMPLATES,
} from '@hokko/ai';
import { DemoMapProvider } from '@hokko/integrations';

const prisma = new PrismaClient();
const embedder = new FakeEmbeddingProvider();
const now = new Date();
const day = 86_400_000;
const addDays = (n: number) => new Date(now.getTime() + n * day);
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]!;

async function reset() {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

const ROLE_NAMES: Record<RoleKey, string> = {
  OWNER: '社長',
  EXECUTIVE: '役員',
  ADMIN: '管理者',
  DEPARTMENT_MANAGER: '部署長',
  STAFF: '担当者',
  READ_ONLY: '閲覧のみ',
  EXTERNAL_EXPERT: '外部士業',
  EXTERNAL_PARTNER: '外部パートナー',
  AI_AGENT: 'AI社員',
  AI_ASSISTANT: 'AIアシスタント',
};

async function main() {
  console.log('🌱 seeding IKEZAKI OS / LeadMap AI demo data…');
  // 非破壊ガード: SEED_ONLY_IF_EMPTY=1 のときは、既存データがあれば何もしない（本番の再デプロイ用）。
  // 通常の `pnpm db:seed`（フラグ無し）は従来どおり reset→再生成する。
  if (process.env.SEED_ONLY_IF_EMPTY === '1') {
    const existing = await prisma.tenant.findFirst();
    if (existing) {
      console.log('[seed] 既存データを検出したためシードをスキップしました（非破壊）。');
      return;
    }
    console.log('[seed] 空のデータベースを検出 — 初回シードを実行します。');
  }
  await reset();

  // ---- Tenant ----
  const tenant = await prisma.tenant.create({
    data: { name: '株式会社プランニングホッコー', plan: 'mvp' },
  });
  const tenantId = tenant.id;

  // ---- Permissions catalog ----
  const permCatalog = [
    ['customer:read', 'CRM', '顧客の閲覧'],
    ['customer:create', 'CRM', '顧客の作成'],
    ['deal:approve', '営業', '案件の承認'],
    ['leadmap:external_send', 'LeadMap', '営業メールの外部送信'],
    ['finance:read', '財務', '財務情報の閲覧'],
    ['admin:update', '管理', '管理設定の変更'],
    ['audit:read', '監査', '監査ログの閲覧'],
  ];
  await prisma.permission.createMany({
    data: permCatalog.map(([key, category, description]) => ({ key: key!, category: category!, description: description! })),
    skipDuplicates: true,
  });

  // ---- Roles ----
  const roleIds: Partial<Record<RoleKey, string>> = {};
  for (const key of Object.keys(ROLE_PERMISSIONS) as RoleKey[]) {
    const role = await prisma.role.create({
      data: { tenantId, key, name: ROLE_NAMES[key], permissions: ROLE_PERMISSIONS[key], isSystem: true },
    });
    roleIds[key] = role.id;
  }

  // ---- Departments ----
  const sales = await prisma.department.create({ data: { tenantId, name: '営業部' } });
  await prisma.department.createMany({
    data: [
      { tenantId, name: '経営管理部' },
      { tenantId, name: '現場・在庫部' },
      { tenantId, name: 'マーケティング部' },
    ],
  });

  // ---- Users ----
  const hash = await bcrypt.hash('password123!', 10);
  async function createUser(email: string, name: string, role: RoleKey, isAi = false, color = '#6366f1') {
    const user = await prisma.user.create({
      data: { tenantId, email, name, passwordHash: hash, isAiAgent: isAi, avatarColor: color, departmentId: sales.id },
    });
    await prisma.userRole.create({ data: { tenantId, userId: user.id, roleId: roleIds[role]! } });
    return user;
  }
  const ceo = await createUser('ceo@ikezaki.local', '北郷 誠一', 'OWNER', false, '#4f46e5');
  const salesUser = await createUser('sales@ikezaki.local', '佐藤 大輔', 'STAFF', false, '#0891b2');
  await createUser('admin@ikezaki.local', '管理 花子', 'ADMIN', false, '#7c3aed');
  const aiSales = await createUser('ai-sales@ikezaki.local', 'AI営業社員 アオイ', 'AI_AGENT', true, '#9333ea');

  await prisma.employeeProfile.create({
    data: { tenantId, userId: salesUser.id, employeeCode: 'EMP-001', title: '営業主任', hiredAt: addDays(-900) },
  });

  // ---- System settings ----
  await prisma.systemSetting.createMany({
    data: [
      { tenantId, key: 'external_send_enabled', value: false },
      { tenantId, key: 'llm_mask_pii', value: true },
      { tenantId, key: 'maps_provider', value: 'demo' },
      { tenantId, key: 'sales_target_monthly', value: 12_000_000 },
    ],
  });

  // ---- Prompt templates ----
  await prisma.promptTemplate.createMany({
    data: PROMPT_TEMPLATES.map((t) => ({
      tenantId,
      key: t.key,
      name: t.name,
      description: t.description,
      template: t.template,
    })),
  });

  // ---- AI Agents ----
  const agentDefs = [
    ['leadmap_sales', 'LeadMap営業AI社員 アオイ', '新規開拓の分析・営業文生成・追客を担当', '営業部', aiSales.id],
    ['sales', 'AI営業社員', '商談要約・提案文・次アクション提案', '営業部', null],
    ['cfo', 'AI CFO', '資金繰り・利益漏れ・財務確認観点の提示', '経営管理部', null],
    ['inventory', 'AI在庫管理社員', '稼働率・収益性・ダイナミックプライシング', '現場・在庫部', null],
    ['chief_of_staff', 'AI社長室長', '朝礼レポート・経営異常検知の統括', '経営管理部', null],
    ['customer', 'AI顧客対応社員', '返信下書き・クレーム予兆検知', '営業部', null],
    ['accounting', 'AI経理社員', '仕訳補助・経費異常検知', '経営管理部', null],
    ['hr', 'AI人事社員', '労務リスク・採用要約', '経営管理部', null],
  ];
  const agents: Record<string, string> = {};
  for (const [key, name, role, dept, userId] of agentDefs) {
    const a = await prisma.aIAgent.create({
      data: { tenantId, key: key as string, name: name as string, role: role as string, department: dept as string, autonomy: 'supervised', userId: (userId as string) ?? null },
    });
    agents[key as string] = a.id;
  }

  // ---- Customers ----
  const customerDefs = [
    ['札幌イベント企画株式会社', 'イベント会社', 'A', 88, 12],
    ['北海道さくら自治会', '地方自治体', 'B', 75, 20],
    ['大通商業施設マネジメント', '商業施設', 'A', 82, 15],
    ['星和学園', '学校法人', 'B', 70, 30],
    ['炭火焼肉 すすきの亭', '飲食店', 'C', 60, 45],
    ['Lien hair 札幌', '美容室', 'B', 78, 18],
    ['さっぽろ北歯科クリニック', '歯科医院', 'B', 72, 25],
    ['そら整体院', '整体院', 'C', 65, 40],
    ['みらい税理士事務所', '士業事務所', 'A', 85, 10],
  ];
  const customers: { id: string; name: string }[] = [];
  for (let i = 0; i < customerDefs.length; i++) {
    const [name, industry, rank, sat, churn] = customerDefs[i]!;
    const c = await prisma.customer.create({
      data: {
        tenantId,
        name: name as string,
        industry: industry as string,
        rank: rank as string,
        ownerId: i % 2 === 0 ? salesUser.id : ceo.id,
        phone: `011-${200 + i}-${1000 + i}`,
        email: `info${i}@example.jp`,
        address: `北海道札幌市中央区${i + 1}条西${i + 2}丁目`,
        satisfaction: sat as number,
        churnRisk: churn as number,
        lastContactAt: addDays(-(i + 1) * 2),
        nextContactAt: addDays(i % 3),
        notes: '主要顧客。リピート・紹介の可能性あり。',
      },
    });
    customers.push({ id: c.id, name: c.name });
    await prisma.customerTimelineEvent.createMany({
      data: [
        { tenantId, customerId: c.id, type: 'meeting', title: '初回商談', body: '要望ヒアリングを実施。', occurredAt: addDays(-30) },
        { tenantId, customerId: c.id, type: 'quote', title: '見積提出', body: '概算見積を提示。', occurredAt: addDays(-18) },
        { tenantId, customerId: c.id, type: 'email', title: 'フォロー連絡', body: '進捗確認のメールを送付。', occurredAt: addDays(-7) },
      ],
    });
    await prisma.customerInsight.create({
      data: {
        tenantId,
        customerId: c.id,
        needs: '集客強化とリピート率向上',
        concerns: '費用対効果と運用負荷',
        priceReaction: '成果が見えれば価格には柔軟',
        nextProposal: '小さく始められる改善施策の提示',
        churnRisk: churn as number,
        confidence: 0.7,
        ngWords: [],
      },
    });
    if ((churn as number) >= 40) {
      await prisma.customerComplaint.create({
        data: { tenantId, customerId: c.id, title: '納品スケジュールの遅延', severity: 'MEDIUM', body: '搬入時間の調整に課題。' },
      });
    }
  }

  // ---- Deals ----
  const dealDefs: [string, number, number, number, string, number][] = [
    ['夏祭り会場設営一式', 1_800_000, 1_150_000, 70, 'NEGOTIATION', 0],
    ['企業展示会ブース設営', 2_400_000, 1_500_000, 55, 'PROPOSAL', 2],
    ['学校イベント備品レンタル', 680_000, 520_000, 80, 'QUOTE', 3],
    ['商業施設キャンペーン装飾', 1_200_000, 900_000, 40, 'HEARING', 2],
    ['美容室Web改善提案', 450_000, 120_000, 60, 'PROPOSAL', 5],
    ['歯科医院MEO改善提案', 300_000, 80_000, 50, 'CONTACT', 6],
    ['飲食店LINE予約導入提案', 250_000, 70_000, 65, 'QUOTE', 4],
    ['整体院Webサイト改善提案', 380_000, 110_000, 35, 'CONTACT', 7],
  ];
  const deals: { id: string; title: string; amount: number; stage: string }[] = [];
  for (let i = 0; i < dealDefs.length; i++) {
    const [title, amount, cost, prob, stage, ci] = dealDefs[i]!;
    const d = await prisma.deal.create({
      data: {
        tenantId,
        customerId: customers[ci]!.id,
        title,
        ownerId: i % 2 === 0 ? salesUser.id : ceo.id,
        stage: stage as any,
        amount,
        cost,
        probability: prob,
        expectedCloseAt: addDays(10 + i * 3),
        nextAction: i % 2 === 0 ? '見積の最終確認' : '提案資料の作成',
        nextActionAt: addDays(i % 5),
        source: i >= 4 ? 'leadmap' : 'manual',
      },
    });
    deals.push({ id: d.id, title, amount, stage });
    await prisma.dealStageHistory.create({
      data: { tenantId, dealId: d.id, toStage: stage as any, note: '初期ステージ', changedById: salesUser.id },
    });
    await prisma.salesActivity.create({
      data: { tenantId, dealId: d.id, customerId: customers[ci]!.id, type: 'visit', summary: '現地確認と要件すり合わせ', ownerId: salesUser.id },
    });
  }

  // ---- Quotes / Contracts / Invoices ----
  for (let i = 0; i < 4; i++) {
    const d = deals[i]!;
    const subtotal = d.amount;
    const cost = Math.round(subtotal * 0.65);
    const discount = i === 1 ? 22 : 5;
    const totals = computeQuoteTotals(subtotal, cost, discount, 10);
    const q = await prisma.quote.create({
      data: {
        tenantId,
        dealId: d.id,
        number: `Q-2026-${100 + i}`,
        title: `${d.title} 御見積`,
        status: i === 0 ? 'approved' : 'pending_approval',
        subtotal,
        cost,
        discountRate: discount,
        taxRate: 10,
        total: totals.total,
        grossMargin: totals.grossMargin,
        grossMarginRate: totals.grossMarginRate,
        validUntil: addDays(30),
        lineItems: {
          create: [
            { tenantId, name: '会場設営・機材一式', quantity: 1, unitPrice: subtotal * 0.7, unitCost: cost * 0.7, amount: subtotal * 0.7 },
            { tenantId, name: '配送・設営・撤去', quantity: 1, unitPrice: subtotal * 0.3, unitCost: cost * 0.3, amount: subtotal * 0.3 },
          ],
        },
      },
    });
    if (i === 0) {
      await prisma.contract.create({
        data: { tenantId, customerId: customers[0]!.id, dealId: d.id, number: `C-2026-${i}`, title: `${d.title} 契約`, status: 'active', startDate: addDays(-5), endDate: addDays(60), renewalDate: addDays(50), autoRenew: true, value: q.total,
          clauses: { create: [{ tenantId, heading: '第5条 解約', body: '中途解約は30日前までに通知。', important: true }] },
          risks: { create: [{ tenantId, description: '自動更新条項あり。更新可否の確認が必要。', severity: 'MEDIUM', recommendation: '更新期限のリマインド設定。', expertNeeded: false }] },
        },
      });
    }
    const inv = await prisma.invoice.create({
      data: {
        tenantId,
        customerId: customers[i]!.id,
        dealId: d.id,
        number: `INV-2026-${200 + i}`,
        status: i === 2 ? 'OVERDUE' : i === 0 ? 'PAID' : 'SENT',
        issueDate: addDays(-40 + i * 5),
        dueDate: i === 2 ? addDays(-10) : addDays(20),
        subtotal,
        taxAmount: Math.round(subtotal * 0.1),
        total: subtotal + Math.round(subtotal * 0.1),
        paidAmount: i === 0 ? subtotal + Math.round(subtotal * 0.1) : 0,
        lineItems: { create: [{ tenantId, name: d.title, quantity: 1, unitPrice: subtotal, amount: subtotal }] },
      },
    });
    if (i === 0) {
      await prisma.payment.create({ data: { tenantId, invoiceId: inv.id, amount: inv.total, method: 'bank' } });
    }
    if (i === 2) {
      await prisma.receivable.create({
        data: { tenantId, invoiceId: inv.id, amount: inv.total, dueDate: addDays(-10), status: 'overdue', riskScore: 70,
          reminders: { create: [{ tenantId, draftMessage: 'お支払期日を過ぎております。ご確認をお願いいたします。（下書き）', status: 'draft' }] },
        },
      });
    }
  }

  // ---- Finance ----
  const accounts = await Promise.all(
    [
      ['400', '売上高', 'revenue'],
      ['500', '売上原価', 'expense'],
      ['600', '販管費', 'expense'],
      ['100', '現金預金', 'asset'],
    ].map(([code, name, type]) =>
      prisma.account.create({ data: { tenantId, code: code!, name: name!, type: type! } }),
    ),
  );
  await prisma.journalEntry.create({
    data: { tenantId, date: addDays(-3), memo: '夏祭り案件 売上計上', source: 'manual',
      lines: { create: [{ tenantId, accountId: accounts[3]!.id, debit: 1_980_000, credit: 0 }, { tenantId, accountId: accounts[0]!.id, debit: 0, credit: 1_980_000 }] } },
  });
  await prisma.expense.createMany({
    data: [
      { tenantId, category: '広告宣伝費', vendor: 'Web広告', amount: 350_000, date: addDays(-12) },
      { tenantId, category: '外注費', vendor: '設営協力会社', amount: 480_000, date: addDays(-9) },
      { tenantId, category: '交際費', vendor: '会食', amount: 88_000, date: addDays(-6), anomaly: true, memo: '前月比で増加。確認推奨。' },
    ],
  });
  await prisma.cashAccount.create({ data: { tenantId, name: 'メインバンク普通預金', balance: 8_400_000 } });
  const forecast = await prisma.cashflowForecast.create({ data: { tenantId, name: '3か月資金繰り見込み', baseDate: now } });
  let bal = 8_400_000;
  for (let w = 0; w < 12; w++) {
    const inflow = w % 4 === 0 ? 2_400_000 : 600_000;
    const outflow = w % 3 === 0 ? 2_900_000 : 1_100_000;
    bal += inflow - outflow;
    await prisma.cashflowForecastLine.create({
      data: { tenantId, forecastId: forecast.id, date: addDays(w * 7), inflow, outflow, balance: bal, note: bal < 1_500_000 ? '残高低下に注意' : '' },
    });
  }
  await prisma.financialAlert.create({
    data: { tenantId, code: 'CASH_WATCH', title: '8週目に資金繰りが薄くなる見込み', severity: 'MEDIUM', detail: '大型支払と入金タイミングのズレ。', recommendation: '入金前倒し交渉・支払サイトの調整を検討。' },
  });
  await prisma.loan.create({ data: { tenantId, lender: '北海道信用金庫', principal: 10_000_000, balance: 6_200_000, interestRate: 1.4, startDate: addDays(-700),
    repayments: { create: [{ tenantId, dueDate: addDays(8), amount: 180_000, paid: false }] } } });

  // ---- Inventory ----
  const cat = await prisma.productCategory.create({ data: { tenantId, name: 'イベント機材' } });
  const loc = await prisma.stockLocation.create({ data: { tenantId, name: '本社倉庫' } });
  const assetDefs: [string, number, number, number, number][] = [
    ['テント(3x3m)', 12, 45000, 18000, 62],
    ['長机', 80, 6000, 1200, 71],
    ['折りたたみ椅子', 300, 1500, 300, 80],
    ['音響機材セット', 6, 280000, 35000, 40],
    ['照明セット', 8, 150000, 22000, 35],
    ['ステージ(ユニット)', 20, 90000, 12000, 28],
    ['発電機', 5, 220000, 18000, 22],
    ['看板スタンド', 30, 12000, 2500, 55],
    ['パーテーション', 40, 8000, 1800, 48],
    ['受付台', 15, 25000, 4000, 33],
    ['スポットライト', 24, 18000, 3000, 30],
    ['展示パネル', 50, 14000, 2600, 26],
    ['紅白幕', 18, 22000, 3500, 20],
    ['のぼり旗', 60, 3000, 600, 44],
    ['延長コード(20m)', 100, 2500, 500, 75],
  ];
  const assets: { id: string; name: string; qty: number }[] = [];
  for (let i = 0; i < assetDefs.length; i++) {
    const [name, qty, price, _cost, util] = assetDefs[i]!;
    const a = await prisma.productAsset.create({
      data: {
        tenantId, code: `AST-${100 + i}`, name, categoryId: cat.id, locationId: loc.id, quantity: qty,
        condition: i === 12 ? 'repair' : 'good', status: 'available', acquisitionCost: price * qty,
        cumulativeRevenue: price * qty * (util / 20), cumulativeGross: price * qty * (util / 40),
        utilizationRate: util, rentalPrice: price, usageCount: Math.round(util / 2), lastUsedAt: addDays(-(i + 1) * 3), nextUseAt: addDays(i % 6),
      },
    });
    assets.push({ id: a.id, name, qty });
    await prisma.assetProfitabilitySnapshot.create({
      data: { tenantId, assetId: a.id, period: '2026-06', revenue: price * qty * (util / 20), gross: price * qty * (util / 40), utilization: util, recovered: util > 50 },
    });
    if (util < 30) {
      await prisma.dynamicPricingSuggestion.create({
        data: { tenantId, assetId: a.id, basePrice: price, suggestedPrice: Math.round(price * 0.88), changeRate: -12, reason: '低稼働解消のため値下げを提案。', factors: { lowUtilization: true } },
      });
    }
  }
  // Lease reservations (with one conflict scenario handled in UI)
  await prisma.leaseReservation.create({
    data: { tenantId, customerId: customers[0]!.id, dealId: deals[0]!.id, eventName: '夏祭り会場設営', venue: '中央区民広場', status: 'reserved', startAt: addDays(14), endAt: addDays(16), deliveryAt: addDays(14), setupAt: addDays(14), returnAt: addDays(16), deliveryStaff: '佐藤', setupStaff: '田中',
      lines: { create: [{ tenantId, assetId: assets[0]!.id, quantity: 8 }, { tenantId, assetId: assets[1]!.id, quantity: 40 }, { tenantId, assetId: assets[2]!.id, quantity: 150 }] } },
  });
  await prisma.leaseReservation.create({
    data: { tenantId, customerId: customers[2]!.id, eventName: '商業施設キャンペーン', venue: '大通モール', status: 'reserved', startAt: addDays(15), endAt: addDays(17),
      lines: { create: [{ tenantId, assetId: assets[0]!.id, quantity: 6 }, { tenantId, assetId: assets[3]!.id, quantity: 2 }] } },
  });

  // ---- Meetings ----
  const meetingDefs: [string, string, string][] = [
    ['夏祭り会場設営 商談', 'social', '佐藤: 今回の夏祭りですが、テントは10張りで進めることに決定しました。\n顧客: 予算は200万円程度を想定しています。少し高いかなという懸念があります。\n佐藤: 音響と照明もセットでご提案します。見積を金曜までに作成してお送りします。\n顧客: 搬入時間が当日朝になる点が気になります。\n佐藤: 搬入導線は事前に会場と調整して、リスクがないようにします。'],
    ['社内定例ミーティング', 'internal', '北郷: 今月の売上が目標に届いていない。営業は受注確度の高い案件を前倒しでお願いします。\n佐藤: 承知しました。展示会ブースの提案を今週中に仕上げます。\n北郷: 在庫の稼働率が低い商品の活用も検討してください。'],
    ['採用面接(営業職)', 'interview', '面接官: これまでのご経験を教えてください。\n候補者: 前職では法人営業を5年担当し、新規開拓を得意としていました。\n面接官: 当社の新規開拓の進め方に興味はありますか。\n候補者: はい、AIを活用した営業に強く関心があります。'],
    ['佐藤さん 1on1', 'oneonone', '北郷: 最近の業務で詰まっている点はありますか。\n佐藤: 見積作成に時間がかかっています。\n北郷: AIアシスタントの見積補助を使ってみてください。'],
    ['整体院Web改善 打ち合わせ', 'social', '佐藤: 現状のサイトはスマホ対応が弱く、予約導線も分かりにくいです。\n顧客: 予約の電話が多くて手間です。改善したいです。\n佐藤: LINE予約とスマホ最適化をご提案します。'],
    ['クレーム対応会議', 'complaint', '佐藤: 焼肉店様より搬入の遅延でクレームがありました。\n北郷: 原因と再発防止策を整理してください。早急に対応をお願いします。\n佐藤: 配送スケジュールの見直しを提案します。'],
  ];
  for (let i = 0; i < meetingDefs.length; i++) {
    const [title, type, transcript] = meetingDefs[i]!;
    const m = await prisma.meeting.create({
      data: { tenantId, title, type, customerId: i === 0 ? customers[0]!.id : i === 4 ? customers[7]!.id : null, occurredAt: addDays(-(i + 1)), organizerId: salesUser.id, status: 'summarized', label: type === 'interview' || type === 'oneonone' ? 'HR_CONFIDENTIAL' : 'INTERNAL' },
    });
    await prisma.recording.create({ data: { tenantId, meetingId: m.id, source: 'upload', durationSec: 1200 } });
    const tr = await prisma.transcript.create({
      data: { tenantId, meetingId: m.id, fullText: transcript, provider: 'FakeTranscription',
        segments: { create: transcript.split('\n').map((line, idx) => {
          const mm = line.match(/^([^:：]{1,12})[:：]\s*(.*)$/);
          return { tenantId, speaker: mm?.[1] ?? '不明', startSec: idx * 30, text: mm?.[2] ?? line };
        }) } },
    });
    const minutes = fakeMeetingMinutes({ title, transcript, type });
    await prisma.meetingMinutes.create({
      data: { tenantId, meetingId: m.id, summary3: minutes.summary3, summaryFull: minutes.summaryFull, ceoSummary: minutes.ceoSummary, insights: minutes.insights, risks: minutes.risks, nextAgenda: minutes.nextAgenda, generatedBy: 'FakeLLM' },
    });
    for (const dec of minutes.decisions) await prisma.decision.create({ data: { tenantId, meetingId: m.id, text: dec } });
    for (const ai of minutes.actionItems) {
      await prisma.actionItem.create({
        data: { tenantId, meetingId: m.id, title: ai.title, assigneeId: salesUser.id, assigneeName: salesUser.name, dueDate: addDays(ai.dueInDays), priority: ai.priority, status: 'open', source: 'meeting' },
      });
    }
    void tr;
  }
  // standalone tasks
  await prisma.actionItem.createMany({
    data: [
      { tenantId, title: '展示会ブースの提案資料を仕上げる', assigneeId: salesUser.id, assigneeName: salesUser.name, dueDate: addDays(2), priority: 'high', status: 'in_progress', source: 'manual' },
      { tenantId, title: '焼肉店様への謝罪と再発防止策の連絡', assigneeId: salesUser.id, assigneeName: salesUser.name, dueDate: addDays(1), priority: 'high', status: 'open', source: 'manual' },
    ],
  });

  // ---- Knowledge ----
  const ksrc = await prisma.knowledgeSource.create({ data: { tenantId, type: 'manual', name: '社内ナレッジ', origin: 'seed' } });
  const knowledgeDocs = [
    ['夏祭り案件の成功提案パターン', 'テント・音響・照明をセットで提案し、搬入導線を事前に会場と調整することで満足度が高い。価格はセット割引で粗利を確保しつつ提示する。'],
    ['美容室向けの刺さる営業切り口', '口コミ評価が高い美容室には、予約導線（LINE予約・スマホ最適化）の改善を切り口にすると反応が良い。Instagramからの予約導線設計も有効。'],
    ['札幌エリアの新規開拓ノウハウ', '中央区・北区は競合が多いが口コミ数も多い。評価4.0前後で口コミに予約の不満がある店舗は提案が刺さりやすい。'],
    ['値引き運用のルール', '値引きは20%を上限とし、それ以上は承認が必要。低粗利案件は付帯サービスで粗利を確保する。'],
    ['クレーム対応の基本', '搬入遅延などのクレームは、原因の特定・再発防止策・顧客への前向きな提案をセットで行う。離反リスク顧客は社長に共有する。'],
  ];
  for (let i = 0; i < knowledgeDocs.length; i++) {
    const [title, body] = knowledgeDocs[i]!;
    const doc = await prisma.knowledgeDocument.create({
      data: { tenantId, sourceId: ksrc.id, title: title!, body: body!, label: 'INTERNAL', active: true },
    });
    const [emb] = await embedder.embed([`${title} ${body}`]);
    await prisma.knowledgeChunk.create({
      data: { tenantId, documentId: doc.id, ordinal: 0, text: `${title}\n${body}`, label: 'INTERNAL', embedding: emb!, active: true },
    });
    await prisma.dataLineage.create({ data: { tenantId, documentId: doc.id, stage: 'embedded', detail: 'FakeEmbedding 64d' } });
  }

  // ---- LeadMap campaigns + leads ----
  const provider = new DemoMapProvider();
  const campaignDefs: [string, string, number, string][] = [
    ['札幌市 美容室 開拓', '美容室', 20, 'Web制作'],
    ['札幌市 歯科医院 開拓', '歯科医院', 15, 'MEO'],
    ['札幌市 飲食店 開拓', '飲食店', 20, 'SNS'],
    ['札幌市 整体院 開拓', '整体院', 15, 'Web制作'],
    ['札幌市 税理士事務所 開拓', '税理士事務所', 10, '広告'],
  ];
  const stageDist: LeadStage[] = ['NEW', 'NEW', 'ANALYZED', 'ANALYZED', 'DRAFTED', 'PENDING_APPROVAL', 'SENT', 'REPLIED'];
  let totalLeads = 0;
  let firstDraftId: string | null = null;
  for (let ci = 0; ci < campaignDefs.length; ci++) {
    const [name, industry, limit, salesType] = campaignDefs[ci]!;
    const campaign = await prisma.leadSearchCampaign.create({
      data: { tenantId, name: name!, region: '札幌市', industry: industry!, status: 'active', source: 'DEMO', ownerId: salesUser.id, forSalesType: salesType!,
        conditions: { create: [{ tenantId, keyword: industry! }] } },
    });
    const places = await provider.search({ region: '札幌市', industry: industry!, limit: limit! });
    for (let li = 0; li < places.length; li++) {
      const p = places[li]!;
      const wh = p.website_hints;
      const score = computeLeadScore({
        rating: p.rating, reviewCount: p.reviewCount, hasWebsite: wh.hasWebsite,
        mobileFriendly: wh.mobile, hasBooking: wh.hasBooking, hasLine: wh.hasLine, hasSocial: !!p.social.instagram,
      }).score;
      const stage = pick(stageDist, totalLeads);
      const lead = await prisma.localBusinessLead.create({
        data: {
          tenantId, campaignId: campaign.id, name: p.name, industry: industry!, address: p.address, prefecture: p.prefecture, city: p.city,
          phone: p.phone, website: p.website, email: p.email, contactForm: p.contactForm, rating: p.rating, reviewCount: p.reviewCount,
          openingHours: p.openingHours, lat: p.lat, lng: p.lng, googleMapsUrl: p.googleMapsUrl, placeId: p.placeId, source: 'DEMO',
          attributionRequired: false, fetchedAt: new Date(p.fetchedAt), cachePolicy: 'demo', priority: score, stage, ownerId: salesUser.id,
          placeSnapshots: { create: [{ tenantId, source: 'DEMO', placeId: p.placeId, payload: p as any, attributionRequired: false, cachePolicy: 'demo' }] },
          reviews: { create: p.reviews.map((r) => ({ tenantId, author: r.author, rating: r.rating, text: r.text, source: 'DEMO' as const })) },
          socialProfiles: { create: p.social.instagram ? [{ tenantId, platform: 'instagram', url: p.social.instagram }] : [] },
          scores: { create: [{ tenantId, score, breakdown: computeLeadScore({ rating: p.rating, reviewCount: p.reviewCount, hasWebsite: wh.hasWebsite }).breakdown }] },
        },
      });
      // website scan + findings (analyzed stages onward)
      if (stage !== 'NEW') {
        const wa = fakeWebsiteAnalysis({ url: p.website ?? '', ssl: wh.ssl, mobile: wh.mobile, hasBooking: wh.hasBooking, hasLine: wh.hasLine, hasContactForm: wh.hasContactForm, hasRecruit: wh.hasRecruit, fetchedOk: wh.hasWebsite });
        await prisma.websiteScan.create({
          data: { tenantId, leadId: lead.id, url: p.website ?? '(なし)', fetchedOk: wh.hasWebsite, ssl: !!wh.ssl, mobile: !!wh.mobile, hasBooking: !!wh.hasBooking, hasLine: !!wh.hasLine, hasContactForm: !!wh.hasContactForm, hasRecruit: !!wh.hasRecruit, title: p.name, emails: wh.emails ?? [], socialLinks: p.social.instagram ? [p.social.instagram] : [],
            findings: { create: wa.findings.map((f) => ({ tenantId, type: f.type, positive: f.positive, detail: f.detail })) } },
        });
        const ra = fakeReviewAnalysis(p.reviews);
        const la = fakeLeadAnalysis({ name: p.name, industry: industry!, city: p.city, rating: p.rating, reviewCount: p.reviewCount, hasWebsite: wh.hasWebsite, mobileFriendly: wh.mobile, hasBooking: wh.hasBooking, hasLine: wh.hasLine, hasSocial: !!p.social.instagram, reviewSummary: ra.positiveReframe, salesType: salesType! });
        await prisma.leadInsight.create({
          data: { tenantId, leadId: lead.id, strengths: la.strengths, opportunities: la.opportunities, angle: la.angle, reasoning: la.reasoning, confidence: la.confidence, generatedBy: 'FakeLLM' },
        });
        // outreach draft for DRAFTED+ stages
        if (['DRAFTED', 'PENDING_APPROVAL', 'SENT', 'REPLIED'].includes(stage)) {
          const od = fakeOutreachDraft({ leadName: p.name, industry: industry!, city: p.city, salesType: salesType!, senderCompany: 'dreexy', senderName: '佐藤', strengths: la.strengths, opportunities: la.opportunities, angle: la.angle });
          const draftStatus = stage === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : stage === 'SENT' || stage === 'REPLIED' ? 'SENT' : 'DRAFT';
          const draft = await prisma.outreachDraft.create({
            data: { tenantId, leadId: lead.id, channel: 'email', subject: od.subject, body: od.body, rationale: od.rationale, evidence: od.evidence, cautions: od.cautions, status: draftStatus as any, generatedBy: 'FakeLLM', createdById: aiSales.id },
          });
          firstDraftId ??= draft.id;
          if (stage === 'PENDING_APPROVAL') {
            await prisma.outreachApproval.create({ data: { tenantId, draftId: draft.id, status: 'PENDING' } });
            await prisma.approvalRequest.create({ data: { tenantId, type: 'outreach_send', title: `営業メール送信承認: ${p.name}`, summary: od.subject, entityType: 'OutreachDraft', entityId: draft.id, requestedById: aiSales.id, assigneeRole: 'DEPARTMENT_MANAGER', riskLevel: 'MEDIUM', status: 'PENDING' } });
          }
          if (stage === 'SENT' || stage === 'REPLIED') {
            await prisma.outreachSendLog.create({ data: { tenantId, draftId: draft.id, channel: 'email', toAddress: p.email ?? `info@${p.placeId}.example.jp`, fromAddress: 'sales@dreexy.example.jp', subject: od.subject, body: od.body, status: 'logged', provider: 'log', approvedById: salesUser.id } });
          }
          if (stage === 'REPLIED') {
            const replyText = li % 3 === 0 ? '配信停止してください。' : 'ぜひ詳しく話を聞きたいです。';
            const cls = fakeClassifyReply(replyText);
            await prisma.outreachReply.create({ data: { tenantId, draftId: draft.id, body: replyText, classification: cls.classification, confidence: cls.confidence } });
            if (cls.classification === 'unsubscribe') {
              await prisma.suppressionList.create({ data: { tenantId, channel: 'email', value: p.email ?? `info@${p.placeId}.example.jp`, reason: '返信で配信停止希望' } }).catch(() => {});
            }
          }
        }
      }
      await prisma.leadPipelineStageHistory.create({ data: { tenantId, leadId: lead.id, toStage: stage, note: 'seed初期ステージ', changedById: salesUser.id } });
      totalLeads++;
    }
  }

  // visit route
  const route = await prisma.visitRoute.create({ data: { tenantId, name: '中央区 訪問ルート', date: addDays(2), ownerId: salesUser.id } });
  const routeLeads = await prisma.localBusinessLead.findMany({ where: { tenantId }, take: 4, orderBy: { priority: 'desc' } });
  for (let i = 0; i < routeLeads.length; i++) {
    const l = routeLeads[i]!;
    await prisma.visitRouteStop.create({ data: { tenantId, routeId: route.id, leadId: l.id, order: i, label: l.name, lat: l.lat, lng: l.lng } });
  }

  // ---- Approvals (extra) ----
  await prisma.approvalRequest.createMany({
    data: [
      { tenantId, type: 'quote_issue', title: '見積発行承認: 企業展示会ブース設営', summary: '値引き22%・粗利低下のため承認が必要', entityType: 'Quote', entityId: 'Q-2026-101', requestedById: salesUser.id, assigneeRole: 'EXECUTIVE', riskLevel: 'HIGH', status: 'PENDING' },
      { tenantId, type: 'invoice_send', title: '請求書送付承認: 学校イベント備品レンタル', summary: '請求書INV-2026-202の送付', entityType: 'Invoice', entityId: 'INV-2026-202', requestedById: salesUser.id, assigneeRole: 'DEPARTMENT_MANAGER', riskLevel: 'MEDIUM', status: 'PENDING' },
    ],
  });

  // ---- AI recommendations / alerts (dashboard) ----
  await prisma.aIRecommendation.createMany({
    data: [
      { tenantId, audience: 'ceo', title: '高優先度リードが未対応です', detail: 'LeadMapで優先度75以上のリードが複数あります。', action: 'AI分析と営業メールを確認し承認・送信', severity: 'MEDIUM', entityType: 'LeadMap' },
      { tenantId, audience: 'ceo', title: '回収遅延の売掛があります', detail: '期日超過の請求が1件あります。', action: '督促文ドラフトを確認し回収アクション', severity: 'HIGH', entityType: 'Receivable' },
      { tenantId, audience: 'ceo', title: '低粗利の見積が承認待ちです', detail: '値引き22%の見積が承認待ちです。', action: '値引き根拠を確認のうえ承認可否を判断', severity: 'MEDIUM', entityType: 'Quote' },
    ],
  });
  await prisma.aIAlert.createMany({
    data: [
      { tenantId, code: 'IDLE_ASSET', title: '眠っているリース商品があります', detail: '紅白幕・展示パネルの稼働率が低下。', severity: 'LOW', entityType: 'ProductAsset' },
      { tenantId, code: 'COMPLAINT', title: 'クレーム予兆を検知', detail: '焼肉店様で搬入遅延の不満。離反リスク。', severity: 'MEDIUM', entityType: 'Customer' },
    ],
  });

  // ---- AI agent runs (activity log) ----
  for (const [key, agentId] of Object.entries(agents)) {
    const run = await prisma.aIAgentRun.create({
      data: { tenantId, agentId, task: key === 'leadmap_sales' ? '営業メール下書き生成' : '日次分析', status: 'SUCCEEDED', input: { scope: 'demo' }, output: { ok: true }, humanReviewed: key !== 'leadmap_sales', sentExternally: false, riskLevel: 'LOW', finishedAt: now },
    });
    await prisma.aIAgentAction.create({ data: { tenantId, runId: run.id, type: 'draft', summary: key === 'leadmap_sales' ? '営業メール下書きを作成（送信は人間承認）' : '異常検知と推奨アクションを生成', refType: 'AIOutput' } });
  }

  // ---- Horenso ----
  await prisma.dailyReport.createMany({
    data: [
      { tenantId, userId: salesUser.id, done: '夏祭り案件の見積を提出', todo: '展示会ブースの提案資料作成', blockers: '搬入時間の確定待ち', forCeo: '展示会案件は今週中に提案完了予定' },
      { tenantId, userId: aiSales.id, done: 'LeadMapリードのAI分析と営業メール下書きを生成', todo: '承認後の送信準備', blockers: '', forCeo: '高優先度リードの承認をお願いします', isAi: true },
    ],
  });
  await prisma.consultation.create({ data: { tenantId, fromId: salesUser.id, topic: 'discount', question: '展示会案件で22%値引きの要望。承認いただけますか。', status: 'open' } });

  // ---- Experts / Subsidies ----
  await prisma.expertPartner.createMany({
    data: [
      { tenantId, type: '社労士', name: '札幌労務サポート', email: 'sr@example.jp' },
      { tenantId, type: '弁護士', name: '大通法律事務所', email: 'law@example.jp' },
      { tenantId, type: '税理士', name: 'みらい税理士事務所', email: 'tax@example.jp' },
    ],
  });
  await prisma.expertReferral.create({ data: { tenantId, reason: '契約に自動更新条項があり確認が必要', topic: 'legal', severity: 'MEDIUM', status: 'suggested', entityType: 'Contract' } });
  await prisma.subsidyProgram.create({
    data: { tenantId, name: 'IT導入補助金2026', authority: '中小企業庁', summary: 'ITツール導入による生産性向上を支援。', maxAmount: 4_500_000, deadline: addDays(45), requirements: ['中小企業であること', 'gBizIDの取得'], documents: ['事業計画書', '見積書'], source: 'DEMO',
      eligibilityChecks: { create: [{ tenantId, score: 78, result: 'likely', detail: '対象要件を概ね満たす見込み。' }] },
      tasks: { create: [{ tenantId, title: 'gBizID プライムの取得', status: 'todo', dueDate: addDays(10) }] } },
  });

  // ---- Planning Hokko events ----
  await prisma.eventProject.create({
    data: { tenantId, name: '中央区 夏祭り 2026', customerId: customers[0]!.id, venue: '中央区民広場', eventDate: addDays(16), status: 'planned', revenue: 1_980_000, cost: 1_150_000, gross: 830_000, loadInAt: addDays(16), loadOutAt: addDays(17), weatherRisk: '降雨時はテント増設が必要', notes: '昨年比で来場者増の見込み',
      productUsages: { create: [{ tenantId, assetName: 'テント(3x3m)', quantity: 8 }, { tenantId, assetName: '音響機材セット', quantity: 1 }] },
      costs: { create: [{ tenantId, category: '設営人件費', amount: 420_000 }, { tenantId, category: '配送費', amount: 180_000 }] },
      grossSnapshots: { create: [{ tenantId, revenue: 1_980_000, cost: 1_150_000, gross: 830_000, marginRate: 41.9 }] },
      nextProposals: { create: [{ tenantId, proposal: '秋の収穫祭で同様のセット提案が可能。照明の追加で客単価向上。' }] } },
  });

  // ---- Marketing ----
  const mc = await prisma.marketingCampaign.create({ data: { tenantId, name: '夏のイベント集客', channel: 'ads', status: 'active', budget: 500_000, spent: 350_000,
    metrics: { create: [{ tenantId, date: addDays(-7), impressions: 42000, clicks: 860, conversions: 18, cost: 350_000 }] } } });
  void mc;
  await prisma.inquiry.createMany({
    data: [
      { tenantId, source: 'Web広告', name: '匿名の問い合わせ', contact: 'lead@example.jp', message: '展示会の設営について相談したい', status: 'new' },
      { tenantId, source: 'Googleマップ', name: '飲食店オーナー', contact: '011-000-0000', message: 'のぼりとテントのレンタル可否', status: 'new' },
    ],
  });

  // ---- Communications (二段階保存) ----
  const thread = await prisma.communicationThread.create({ data: { tenantId, channel: 'gmail', subject: '夏祭り会場設営の見積について', customerId: customers[0]!.id, relevance: 'relevant',
    messages: { create: [{ tenantId, sender: 'tanaka@city-hall.example.jp', direction: 'inbound', body: 'テントと音響の見積をお願いします。' }] } } });
  void thread;
  await prisma.temporaryIngestionItem.createMany({
    data: [
      { tenantId, channel: 'gmail', preview: 'Webサイト改善の相談（業務関連の可能性）', status: 'review' },
      { tenantId, channel: 'gmail', preview: '週末の家族での飲み会の相談（私的内容のため保存しません）', status: 'discarded' },
    ],
  });

  // ---- Backup / consent ----
  await prisma.backupJob.create({ data: { tenantId, tier: 'daily', status: 'succeeded', sizeBytes: 1048576, artifacts: { create: [{ tenantId, fileKey: 'backup/daily/2026-06-22.tar', scope: 'full' }] } } });
  await prisma.consentRecord.create({ data: { tenantId, subject: 'info0@example.jp', channel: 'email', consent: true, source: 'inquiry' } });

  // ---- Notifications ----
  await prisma.notification.createMany({
    data: [
      { tenantId, userId: ceo.id, title: '承認待ちが2件あります', body: '見積発行と請求書送付の承認をご確認ください。', severity: 'MEDIUM', link: '/approvals' },
      { tenantId, userId: ceo.id, title: 'AI朝礼レポートが生成されました', body: '本日の経営サマリーをご確認ください。', severity: 'INFO', link: '/reports/morning' },
    ],
  });

  // ---- Profit leak findings (rule-based) ----
  const leaks = detectProfitLeaks({
    quotes: [{ id: 'Q-2026-101', title: '企業展示会ブース設営', grossMarginRate: 12, discountRate: 22, total: 2_400_000 }],
    unbilledDeals: [{ id: deals[1]!.id, title: deals[1]!.title, amount: deals[1]!.amount }],
    overdueReceivables: [{ id: 'INV-2026-202', amount: 748_000, customer: customers[2]!.name }],
    idleAssets: [{ id: assets[12]!.id, name: assets[12]!.name, utilizationRate: 20, acquisitionCost: 396_000 }],
  });
  for (const lk of leaks) {
    await prisma.profitLeakFinding.create({ data: { tenantId, type: lk.type, title: lk.title, impactJpy: lk.impactJpy, severity: lk.severity, detail: lk.detail, recommendation: lk.recommendation, entityId: lk.entityId } });
  }

  // ---- Company Brain（Phase 2-A: 会社方針・商品カタログ。架空デモデータのみ / PII・実価格なし） ----
  await prisma.companyPolicy.createMany({
    data: [
      { tenantId, title: '経営理念：現場の時間を取り戻す', body: '私たちは中小企業の「人にしかできない仕事」の時間を増やすために、記録・集計・下書きをAIと仕組みに任せる。判断と責任は常に人間が持つ。', category: '経営方針', tags: ['理念'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, title: 'AIと人間の役割分担ポリシー', body: 'AIは分析・下書き・推奨まで。外部送信・承認・削除・契約・人事の決定は必ず人間が行う。AIの生成物は必ず下書きとして扱い、承認なしに社外へ出さない。', category: '社内ルール', tags: ['AI', '安全'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, title: '値引き承認ルール', body: '値引きは20%を上限とし、超える場合は承認が必要。低粗利案件は付帯サービスで粗利を確保する。承認は見積画面の承認フローを使う。', category: '営業方針', tags: ['見積', '承認'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, title: '顧客情報の取り扱い基本方針', body: '顧客の連絡先・商談内容は業務目的以外で参照しない。機密ラベルに従いアクセスし、外部AIへ送る場合は必ずマスキングを通す。', category: '社内ルール', tags: ['個人情報'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, title: '品質確認の基本：検証してから完了報告', body: '「動くはず」ではなく「動いた証拠」で完了報告する。検証していないものを成功扱いしない。問題は隠さず早く共有する。', category: '品質方針', tags: ['品質'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
    ],
  });
  await prisma.productCatalogItem.createMany({
    data: [
      { tenantId, name: 'Web制作パック', description: '店舗・中小企業向けのWebサイト制作。予約導線とスマホ表示を最適化し、更新しやすい構成で納品する。', category: 'Web支援', targetPain: 'Webサイトが古く、予約や問い合わせにつながらない', strengths: '地域業種ごとのテンプレートと運用サポート', priceNote: '規模により個別見積り。営業資料の料金表を参照。', tags: ['web'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: 'MEO対策プラン', description: 'Google マップでの露出改善。口コミ返信の運用支援と情報整備をセットで行う。', category: 'Web支援', targetPain: '近隣検索で競合より下に表示される', strengths: '口コミ分析に基づく改善提案', priceNote: '月額制。詳細は営業資料を参照。', tags: ['meo'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: '予約システム導入支援', description: '電話中心の予約をオンライン予約に移行。無断キャンセル対策の設定まで支援する。', category: 'Web支援', targetPain: '営業中に電話予約対応で手が止まる', strengths: '既存サイト・SNSとの連携設定込み', priceNote: '初期費用＋月額。個別見積り。', tags: ['予約'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: 'イベント企画・運営', description: '展示会・地域イベントの企画から当日運営まで一括対応。機材と人員をまとめて手配する。', category: 'イベント', targetPain: 'イベントの準備に社内の手が回らない', strengths: '自社レンタル資材との一括手配で調整が速い', priceNote: '内容により個別見積り。', tags: ['イベント'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: '音響・照明レンタルプラン', description: '催事・式典向けの音響照明機材レンタル。設営・オペレーター派遣もセットで対応可能。', category: 'レンタル', targetPain: '機材の手配先がバラバラで当日トラブルが不安', strengths: '設営から撤収まで自社スタッフで一貫', priceNote: '機材構成により個別見積り。', tags: ['レンタル'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: 'テント・ステージ設営', description: '屋外イベント用テント・ステージの設営撤去。安全基準に沿った施工計画を含む。', category: 'レンタル', targetPain: '屋外イベントの安全な設営先を探している', strengths: '施工計画書と保険対応の実績', priceNote: '規模・日数により個別見積り。', tags: ['設営'], label: 'INTERNAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: 'SNS運用支援', description: '店舗のSNS投稿計画と運用の伴走支援。投稿はすべて店舗側の承認後に公開する運用。', category: 'Web支援', targetPain: 'SNSを始めたが続かない・効果が見えない', strengths: '業種別の投稿テンプレートと月次レポート', priceNote: '月額制。詳細は営業資料を参照。', tags: ['sns'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
      { tenantId, name: '看板・サインデザイン', description: '店舗看板・催事サインのデザインと製作手配。設置工事の調整まで対応する。', category: 'イベント', targetPain: '店の場所が分かりにくく初来店につながらない', strengths: 'イベント装飾と合わせた一体デザイン', priceNote: 'サイズ・素材により個別見積り。', tags: ['デザイン'], label: 'NORMAL', externalAiAllowed: false, sourceType: 'manual', createdById: ceo.id },
    ],
  });

  // ---- Seed audit logs ----
  await prisma.auditLog.createMany({
    data: [
      { tenantId, actorId: ceo.id, action: 'create', entityType: 'Tenant', entityId: tenantId, summary: 'デモ環境を初期化' },
      { tenantId, actorId: aiSales.id, actorType: 'ai_agent', action: 'ai_run', entityType: 'OutreachDraft', summary: 'AIが営業メール下書きを生成（外部送信なし）' },
      { tenantId, actorId: salesUser.id, action: 'update', entityType: 'Deal', summary: '案件ステージを更新' },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    deals: await prisma.deal.count(),
    leads: await prisma.localBusinessLead.count(),
    drafts: await prisma.outreachDraft.count(),
    assets: await prisma.productAsset.count(),
    meetings: await prisma.meeting.count(),
    policies: await prisma.companyPolicy.count(),
    catalogItems: await prisma.productCatalogItem.count(),
  };
  console.log('✅ seed done', counts, firstDraftId ? `firstDraft=${firstDraftId}` : '');
}

main()
  .catch((e) => {
    console.error('❌ seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
