import * as React from 'react';
import { cn } from '@/lib/utils';

// ---- Card ----
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4 pb-2', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm font-semibold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-2', className)} {...props} />;
}

// ---- Badge ----
const TONE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  primary: 'bg-accent text-accent-foreground ring-transparent',
};
export function Badge({
  tone = 'slate',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONE[tone] ?? TONE.slate,
        className,
      )}
      {...props}
    />
  );
}

// ---- Button ----
const BTN: Record<string, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted active:scale-[0.98]',
  outline: 'border border-input bg-card hover:bg-secondary active:scale-[0.98]',
  ghost: 'hover:bg-secondary active:scale-[0.98]',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[0.98]',
};
const BTN_SIZE: Record<string, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN;
  size?: keyof typeof BTN_SIZE;
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        BTN_SIZE[size],
        BTN[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---- Table ----
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-border bg-secondary/40 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-border/60 px-3 py-2.5 align-middle', className)} {...props} />
  );
}

// ---- Input ----
const FIELD =
  'w-full rounded-md border border-input bg-card text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD, 'h-9 px-3 py-1', className)} {...props} />;
  },
);

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'px-3 py-2', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD, 'h-9 px-2', className)} {...props} />;
}

// ---- Stat (KPIカード) ----
const STAT_SUB_TONE: Record<string, string> = {
  slate: 'text-muted-foreground',
  green: 'text-emerald-600',
  emerald: 'text-emerald-600',
  red: 'text-red-600',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
  sky: 'text-sky-600',
  purple: 'text-purple-600',
};
const STAT_ICON_TONE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600',
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  sky: 'bg-sky-100 text-sky-600',
  purple: 'bg-purple-100 text-purple-600',
  primary: 'bg-accent text-accent-foreground',
};
export function Stat({
  label,
  value,
  sub,
  tone = 'slate',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-4 transition-shadow hover:shadow-card-hover">
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
        {sub ? (
          <div className={cn('mt-1 text-xs font-medium', STAT_SUB_TONE[tone] ?? STAT_SUB_TONE.slate)}>
            {sub}
          </div>
        ) : null}
      </div>
      {icon ? (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-5 [&>svg]:w-5',
            STAT_ICON_TONE[tone] ?? STAT_ICON_TONE.slate,
          )}
        >
          {icon}
        </span>
      ) : null}
    </Card>
  );
}

// ---- Empty / Section ----
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-secondary/30 py-12 text-center">
      <div className="text-sm font-medium text-foreground/70">{title}</div>
      {hint ? <div className="max-w-sm text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
