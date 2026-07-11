#!/usr/bin/env bash

# Read-only GitHub inbox for Claude Code. Hook failures must never block a session.
set -u

hook_input="$(cat 2>/dev/null || true)"
project_dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$project_dir" 2>/dev/null || exit 0

is_session_start=false
if printf '%s' "$hook_input" | grep -q '"hook_event_name"[[:space:]]*:[[:space:]]*"SessionStart"'; then
  is_session_start=true
fi

repo=""
handoffs=""
source_name=""

if command -v gh >/dev/null 2>&1; then
  repo="$(GH_PROMPT_DISABLED=1 gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || true)"
  if [ -n "$repo" ]; then
    handoffs="$(GH_PROMPT_DISABLED=1 gh pr list \
      --repo "$repo" \
      --state open \
      --limit 100 \
      --json number,title,url,headRefName,headRefOid,isDraft,updatedAt \
      --jq '.[] | select(.headRefName | startswith("codex/")) | "PR #\(.number) | \(.headRefName) | \(.headRefOid[0:12]) | draft=\(.isDraft) | updated=\(.updatedAt) | \(.title) | \(.url)"' \
      2>/dev/null || true)"
    source_name="GitHub PR API"
  fi
fi

if [ -z "$source_name" ]; then
  handoffs="$(git ls-remote --heads origin 'refs/heads/codex/*' 2>/dev/null \
    | sed 's#refs/heads/##' \
    | awk '{ print $2 " | " substr($1, 1, 12) }' || true)"
  source_name="Git remote refs (PR state unavailable)"
fi

if [ -z "$handoffs" ]; then
  if $is_session_start; then
    printf '%s\n' \
      '[CODEX_HANDOFF_CHECK]' \
      "Source: $source_name" \
      'Open Codex handoff PRは検出されませんでした。GitHub接続失敗の可能性がある場合はCLAUDE.mdの手順で再確認してください。'
  fi
  exit 0
fi

state_file="$(git rev-parse --git-path claude-codex-inbox.last 2>/dev/null || printf '%s' '/tmp/claude-codex-inbox.last')"
if command -v shasum >/dev/null 2>&1; then
  current_digest="$(printf '%s' "$handoffs" | shasum -a 256 | awk '{print $1}')"
else
  current_digest="$(printf '%s' "$handoffs" | cksum | awk '{print $1 ":" $2}')"
fi
previous_digest="$(cat "$state_file" 2>/dev/null || true)"

if ! $is_session_start && [ "$current_digest" = "$previous_digest" ]; then
  exit 0
fi
printf '%s' "$current_digest" > "$state_file" 2>/dev/null || true

printf '%s\n' \
  '[CODEX_HANDOFF_PENDING]' \
  "Source: $source_name" \
  "$handoffs" \
  '新規実装の前に対象PRの本文・差分・checks・最新コメントをread-only確認し、CLAUDE.mdの受領手順に従ってください。'

exit 0
