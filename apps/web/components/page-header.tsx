import Link from 'next/link';

export function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href: string }[];
}) {
  return (
    <div className="mb-5">
      {breadcrumb ? (
        <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={b.href} className="flex items-center gap-1">
              {i > 0 ? <span>/</span> : null}
              <Link href={b.href} className="hover:underline">
                {b.label}
              </Link>
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
