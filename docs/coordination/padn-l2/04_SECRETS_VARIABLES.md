# PADN L2 — Required Secrets / Variables（名前のみ・値は絶対に書かない）

設定はすべて人間が GitHub UI（Settings → Secrets and variables → Actions）で行う。
Secrets の設定・変更自体が Human Gate（secrets_env_oauth）。

## Actions Secrets

| 名前 | 用途 | 備考 |
|---|---|---|
| `PADN_GITHUB_APP_PRIVATE_KEY` | PADN 専用 GitHub App の秘密鍵（PEM） | App 権限は 03_PERMISSION_MATRIX.md |
| `ANTHROPIC_API_KEY` | anthropics/claude-code-action@v1 の認証 | claude role job のみに供給 |
| `OPENAI_API_KEY` | openai/codex-action@v1 の認証 | codex audit / oversight job のみに供給 |

## Actions Variables（非機密）

| 名前 | 既定（未設定時） | 意味 |
|---|---|---|
| `PADN_AUTONOMY_ENABLED` | （未設定＝無効） | kill switch。'true' 以外は全 workflow が観測ログのみ |
| `PADN_MODE` | `observe` | `observe` / `rt0_pilot` / `rt1_pilot` |
| `PADN_WRITE_LANES` | `0` | L2 が同時に許す write レーン数（hard cap 2） |
| `PADN_REPORTS_ENABLED` | `false` | Control Root への append-only コメント投稿の許可 |
| `PADN_ACTOR_ALLOWLIST` | （dispatch-policy.json の owner） | 人間 actor の allowlist（カンマ区切り） |
| `PADN_GITHUB_APP_ID` | （未設定＝App 無し） | PADN 専用 GitHub App の App ID（数値・非機密） |

## merge 直後の初期値（§18 default off）

すべて未設定のままにする。その状態では:

- dispatcher / watchdog / oversight / governance は schedule で起動しても即 no-op
  （`DISABLED` を Step Summary に記録するのみ。schedule 起動自体も autonomy 変数で抑制）。
- repository_dispatch を受ける role workflow も `vars.PADN_AUTONOMY_ENABLED == 'true'` ガードで
  起動しない。
- つまり「merge しただけでは何も動かない」。人間が変数を設定して初めて observe が始まる。
