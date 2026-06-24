// Planning Hokko Golden Path（顧客→イベント案件→…→請求→入金→資金繰り）の
// 「現在地・次の一手・進捗・低粗利警告」を計算する純ロジック。Phase 1-11。
// 既存モデルから集めた事実（件数/金額/ステータス）だけを受け取り、UI/DB 非依存で返す。
// UI はここで返る step.key を画面・ボタンへマップする（href はここに持たせない＝純粋性維持）。
import { eventProfitMargin } from './operations';
import { isInvoiceSent } from './finance';

export type GoldenPathStepStatus = 'done' | 'current' | 'todo' | 'optional';

/** Golden Path を判定するために必要な、既存モデル由来の事実のみ。 */
export interface GoldenPathInput {
  hasCustomer: boolean;
  productUsageCount: number;
  logisticsTaskCount: number;
  staffCount: number;
  riskCount: number; // リスク登録は任意（請求を止めない）
  costRecorded: boolean; // 原価明細あり or cost>0
  revenue: number;
  cost: number;
  grossSnapshotCount: number;
  bridged: boolean; // Finance Bridge 済み（EventProject 由来 FinanceEvent あり）
  invoiceCandidateStatus: string | null; // null=未作成
  invoiceStatus: string | null; // null=未正式化。以降 DRAFT/ISSUED/SENT/PARTIALLY_PAID/PAID/VOID
  paidAmount: number;
  invoiceTotal: number;
}

export interface GoldenPathStep {
  key: string;
  label: string;
  status: GoldenPathStepStatus;
  optional?: boolean;
}

export interface GoldenPathResult {
  steps: GoldenPathStep[];
  doneCount: number; // 必須ステップのうち完了数
  totalCount: number; // 必須ステップ総数（optional 除く）
  percent: number; // 0-100
  nextActionKey: string | null; // 次にやるべき必須ステップ key（なければ null=完了）
  nextActionLabel: string | null;
  marginPercent: number;
  lowMarginWarning: boolean; // 売上あり かつ 粗利率が低い
  fullyCollected: boolean; // 全額回収済み（PAID）
}

// 粗利率がこの値未満なら警告（プランニングホッコーの薄利案件検知）。
export const GOLDEN_PATH_LOW_MARGIN_THRESHOLD = 15;

interface StepDef {
  key: string;
  label: string;
  optional?: boolean;
  done: (i: GoldenPathInput) => boolean;
}

// Golden Path 20ステップを、現場で意味のある必須マイルストーンへ集約（番号は元20ステップ対応）。
const STEP_DEFS: StepDef[] = [
  { key: 'customer', label: '顧客の紐付け', done: (i) => i.hasCustomer }, // 1
  { key: 'assets', label: '商品・備品の割当', done: (i) => i.productUsageCount > 0 }, // 3,4
  { key: 'logistics', label: '配送・設営・撤去・回収', done: (i) => i.logisticsTaskCount > 0 }, // 5
  { key: 'staff', label: '人員配置', done: (i) => i.staffCount > 0 }, // 6
  { key: 'risk', label: 'イベントリスク登録', optional: true, done: (i) => i.riskCount > 0 }, // 7（任意）
  { key: 'cost', label: '原価登録', done: (i) => i.costRecorded }, // 8
  { key: 'revenue', label: '売上登録', done: (i) => i.revenue > 0 }, // 9
  { key: 'profit', label: '粗利計算・スナップショット', done: (i) => i.grossSnapshotCount > 0 }, // 10
  { key: 'bridge', label: 'Finance Bridge（請求/仕訳候補）', done: (i) => i.bridged }, // 11,12,13
  { key: 'formalize', label: '正式請求書化', done: (i) => i.invoiceStatus != null }, // 14
  { key: 'send', label: '請求書送信（承認後）', done: (i) => i.invoiceStatus != null && isInvoiceSent(i.invoiceStatus) }, // 15,16
  { key: 'payment', label: '入金記録', done: (i) => i.paidAmount > 0 }, // 17
  { key: 'collected', label: '売掛金回収・資金繰り反映', done: (i) => i.invoiceStatus === 'PAID' }, // 18,19
];

/** Golden Path の進捗・次アクション・低粗利警告を計算（純関数）。 */
export function computeGoldenPath(input: GoldenPathInput): GoldenPathResult {
  const required = STEP_DEFS.filter((s) => !s.optional);
  const totalCount = required.length;
  let doneCount = 0;
  let nextActionKey: string | null = null;
  let nextActionLabel: string | null = null;

  const steps: GoldenPathStep[] = STEP_DEFS.map((def) => {
    const isDone = def.done(input);
    if (def.optional) {
      return { key: def.key, label: def.label, status: (isDone ? 'done' : 'optional') as GoldenPathStepStatus, optional: true };
    }
    if (isDone) {
      doneCount += 1;
      return { key: def.key, label: def.label, status: 'done' as GoldenPathStepStatus };
    }
    // 最初の未完了 必須ステップを current（次の一手）に。以降は todo。
    if (nextActionKey == null) {
      nextActionKey = def.key;
      nextActionLabel = def.label;
      return { key: def.key, label: def.label, status: 'current' as GoldenPathStepStatus };
    }
    return { key: def.key, label: def.label, status: 'todo' as GoldenPathStepStatus };
  });

  const marginPercent = eventProfitMargin(input.revenue, input.cost);
  const lowMarginWarning = input.revenue > 0 && marginPercent < GOLDEN_PATH_LOW_MARGIN_THRESHOLD;
  const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return {
    steps,
    doneCount,
    totalCount,
    percent,
    nextActionKey,
    nextActionLabel,
    marginPercent,
    lowMarginWarning,
    fullyCollected: input.invoiceStatus === 'PAID',
  };
}
