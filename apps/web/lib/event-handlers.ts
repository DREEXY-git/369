// ドメインイベントの業務連動ハンドラ（要件 8-1〜8-4 ＋ 顧客作成）。
// 「直接確定しすぎず、危険なものは候補(タスク)・承認待ちにする」方針。
// このモジュールを import すると registerEventHandler が実行され、ハンドラが登録される。
import { prisma, writeAudit } from './db';
import { registerEventHandler } from './events';

let registered = false;

function pickCustomerId(payload: any): string | null {
  return (payload && (payload.customerId as string)) || null;
}

export function registerDomainEventHandlers(): void {
  if (registered) return;
  registered = true;

  // 顧客作成 → 初回フォロー候補タスク
  registerEventHandler('CUSTOMER_CREATED', async (ev) => {
    await prisma.actionItem.create({
      data: {
        tenantId: ev.tenantId,
        title: `新規顧客の初回フォロー設定: ${ev.payload?.name ?? ''}`.trim(),
        source: 'event',
        priority: 'medium',
        status: 'open',
      },
    });
    await writeAudit({
      tenantId: ev.tenantId,
      actorId: ev.actorId,
      action: 'event_handled',
      entityType: 'Customer',
      entityId: ev.aggregateId,
      summary: 'CUSTOMER_CREATED 連動: 初回フォロータスクを作成',
    });
  });

  // 8-1 見積承認 → 契約/請求/タスクの「候補」を作成（確定はしない）
  registerEventHandler('QUOTE_APPROVED', async (ev) => {
    const cid = pickCustomerId(ev.payload);
    await prisma.actionItem.create({
      data: { tenantId: ev.tenantId, title: '契約書ドラフト作成（見積承認に伴う）', source: 'event', priority: 'high', status: 'open' },
    });
    await prisma.actionItem.create({
      data: { tenantId: ev.tenantId, title: '請求予定の作成（見積承認に伴う）', source: 'event', priority: 'medium', status: 'open' },
    });
    if (cid) {
      await prisma.customerTimelineEvent.create({
        data: { tenantId: ev.tenantId, customerId: cid, type: 'quote', title: '見積が承認されました', body: '契約・請求の準備タスクを自動作成しました。', actorId: ev.actorId },
      });
    }
    await writeAudit({
      tenantId: ev.tenantId,
      actorId: ev.actorId,
      action: 'event_handled',
      entityType: 'Quote',
      entityId: ev.aggregateId,
      summary: 'QUOTE_APPROVED 連動: 契約/請求の準備タスクを作成',
    });
  });

  // 8-2 契約締結 → 請求予定タスク・顧客タイムライン
  registerEventHandler('CONTRACT_SIGNED', async (ev) => {
    const cid = pickCustomerId(ev.payload);
    await prisma.actionItem.create({
      data: { tenantId: ev.tenantId, title: '請求予定作成（契約締結に伴う）', source: 'event', priority: 'high', status: 'open' },
    });
    if (cid) {
      await prisma.customerTimelineEvent.create({
        data: { tenantId: ev.tenantId, customerId: cid, type: 'deal', title: '契約が締結されました', body: '受注処理・請求予定の作成を行ってください。', actorId: ev.actorId },
      });
    }
    await writeAudit({
      tenantId: ev.tenantId,
      actorId: ev.actorId,
      action: 'event_handled',
      entityType: 'Contract',
      entityId: ev.aggregateId,
      summary: 'CONTRACT_SIGNED 連動: 請求予定タスクを作成',
    });
  });

  // 8-3 入金 → 売掛金消込確認タスク・顧客タイムライン
  registerEventHandler('PAYMENT_RECEIVED', async (ev) => {
    const cid = pickCustomerId(ev.payload);
    await prisma.actionItem.create({
      data: { tenantId: ev.tenantId, title: '売掛金消込の確認（入金）', source: 'event', priority: 'medium', status: 'open' },
    });
    if (cid) {
      await prisma.customerTimelineEvent.create({
        data: { tenantId: ev.tenantId, customerId: cid, type: 'invoice', title: '入金を確認しました', body: `入金額: ${ev.payload?.amount ?? ''}`, actorId: ev.actorId },
      });
    }
    await writeAudit({
      tenantId: ev.tenantId,
      actorId: ev.actorId,
      action: 'event_handled',
      entityType: 'Payment',
      entityId: ev.aggregateId,
      summary: 'PAYMENT_RECEIVED 連動: 消込確認タスクを作成',
    });
  });

  // 8-4 議事録作成 → タスク化・ナレッジ取り込み候補
  registerEventHandler('MEETING_MINUTES_CREATED', async (ev) => {
    await prisma.actionItem.create({
      data: { tenantId: ev.tenantId, title: '議事録の決定事項をタスク化・確認', meetingId: ev.aggregateId, source: 'event', priority: 'medium', status: 'open' },
    });
    await writeAudit({
      tenantId: ev.tenantId,
      actorId: ev.actorId,
      action: 'event_handled',
      entityType: 'Meeting',
      entityId: ev.aggregateId,
      summary: 'MEETING_MINUTES_CREATED 連動: タスク化・ナレッジ取込候補を作成',
    });
  });
}

// import 時に登録（副作用）。
registerDomainEventHandlers();
