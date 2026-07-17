// PADN L2 — Lease と fencing token の検証。
// fencing token 形式（L1 実績値に一致）: FT-369PADN-E{epoch}-{lane}-L{leaseRevision}-{shortSha}
//   例: FT-369PADN-E1-B2-L1-7e50a04 / FT-369PADN-E1-G1-L2-7e50a04

const TOKEN_RE = /^FT-369PADN-E(\d+)-([A-Za-z0-9]+(?:-\d+)?)-L(\d+)-([0-9a-f]{7,40})$/;

export function buildFencingToken({ epoch, lane, leaseRevision, baseSha }) {
  const short = String(baseSha).slice(0, 7);
  return `FT-369PADN-E${epoch}-${lane}-L${leaseRevision}-${short}`;
}

export function parseFencingToken(token) {
  const m = TOKEN_RE.exec(String(token || '').trim());
  if (!m) return null;
  return { epoch: Number(m[1]), lane: m[2], leaseRevision: Number(m[3]), shortSha: m[4] };
}

/**
 * stale fencing token での write を無効化する検証（Control Root 運用規約3）。
 * epoch / lease revision / base SHA prefix がすべて現在値と一致しなければ invalid。
 */
export function validateFencingToken(token, { epoch, leaseRevision, baseSha, lane }) {
  const parsed = parseFencingToken(token);
  if (!parsed) return { valid: false, reason: 'token_format_invalid' };
  if (parsed.epoch !== Number(epoch)) return { valid: false, reason: 'epoch_mismatch' };
  if (parsed.leaseRevision !== Number(leaseRevision)) return { valid: false, reason: 'lease_revision_mismatch' };
  if (!String(baseSha).startsWith(parsed.shortSha)) return { valid: false, reason: 'base_sha_mismatch' };
  if (lane !== undefined && parsed.lane !== String(lane)) return { valid: false, reason: 'lane_mismatch' };
  return { valid: true, parsed };
}

/**
 * Lease の有効判定。発行から ttlHours、または最後の CHECKPOINT から checkpointTtlHours を
 * 超えたら失効（WIP #67/#68 の期限規定を実装）。
 */
export function isLeaseActive(lease, now, { ttlHours = 48, checkpointTtlHours = 24 } = {}) {
  const nowMs = toMs(now);
  const issued = toMs(lease.issuedAt);
  if (issued === null || nowMs === null) return { active: false, reason: 'timestamps_missing' };
  if (lease.revoked) return { active: false, reason: 'revoked' };
  if (nowMs - issued > ttlHours * 3600_000) return { active: false, reason: 'ttl_expired' };
  const lastActivity = toMs(lease.lastCheckpointAt) ?? issued;
  if (nowMs - lastActivity > checkpointTtlHours * 3600_000) {
    return { active: false, reason: 'checkpoint_ttl_expired' };
  }
  return { active: true };
}

/** write 開始条件としての lease+token 一括検証。 */
export function validateLeaseForWrite(lease, token, ctx, now, ttl) {
  const activity = isLeaseActive(lease, now, ttl);
  if (!activity.active) return { valid: false, reason: `lease_inactive:${activity.reason}` };
  const tokenCheck = validateFencingToken(token, {
    epoch: ctx.epoch,
    leaseRevision: lease.revision,
    baseSha: ctx.baseSha,
  });
  if (!tokenCheck.valid) return { valid: false, reason: `fencing:${tokenCheck.reason}` };
  return { valid: true };
}

function toMs(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}
