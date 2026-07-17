// PADN L2 — 設定・payload・workflow の検証と negative selftest。
// 使い方:
//   node scripts/padn/validate.mjs --configs    # config/padn の相互整合 + workflow lint
//   node scripts/padn/validate.mjs --payload f  # repository_dispatch client_payload の静的検証
//   node scripts/padn/validate.mjs --selftest   # 否定系 selftest（壊れた入力が正しく拒否されるか）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { promptSha256, verifyPacket, renderTemplate } from './prompts.mjs';
import { validateFencingToken } from './leases.mjs';
import { loadStateMachine, REQUIRED_REVIEW_LANES } from './state.mjs';

const WORKFLOW_DIR = '.github/workflows';
const PADN_WORKFLOW_PREFIX = '369-padn-';

export function validateConfigs(rootDir = '.') {
  const errors = [];
  const load = (name) => JSON.parse(readFileSync(`${rootDir}/config/padn/${name}`, 'utf8'));
  const roles = load('roles.json');
  const stateMachine = load('state-machine.json');
  const riskPolicy = load('risk-policy.json');
  const humanGates = load('human-gates.json');
  const policy = load('dispatch-policy.json');
  const taxonomy = load('resource-taxonomy.json');

  // roles ↔ dispatch_event_types
  const declared = new Set(roles.dispatch_event_types);
  for (const [key, role] of Object.entries(roles.roles)) {
    for (const et of role.event_types ?? []) {
      if (!declared.has(et)) errors.push(`roles.json: role ${key} の event_type ${et} が dispatch_event_types に無い`);
    }
  }
  // fold の必須監査レーン定義と roles.json の review_event_types の整合（部分 PASS 防止の前提）
  const reviewSet = [...roles.reviewer_independence.review_event_types].sort().join(',');
  if (reviewSet !== [...REQUIRED_REVIEW_LANES].sort().join(',')) {
    errors.push(`roles.json review_event_types と state.mjs REQUIRED_REVIEW_LANES が不一致（${reviewSet}）`);
  }
  // review 独立性: review event は codex/mixed role にのみ属する
  for (const et of roles.reviewer_independence.review_event_types) {
    const owners = Object.entries(roles.roles).filter(([, r]) => (r.event_types ?? []).includes(et));
    if (!owners.length) errors.push(`roles.json: review event ${et} の担当 role が無い`);
    for (const [k, r] of owners) {
      if (r.engine === 'claude') errors.push(`roles.json: review event ${et} が claude engine role ${k} に割当（Implementer=final reviewer 禁止違反）`);
    }
  }
  // state machine
  const states = new Set(stateMachine.states);
  if (!states.has(stateMachine.initial)) errors.push('state-machine.json: initial が states に無い');
  for (const t of stateMachine.terminal) if (!states.has(t)) errors.push(`state-machine.json: terminal ${t} が states に無い`);
  for (const tr of stateMachine.transitions) {
    if (!states.has(tr.from)) errors.push(`state-machine.json: 未定義 from ${tr.from}`);
    if (!states.has(tr.to)) errors.push(`state-machine.json: 未定義 to ${tr.to}`);
  }
  for (const p of stateMachine.l2_dispatchable.pairs) {
    if (!states.has(p.state)) errors.push(`state-machine.json: dispatchable の未定義 state ${p.state}`);
    if (!declared.has(p.event_type)) errors.push(`state-machine.json: dispatchable の未定義 event_type ${p.event_type}`);
  }
  // risk policy
  for (const t of ['RT0', 'RT1', 'RT2', 'RT3', 'RT4']) {
    if (!riskPolicy.tier_order.includes(t)) errors.push(`risk-policy.json: tier_order に ${t} が無い`);
    if (!riskPolicy.tiers[t]) errors.push(`risk-policy.json: tiers.${t} が無い`);
  }
  if (!riskPolicy.tier_order.includes(riskPolicy.unknown_path_tier)) errors.push('risk-policy.json: unknown_path_tier が不正');
  if (riskPolicy.modes.observe?.max_total_write_lanes !== 0) errors.push('risk-policy.json: observe mode は write 0 でなければならない（§11/§18）');
  for (const t of riskPolicy.never_auto_start_tiers) {
    for (const [mode, spec] of Object.entries(riskPolicy.modes)) {
      if (spec.auto_start_tiers.includes(t)) errors.push(`risk-policy.json: mode ${mode} が ${t} を auto_start（RT3/RT4 自動開始禁止違反）`);
    }
  }
  // human gates
  const gateIds = new Set(humanGates.gates.map((g) => g.id));
  for (const required of ['main_merge', 'production', 'schema_migration', 'package_lock', 'secrets_env_oauth', 'external_send', 'billing_payment', 'rbac_abac_labels', 'destructive_data', 'business_phase_close', 'scope_expansion', 'lane_promotion_2_to_3', 'workflow_main_reflect']) {
    if (!gateIds.has(required)) errors.push(`human-gates.json: 必須 gate ${required} が無い`);
  }
  // dispatch policy sanity
  if (policy.default_mode !== 'observe') errors.push('dispatch-policy.json: default_mode は observe（§18 default off）');
  if (!(policy.chain.max_depth >= 1 && policy.chain.max_depth <= 3)) errors.push('dispatch-policy.json: chain.max_depth が異常');
  if (policy.capacity.max_total_write_lanes_hard > 2) errors.push('dispatch-policy.json: write lane hard cap は 2（3本目は Human Gate）');
  if (policy.reports.enabled_default !== false) errors.push('dispatch-policy.json: reports.enabled_default は false');
  // taxonomy
  for (const lvl of ['SNAPSHOT_READ', 'INTENT_WRITE', 'WRITE', 'EXCLUSIVE']) {
    if (!taxonomy.lock_levels.includes(lvl)) errors.push(`resource-taxonomy.json: lock level ${lvl} が無い`);
    if (!taxonomy.compatibility[lvl]) errors.push(`resource-taxonomy.json: compatibility.${lvl} が無い`);
  }
  // templates
  const templateDir = `${rootDir}/config/padn/prompt-templates`;
  for (const role of Object.values(roles.roles)) {
    for (const [et, file] of Object.entries(role.prompt_templates ?? {})) {
      const path = `${templateDir}/${file}`;
      if (!existsSync(path)) {
        errors.push(`prompt-templates: ${file}（${et}）が存在しない`);
        continue;
      }
      const text = readFileSync(path, 'utf8');
      const placeholders = [...text.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
      const dummy = Object.fromEntries(placeholders.map((p) => [p, 'x']));
      try {
        renderTemplate(text, dummy);
      } catch (e) {
        errors.push(`prompt-templates: ${file} render 失敗: ${e.message}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * PADN workflow の静的 lint（regex ベース・完全な YAML parse ではない点は docs 参照）。
 * - pull_request_target 禁止
 * - repository_dispatch types が roles.json の dispatch_event_types と整合
 * - 全 workflow に concurrency 定義
 * - dispatch workflow: secrets を参照する job は pull_request イベントを除外している
 */
export function lintWorkflows(rootDir = '.') {
  const errors = [];
  const dir = `${rootDir}/${WORKFLOW_DIR}`;
  const roles = JSON.parse(readFileSync(`${rootDir}/config/padn/roles.json`, 'utf8'));
  const declared = new Set(roles.dispatch_event_types);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.startsWith(PADN_WORKFLOW_PREFIX)) : [];
  if (files.length === 0) errors.push(`workflow lint: ${PADN_WORKFLOW_PREFIX}*.yml が見つからない`);
  const seenTypes = new Set();
  for (const file of files) {
    const text = readFileSync(`${dir}/${file}`, 'utf8');
    // trigger key としての使用のみ禁止（コメントでの言及は許容）
    if (/^\s*pull_request_target\s*:/m.test(text)) errors.push(`${file}: pull_request_target は禁止（untrusted head + secrets の危険）`);
    if (!/^concurrency:/m.test(text)) errors.push(`${file}: concurrency 定義が無い（§10）`);
    if (!/PADN_AUTONOMY_ENABLED/.test(text)) errors.push(`${file}: kill switch（PADN_AUTONOMY_ENABLED）ガードが無い`);
    // deployment_status / workflow_dispatch は branch 上の workflow 定義で実行され得る（実測確認済み）
    // ため、全 padn workflow に default-branch ref ガードを要求する
    if (!/refs\/heads\/main/.test(text)) errors.push(`${file}: default-branch ref ガード（refs/heads/main）が無い`);
    for (const m of text.matchAll(/types:\s*\[([^\]]*)\]/g)) {
      for (const raw of m[1].split(',')) {
        const t = raw.trim().replace(/['"]/g, '');
        if (t.startsWith('padn_')) {
          if (!declared.has(t)) errors.push(`${file}: 未宣言の repository_dispatch type ${t}`);
          seenTypes.add(t);
        }
      }
    }
    if (file === '369-padn-dispatch.yml') {
      if (!/github\.event_name\s*!=\s*'pull_request'/.test(text)) {
        errors.push(`${file}: secrets を使う job に pull_request 除外ガードが無い（untrusted workflow definition 対策）`);
      }
      if (!/head\.repo\.full_name\s*==\s*github\.repository/.test(text)) {
        errors.push(`${file}: fork PR ガードが無い`);
      }
    }
  }
  for (const t of declared) {
    if (t === 'padn_dispatch') continue; // dispatcher 自身の再入 type
    if (!seenTypes.has(t)) errors.push(`workflow lint: event type ${t} を受ける workflow が無い`);
  }
  return { ok: errors.length === 0, errors };
}

/** repository_dispatch client_payload の静的検証（role workflow の guard step が使う）。 */
export function validatePayload(payload, rootDir = '.') {
  const errors = [];
  const policy = JSON.parse(readFileSync(`${rootDir}/config/padn/dispatch-policy.json`, 'utf8'));
  const roles = JSON.parse(readFileSync(`${rootDir}/config/padn/roles.json`, 'utf8'));
  if (payload?.schema !== '369-l2-dispatch-v1') errors.push('schema が 369-l2-dispatch-v1 ではない');
  if (payload?.dispatched_by !== '369-padn-l2-dispatcher') errors.push('dispatched_by が不正');
  if (!payload?.wip_id || !/^WIP-[A-Z0-9-]+$/.test(payload.wip_id)) errors.push('wip_id 形式不正');
  if (!Number.isInteger(payload?.wip_issue)) errors.push('wip_issue が整数ではない');
  if (!payload?.base_sha || !/^[0-9a-f]{7,40}$/.test(payload.base_sha)) errors.push('base_sha 形式不正');
  if (payload?.head_sha && !/^[0-9a-f]{7,40}$/.test(payload.head_sha)) errors.push('head_sha 形式不正');
  // branch は shell へ渡り得るため base_sha/head_sha と同様に厳格な形式検証（injection 対策）
  if (payload?.branch != null && !/^[A-Za-z0-9._/-]{1,255}$/.test(payload.branch)) errors.push('branch 形式不正');
  const depth = Number(payload?.chain_depth ?? NaN);
  if (!Number.isInteger(depth) || depth < 1 || depth > policy.chain.max_depth) errors.push(`chain_depth 不正: ${payload?.chain_depth}`);
  if (!payload?.idempotency_key) errors.push('idempotency_key 欠落');
  if (payload?.fencing_token) {
    const check = validateFencingToken(payload.fencing_token, {
      epoch: payload.director_epoch,
      leaseRevision: payload.lease_revision,
      baseSha: payload.base_sha,
    });
    if (!check.valid) errors.push(`fencing_token 不正: ${check.reason}`);
  }
  return { ok: errors.length === 0, errors };
}

/** 否定系 selftest: 壊れた入力が「正しく拒否される」ことを検証する。拒否されなければ失敗。 */
export function negativeSelftest(rootDir = '.') {
  const errors = [];
  const mustFail = (name, fn) => {
    try {
      const r = fn();
      if (r && typeof r === 'object' && 'ok' in r && r.ok === false) return; // 拒否された
      if (r && typeof r === 'object' && 'valid' in r && r.valid === false) return;
      if (r && typeof r === 'object' && 'verified' in r && r.verified === false) return;
      errors.push(`negative selftest 失敗: ${name} が拒否されなかった`);
    } catch {
      // throw も「拒否」
    }
  };
  mustFail('corrupted packet hash', () => verifyPacket({ a: 1 }, promptSha256({ a: 2 })));
  mustFail('truncated hash is not verified', () => verifyPacket({ a: 1 }, promptSha256({ a: 1 }).slice(0, 8)));
  mustFail('unresolved template placeholder', () => renderTemplate('x {{MISSING}} y', {}));
  mustFail('fencing token epoch mismatch', () =>
    validateFencingToken('FT-369PADN-E1-B1-L1-7e50a04', { epoch: 2, leaseRevision: 1, baseSha: '7e50a04df6' }),
  );
  mustFail('fencing token stale base', () =>
    validateFencingToken('FT-369PADN-E1-B1-L1-7e50a04', { epoch: 1, leaseRevision: 1, baseSha: 'deadbeef00' }),
  );
  mustFail('invalid payload', () => validatePayload({ schema: 'wrong' }, rootDir));
  // 不正遷移
  const sm = loadStateMachine(JSON.parse(readFileSync(`${rootDir}/config/padn/state-machine.json`, 'utf8')));
  const bad = sm.next('DISPATCHED', 'HUMAN_MERGE');
  if (bad.ok) errors.push('negative selftest 失敗: DISPATCHED→HUMAN_MERGE が許可された');
  const humanOnly = sm.next('READY_FOR_HUMAN_GATE', 'HUMAN_MERGE');
  if (!humanOnly.ok || humanOnly.humanOnly !== true) errors.push('negative selftest 失敗: HUMAN_MERGE が human_only 扱いではない');
  // 合成の悪い workflow 文字列は lint パターンに検出されること
  const fakeBad = 'on:\n  pull_request_target:\n';
  if (!/^\s*pull_request_target\s*:/m.test(fakeBad)) errors.push('selftest 内部矛盾: pull_request_target 検出パターンが機能していない');
  return { ok: errors.length === 0, errors };
}

// ---------------- CLI ----------------
function run() {
  const arg = process.argv[2];
  const rootDir = process.env.PADN_ROOT ?? '.';
  let result;
  if (arg === '--configs') {
    const c = validateConfigs(rootDir);
    const w = lintWorkflows(rootDir);
    result = { ok: c.ok && w.ok, errors: [...c.errors, ...w.errors] };
  } else if (arg === '--payload') {
    const file = process.argv[3];
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    // GITHUB_EVENT_PATH（repository_dispatch payload 全体）と client_payload 単体の両方を受ける
    const payload = raw.client_payload ?? raw;
    result = validatePayload(payload, rootDir);
  } else if (arg === '--selftest') {
    result = negativeSelftest(rootDir);
  } else {
    console.error('usage: validate.mjs --configs | --payload <file> | --selftest');
    process.exit(2);
  }
  if (result.ok) {
    console.log('OK');
    process.exit(0);
  }
  for (const e of result.errors) console.error(`NG: ${e}`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) run();
