import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, promptSha256, verifyPacket, renderTemplate } from '../prompts.mjs';

test('canonicalJson: Python json.dumps(sort_keys, separators, ensure_ascii=False) と同一 bytes', () => {
  const packet = { b: 'あいう', a: 1, nested: { z: [1, 2, { y: null }], x: true }, s: 'quote"and\\' };
  assert.equal(
    canonicalJson(packet),
    '{"a":1,"b":"あいう","nested":{"x":true,"z":[1,2,{"y":null}]},"s":"quote\\"and\\\\"}',
  );
  // Python hashlib で事前計算した vector（実装から独立）
  assert.equal(promptSha256(packet), 'fdbd6aaf4cdfbe81e55f1b3bab15289c65a1beccc5a2e4e2774a104bbb6fa260');
});

test('promptSha256: L1 形式 packet の vector 一致', () => {
  const packet = { packet: 'PADN', wip: 'WIP-PADN-B1-001', base_sha: '7e50a04df6dcc8043689958cbfd9be42e15e1af7' };
  assert.equal(promptSha256(packet), '842dac6d3612ddccc2bccb225f65710e02b449186d3fcfc88793aec2086cab0d');
});

test('verifyPacket: 完全一致のみ verified', () => {
  const packet = { a: 1 };
  const hash = promptSha256(packet);
  assert.equal(verifyPacket(packet, hash).verified, true);
  assert.equal(verifyPacket({ a: 2 }, hash).verified, false);
});

test('verifyPacket: truncated hash（ca57d9c1… 形式）は prefixOnly で write 開始条件にならない', () => {
  const packet = { a: 1 };
  const truncated = promptSha256(packet).slice(0, 8) + '…';
  const r = verifyPacket(packet, truncated);
  assert.equal(r.verified, false);
  assert.equal(r.prefixOnly, true);
});

test('verifyPacket: 全角括弧などの packet 破損は hash 不一致になる（D-201 インシデントの再現）', () => {
  const original = { note: 'separators=(",",":")' };
  const corrupted = { note: 'separators=（","，":"）' }; // 全角括弧への転写破損
  const declared = promptSha256(original);
  assert.equal(verifyPacket(corrupted, declared).verified, false);
});

test('renderTemplate: プレースホルダ解決と未解決の拒否', () => {
  assert.equal(renderTemplate('a {{X}} b', { X: '1' }), 'a 1 b');
  assert.throws(() => renderTemplate('a {{MISSING}} b', {}), /未解決/);
  assert.throws(() => renderTemplate('a {{X}} b', { X: null }), /未解決/);
});

test('canonicalJson: undefined キーは無視・undefined 値の配列要素は null', () => {
  assert.equal(canonicalJson({ a: undefined, b: 1 }), '{"b":1}');
  assert.equal(canonicalJson([1, undefined, 2]), '[1,null,2]');
});
