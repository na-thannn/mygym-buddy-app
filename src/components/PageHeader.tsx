export function PageHeader({
  title,
  subtitle,
  description,
  action,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-50 md:text-3xl">{title}</h1>
        {(subtitle ?? description) && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
            {subtitle ?? description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
