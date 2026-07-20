// PADN L2 — Risk Tier 判定と Human Gate 検出。
import { pathMatches } from './locks.mjs';

export function classifyPath(path, riskPolicy) {
  const order = [...riskPolicy.tier_order].reverse(); // 高い tier を優先判定
  for (const tier of order) {
    const spec = riskPolicy.tiers[tier];
    if (!spec) continue;
    if (spec.exclude_patterns && pathMatches(path, spec.exclude_patterns)) continue;
    if (pathMatches(path, spec.path_patterns)) return tier;
  }
  return riskPolicy.unknown_path_tier; // 未知パスは fail-closed（既定 RT3）
}

/** 変更パス集合の tier = 最も高い tier。exclude に当たったパスは RT4 側で再評価される。 */
export function classifyPaths(paths, riskPolicy) {
  if (!paths || paths.length === 0) return { tier: riskPolicy.unknown_path_tier, perPath: {} };
  const perPath = {};
  let maxIdx = -1;
  for (const p of paths) {
    // exclude された RT1 パス（rbac 等）は上位 tier に拾わせる: RT4 パターンにも当てて高い方を採用
    let tier = classifyPath(p, riskPolicy);
    for (const t of [...riskPolicy.tier_order].reverse()) {
      const spec = riskPolicy.tiers[t];
      if (spec && pathMatches(p, spec.path_patterns) && !(spec.exclude_patterns && pathMatches(p, spec.exclude_patterns))) {
        tier = higherTier(tier, t, riskPolicy.tier_order);
        break;
      }
    }
    perPath[p] = tier;
    const idx = riskPolicy.tier_order.indexOf(tier);
    if (idx > maxIdx) maxIdx = idx;
  }
  return { tier: riskPolicy.tier_order[Math.max(maxIdx, 0)], perPath };
}

function higherTier(a, b, order) {
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/**
 * mode / tier / 事前許可から自動開始可否を判定する。
 * - never_auto_start_tiers（RT3/RT4）は常に不可。
 * - RT2 は人間の PADN_RT2_APPROVED marker がある WIP のみ可（mode が write を許す場合）。
 */
export function tierAllowed(tier, mode, riskPolicy, { rt2Approved = false } = {}) {
  if (riskPolicy.never_auto_start_tiers.includes(tier)) {
    return { allowed: false, reason: `tier_${tier}_never_auto_start` };
  }
  const modeSpec = riskPolicy.modes[mode];
  if (!modeSpec) return { allowed: false, reason: `unknown_mode_${mode}` };
  if (modeSpec.auto_start_tiers.includes(tier)) return { allowed: true };
  if (tier === 'RT2') {
    if (!rt2Approved) return { allowed: false, reason: 'rt2_requires_human_preapproval' };
    if (mode === 'observe') return { allowed: false, reason: 'observe_mode_no_write' };
    return { allowed: true, reason: 'rt2_preapproved' };
  }
  return { allowed: false, reason: `tier_${tier}_not_in_mode_${mode}` };
}

/** WIP Issue のコメントから RT2 事前許可 marker を検出する（許可者 login 限定）。 */
export function findRt2Approval(comments, riskPolicy) {
  const marker = riskPolicy.rt2_preapproval.marker;
  const approvers = riskPolicy.rt2_preapproval.approver_logins;
  return comments.some(
    (c) => approvers.includes(c.user?.login ?? c.author ?? '') && String(c.body || '').includes(marker),
  );
}

/** 変更パス・アクションから Human Gate 越境を検出する。 */
export function detectGateViolations({ paths = [], actions = [] }, gatesConfig) {
  const hits = [];
  for (const gate of gatesConfig.gates) {
    const pathHit = gate.detection.paths?.length ? paths.filter((p) => pathMatches(p, gate.detection.paths)) : [];
    const actionHit = gate.detection.actions?.length ? actions.filter((a) => gate.detection.actions.includes(a)) : [];
    if (pathHit.length || actionHit.length) {
      hits.push({ gate: gate.id, paths: pathHit, actions: actionHit });
    }
  }
  return hits;
}
