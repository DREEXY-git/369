'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { summarizeMeeting, getTranscriptionProvider, getEmbeddingProvider } from '@hokko/ai';
import { chunkText } from '@hokko/shared';
import { safeAiInput, saveAIOutputStandard } from '@/lib/ai-safety-server';

export async function uploadMeetingAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'meeting', 'create')) redirect('/meetings?denied=1');

  const title = String(formData.get('title') ?? '').trim() || '無題の会議';
  const type = String(formData.get('type') ?? 'social');
  const text = String(formData.get('transcript') ?? '').trim();
  if (!text) redirect('/meetings/upload?error=empty');

  // --- ① ネットワーク/AI 呼び出しは DB 書き込み前に完了させる ---
  // （$transaction 内で外部 I/O を待つと接続/ロックを長時間保持してしまうため、先に純データ化する。）
  // 文字起こし（テキスト前提。音声は将来 TranscriptionProvider 差し替え）
  const transcription = await getTranscriptionProvider().transcribe({ text });
  const label = type === 'interview' || type === 'oneonone' ? 'HR_CONFIDENTIAL' : 'INTERNAL';
  // AI議事録生成（FakeLLM でも動作）
  const minutes = await summarizeMeeting({ title, transcript: transcription.text, type });
  // ナレッジ RAG 用の Embedding も先に計算（transaction 外）。
  const chunks = chunkText(`${title}\n${minutes.summaryFull}\n${transcription.text}`, 400, 60);
  const vectors = await getEmbeddingProvider().embed(chunks);

  // --- ② 中核レコードを単一 $transaction で all-or-nothing 確定 ---
  // 会議・文字起こし(+segments)・議事録・決定事項・アクションアイテム・監査を1つの transaction で確定し、
  // 途中失敗で「会議はあるが議事録/タスクが欠落」等の中途半端な状態を残さない。
  // ナレッジ取込み・AI安全ログは非中核（commit 後の best-effort）。
  const { meeting } = await prisma.$transaction(async (tx) => {
    const meeting = await tx.meeting.create({
      data: {
        tenantId: user.tenantId,
        title,
        type,
        occurredAt: new Date(),
        organizerId: user.userId,
        status: 'summarized',
        label,
      },
    });
    await tx.transcript.create({
      data: {
        tenantId: user.tenantId,
        meetingId: meeting.id,
        fullText: transcription.text,
        provider: transcription.provider,
        segments: {
          create: transcription.segments.map((s) => ({
            tenantId: user.tenantId,
            speaker: s.speaker,
            startSec: s.startSec,
            text: s.text,
          })),
        },
      },
    });
    await tx.meetingMinutes.create({
      data: {
        tenantId: user.tenantId,
        meetingId: meeting.id,
        summary3: minutes.summary3,
        summaryFull: minutes.summaryFull,
        ceoSummary: minutes.ceoSummary,
        insights: minutes.insights,
        risks: minutes.risks,
        nextAgenda: minutes.nextAgenda,
        generatedBy: 'FakeLLM',
      },
    });
    for (const d of minutes.decisions) {
      await tx.decision.create({ data: { tenantId: user.tenantId, meetingId: meeting.id, text: d } });
    }
    for (const ai of minutes.actionItems) {
      await tx.actionItem.create({
        data: {
          tenantId: user.tenantId,
          meetingId: meeting.id,
          title: ai.title,
          assigneeId: user.userId,
          assigneeName: user.name,
          dueDate: new Date(Date.now() + ai.dueInDays * 86400000),
          priority: ai.priority,
          status: 'open',
          source: 'meeting',
        },
      });
    }
    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId ?? null,
        actorType: 'user',
        action: 'create',
        entityType: 'Meeting',
        entityId: meeting.id,
        summary: `議事録を取込み、AI要約とタスク${minutes.actionItems.length}件を生成`,
      },
    });
    return { meeting };
  });

  // --- ③ 非中核（commit 後の best-effort）: AI安全ログ・AI出力記録・ナレッジ RAG 取込み ---
  // 文字起こしは外部由来テキスト＝間接注入面。検出して記録する（要約は既に生成済み・FakeLLMは決定論で安全）。
  const guard = await safeAiInput({
    tenantId: user.tenantId,
    actorId: user.userId,
    actorType: 'ai_agent',
    purpose: 'meeting_summarization',
    text: transcription.text,
    entityType: 'Meeting',
    entityId: meeting.id,
    detail: 'summarizeMeeting',
  });
  await saveAIOutputStandard({
    tenantId: user.tenantId,
    userId: user.userId,
    actorType: 'ai_agent',
    task: 'summarizeMeeting',
    purpose: type,
    entityType: 'Meeting',
    entityId: meeting.id,
    input: { meetingId: meeting.id, title, type },
    output: minutes,
    outputText: minutes.summaryFull,
    confidence: 0.7,
    safetyFlags: guard.flags,
  });
  // ナレッジへ取り込み（RAG用にチャンク + 事前計算した Embedding を保存）
  const doc = await prisma.knowledgeDocument.create({
    data: {
      tenantId: user.tenantId,
      title: `会議議事録: ${title}`,
      body: `${minutes.summaryFull}\n\n${transcription.text}`,
      entityType: 'Meeting',
      entityId: meeting.id,
      label,
      active: true,
    },
  });
  for (let i = 0; i < chunks.length; i++) {
    await prisma.knowledgeChunk.create({
      data: { tenantId: user.tenantId, documentId: doc.id, ordinal: i, text: chunks[i]!, label, embedding: vectors[i]!, active: true },
    });
  }
  await prisma.dataLineage.create({ data: { tenantId: user.tenantId, documentId: doc.id, stage: 'embedded', detail: `${chunks.length} chunks` } });

  revalidatePath('/meetings');
  redirect(`/meetings/${meeting.id}`);
}
