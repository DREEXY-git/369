// 会議アップロード（uploadMeeting）の業務ロジック。P3-MEETING（Codex CR #4964764958 / R2 #4989554075 対応）。
// 設計ルール: docs/audit/12_maintenance_architecture.md。Server Action はこのサービスを呼ぶだけ。
//
// CR R1 の要求と対応:
//  1. 未信頼本文の安全検査（safeAiInput）を **AI/Embedding 呼び出しより前** に置く。
//     block/flag 規約: severity=high → 生成中止（provider へ一切渡さない）。medium/low → 続行しフラグを
//     AIOutput.safetyFlags に記録する。
//  2. requestId（フォーム埋め込みの一意トークン）で upload 全体を冪等化する。同一 requestId の
//     retry / 並行 submit は **同一 Meeting へ収束**し、重複会議を作らない。
//  3. KnowledgeDocument / KnowledgeChunk / DataLineage / AIOutput を中核レコードと **同一 $transaction**
//     で確定する（post-commit best-effort を全廃 = 部分状態が構造的に発生しない）。
//
// CR R2（#4989554075）の要求と対応:
//  4. requestId 冪等が payload-blind だった → **fingerprint 結合**。fp = sha256(stableStringify(
//     {tenantId, actorId, title, type, transcript})) を claim/anchor の metadata に保存し、fast-path /
//     収束の前に fp を照合する。同一 requestId + 異 payload は provider/DB 到達前に
//     `idempotency-mismatch` で fail-closed（別内容が既存 Meeting へ「成功」偽装で収束しない）。
//  5. 冪等 barrier が transaction 末尾（provider 呼び出し後）だった → **provider 前 durable claim**。
//     DomainEvent の (tenantId, idempotencyKey) unique を「先取り claim 行」（status='processing'・
//     aggregateId='pending'・metadata={requestId, fp, phase:'claimed'}・Outbox なし）として提供者呼び出し
//     **前**に獲得する。winner だけが guard + 3 provider を実行し、same-payload follower は claim 完了を
//     poll して winner の Meeting へ収束する（provider 呼び出し 0 = 二重 AI 実行なし）。
//     - winner の業務 transaction は claim 行を **fenced UPDATE**（id + status='processing' +
//       occurredAt 一致の updateMany count===1）で aggregateId=meeting.id / payload / phase:'complete' /
//       status='pending' へ確定し、OutboxMessage を同時作成する（lease を失っていれば rollback）。
//     - winner 失敗（guard blocked / provider throw / tx rollback）は claim を fenced deleteMany で解放し、
//       retry が新 winner になれる。crash で解放されない claim は occurredAt の TTL（2分）超過で
//       follower が CAS（occurredAt 更新 count===1）により takeover する。
//     - claim 行は Outbox を持たず status='processing' のため、イベント消費系（Outbox worker）には流れない。
//
// 冪等キーについて: `emitDomainEvent`（apps/web/lib/events.ts）は独自 transaction を張るため本
// transaction と合成できず、また main の `makeIdempotencyKey` は FNV-1a 32bit 短縮で衝突し得る
// （PR #57 で正準キーへ更新中・未 merge）。そのため本モジュールは **単射な専用キー書式** を自前で
// 構築し、DomainEvent/OutboxMessage を transaction 内で直接作成する（schema 変更なし・frozen ファイル非接触）。
import { createHash } from 'node:crypto';
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

export type MeetingUploadFailReason =
  | 'empty'
  | 'invalid-request-id'
  | 'blocked'
  /** 同一 requestId が**異なる内容**で既に使用済み/処理中（fp 不一致）。別内容を既存結果へ収束させない fail-closed。 */
  | 'idempotency-mismatch'
  /** 同一 requestId の winner が処理中で、poll 予算内に完了しなかった（TTL 内 = takeover もしない）。 */
  | 'in-progress';

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
  /** claim（lease）獲得直後・guard/provider 実行前の hook（winner だけが通る）。並行テストの winner gate 用。 */
  __gateAfterClaimForTest?: () => Promise<void> | void;
  /** follower の claim 完了 poll 間隔/予算の上書き（テスト用）。 */
  __claimPollForTest?: { intervalMs: number; budgetMs: number };
  /** claim TTL（ms）の上書き（テスト用）。既定 2 分。 */
  __claimTtlMsForTest?: number;
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

/** 決定論的 JSON 文字列化（キー昇順・再帰）。fp 計算の入力を key 順序に依存させない。 */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map((x) => stableStringify(x)).join(',')}]`;
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`).join(',')}}`;
}

/**
 * upload 内容 fingerprint（CR R2 #1）。requestId が指す「内容」を claim/anchor に固定し、
 * 同一 requestId + 異 payload の再利用を fail-closed にする。内部と同じ正規化（trim/default）を通すため
 * テストの seed でも本関数を使うこと。
 */
export function makeMeetingUploadFingerprint(
  actor: Pick<MeetingUploadActor, 'tenantId' | 'userId'>,
  input: Pick<MeetingUploadInput, 'title' | 'type' | 'transcript'>,
): string {
  const material = stableStringify({
    tenantId: actor.tenantId,
    actorId: actor.userId ?? null,
    title: input.title.trim() || '無題の会議',
    type: input.type || 'social',
    transcript: input.transcript.trim(),
  });
  return createHash('sha256').update(material).digest('hex');
}

const EVENT_TYPE = 'MEETING_MINUTES_CREATED';
const AGGREGATE_TYPE = 'Meeting';
/** claim（status='processing'）の lease TTL。超過は winner crash とみなし follower が takeover できる。 */
const CLAIM_TTL_MS = 2 * 60 * 1000;
/** follower の claim 完了 poll 既定値（Server Action 内で待てる現実的な予算）。 */
const CLAIM_POLL_INTERVAL_MS = 300;
const CLAIM_POLL_BUDGET_MS = 15_000;
/** claim 獲得の再試行上限（release/takeover 競合の ping-pong を有限に抑える fail-safe）。 */
const CLAIM_MAX_ATTEMPTS = 5;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface ClaimMeta {
  requestId?: string;
  fp?: string;
  phase?: string;
}

interface ClaimRow {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  metadata: unknown;
  occurredAt: Date;
}

/** winner が保持する lease。fenced UPDATE/DELETE の照合条件（id + status='processing' + occurredAt）。 */
interface ClaimLease {
  id: string;
  occurredAt: Date;
}

const CLAIM_SELECT = {
  id: true,
  eventType: true,
  aggregateType: true,
  aggregateId: true,
  status: true,
  metadata: true,
  occurredAt: true,
} as const;

function claimMeta(row: ClaimRow): ClaimMeta {
  return (row.metadata ?? {}) as ClaimMeta;
}

function isIdempotencyUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: string; meta?: { target?: unknown } };
  if (err.code !== 'P2002') return false;
  // DomainEvent の (tenantId, idempotencyKey) 制約のみ claim 競合として扱う。他の unique 違反は実エラーとして再throw。
  return JSON.stringify(err.meta?.target ?? '').includes('idempotencyKey');
}

/**
 * 会議アップロード本体（CR R2 設計）:
 *   fp 計算 → durable claim 獲得（provider 前 barrier）→ [winner] 安全検査 → AI 生成 → 単一 transaction
 *   で全レコード確定＋claim を fenced UPDATE で 'complete' 化。
 *   [follower] fp 照合 → 一致なら poll で winner の Meeting へ収束（provider 0）/ 不一致は idempotency-mismatch。
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
  const fp = makeMeetingUploadFingerprint(actor, input);

  // --- ⓪ durable claim の獲得ループ（provider 呼び出し前の冪等 barrier） ---
  // 既存行なし → claim 作成を試行（P2002 = 競合負け → 再評価）。
  // 既存行あり → complete なら fp 照合の上で収束 / claimed なら fp 照合 → poll or TTL takeover。
  for (let attempt = 0; attempt < CLAIM_MAX_ATTEMPTS; attempt++) {
    const existing = (await prisma.domainEvent.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: actor.tenantId, idempotencyKey } },
      select: CLAIM_SELECT,
    })) as ClaimRow | null;

    let lease: ClaimLease | null = null;

    if (!existing) {
      try {
        const occurredAt = new Date();
        const claim = await prisma.domainEvent.create({
          data: {
            tenantId: actor.tenantId,
            eventType: EVENT_TYPE,
            aggregateType: AGGREGATE_TYPE,
            aggregateId: 'pending', // Meeting 未確定のプレースホルダ（complete 時に実 id へ更新）
            actorId: actor.userId ?? null,
            actorType: 'user',
            payload: {},
            metadata: { requestId: input.requestId, fp, phase: 'claimed' },
            idempotencyKey,
            status: 'processing', // Outbox を作らない = イベント消費系に流れない claim 行
            occurredAt, // 明示 set（DB default(now()) だと μs 精度で fenced 照合が不成立になるため）
          },
          select: { id: true },
        });
        lease = { id: claim.id, occurredAt };
      } catch (e) {
        if (!isIdempotencyUniqueViolation(e)) throw e;
        continue; // 競合負け → 次 iteration で既存 claim を再評価
      }
    } else {
      // キー書式は本モジュール専用の単射だが、防御的に列一致も要求する（別経路の同キーへ誤収束しない）。
      if (existing.eventType !== EVENT_TYPE || existing.aggregateType !== AGGREGATE_TYPE) {
        throw new Error(`meeting-upload idempotency key collision with foreign event: ${existing.id}`);
      }
      const meta = claimMeta(existing);
      if (existing.status !== 'processing') {
        // complete 済み anchor。fp 一致のみ収束（同一 requestId + 異 payload は fail-closed）。
        if (meta.fp === fp) return { ok: true, meetingId: existing.aggregateId, duplicated: true };
        return { ok: false, reason: 'idempotency-mismatch' };
      }
      // 処理中 claim。異 payload は poll せず即 fail-closed（winner の結果に収束させない）。
      if (meta.fp !== fp) return { ok: false, reason: 'idempotency-mismatch' };
      const ttlMs = opts.__claimTtlMsForTest ?? CLAIM_TTL_MS;
      if (Date.now() - existing.occurredAt.getTime() > ttlMs) {
        // winner crash とみなし CAS takeover（occurredAt を lease 照合値ごと更新。負けたら再評価）。
        const now = new Date();
        const cas = await prisma.domainEvent.updateMany({
          where: { id: existing.id, status: 'processing', occurredAt: existing.occurredAt },
          data: { occurredAt: now },
        });
        if (cas.count === 1) {
          lease = { id: existing.id, occurredAt: now };
        } else {
          continue; // takeover 競合負け / winner が完了・解放 → 再評価
        }
      } else {
        // same-payload follower: winner の完了を poll（provider は一切呼ばない）。
        const poll = opts.__claimPollForTest ?? { intervalMs: CLAIM_POLL_INTERVAL_MS, budgetMs: CLAIM_POLL_BUDGET_MS };
        const deadline = Date.now() + poll.budgetMs;
        let outcome: MeetingUploadResult | 'reclaim' | null = null;
        while (Date.now() < deadline) {
          await sleep(poll.intervalMs);
          const row = (await prisma.domainEvent.findUnique({
            where: { tenantId_idempotencyKey: { tenantId: actor.tenantId, idempotencyKey } },
            select: CLAIM_SELECT,
          })) as ClaimRow | null;
          if (!row) {
            outcome = 'reclaim'; // winner が失敗して claim 解放 → 自分が claim を取り直す
            break;
          }
          if (row.status !== 'processing') {
            const m = claimMeta(row);
            outcome = m.fp === fp ? { ok: true, meetingId: row.aggregateId, duplicated: true } : { ok: false, reason: 'idempotency-mismatch' };
            break;
          }
        }
        if (outcome === 'reclaim') continue;
        if (outcome) return outcome;
        // TTL 内に完了せず予算切れ。takeover はせず fail-closed（二重 AI 実行を避ける）。
        return { ok: false, reason: 'in-progress' };
      }
    }

    // --- lease 獲得 = winner。以降の失敗は必ず claim を解放してから伝播する。 ---
    return await runAsClaimWinner(actor, { title, type, text, requestId: input.requestId, idempotencyKey, fp }, lease, opts);
  }
  // 再試行上限（release/takeover の連続競合）。呼び出し側は再送信で回復できる。
  return { ok: false, reason: 'in-progress' };
}

interface NormalizedUpload {
  title: string;
  type: string;
  text: string;
  requestId: string;
  idempotencyKey: string;
  fp: string;
}

/** winner 失敗時の claim 解放（fenced delete）。解放自体の失敗は元エラーを隠さない（TTL takeover が回収する）。 */
async function releaseClaim(lease: ClaimLease): Promise<void> {
  try {
    await prisma.domainEvent.deleteMany({ where: { id: lease.id, status: 'processing', occurredAt: lease.occurredAt } });
  } catch {
    // 解放失敗（DB 断等）は握りつぶす: 元の例外/返値を優先し、残った stale claim は TTL takeover で回収される。
  }
}

/**
 * claim winner の本処理: 安全検査 → AI 生成（transaction 外・純データ化）→ 全レコード単一 transaction 確定
 * ＋ claim 行の fenced 'complete' 化。guard blocked / provider 例外 / tx rollback は claim を解放する。
 */
async function runAsClaimWinner(
  actor: MeetingUploadActor,
  n: NormalizedUpload,
  lease: ClaimLease,
  opts: MeetingUploadOptions,
): Promise<MeetingUploadResult> {
  if (opts.__gateAfterClaimForTest) await opts.__gateAfterClaimForTest();
  try {
    // --- ① 安全検査を AI/Embedding 呼び出しの**前**に実施（未信頼本文を provider へ渡す前に遮断） ---
    // block/flag 規約: high 注入 → blocked（生成中止・provider 未到達）。medium/low → 続行しフラグ記録。
    // guard は claim 獲得後 = winner だけが実行するため、AISafetyLog は upload 1回につき 1 行。
    // AISafetyLog は requestId を entityId に持つ（Meeting はまだ存在しないため）。
    const guard = await safeAiInput({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      actorType: 'ai_agent',
      purpose: 'meeting_summarization',
      text: n.text,
      entityType: 'MeetingUploadRequest',
      entityId: n.requestId,
      detail: 'pre-provider guard (summarizeMeeting/embedding)',
    });
    if (guard.blocked) {
      await releaseClaim(lease);
      return { ok: false, reason: 'blocked' };
    }
    if (opts.__faultAfterForTest) await opts.__faultAfterForTest('after-guard');

    // --- ② ネットワーク/AI 呼び出しは DB 書き込み前に完了させる（transaction 内で外部 I/O を待たない） ---
    const providers: MeetingUploadProviders = opts.__providersForTest ?? {
      transcribe: (i) => getTranscriptionProvider().transcribe(i),
      summarize: (i) => summarizeMeeting(i),
      embed: (texts) => getEmbeddingProvider().embed(texts),
    };
    const transcription = await providers.transcribe({ text: n.text });
    const label = n.type === 'interview' || n.type === 'oneonone' ? 'HR_CONFIDENTIAL' : 'INTERNAL';
    const minutes = await providers.summarize({ title: n.title, transcript: transcription.text, type: n.type });
    const chunks = chunkText(`${n.title}\n${minutes.summaryFull}\n${transcription.text}`, 400, 60);
    const vectors = await providers.embed(chunks);
    if (vectors.length !== chunks.length) throw new Error(`embedding count mismatch: ${vectors.length} != ${chunks.length}`);

    if (opts.__beforeTxForTest) await opts.__beforeTxForTest();

    // --- ③ 中核＋AI出力＋ナレッジ RAG＋claim 確定を **単一 $transaction** で all-or-nothing 確定 ---
    // post-commit best-effort を全廃: 会議・文字起こし(+segments)・議事録・決定・タスク・監査・AIOutput・
    // KnowledgeDocument・KnowledgeChunk・DataLineage・claim→anchor 昇格・OutboxMessage が揃って commit
    // されるか、全て rollback されるかの二択（部分 RAG / 重複会議が構造的に発生しない）。
    const { meeting, aiOutputId } = await prisma.$transaction(async (tx) => {
      const fault = async (p: MeetingUploadFaultPoint) => {
        if (opts.__faultAfterForTest) await opts.__faultAfterForTest(p);
      };
      const meeting = await tx.meeting.create({
        data: {
          tenantId: actor.tenantId,
          title: n.title,
          type: n.type,
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
        purpose: n.type,
        entityType: 'Meeting',
        entityId: meeting.id,
        input: { meetingId: meeting.id, title: n.title, type: n.type },
        output: minutes,
        outputText: minutes.summaryFull,
        confidence: 0.7,
        safetyFlags: guard.flags,
      });
      await fault('after-ai-output');
      const doc = await tx.knowledgeDocument.create({
        data: {
          tenantId: actor.tenantId,
          title: `会議議事録: ${n.title}`,
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
      // claim → anchor 昇格（fenced UPDATE）。lease（id + processing + occurredAt）を失っていれば count 0 →
      // throw で全段 rollback（takeover 後の旧 winner が二重確定できない）。
      const promoted = await tx.domainEvent.updateMany({
        where: { id: lease.id, status: 'processing', occurredAt: lease.occurredAt },
        data: {
          aggregateId: meeting.id,
          payload: { meetingId: meeting.id, title: n.title, knowledgeDocumentId: doc.id } as Prisma.InputJsonValue,
          metadata: { requestId: n.requestId, fp: n.fp, phase: 'complete' } as Prisma.InputJsonValue,
          status: 'pending',
        },
      });
      if (promoted.count !== 1) throw new Error('meeting-upload-claim-lost');
      await tx.outboxMessage.create({
        data: {
          tenantId: actor.tenantId,
          eventId: lease.id,
          eventType: EVENT_TYPE,
          payload: { meetingId: meeting.id, title: n.title, knowledgeDocumentId: doc.id } as Prisma.InputJsonValue,
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
    // winner 失敗（guard 後 fault / provider 例外 / tx rollback）→ claim 解放（retry が新 winner になれる）。
    await releaseClaim(lease);
    throw e;
  }
}
