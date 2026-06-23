'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser, hasPermission } from '@/lib/auth/current-user';
import { prisma, writeAudit } from '@/lib/db';

export async function createCustomerAction(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, 'customer', 'create')) redirect('/customers?denied=1');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect('/customers/new?error=name');

  const customer = await prisma.customer.create({
    data: {
      tenantId: user.tenantId,
      name,
      industry: String(formData.get('industry') ?? '') || null,
      rank: String(formData.get('rank') ?? 'B'),
      phone: String(formData.get('phone') ?? '') || null,
      email: String(formData.get('email') ?? '') || null,
      address: String(formData.get('address') ?? '') || null,
      ownerId: user.userId,
      notes: String(formData.get('notes') ?? ''),
    },
  });
  await prisma.customerTimelineEvent.create({
    data: { tenantId: user.tenantId, customerId: customer.id, type: 'ai', title: '顧客を登録', body: `${user.name} が顧客を登録しました。`, actorId: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'create',
    entityType: 'Customer',
    entityId: customer.id,
    summary: `顧客「${name}」を作成`,
  });
  revalidatePath('/customers');
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomerAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!hasPermission(user, 'customer', 'update')) redirect(`/customers/${id}?denied=1`);

  const existing = await prisma.customer.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!existing) redirect('/customers');

  const name = String(formData.get('name') ?? '').trim() || existing.name;
  const satisfaction = formData.get('satisfaction') ? Number(formData.get('satisfaction')) : null;
  const churnRisk = formData.get('churnRisk') ? Number(formData.get('churnRisk')) : null;

  await prisma.customer.update({
    where: { id },
    data: {
      name,
      industry: String(formData.get('industry') ?? '') || null,
      rank: String(formData.get('rank') ?? existing.rank),
      phone: String(formData.get('phone') ?? '') || null,
      email: String(formData.get('email') ?? '') || null,
      address: String(formData.get('address') ?? '') || null,
      status: String(formData.get('status') ?? existing.status),
      satisfaction: satisfaction !== null && Number.isFinite(satisfaction) ? satisfaction : existing.satisfaction,
      churnRisk: churnRisk !== null && Number.isFinite(churnRisk) ? churnRisk : existing.churnRisk,
      notes: String(formData.get('notes') ?? existing.notes),
    },
  });
  await prisma.customerTimelineEvent.create({
    data: { tenantId: user.tenantId, customerId: id, type: 'ai', title: '顧客情報を更新', body: `${user.name} が顧客情報を編集しました。`, actorId: user.userId },
  });
  await writeAudit({
    tenantId: user.tenantId,
    actorId: user.userId,
    action: 'update',
    entityType: 'Customer',
    entityId: id,
    summary: `顧客「${name}」を編集`,
  });
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}
