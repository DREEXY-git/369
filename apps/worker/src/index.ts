import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { prisma } from '@hokko/db';
import { JOB_NAMES, runJob, type JobData, type JobName } from './jobs';

// ルート .env をロード
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

const QUEUE_NAME = '369-jobs';

function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    // BullMQ 要件
    maxRetriesPerRequest: null,
  } as ConnectionOptions;
}

async function main() {
  const connection = redisConnection();
  const queue = new Queue(QUEUE_NAME, { connection });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const name = job.name as JobName;
      console.log(`▶︎ [${name}] 開始`, job.data);
      const result = await runJob(name, job.data as JobData);
      console.log(`✓ [${name}] 完了`, result);
      return result;
    },
    { connection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    console.error(`✗ [${job?.name}] 失敗:`, err.message);
  });

  console.log('🛠  369 Worker 起動。キュー:', QUEUE_NAME);
  console.log('   対応ジョブ:', JOB_NAMES.join(', '));

  // 開発時はデモジョブを投入して動作を確認
  if (process.env.NODE_ENV !== 'production') {
    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      await queue.add('MORNING_REPORT_JOB', { tenantId: tenant.id });
      await queue.add('ANOMALY_DETECTION_JOB', { tenantId: tenant.id });
      await queue.add('PROFIT_LEAK_DETECTION_JOB', { tenantId: tenant.id });
      await queue.add('DYNAMIC_PRICING_JOB', { tenantId: tenant.id });
      console.log('   デモジョブを投入しました（tenant:', tenant.name, '）');
    } else {
      console.log('   テナント未検出。`pnpm db:seed` を先に実行してください。');
    }
  }

  const shutdown = async () => {
    console.log('\n⏹  Worker を停止します…');
    await worker.close();
    await queue.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error('Worker 起動失敗:', e);
  process.exit(1);
});
