import { requireUser } from '@/lib/auth/current-user';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Textarea } from '@/components/ui';
import { uploadMeetingAction } from '../actions';

export const dynamic = 'force-dynamic';

const SAMPLE = `佐藤: 本日はお時間ありがとうございます。今回の夏祭りの会場設営についてですが、テントは10張りで進めることに決定しました。
顧客: 予算は200万円程度を想定しています。少し高いかなという懸念があります。
佐藤: 音響と照明もセットでご提案します。見積を金曜までに作成してお送りします。
顧客: 搬入時間が当日朝になる点が気になります。
佐藤: 搬入導線は事前に会場と調整して、リスクがないように対応します。次回までに配送計画を確認します。`;

export default async function MeetingUploadPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="議事録の取込（テキスト）"
        description="文字起こし済みテキストを貼り付けると、AIが議事録・決定事項・タスクを自動生成します。"
        breadcrumb={[{ label: '会議', href: '/meetings' }, { label: '取込', href: '/meetings/upload' }]}
      />
      <Card>
        <CardHeader><CardTitle>会議テキスト</CardTitle></CardHeader>
        <CardContent>
          {sp.error === 'empty' ? <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">テキストを入力してください。</div> : null}
          <form action={uploadMeetingAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">タイトル</label>
                <Input name="title" defaultValue="夏祭り会場設営 商談" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">種別</label>
                <Select name="type" defaultValue="social">
                  <option value="social">商談</option>
                  <option value="internal">社内会議</option>
                  <option value="interview">採用面接</option>
                  <option value="oneonone">1on1</option>
                  <option value="event">イベント打合せ</option>
                  <option value="complaint">クレーム対応</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                文字起こしテキスト（「話者: 発言」形式を推奨）
              </label>
              <Textarea name="transcript" rows={12} defaultValue={SAMPLE} required />
            </div>
            <div className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              音声・動画ファイルは TranscriptionProvider（Whisper等）に差し替え可能です。APIキーがない場合は文字起こし済みテキスト前提で動作します。
            </div>
            <Button type="submit" className="w-full">AI議事録を生成</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
