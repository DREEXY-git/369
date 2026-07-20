// PADN L2 — path lock（ALLOWED_PATHS）と semantic resource lock。
// glob は ** / * のみ対応（依存追加なしの最小実装）。

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        // "**" は空を含む任意パス。後続の "/" ごと飲み込めるようにする。
        re += '(?:.*)';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if ('\\^$.|?+()[]{}'.includes(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  return new RegExp(`^${re}$`);
}

export function pathMatches(path, patterns) {
  return patterns.some((p) => globToRegExp(p).test(path));
}

/** ALLOWED_PATHS 逸脱の検出。violations が 1 件でもあれば write 禁止。 */
export function checkAllowedPaths(touchedPaths, allowedPatterns) {
  const violations = touchedPaths.filter((p) => !pathMatches(p, allowedPatterns));
  return { ok: violations.length === 0, violations };
}

export function loadTaxonomy(taxonomyConfig) {
  const levels = taxonomyConfig.lock_levels;
  const compat = taxonomyConfig.compatibility;
  return {
    levels,
    resources: taxonomyConfig.resources,
    isCompatible(heldLevel, requestedLevel) {
      const row = compat[heldLevel];
      if (!row || !(requestedLevel in row)) return false; // 未定義は fail-closed
      return row[requestedLevel] === true;
    },
  };
}

/** paths が触る semantic resource の集合を返す。 */
export function resourcesForPaths(taxonomy, paths) {
  const hit = new Set();
  for (const [name, resource] of Object.entries(taxonomy.resources)) {
    if (paths.some((p) => pathMatches(p, resource.paths))) hit.add(name);
  }
  return [...hit].sort();
}

/**
 * 既保持ロック held=[{resource, level, holder}] に対し要求 request={resource, level, holder} が
 * 取得可能か。自分自身（同一 holder）の保持とは競合しない。
 */
export function canAcquire(taxonomy, held, request) {
  const conflicts = held.filter(
    (h) =>
      h.resource === request.resource &&
      h.holder !== request.holder &&
      !taxonomy.isCompatible(h.level, request.level),
  );
  return { ok: conflicts.length === 0, conflicts };
}

/**
 * レーン間の競合検査: 各レーン {holder, paths, level} を resource lock 集合に展開し、
 * 全組み合わせの競合を返す。
 */
export function laneConflicts(taxonomy, lanes) {
  const locks = [];
  for (const lane of lanes) {
    for (const resource of resourcesForPaths(taxonomy, lane.paths)) {
      locks.push({ resource, level: lane.level ?? 'WRITE', holder: lane.holder });
    }
  }
  const conflicts = [];
  for (let i = 0; i < locks.length; i++) {
    for (let j = i + 1; j < locks.length; j++) {
      const a = locks[i];
      const b = locks[j];
      if (a.resource !== b.resource || a.holder === b.holder) continue;
      if (!taxonomy.isCompatible(a.level, b.level) || !taxonomy.isCompatible(b.level, a.level)) {
        conflicts.push({ resource: a.resource, holders: [a.holder, b.holder], levels: [a.level, b.level] });
      }
    }
  }
  return conflicts;
}
