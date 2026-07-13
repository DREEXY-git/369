'use client';

import { useEffect, useState } from 'react';

// C19 生成フォームの冪等キー（= MarketingSuggestion の決定的 PK）を **クライアント mount 時に1度だけ** 発行する。
// 旧実装は Server Component の render 中に `randomUUID()` を controlled input の value へ焼き込んでいたため、
// SSR-HTML と RSC flight で異なる乱数が入り、稀に **hydration mismatch**（React が console error を出す）と、
// pending 再レンダによる値の巻き戻り（= 同一フォーム再送で別キーが飛ぶ flake）を招いていた。
// クライアントで mount 後に1度だけ発行することで:
//   - SSR HTML には乱数を焼かない（初期 value='' で SSR/CSR 一致 → hydration mismatch ゼロ）。
//   - mount 後はキーが固定（再レンダで変わらない）→ 二重 submit / ブラウザ再送は同一キー = DB unique で1件収束。
//   - ページ再読込ごとには新キー（= 新しい生成の試行）という従来の意味論を維持。
// サーバ側の冪等ロジック（deterministic PK・単一 transaction・unique 収束）は不変。
export function IdempotencyKeyField() {
  const [key, setKey] = useState('');
  useEffect(() => {
    // Web Crypto（secure context / localhost で利用可）。cuid 互換形式 ^c[a-z0-9]{20,32}$ に合わせる。
    setKey(`c${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`);
  }, []);
  return <input type="hidden" name="idempotencyKey" value={key} readOnly data-testid="ads-idempotency-key" />;
}
