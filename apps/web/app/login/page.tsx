'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import { loginAction, type LoginState } from './actions';
import { Button, Input } from '@/components/ui';

const DEMO = [
  { email: 'ceo@ikezaki.local', label: '社長 (OWNER)' },
  { email: 'sales@ikezaki.local', label: '営業担当 (STAFF)' },
  { email: 'admin@ikezaki.local', label: '管理者 (ADMIN)' },
  { email: 'ai-sales@ikezaki.local', label: 'AI営業社員 (AI)' },
];

const FEATURES = [
  { icon: MapPinned, text: '地図 × AI で新規開拓（LeadMap AI）' },
  { icon: Sparkles, text: '経営・営業・会計・人事・在庫をひとつに' },
  { icon: ShieldCheck, text: 'AIは下書き・分析まで。送信は人が承認' },
];

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState('ceo@ikezaki.local');
  const [password, setPassword] = useState('password123!');

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-background to-sky-50 p-4">
      {/* 装飾ブロブ */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-pop md:grid-cols-2">
        {/* 左：ブランド訴求（md以上） */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white md:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-black tracking-tight backdrop-blur">
              IK
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold">IKEZAKI OS</div>
              <div className="text-[11px] text-white/70">統合AI経営OS ＋ LeadMap AI</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold leading-snug">
              中小企業の経営を、
              <br />
              ひとつのOSに。
            </h2>
            <ul className="space-y-2.5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm text-white/90">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                    <span>{f.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="text-[11px] text-white/60">© IKEZAKI OS / プランニングホッコー</div>
        </div>

        {/* 右：ログインフォーム */}
        <div className="p-8">
          <div className="mb-6 md:hidden">
            <div className="text-2xl font-black tracking-tight text-primary">IKEZAKI OS</div>
            <div className="mt-1 text-sm text-muted-foreground">統合AI経営OS ＋ LeadMap AI</div>
          </div>

          <h1 className="text-lg font-bold tracking-tight">ログイン</h1>
          <p className="mt-1 text-xs text-muted-foreground">アカウント情報を入力してください。</p>

          <form action={action} className="mt-5 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">
                メールアドレス
              </label>
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">パスワード</label>
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {state.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {state.error}
              </div>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? 'ログイン中…' : 'ログイン'}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              デモアカウント（クリックで入力）
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {DEMO.map((d) => {
                const selected = email === d.email;
                return (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword('password123!');
                    }}
                    className={`rounded-md border px-2 py-1.5 text-left transition ${
                      selected
                        ? 'border-primary/40 bg-accent'
                        : 'border-border bg-secondary/40 hover:border-primary/30 hover:bg-accent/60'
                    }`}
                  >
                    <div className="truncate font-mono text-[11px] text-foreground">{d.email}</div>
                    <div className="text-muted-foreground">{d.label}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              共通パスワード: <span className="font-mono">password123!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
