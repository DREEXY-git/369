'use client';

import { Button } from '@/components/ui';

/** ブラウザの印刷ダイアログを開く（「PDFで保存」で見積書PDFを出力）。印刷時は非表示。 */
export function PrintButton({ label = '印刷 / PDF保存' }: { label?: string }) {
  return (
    <Button type="button" className="print:hidden" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
