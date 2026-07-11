import { describe, expect, it } from 'vitest';
import { AI_CHARACTERS, getAiCharacter } from '../ai-characters';

// seed（packages/db/prisma/seed.ts）の AIAgent key と一致していること。
const SEED_AGENT_KEYS = ['leadmap_sales', 'sales', 'cfo', 'inventory', 'chief_of_staff', 'customer', 'accounting', 'hr'];

describe('AI_CHARACTERS（キャラクター設定の整合性）', () => {
  it('seed の全 AIAgent key にプロフィールがある', () => {
    for (const key of SEED_AGENT_KEYS) {
      expect(AI_CHARACTERS[key], `missing profile: ${key}`).toBeDefined();
      expect(AI_CHARACTERS[key]!.key).toBe(key);
    }
  });
  it('人物名・かな・コードネームは全員ユニークで空でない', () => {
    const profiles = Object.values(AI_CHARACTERS);
    const names = profiles.map((p) => p.fullName);
    expect(new Set(names).size).toBe(names.length);
    for (const p of profiles) {
      expect(p.fullName.length).toBeGreaterThan(0);
      expect(p.kana.length).toBeGreaterThan(0);
      expect(p.codeName.length).toBeGreaterThan(0);
    }
  });
  it('スキルレベルは 1-5・スキル/クセ/ミスは空でない（設定として成立している）', () => {
    for (const p of Object.values(AI_CHARACTERS)) {
      expect(p.skills.length).toBeGreaterThanOrEqual(3);
      for (const s of p.skills) {
        expect(s.level).toBeGreaterThanOrEqual(1);
        expect(s.level).toBeLessThanOrEqual(5);
      }
      expect(p.traits.length).toBeGreaterThanOrEqual(2);
      expect(p.commonMistakes.length).toBeGreaterThanOrEqual(1);
      // 評価コメントは「設定」であることを明示する（実測の成果主張と混同しない）。
      expect(p.evaluationNote).toContain('設定');
    }
  });
  it('未登録 key はフォールバック（設定未作成を明示・決定論）', () => {
    const a = getAiCharacter('unknown_agent_x');
    const b = getAiCharacter('unknown_agent_x');
    expect(a.fullName).toBe('（設定未作成）');
    expect(a).toEqual(b);
    expect(getAiCharacter('cfo').fullName).toBe('氷室 紫苑');
  });
});
