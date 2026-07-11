import { describe, expect, it } from 'vitest';
import {
  classifyHumanTimeSaving,
  canDisplayVerifiedTimeSaving,
  sumByEvidenceClass,
  OUTCOME_EVIDENCE_LABEL,
  type OutcomeEntry,
} from '../outcome-evidence';

describe('classifyHumanTimeSaving（baseline 規律・格上げしない）', () => {
  it('baseline なし → unavailable（AI 実行時間だけから推定しない）', () => {
    expect(
      classifyHumanTimeSaving({ baselineMinutesPerTask: null, baselineIsMeasured: false, completedTaskCountMeasured: true }),
    ).toBe('unavailable');
    expect(
      classifyHumanTimeSaving({ baselineMinutesPerTask: 0, baselineIsMeasured: true, completedTaskCountMeasured: true }),
    ).toBe('unavailable');
  });
  it('baseline が自己申告 → self_reported 止まり（verified にしない）', () => {
    expect(
      classifyHumanTimeSaving({ baselineMinutesPerTask: 30, baselineIsMeasured: false, completedTaskCountMeasured: true }),
    ).toBe('self_reported');
  });
  it('baseline 実測でも成果カウントが実測でなければ estimated 止まり', () => {
    expect(
      classifyHumanTimeSaving({ baselineMinutesPerTask: 30, baselineIsMeasured: true, completedTaskCountMeasured: false }),
    ).toBe('estimated');
  });
  it('両方実測のときのみ measured（= 検証済み表示可）', () => {
    const input = { baselineMinutesPerTask: 30, baselineIsMeasured: true, completedTaskCountMeasured: true };
    expect(classifyHumanTimeSaving(input)).toBe('measured');
    expect(canDisplayVerifiedTimeSaving(input)).toBe(true);
    expect(canDisplayVerifiedTimeSaving({ ...input, baselineMinutesPerTask: null })).toBe(false);
  });
});

describe('sumByEvidenceClass（自己申告を実測に合算しない）', () => {
  const entry = (evidenceClass: OutcomeEntry['evidenceClass'], value: number | null): OutcomeEntry => ({
    key: 'k',
    label: 'l',
    value,
    unit: '件',
    evidenceClass,
    evidenceSource: 's',
    periodLabel: '直近30日',
    denominatorNote: '',
    confidence: null,
  });
  it('バケットが分かれて合計される・unavailable(null) は合計に入らない', () => {
    const sums = sumByEvidenceClass([
      entry('measured', 10),
      entry('measured', 5),
      entry('self_reported', 100),
      entry('estimated', 7),
      entry('unavailable', null),
    ]);
    expect(sums.measured).toBe(15); // 100(自己申告) が混ざらない
    expect(sums.self_reported).toBe(100);
    expect(sums.estimated).toBe(7);
    expect(sums.unavailable).toBe(0);
  });
  it('ラベルは5区分すべて日本語定義済み', () => {
    expect(Object.keys(OUTCOME_EVIDENCE_LABEL)).toHaveLength(5);
    expect(OUTCOME_EVIDENCE_LABEL.unavailable).toBe('計測なし');
  });
});
