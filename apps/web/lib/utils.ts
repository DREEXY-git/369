import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === 'object' && 'toNumber' in (value as any)
    ? (value as any).toNumber()
    : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
