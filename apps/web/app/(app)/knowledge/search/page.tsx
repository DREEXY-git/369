import Link from 'next/link';
import { requireUser } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';
import { writeAIDataAccess } from '@/lib/audit';
import { safeAiInput } from '@/lib/ai-safety-server';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Badge, Input, Button, EmptyState } from '@/components/ui';
import { LabelBadge } from '@/components/badges';
import { getEmbeddingProvider, answerKnowledgeQuestion } from '@hokko/ai';
import { rankByEmbedding, canAccessLabel, type ConfidentialityLabel } from '@hokko/shared';

export const dynamic = 'force-dynamic';

const EXAMPLES = [
  '札幌の美容室向けに反応が良かった営業切り口は？',
  '夏祭り案件で成功した提案は？',
  '値引きのルールは？',
  'クレーム対応の基本は？',
];

export default async function KnowledgeSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  let answer: Awaited<ReturnType<typeof answerKnowledgeQuestion>> | null = null;
  let hits: { documentId: string; title: string; text: string; label: ConfidentialityLabel; score: number }[] = [];
  let blocked = false;

  if (q) {
    // 検索クエリの命令注入を検査。high なら回答せず安全注意を表示（ユーザー入力のため遮断が妥当）。
    const guard = await safeAiInput({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorType: 'user',
      purpose: 'knowledge_search',
      text: q,
      entityType: 'KnowledgeSearch',
      detail: q.slice(0, 60),
    });
    blocked = guard.blocked;
  }

  if (q && !blocked) {
    const chunks = await prisma.knowledgeChunk.findMany({
      where: { tenantId: user.tenantId, active: true },
      include: { document: true },
    });
    // RBAC / 機密ラベルでフィルタ
    const accessible = chunks.filter((c) => canAccessLabel(user.roles, c.label as ConfidentialityLabel));
    const embedder = getEmbeddingProvider();
    const [queryVec] = await embedder.embed([q]);
    const ranked = rankByEmbedding(
      queryVec!,
      accessible.map((c) => ({ embedding: c.embedding, chunk: c })),
      5,
    );
    hits = ranked
      .filter((r) => r.score > 0.05)
      .map((r) => ({
        documentId: r.item.chunk.documentId,
        title: r.item.chunk.document.title,
        text: r.item.chunk.text,
        label: r.item.chunk.label as ConfidentialityLabel,
        score: Math.round(r.score * 100) / 100,
      }));

    answer = await answerKnowledgeQuestion({
      question: q,
      contexts: hits.map((h) => ({ title: h.title, text: h.text })),
    });

    // AI によるナレッジ参照を機密参照ログに記録（RBAC/機密ラベルでのフィルタは上で適用済み）。
    await writeAIDataAccess({
      tenantId: user.tenantId,
      actorId: user.userId,
      actorType: 'user',
      entityType: 'KnowledgeSearch',
      label: hits[0]?.label ?? 'INTERNAL',
      purpose: `ナレッジ検索: ${q.slice(0, 80)}`,
    });

    // RetrievalLog / AnswerCitation を保存
    const log = await prisma.retrievalLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId,
        query: q,
        chunkIds: hits.map((h) => h.documentId),
        topScore: hits[0]?.score ?? 0,
      },
    });
    for (const h of hits) {
      await prisma.answerCitation.create({
        data: { tenantId: user.tenantId, retrievalId: log.id, documentId: h.documentId, snippet: h.text.slice(0, 160) },
      });
    }
  }

  return (
    <div>
      <PageHeader title="ナレッジ検索・AI Q&A" description="会議録・商談録・営業ノウハウなど、社内ナレッジにAIが引用付きで回答します。" />

      <Card className="mb-4">
        <CardContent className="pt-4">
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="例: 札幌の美容室向けに反応が良かった営業切り口は？" className="flex-1" />
            <Button type="submit">検索</Button>
          </form>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {EXAMPLES.map((e) => (
              <Link key={e} href={`/knowledge/search?q=${encodeURIComponent(e)}`} className="rounded-full border px-2 py-0.5 text-muted-foreground hover:bg-secondary">{e}</Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {blocked ? (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <EmptyState
              title="この検索はAI安全ポリシーによりブロックされました"
              hint="命令注入（プロンプトインジェクション）の兆候が検出されたため、回答を行いません。通常の業務質問でお試しください。"
            />
          </CardContent>
        </Card>
      ) : q && answer ? (
        <div className="space-y-4">
          <Card className="border-primary/30 bg-accent/30">
            <CardHeader><CardTitle>🤖 AIの回答（信頼度 {Math.round(answer.confidence * 100)}%）</CardTitle></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap font-sans text-sm">{answer.answer}</pre></CardContent>
          </Card>

          <div>
            <h2 className="mb-2 text-sm font-semibold">引用元（{hits.length}件）</h2>
            {hits.length === 0 ? (
              <Card><CardContent className="pt-4"><EmptyState title="該当するナレッジが見つかりませんでした" /></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {hits.map((h, i) => (
                  <Card key={i}>
                    <CardContent className="pt-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium">{h.title}</span>
                        <LabelBadge label={h.label} />
                        <Badge tone="slate">類似度 {h.score}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{h.text.slice(0, 200)}…</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card><CardContent className="pt-6"><EmptyState title="質問を入力してください" hint="社内ナレッジ・会議録・営業ノウハウから回答します。" /></CardContent></Card>
      )}
    </div>
  );
}
