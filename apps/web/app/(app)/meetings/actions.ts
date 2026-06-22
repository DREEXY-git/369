'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';
import { summarizeMeeting, getTranscriptionProvider, getEmbeddingProvider } from '@hokko/ai';
import { chunkText } from '@hokko/shared';

export async function uploadMeetingAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'meeting', 'create')) redirect('/meetings?denied=1');

  const title = String(formData.get('title') ?? '').trim() || '無題の会議';
  const type = String(formData.get('type') ?? 'social');
  const text = String(formData.get('transcript') ?? '').trim();
  if (!text) redirect('/meetings/upload?error=empty');

  // 文字起こし（テキスト前提。音声は将来 TranscriptionProvider 差し替え）
  const transcription = await getTranscriptionProvider().transcribe({ text });

  const meeting = await prisma.meeting.create({
    data: {
      tenantId: user.tenantId,
      title,
      type,
      occurredAt: new Date(),
      organizerId: user.userId,
      status: 'summarized',
      label: type === 'interview' || type === 'oneonone' ? 'HR_CONFIDENTIAL' : 'INTERNAL',
    },
  });

  const transcript = await prisma.transcript.create({
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

  // AI議事録生成（FakeLLM でも動作）
  const minutes = await summarizeMeeting({ title, transcript: transcription.text, type });
  await prisma.meetingMinutes.create({
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
  await prisma.aIOutput.create({
    data: { tenantId: user.tenantId, task: 'summarizeMeeting', entityType: 'Meeting', entityId: meeting.id, output: minutes as any, confidence: 0.7 },
  });

  for (const d of minutes.decisions) {
    await prisma.decision.create({ data: { tenantId: user.tenantId, meetingId: meeting.id, text: d } });
  }
  for (const ai of minutes.actionItems) {
    await prisma.actionItem.create({
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

  // ナレッジへ取り込み（RAG用にチャンク + Embedding）
  const doc = await prisma.knowledgeDocument.create({
    data: {
      tenantId: user.tenantId,
      title: `会議議事録: ${title}`,
      body: `${minutes.summaryFull}\n\n${transcription.text}`,
      entityType: 'Meeting',
      entityId: meeting.id,
      label: meeting.label,
      active: true,
    },
  });
  const embedder = getEmbeddingProvider();
  const chunks = chunkText(`${title}\n${minutes.summaryFull}\n${transcription.text}`, 400, 60);
  const vectors = await embedder.embed(chunks);
  for (let i = 0; i < chunks.length; i++) {
    await prisma.knowledgeChunk.create({
      data: { tenantId: user.tenantId, documentId: doc.id, ordinal: i, text: chunks[i]!, label: meeting.label, embedding: vectors[i]!, active: true },
    });
  }
  await prisma.dataLineage.create({ data: { tenantId: user.tenantId, documentId: doc.id, stage: 'embedded', detail: `${chunks.length} chunks` } });

  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'Meeting',
    entityId: meeting.id,
    summary: `議事録を取込み、AI要約とタスク${minutes.actionItems.length}件を生成`,
  });

  void transcript;
  revalidatePath('/meetings');
  redirect(`/meetings/${meeting.id}`);
}
