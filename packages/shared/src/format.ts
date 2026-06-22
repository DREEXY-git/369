import type { AlertSeverity } from './types';

export function formatJpy(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return '¥0';
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function daysFromNow(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((date.getTime() - Date.now()) / 86_400_000);
}

export const SEVERITY_TONE: Record<AlertSeverity, string> = {
  INFO: 'slate',
  LOW: 'sky',
  MEDIUM: 'amber',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  INFO: '情報',
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '緊急',
};
