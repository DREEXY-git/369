'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { processMeetingUpload } from '@/lib/domains/meetings/upload';

// 会議アップロード。業務ロジックは lib/domains/meetings/upload.ts（P3-MEETING: guard 先行・単一
// transaction・requestId 冪等化）。この action は 認証→権限→入力読取→委譲→redirect のみを行う。
export async function uploadMeetingAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'meeting', 'create')) redirect('/meetings?denied=1');

  const result = await processMeetingUpload(
    { tenantId: user.tenantId, userId: user.userId, name: user.name },
    {
      title: String(formData.get('title') ?? ''),
      type: String(formData.get('type') ?? 'social'),
      transcript: String(formData.get('transcript') ?? ''),
      requestId: String(formData.get('requestId') ?? ''),
    },
  );

  if (!result.ok) {
    // 失敗理由をそのまま upload 画面へ差し戻す（blocked = high 注入検出で生成中止 /
    // idempotency-mismatch = 同一 requestId の異内容再利用を fail-closed / in-progress = winner 処理中）。
    redirect(`/meetings/upload?error=${encodeURIComponent(result.reason)}`);
  }
  revalidatePath('/meetings');
  redirect(`/meetings/${result.meetingId}${result.duplicated ? '?duplicated=1' : ''}`);
}
