'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma } from '@/lib/db';

/** デモ用の従業員位置ログを投入（閲覧スライスの動作確認用）。 */
export async function seedDemoLocationsAction() {
  const user = await requireUser();
  if (!hasPermission(user, 'admin', 'update')) return;
  const users = await prisma.user.findMany({
    where: { tenantId: user.tenantId, isAiAgent: false },
    take: 4,
    select: { id: true },
  });
  const h = new Date().getHours();
  const within = h >= 8 && h < 20;
  const base = [
    { lat: 43.0621, lng: 141.3544, address: '札幌市中央区大通' },
    { lat: 43.0687, lng: 141.3508, address: '札幌市中央区北1条' },
    { lat: 43.0556, lng: 141.3403, address: '札幌市中央区南3条' },
    { lat: 43.0762, lng: 141.3469, address: '札幌市北区北8条' },
  ];
  for (let i = 0; i < users.length; i++) {
    const b = base[i % base.length]!;
    await prisma.employeeLocationLog.create({
      data: {
        tenantId: user.tenantId,
        userId: users[i]!.id,
        lat: b.lat,
        lng: b.lng,
        accuracy: 12,
        address: b.address,
        source: 'gps_punch',
        withinWorkingHours: within,
      },
    });
  }
  revalidatePath('/admin/location-access');
}
