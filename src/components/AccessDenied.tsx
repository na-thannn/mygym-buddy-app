import { ShieldAlert } from "lucide-react";

export function AccessDenied({
  title = "Access required",
  message = "You do not have permission to view this page.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl p-6 text-center">
      <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-8">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-primary">
          <ShieldAlert className="size-6" />
        </div>
        <div className="text-lg font-semibold text-slate-100">{title}</div>
        <p className="text-sm text-slate-400 mt-2">{message}</p>
      </div>
    </div>
  );
}
