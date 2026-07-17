// PADN L2 — Prompt Packet の正準直列化・hash 検証・テンプレート描画。
// hash 規則は Control Root #66 運用規約2 を実装する:
//   「packet JSON を UTF-8 / sort_keys / separators=(",",":") で直列化した bytes の sha256」
// （Python json.dumps(obj, sort_keys=True, separators=(",",":"), ensure_ascii=False) と同一 bytes。
//  UTF-8 bytes 指定のため ensure_ascii=False 相当＝非ASCIIはエスケープしない。）
import { createHash } from 'node:crypto';

export function canonicalJson(value) {
  if (value === undefined) throw new TypeError('canonicalJson: undefined は直列化できない');
  return serialize(value);
}

function serialize(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonicalJson: 非有限数');
    return JSON.stringify(value);
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => serialize(v === undefined ? null : v)).join(',')}]`;
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    const parts = [];
    for (const k of keys) {
      const v = value[k];
      if (v === undefined) continue; // Python 側に存在しないキーは持ち込まない
      parts.push(`${JSON.stringify(k)}:${serialize(v)}`);
    }
    return `{${parts.join(',')}}`;
  }
  throw new TypeError(`canonicalJson: 直列化できない型 ${t}`);
}

export function promptSha256(packet) {
  const canonical = typeof packet === 'string' ? packet : canonicalJson(packet);
  return createHash('sha256').update(Buffer.from(canonical, 'utf8')).digest('hex');
}

/**
 * packet と宣言 hash の一致検証。prefix 一致（truncated hash "ca57d9c1…" 形式）も判定できるが、
 * 完全一致でない場合は verified=false / prefixOnly=true として返し、write 開始条件には使わせない。
 */
export function verifyPacket(packet, declaredHash) {
  const declared = String(declaredHash || '').replace(/[……]/g, '').trim().toLowerCase();
  if (!/^[0-9a-f]{8,64}$/.test(declared)) {
    return { verified: false, prefixOnly: false, computed: null, reason: 'declared_hash_invalid' };
  }
  const computed = promptSha256(packet);
  if (declared.length === 64) {
    return declared === computed
      ? { verified: true, prefixOnly: false, computed }
      : { verified: false, prefixOnly: false, computed, reason: 'hash_mismatch' };
  }
  return computed.startsWith(declared)
    ? { verified: false, prefixOnly: true, computed, reason: 'declared_hash_truncated' }
    : { verified: false, prefixOnly: false, computed, reason: 'hash_mismatch' };
}

/** {{KEY}} プレースホルダ置換。未解決が残れば throw（negative selftest 対象）。 */
export function renderTemplate(templateText, vars) {
  const rendered = templateText.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (!(key in vars) || vars[key] === undefined || vars[key] === null) {
      throw new Error(`renderTemplate: 未解決プレースホルダ {{${key}}}`);
    }
    return String(vars[key]);
  });
  const leftover = rendered.match(/\{\{[A-Z0-9_]+\}\}/);
  if (leftover) throw new Error(`renderTemplate: 未解決プレースホルダ ${leftover[0]}`);
  return rendered;
}
