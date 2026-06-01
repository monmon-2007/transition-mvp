import { daysUntil } from "@/app/onboarding/layoff/shared/utils";
import { AlertTriangle, Clock } from "lucide-react";

export function DeadlineBadge({ deadline }: { deadline: string | undefined }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days === null) return null;

  const isOverdue = days < 0;
  const isCritical = days >= 0 && days <= 7;
  const isWarning = days > 7 && days <= 30;

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Overdue
      </span>
    );
  }
  if (isCritical) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> {days === 0 ? "Due today" : `${days}d`}
      </span>
    );
  }
  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> {new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}

export default DeadlineBadge;
