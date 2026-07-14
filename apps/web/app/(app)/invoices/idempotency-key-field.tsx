'use client';

import { useEffect, useState } from 'react';

// 入金記録フォームの request-level 冪等キー（= Payment の deterministic PK）を **クライアント mount 時に
// 1度だけ** 発行する（C19 の ads-idempotency-key と同型）。
//   - SSR HTML には乱数を焼かない（初期 value='' で hydration mismatch ゼロ）。
//   - mount 後はキー固定 → 二重 submit / ブラウザ再送 / post-commit 失敗後の再送は同一キー = DB PK unique で1件収束。
//   - ページ再読込ごとには新キー（= 新しい入金 request）という意味論を維持。
// サーバ側の冪等ロジック（deterministic PK・単一 transaction・PK unique 収束）は payments.ts が担う。
export function PaymentIdempotencyKeyField() {
  const [key, setKey] = useState('');
  useEffect(() => {
    // Web Crypto（secure context / localhost で利用可）。cuid 互換形式 ^c[a-z0-9]{20,32}$ に合わせる。
    setKey(`c${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`);
  }, []);
  return <input type="hidden" name="idempotencyKey" value={key} readOnly data-testid="payment-idempotency-key" />;
}
