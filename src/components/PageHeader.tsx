export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-6 animate-fade-up">
      <div>
        <div className="text-[11px] uppercase tracking-[0.35em] text-yellow-300 mb-2">Dashboard</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-300 mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
