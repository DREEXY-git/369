import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase のトランザクションプーラー（ポート6543）を実行時に使う場合、Prisma は
// プリペアドステートメントを無効化するために接続URLへ `?pgbouncer=true` が必要。
// これが無いと実行時クエリが「prepared statement ... already exists」等で失敗する。
// Vercel の DATABASE_URL に付け忘れていても安全側に倒すため、ここで自動付与する。
// （migrate/seed は DIRECT_URL=5432 を使うので影響しない。ローカルの 5432 も素通し。）
function poolerSafeUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (u.port === '6543' && !u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true');
      return u.toString();
    }
  } catch {
    // URL として解釈できない値はそのまま Prisma に渡し、Prisma 側のエラーに委ねる。
  }
  return raw;
}

const datasourceUrl = poolerSafeUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: process.env.PRISMA_LOG ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
