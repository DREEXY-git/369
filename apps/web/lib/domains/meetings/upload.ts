// 会議アップロード（uploadMeeting）の業務ロジック。P3-MEETING（Codex CR #4964764958 対応）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// CR の要求と対応:
//  1. 未信頼本文の安全検査（safeAiInput）を **AI/Embedding 呼び出しより前** に置く。
//     block/flag 規約: severity=high → 生成中止（provider へ一切渡さない）。medium/low → 続行しフラグを
//     AIOutput.safetyFlags に記録する。
//  2. requestId（フォーム埋め込みの一意トークン）で upload 全体を冪等化する。同一 requestId の
//     retry / 並行 submit は **同一 Meeting へ収束**し、重複会議を作らない。
//  3. KnowledgeDocument / KnowledgeChunk / DataLineage / AIOutput を中核レコードと **同一 $transaction**
//     で確定する（post-commit best-effort を全廃 = 部分状態が構造的に発生しない）。
//  4. 冪等アンカーは DomainEvent の @@unique([tenantId, idempotencyKey])。transaction 内で
//     DomainEvent + OutboxMessage を作成し、並行敗者は P2002 → 勝者の Meeting へ収束する。
//
// 冪等キーについて: `emitDomainEvent`（apps/web/lib/events.ts）は独自 transaction を張るため本
// transaction と合成できず、また main の `makeIdempotencyKey` は FNV-1a 32bit 短縮で衝突し得る
// （PR #57 で正準キーへ更新中・未 merge）。そのため本モジュールは **単射な専用キー書式** を自前で
// 構築し、DomainEvent/OutboxMessage を transaction 内で直接作成する（schema 変更なし・frozen ファイル非接触）。
import { prisma } from '@/lib/db';
import type { Prisma } from '@hokko/db';
import { summarizeMeeting, getTranscriptionProvider, getEmbeddingProvider } from '@hokko/ai';
import { chunkText } from '@hokko/shared';
import { safeAiInput, saveAIOutputStandardTx, recordAIOutputUsage } from '@/lib/ai-safety-server';

export interface MeetingUploadActor {
  tenantId: string;
  userId?: string | null;
  /** アクションアイテムの初期担当者表示名。 */
  name?: string | null;
}

export interface MeetingUploadInput {
  title: string;
  type: string;
  transcript: string;
  /** upload 1回分の一意トークン（フォーム描画時に発行）。同一値の再送信は同一 Meeting へ収束する。 */
  requestId: string;
}

export type MeetingUploadFailReason = 'empty' | 'invalid-request-id' | 'blocked';

export type MeetingUploadResult =
  | { ok: true; meetingId: string; duplicated: boolean }
  | { ok: false; reason: MeetingUploadFailReason };

/** テスト専用 fault 注入点（本番経路からは到達不能）。transaction 内の各段直後で throw させ、全段 rollback を実証する。 */
export type MeetingUploadFaultPoint =
  | 'after-guard'
  | 'after-meeting'
  | 'after-transcript'
  | 'after-minutes'
  | 'after-tasks'
  | 'after-audit'
  | 'after-ai-output'
  | 'after-knowledge-doc'
  | 'after-chunks'
  | 'after-lineage'
  | 'after-event';

/** テストで provider 呼び出しの有無を観測するための注入口（未指定なら実 provider getter）。 */
export interface MeetingUploadProviders {
  transcribe(input: { text: string }): Promise<{ text: string; segments: Array<{ speaker: string; startSec: number; text: string }>; provider: string }>;
  summarize(input: { title: string; transcript: string; type?: string }): ReturnType<typeof summarizeMeeting>;
  embed(texts: string[]): Promise<number[][]>;
}

export interface MeetingUploadOptions {
  __providersForTest?: MeetingUploadProviders;
  /** transaction 開始直前の hook（並行テストの barrier 用）。 */
  __beforeTxForTest?: () => Promise<void> | void;
  __faultAfterForTest?: (point: MeetingUploadFaultPoint) => Promise<void> | void;
}

/** requestId の許容書式（UUID/cuid/nanoid を包含する保守的な文字集合・長さ制限）。 */
export const MEETING_UPLOAD_REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * upload 冪等キー（本モジュール専用書式・単射）。
 * requestId は encodeURIComponent で成分エンコードするため区切り注入で他 upload と衝突しない。
 */
export function makeMeetingUploadIdempotencyKey(requestId: string): string {
  return `MEETING_MINUTES_CREATED:upload:${encodeURIComponent(requestId)}`;
}

const EVENT_TYPE = 'MEETING_MINUTES_CREATED';
const AGGREGATE_TYPE = 'Meeting';

function isIdempotencyUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err.code !== 'P2002') return false;
  // DomainEvent の (tenantId, idempotencyKey) 制約のみ収束対象。他の unique 違反は実エラーとして再throw。
  return JSON.stringify(err.meta?.target ?? '').includes('idempotencyKey');
}

/** 既存イベントが本 upload 経路の同一 requestId であることを確認して Meeting id を返す（違えば null）。 */
async function findConvergedMeetingId(tenantId: string, idempotencyKey: string): Promise<string | null> {
  const existing = await prisma.domainEvent.findUnique({
    where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
    select: { eventType: true, aggregateType: true, aggregateId: true },
  });
  if (!existing) return null;
  // キー書式は本モジュール専用の単射だが、防御的に列一致も要求する（別経路の同キーへ誤収束しない）。
  if (existing.eventType !== EVENT_TYPE || existing.aggregateType !== AGGREGATE_TYPE) return null;
  return existing.aggregateId;
}

/**
 * 会議アップロード本体: 安全検査 → AI 生成（transaction 外・純データ化）→ 全レコード単一 transaction 確定。
 * 同一 requestId の再送信・並行送信は同一 Meeting へ収束する（duplicated: true）。
 */
export async function processMeetingUpload(
  actor: MeetingUploadActor,
  input: MeetingUploadInput,
  opts: MeetingUploadOptions = {},
): Promise<MeetingUploadResult> {
  const title = input.title.trim() || '無題の会議';
  const type = input.type || 'social';
  const text = input.transcript.trim();
  if (!text) return { ok: false, reason: 'empty' };
  // requestId 無し/不正は fail-closed（冪等化されない非正規経路を残さない）。
  if (!MEETING_UPLOAD_REQUEST_ID_RE.test(input.requestId)) return { ok: false, reason: 'invalid-request-id' };

  const idempotencyKey = makeMeetingUploadIdempotencyKey(input.requestId);

  // --- ⓪ 冪等 fast-path: 同一 requestId が確定済みなら provider を呼ばず既存 Meeting へ収束 ---
  const already = await findConvergedMeetingId(actor.tenantId, idempotencyKey);
  if (already) return { ok: true, meetingId: already, duplicated: true };

  // --- ① 安全検査を AI/Embedding 呼び出しの**前**に実施（未信頼本文を provider へ渡す前に遮断） ---
  // block/flag 規約: high 注入 → blocked（生成中止・provider 未到達）。medium/low → 続行しフラグ記録。
  // AISafetyLog は requestId を entityId に持つ（Meeting はまだ存在しないため）。
  const guard = await safeAiInput({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorType: 'ai_agent',
    purpose: 'meeting_summarization',
    text,
    entityType: 'MeetingUploadRequest',
    entityId: input.requestId,
    detail: 'pre-provider guard (summarizeMeeting/embedding)',
  });
  if (guard.blocked) return { ok: false, reason: 'blocked' };
  if (opts.__faultAfterForTest) await opts.__faultAfterForTest('after-guard');

  // --- ② ネットワーク/AI 呼び出しは DB 書き込み前に完了させる（transaction 内で外部 I/O を待たない） ---
  const providers: MeetingUploadProviders = opts.__providersForTest ?? {
    transcribe: (i) => getTranscriptionProvider().transcribe(i),
    summarize: (i) => summarizeMeeting(i),
    embed: (texts) => getEmbeddingProvider().embed(texts),
  };
  const transcription = await providers.transcribe({ text });
  const label = type === 'interview' || type === 'oneonone' ? 'HR_CONFIDENTIAL' : 'INTERNAL';
  const minutes = await providers.summarize({ title, transcript: transcription.text, type });
  const chunks = chunkText(`${title}\n${minutes.summaryFull}\n${transcription.text}`, 400, 60);
  const vectors = await providers.embed(chunks);
  if (vectors.length !== chunks.length) throw new Error(`embedding count mismatch: ${vectors.length} != ${chunks.length}`);

  if (opts.__beforeTxForTest) await opts.__beforeTxForTest();

  // --- ③ 中核＋AI出力＋ナレッジ RAG＋冪等アンカーを **単一 $transaction** で all-or-nothing 確定 ---
  // post-commit best-effort を全廃: 会議・文字起こし(+segments)・議事録・決定・タスク・監査・AIOutput・
  // KnowledgeDocument・KnowledgeChunk・DataLineage・DomainEvent・OutboxMessage が揃って commit されるか、
  // 全て rollback されるかの二択（部分 RAG / 重複会議が構造的に発生しない）。
  try {
    const { meeting, aiOutputId } = await prisma.$transaction(async (tx) => {
      const fault = async (p: MeetingUploadFaultPoint) => {
        if (opts.__faultAfterForTest) await opts.__faultAfterForTest(p);
      };
      const meeting = await tx.meeting.create({
        data: {
          tenantId: actor.tenantId,
          title,
          type,
          occurredAt: new Date(),
          organizerId: actor.userId,
          status: 'summarized',
          label,
        },
      });
      await fault('after-meeting');
      await tx.transcript.create({
        data: {
          tenantId: actor.tenantId,
          meetingId: meeting.id,
          fullText: transcription.text,
          provider: transcription.provider,
          segments: {
            create: transcription.segments.map((s) => ({
              tenantId: actor.tenantId,
              speaker: s.speaker,
              startSec: s.startSec,
              text: s.text,
            })),
          },
        },
      });
      await fault('after-transcript');
      await tx.meetingMinutes.create({
        data: {
          tenantId: actor.tenantId,
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
      await fault('after-minutes');
      if (minutes.decisions.length) {
        await tx.decision.createMany({
          data: minutes.decisions.map((d) => ({ tenantId: actor.tenantId, meetingId: meeting.id, text: d })),
        });
      }
      if (minutes.actionItems.length) {
        await tx.actionItem.createMany({
          data: minutes.actionItems.map((ai) => ({
            tenantId: actor.tenantId,
            meetingId: meeting.id,
            title: ai.title,
            assigneeId: actor.userId,
            assigneeName: actor.name ?? undefined,
            dueDate: new Date(Date.now() + ai.dueInDays * 86400000),
            priority: ai.priority,
            status: 'open',
            source: 'meeting',
          })),
        });
      }
      await fault('after-tasks');
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          actorId: actor.userId ?? null,
          actorType: 'user',
          action: 'create',
          entityType: 'Meeting',
          entityId: meeting.id,
          summary: `議事録を取込み、AI要約とタスク${minutes.actionItems.length}件を生成`,
        },
      });
      await fault('after-audit');
      const aiOut = await saveAIOutputStandardTx(tx, {
        tenantId: actor.tenantId,
        userId: actor.userId,
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
      await fault('after-ai-output');
      const doc = await tx.knowledgeDocument.create({
        data: {
          tenantId: actor.tenantId,
          title: `会議議事録: ${title}`,
          body: `${minutes.summaryFull}\n\n${transcription.text}`,
          entityType: 'Meeting',
          entityId: meeting.id,
          label,
          active: true,
        },
      });
      await fault('after-knowledge-doc');
      await tx.knowledgeChunk.createMany({
        data: chunks.map((c, i) => ({
          tenantId: actor.tenantId,
          documentId: doc.id,
          ordinal: i,
          text: c,
          label,
          embedding: vectors[i]!,
          active: true,
        })),
      });
      await fault('after-chunks');
      await tx.dataLineage.create({
        data: { tenantId: actor.tenantId, documentId: doc.id, stage: 'embedded', detail: `${chunks.length} chunks` },
      });
      await fault('after-lineage');
      // 冪等アンカー: (tenantId, idempotencyKey) unique。並行敗者はここで P2002 → 外側 catch で勝者へ収束。
      const ev = await tx.domainEvent.create({
        data: {
          tenantId: actor.tenantId,
          eventType: EVENT_TYPE,
          aggregateType: AGGREGATE_TYPE,
          aggregateId: meeting.id,
          actorId: actor.userId ?? null,
          actorType: 'user',
          payload: { meetingId: meeting.id, title, knowledgeDocumentId: doc.id },
          metadata: { requestId: input.requestId },
          idempotencyKey,
          status: 'pending',
        },
      });
      await tx.outboxMessage.create({
        data: {
          tenantId: actor.tenantId,
          eventId: ev.id,
          eventType: EVENT_TYPE,
          payload: { meetingId: meeting.id, title, knowledgeDocumentId: doc.id } as Prisma.InputJsonValue,
          status: 'pending',
        },
      });
      await fault('after-event');
      return { meeting, aiOutputId: aiOut.aiOutputId };
    });

    // commit 後の利用量記録（非課金・lossy 許容・例外を投げない・AIOutput id で冪等）。業務状態には影響しない。
    await recordAIOutputUsage(aiOutputId, {
      tenantId: actor.tenantId,
      userId: actor.userId,
      actorType: 'ai_agent',
      task: 'summarizeMeeting',
    });
    return { ok: true, meetingId: meeting.id, duplicated: false };
  } catch (e) {
    if (isIdempotencyUniqueViolation(e)) {
      // 並行敗者: 勝者が同一 requestId で確定済み → 勝者の Meeting へ収束（重複 Meeting は rollback 済みで残らない）。
      const winner = await findConvergedMeetingId(actor.tenantId, idempotencyKey);
      if (winner) return { ok: true, meetingId: winner, duplicated: true };
    }
    throw e;
  }
}
