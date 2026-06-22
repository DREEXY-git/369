import { Badge } from './ui';
import {
  LABEL_BADGE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  type AlertSeverity,
  type ConfidentialityLabel,
  type LeadStage,
} from '@hokko/shared';

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function LabelBadge({ label }: { label: ConfidentialityLabel }) {
  const b = LABEL_BADGE[label];
  return <Badge tone={b.tone}>{b.text}</Badge>;
}

export const LEAD_STAGE_LABEL: Record<LeadStage, { text: string; tone: string }> = {
  NEW: { text: '未接触', tone: 'slate' },
  ANALYZED: { text: 'AI分析済', tone: 'sky' },
  DRAFTED: { text: 'メール生成済', tone: 'blue' },
  PENDING_APPROVAL: { text: '承認待ち', tone: 'amber' },
  READY: { text: '送信可能', tone: 'blue' },
  SENT: { text: '送信済', tone: 'purple' },
  OPENED: { text: '開封済', tone: 'purple' },
  CLICKED: { text: 'クリック', tone: 'purple' },
  REPLIED: { text: '返信あり', tone: 'green' },
  APPOINTMENT: { text: 'アポ獲得', tone: 'green' },
  NEGOTIATING: { text: '商談中', tone: 'green' },
  QUOTED: { text: '見積提出', tone: 'amber' },
  WON: { text: '成約', tone: 'green' },
  LOST: { text: '失注', tone: 'red' },
  UNSUBSCRIBED: { text: '配信停止', tone: 'red' },
  EXCLUDED: { text: '対象外', tone: 'slate' },
};

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  const s = LEAD_STAGE_LABEL[stage] ?? { text: stage, tone: 'slate' };
  return <Badge tone={s.tone}>{s.text}</Badge>;
}

export const DEAL_STAGE_LABEL: Record<string, string> = {
  CONTACT: '初回接触',
  HEARING: 'ヒアリング',
  PROPOSAL: '提案',
  QUOTE: '見積',
  NEGOTIATION: '価格交渉',
  INTERNAL_REVIEW: '社内確認',
  CONTRACT: '契約',
  DELIVERY: '納品',
  INVOICE: '請求',
  FOLLOW_UP: '継続提案',
  LOST: '失注',
};

export function PriorityBadge({ score }: { score: number }) {
  const tone = score >= 75 ? 'red' : score >= 55 ? 'amber' : 'slate';
  const text = score >= 75 ? '高' : score >= 55 ? '中' : '低';
  return (
    <Badge tone={tone}>
      優先度{text}・{score}
    </Badge>
  );
}
