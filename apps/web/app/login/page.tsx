'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';
import { Button, Card, Input } from '@/components/ui';

const DEMO = [
  { email: 'ceo@369.local', label: '社長 (OWNER)' },
  { email: 'sales@369.local', label: '営業担当 (STAFF)' },
  { email: 'admin@369.local', label: '管理者 (ADMIN)' },
  { email: 'ai-sales@369.local', label: 'AI営業社員 (AI_AGENT)' },
];

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-sky-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl font-black tracking-tight text-primary">369</div>
          <div className="mt-1 text-sm text-muted-foreground">統合AI経営OS + LeadMap AI</div>
        </div>

        <form action={action} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              メールアドレス
            </label>
            <Input name="email" type="email" defaultValue="ceo@369.local" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              パスワード
            </label>
            <Input name="password" type="password" defaultValue="password123!" required />
          </div>
          {state.error ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</div>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'ログイン中…' : 'ログイン'}
          </Button>
        </form>

        <div className="mt-6 border-t pt-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">デモアカウント</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {DEMO.map((d) => (
              <div key={d.email} className="rounded-md border bg-secondary/50 px-2 py-1.5">
                <div className="font-mono text-[11px]">{d.email}</div>
                <div className="text-muted-foreground">{d.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            共通パスワード: <span className="font-mono">password123!</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
