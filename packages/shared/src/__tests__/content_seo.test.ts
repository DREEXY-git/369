import { describe, expect, it } from 'vitest';
import { diagnoseSeoContent, findDuplicateTitles, detectForbiddenClaims } from '../content-seo';

describe('diagnoseSeoContent（read-only 診断・決定論）', () => {
  it('0件相当（空タイトル・空本文）は warn を返す', () => {
    const f = diagnoseSeoContent({ title: '', body: '' });
    expect(f.map((x) => x.code)).toContain('title-missing');
    expect(f.map((x) => x.code)).toContain('body-missing');
  });
  it('長文タイトルは警告・見出しなし本文は指摘', () => {
    const f = diagnoseSeoContent({ title: 'あ'.repeat(40), body: 'x'.repeat(400) });
    expect(f.map((x) => x.code)).toContain('title-too-long');
    expect(f.map((x) => x.code)).toContain('no-headings');
  });
  it('十分な長さ＋見出しあり＋通常表現は指摘なし', () => {
    const f = diagnoseSeoContent({ title: 'イベント集客の進め方ガイド', body: `# 見出し\n${'内容'.repeat(200)}` });
    expect(f).toHaveLength(0);
  });
  it('禁止クレーム（No.1・業界初・満足度数値）を人間確認として検出する', () => {
    const f = diagnoseSeoContent({ title: '業界初！満足度98%のNo.1サービス', body: `# h\n${'x'.repeat(400)}` });
    const claims = f.filter((x) => x.code === 'forbidden-claim');
    expect(claims.length).toBeGreaterThanOrEqual(3);
  });
});

describe('findDuplicateTitles', () => {
  it('重複タイトルのみ返す（空白は無視）', () => {
    expect(findDuplicateTitles(['A', 'B', 'A', ' ', ''])).toEqual(['A']);
    expect(findDuplicateTitles([])).toEqual([]);
  });
});

describe('detectForbiddenClaims', () => {
  it('通常文は検出しない', () => {
    expect(detectForbiddenClaims('地域で選ばれるイベント会社の選び方')).toEqual([]);
  });
});
