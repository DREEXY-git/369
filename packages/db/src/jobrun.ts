// JobRun 基盤ヘルパ（worker / web 共用）。Phase 1-3。
import { prisma } from './client';

export interface StartJobInput {
  jobType: string;
  tenantId?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function createJobRun(input: StartJobInput): Promise<string> {
  const run = await prisma.jobRun.create({
    data: {
      jobType: input.jobType,
      tenantId: input.tenantId ?? null,
      actorId: input.actorId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      payload: (input.payload ?? undefined) as any,
      metadata: (input.metadata ?? undefined) as any,
      status: 'running',
      startedAt: new Date(),
      attempts: 1,
    },
  });
  return run.id;
}

export async function appendJobRunLog(
  jobRunId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.jobRunLog.create({
    data: { jobRunId, level, message: message.slice(0, 2000), metadata: (metadata ?? undefined) as any },
  });
}

export async function finishJobRun(
  jobRunId: string,
  result?: Record<string, unknown>,
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status: 'succeeded', finishedAt: new Date(), result: (result ?? undefined) as any },
  });
}

export async function failJobRun(
  jobRunId: string,
  error: string,
  dead = false,
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status: dead ? 'dead' : 'failed', finishedAt: new Date(), error: error.slice(0, 2000) },
  });
}
