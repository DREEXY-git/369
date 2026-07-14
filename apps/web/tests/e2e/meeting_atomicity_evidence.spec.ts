import { test, expect, type Page } from '@playwright/test';
import { prisma } from '@hokko/db';

// Wave2 会議アップロード中核の原子化の実 PostgreSQL 証拠。
// uploadMeetingAction は AI 呼び出し（文字起こし/要約/embedding）を DB 書き込み前に完了させ、
// 会議・文字起こし(+segments)・議事録・決定事項・アクションアイテム・監査を単一 $transaction で確定する。
// これにより「会議はあるが議事録/タスクが欠落」等の中途半端な状態が構造的に発生しない
// （Prisma は transaction 内で例外が出れば全書き込みを rollback する）。
// 本テストは commit された中核レコード群が「揃って一貫している」ことを実 DB で検証する。
// 外部作用なし（社内の議事録生成のみ・FakeLLM は決定論）。

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill('password123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('**/dashboard');
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test('会議中核の原子性: 取込みで 会議＋文字起こし＋議事録＋決定＋タスク＋監査 が揃って作られる', async ({ page }) => {
  const title = `MTG-ATOM-${process.pid}-${Date.now()}`;
  await login(page, 'ceo@ikezaki.local');
  await page.goto('/meetings/upload');
  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="type"]').selectOption('internal');
  await page.locator('textarea[name="transcript"]').fill(
    '本日の会議では夏祭りイベントの設営体制を確認した。田中が会場図面を金曜までに用意する。' +
      '予算超過リスクがあるため見積を再確認する。次回は搬入動線を議論する。',
  );

  await Promise.all([
    page.waitForURL(/\/meetings\/[^/]+$/),
    page.getByRole('button', { name: 'AI議事録を生成' }).click(),
  ]);

  const meeting = await prisma.meeting.findFirst({ where: { title }, select: { id: true, status: true, label: true } });
  expect(meeting, '会議が作成されている').not.toBeNull();
  const meetingId = meeting!.id;
  try {
    expect(meeting!.status).toBe('summarized');
    expect(meeting!.label).toBe('INTERNAL');

    // 中核レコードが揃って存在する（transaction commit の完全性）。
    const transcript = await prisma.transcript.findFirst({ where: { meetingId }, select: { id: true } });
    expect(transcript, '文字起こしが作成されている').not.toBeNull();
    const segCount = await prisma.transcriptSegment.count({ where: { transcriptId: transcript!.id } });
    expect(segCount, '文字起こしセグメントが1件以上').toBeGreaterThan(0);

    const minutes = await prisma.meetingMinutes.findFirst({ where: { meetingId } });
    expect(minutes, '議事録が作成されている').not.toBeNull();
    expect(minutes!.summaryFull.length, '要約本文が空でない').toBeGreaterThan(0);

    const actionItems = await prisma.actionItem.count({ where: { meetingId } });
    expect(actionItems, 'アクションアイテムが1件以上').toBeGreaterThan(0);

    const audit = await prisma.auditLog.findFirst({ where: { entityType: 'Meeting', entityId: meetingId, action: 'create' } });
    expect(audit, '監査ログが会議と同一 transaction で作成されている').not.toBeNull();
  } finally {
    // 後片付け（外部キー順に削除）
    const transcript = await prisma.transcript.findFirst({ where: { meetingId }, select: { id: true } });
    if (transcript) await prisma.transcriptSegment.deleteMany({ where: { transcriptId: transcript.id } });
    const docs = await prisma.knowledgeDocument.findMany({ where: { entityType: 'Meeting', entityId: meetingId }, select: { id: true } });
    for (const d of docs) {
      await prisma.knowledgeChunk.deleteMany({ where: { documentId: d.id } });
      await prisma.dataLineage.deleteMany({ where: { documentId: d.id } });
    }
    await prisma.knowledgeDocument.deleteMany({ where: { entityType: 'Meeting', entityId: meetingId } });
    await prisma.transcript.deleteMany({ where: { meetingId } });
    await prisma.meetingMinutes.deleteMany({ where: { meetingId } });
    await prisma.decision.deleteMany({ where: { meetingId } });
    await prisma.actionItem.deleteMany({ where: { meetingId } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'Meeting', entityId: meetingId } });
    await prisma.meeting.deleteMany({ where: { id: meetingId } });
  }
});
