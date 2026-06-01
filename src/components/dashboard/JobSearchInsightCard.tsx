import React from "react";
import type { Insight } from "@/lib/jobSearchInsights";

export function JobSearchInsightCard({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (action: string) => void;
}) {
  const severityStyle = {
    high: "border-l-red-400 bg-red-50",
    medium: "border-l-amber-400 bg-amber-50",
    low: "border-l-gray-300 bg-gray-50",
  }[insight.severity];

  const titleColor = {
    high: "text-red-800",
    medium: "text-amber-800",
    low: "text-gray-700",
  }[insight.severity];

  const descColor = {
    high: "text-red-700",
    medium: "text-amber-700",
    low: "text-gray-600",
  }[insight.severity];

  const actionStyle = {
    high: "border-red-200 text-red-700 hover:bg-red-100",
    medium: "border-amber-200 text-amber-700 hover:bg-amber-100",
    low: "border-gray-200 text-gray-600 hover:bg-gray-100",
  }[insight.severity];

  return (
    <div className={`border border-gray-200 border-l-4 rounded-xl px-5 py-4 ${severityStyle}`}>
      <p className={`text-sm font-semibold mb-1 ${titleColor}`}>{insight.title}</p>
      <p className={`text-sm leading-relaxed ${descColor}`}>{insight.description}</p>
      {insight.recommendation && (
        <p className="text-xs text-gray-500 mt-2 italic">{insight.recommendation}</p>
      )}
      {onAction && insight.actions && insight.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {insight.actions.map((a) => (
            <button
              key={a.action}
              onClick={() => onAction(a.action)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border bg-white/60 transition-colors ${actionStyle}`}
            >
              {a.label} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default JobSearchInsightCard;
