import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Title row shared by every admin screen: heading + short description on the left, actions on the right. */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, description, actions }) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </header>
);

interface AdminStatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}

/** Bordered KPI strip used at the top of admin screens. */
export const AdminStatStrip: React.FC<{ stats: AdminStatProps[]; loading?: boolean }> = ({ stats, loading }) => (
  <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white lg:grid-cols-4">
    {stats.map((s, i) => (
      <div
        key={s.label}
        className={`px-5 py-4 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${
          i === 2 ? 'lg:border-l' : ''
        } border-neutral-200`}
      >
        <dt className="text-[13px] text-neutral-500">{s.label}</dt>
        <dd className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
          {loading ? <span className="block h-8 w-16 animate-pulse rounded bg-neutral-100" /> : s.value}
        </dd>
        {s.hint && <p className="mt-0.5 text-xs text-neutral-500">{s.hint}</p>}
      </div>
    ))}
  </dl>
);

/** White bordered panel with an optional title row. */
export const AdminPanel: React.FC<{
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}> = ({ title, action, children, className = '', bodyClassName = 'p-5' }) => (
  <section className={`overflow-hidden rounded-xl border border-neutral-200 bg-white ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5">
        {title && <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>}
        {action}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);
