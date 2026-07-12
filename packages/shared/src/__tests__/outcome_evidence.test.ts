import { describe, expect, it } from 'vitest';
import {
  classifyHumanTimeSaving,
  canDisplayVerifiedTimeSaving,
  sumByEvidenceClass,
  countWaitingDecisions,
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

describe('sumByEvidenceClass（自己申告を実測に合算しない・異unitを加算しない）', () => {
  const entry = (evidenceClass: OutcomeEntry['evidenceClass'], value: number | null, unit = '件'): OutcomeEntry => ({
    key: 'k',
    label: 'l',
    value,
    unit,
    evidenceClass,
    evidenceSource: 's',
    periodLabel: '直近30日',
    denominatorNote: '',
    confidence: null,
  });
  it('区分バケットが分かれて合計される・unavailable(null) は合計に入らない', () => {
    const sums = sumByEvidenceClass([
      entry('measured', 10),
      entry('measured', 5),
      entry('self_reported', 100),
      entry('estimated', 7),
      entry('unavailable', null),
    ]);
    expect(sums.measured['件']).toBe(15); // 100(自己申告) が混ざらない
    expect(sums.self_reported['件']).toBe(100);
    expect(sums.estimated['件']).toBe(7);
    expect(Object.keys(sums.unavailable)).toHaveLength(0);
  });
  it('v5.9 M8: 件・時間・円の異なる単位は同一区分でも合算されない', () => {
    const sums = sumByEvidenceClass([
      entry('measured', 10, '件'),
      entry('measured', 3, '時間'),
      entry('measured', 5000, '円'),
      entry('measured', 2, '件'),
    ]);
    expect(sums.measured['件']).toBe(12);
    expect(sums.measured['時間']).toBe(3);
    expect(sums.measured['円']).toBe(5000);
    // 「12件＋3時間＋5000円=5015」のような無意味な合計値がどこにも存在しない
    expect(Object.values(sums.measured)).not.toContain(5015);
  });
  it('ラベルは5区分すべて日本語定義済み', () => {
    expect(Object.keys(OUTCOME_EVIDENCE_LABEL)).toHaveLength(5);
    expect(OUTCOME_EVIDENCE_LABEL.unavailable).toBe('計測なし');
  });
});

describe('countWaitingDecisions（v5.9 M7: 判断待ちの二重計上禁止）', () => {
  it('同一 run の NEEDS_APPROVAL と PENDING gate は 1 判断（2 件にしない）', () => {
    expect(countWaitingDecisions(['run-1'], [{ runId: 'run-1' }])).toBe(1);
  });
  it('gate のみ（run 記録が範囲外）でも 1 判断', () => {
    expect(countWaitingDecisions([], [{ runId: 'run-9' }])).toBe(1);
  });
  it('run のみ（gate 未作成）でも 1 判断', () => {
    expect(countWaitingDecisions(['run-2'], [])).toBe(1);
  });
  it('runId null の gate は独立の判断として数える・同一 run の複数 gate は 1 判断', () => {
    expect(countWaitingDecisions(['run-1'], [{ runId: 'run-1' }, { runId: 'run-1' }, { runId: null }])).toBe(2);
  });
  it('空入力は 0', () => {
    expect(countWaitingDecisions([], [])).toBe(0);
  });
});
