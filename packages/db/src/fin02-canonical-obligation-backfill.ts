// P5-FIN-002: Canonical Cashflow Obligation backfill（既存 FinanceEvent の正本化）。
//
// 役割:
//  - 既存の予定 FinanceEvent（cashflow_expected / payment_expected）を、canonical-obligation service を
//    使って CashflowObligation / Alias / link へ収束させる。upsert / conflict 判定は service に一元化し、
//    ここは cursor・batch・分類集計・CLI だけを担う（P5-FIN-002 §12.1）。
//  - dry-run（既定）: DB を一切変更せず分類件数だけを出す（§Acceptance 15）。
//  - execute（--execute）: deterministic cursor で 1 件ずつ独立 transaction 化。中断後の再開が可能で、
//    再実行時は already_linked を skip し新規 0 件に収束する（§Acceptance 16/17）。
//
// 安全境界:
//  - 既定は dry-run。書込みは明示的な --execute のときだけ（誤実行防止・fail-closed）。
//  - ローカル/Production の実 DB に対する execute は Packet の run_local_checks では許可されない。
//    人間が対象環境・データ影響を別途承認したときだけ実行する（§15）。destructive 操作は行わない。

import { pathToFileURL } from 'node:url';
import { prisma } from './client';
import type { PrismaClient } from '@prisma/client';
import {
  EXPECTED_CASHFLOW_TYPES,
  classifyBackfillEvent,
  backfillObligationForEvent,
  type BackfillClassification,
  type BackfillEventRow,
  type BackfillLineage,
} from './canonical-obligation';

/** runBackfill が受ける最小の client（PrismaClient が満たす）。テストで注入しやすくするため。 */
export type BackfillDb = Pick<PrismaClient, 'financeEvent' | 'invoiceCandidate' | '$transaction'>;

const CLASSIFICATIONS: BackfillClassification[] = [
  'purchase_order',
  'direct_invoice',
  'candidate_unformalized',
  'candidate_formalized',
  'unknown_cashflow_expected',
  'unknown_payment_expected',
  'orphan_candidate_inflow',
  'orphan_candidate_outflow',
  'missing_tenant',
  'missing_source',
  'not_expected_type',
  'already_linked',
];

export interface BackfillOptions {
  /** true なら DB を変更しない（既定 true）。 */
  dryRun?: boolean;
  /** 対象 tenant を 1 件に限定（省略時は予定 event を持つ全 tenant）。 */
  tenantId?: string;
  /** cursor pagination の 1 ページ件数（既定 500）。 */
  batchSize?: number;
}

export interface BackfillReport {
  dryRun: boolean;
  tenants: number;
  scanned: number;
  byClassification: Record<BackfillClassification, number>;
  createdObligations: number;
  addedAliases: number;
  linkedEvents: number;
  /** 正本化対象外（skip）として書込みしなかった件数。 */
  skipped: number;
}

const EXPECTED_TYPE_LIST = Array.from(EXPECTED_CASHFLOW_TYPES);

function emptyByClassification(): Record<BackfillClassification, number> {
  const rec = {} as Record<BackfillClassification, number>;
  for (const c of CLASSIFICATIONS) rec[c] = 0;
  return rec;
}

/** Prisma Decimal / number / null を number へ。推測で埋めない（null は 0 とみなす前に呼び出し側が扱う）。 */
function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  // Prisma.Decimal は toNumber() を持つ。
  const maybe = v as { toNumber?: () => number };
  if (typeof maybe.toNumber === 'function') return maybe.toNumber();
  return Number(v);
}

function toRow(e: {
  id: string;
  tenantId: string;
  type: string;
  sourceType: string;
  sourceId: string | null;
  direction: string;
  currency: string;
  amount: unknown;
  dueAt: Date | null;
  description: string;
  cashflowObligationId: string | null;
}): BackfillEventRow {
  return {
    id: e.id,
    tenantId: e.tenantId,
    type: e.type,
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    direction: e.direction,
    currency: e.currency,
    amount: toNum(e.amount),
    dueAt: e.dueAt,
    description: e.description,
    cashflowObligationId: e.cashflowObligationId,
  };
}

/** tenant の lineage（candidateId → invoiceId|null）を読む。tenant 内に実在する candidate のみ。 */
async function loadLineage(db: BackfillDb, tenantId: string): Promise<BackfillLineage> {
  const candidates = await db.invoiceCandidate.findMany({
    where: { tenantId },
    select: { id: true, invoiceId: true },
  });
  const candidateInvoiceById = new Map<string, string | null>();
  for (const c of candidates) candidateInvoiceById.set(c.id, c.invoiceId);
  return { candidateInvoiceById };
}

/** 予定 event を持つ tenant の一覧（決定論のため id 昇順ではなく tenantId 昇順）。 */
async function loadTenantIds(db: BackfillDb, only?: string): Promise<string[]> {
  if (only) return [only];
  const rows = await db.financeEvent.findMany({
    where: { type: { in: EXPECTED_TYPE_LIST } },
    distinct: ['tenantId'],
    select: { tenantId: true },
    orderBy: { tenantId: 'asc' },
  });
  return rows.map((r) => r.tenantId);
}

/**
 * backfill 本体。dry-run（既定）は集計のみ、execute は 1 event = 1 transaction で正本化する。
 * 再実行時は already_linked を skip するので新規 0 件に収束する。
 */
export async function runFin02Backfill(db: BackfillDb, options: BackfillOptions = {}): Promise<BackfillReport> {
  const dryRun = options.dryRun !== false; // 既定 dry-run
  const batchSize = options.batchSize && options.batchSize > 0 ? options.batchSize : 500;
  const report: BackfillReport = {
    dryRun,
    tenants: 0,
    scanned: 0,
    byClassification: emptyByClassification(),
    createdObligations: 0,
    addedAliases: 0,
    linkedEvents: 0,
    skipped: 0,
  };

  const tenantIds = await loadTenantIds(db, options.tenantId);
  report.tenants = tenantIds.length;

  for (const tenantId of tenantIds) {
    const lineage = await loadLineage(db, tenantId);
    let cursorId: string | null = null;

    // deterministic cursor（id 昇順）。cashflowObligationId の付与は id 順序を変えないので安定。
    // 全件を走査して分類集計する（execute では link 済みは skip）。
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: Array<{
        id: string;
        tenantId: string;
        type: string;
        sourceType: string;
        sourceId: string | null;
        direction: string;
        currency: string;
        amount: unknown;
        dueAt: Date | null;
        description: string;
        cashflowObligationId: string | null;
      }> = await db.financeEvent.findMany({
        where: { tenantId, type: { in: EXPECTED_TYPE_LIST } },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        select: {
          id: true,
          tenantId: true,
          type: true,
          sourceType: true,
          sourceId: true,
          direction: true,
          currency: true,
          amount: true,
          dueAt: true,
          description: true,
          cashflowObligationId: true,
        },
      });
      if (page.length === 0) break;

      for (const raw of page) {
        const event = toRow(raw);
        report.scanned += 1;

        if (event.cashflowObligationId) {
          report.byClassification.already_linked += 1;
          continue;
        }

        if (dryRun) {
          const cls = classifyBackfillEvent(event, lineage);
          report.byClassification[cls.classification] += 1;
          if (!cls.namespace || !cls.identitySourceId) report.skipped += 1;
          continue;
        }

        // execute: 1 event = 1 transaction（独立 checkpoint・再開可能）。
        const outcome = await db.$transaction((tx) => backfillObligationForEvent(tx, event, lineage));
        report.byClassification[outcome.classification] += 1;
        if (outcome.createdObligation) report.createdObligations += 1;
        if (outcome.addedAlias) report.addedAliases += 1;
        if (outcome.linked) report.linkedEvents += 1;
        if (!outcome.linked) report.skipped += 1;
      }

      const last = page[page.length - 1];
      if (!last || page.length < batchSize) break;
      cursorId = last.id;
    }
  }

  return report;
}

// ===== CLI =====

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const dryRun = !execute; // 既定 dry-run。--execute のときだけ書込み。
  const tenantId = argValue('--tenant');
  const batchSize = Number(argValue('--batch-size') ?? '500') || 500;

  if (execute) {
    console.error(
      '[FIN-02 backfill] EXECUTE モード: DB を変更します。対象環境とデータ影響が承認済みであることを確認してください。',
    );
  } else {
    console.error('[FIN-02 backfill] DRY-RUN モード: DB は変更しません（書込みには --execute が必要）。');
  }

  const report = await runFin02Backfill(prisma, { dryRun, tenantId, batchSize });
  console.log(JSON.stringify(report, null, 2));
}

// CLI として直接実行された時だけ main() を走らせる（itest から import しても副作用を出さない）。
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main()
    .catch((e) => {
      console.error('❌ FIN-02 backfill failed', e);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
