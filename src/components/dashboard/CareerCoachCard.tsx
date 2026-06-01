"use client";

import React, { useState } from "react";
import {
  generateCoachingInsights,
  type CoachingInsight,
  type UserState,
} from "@/lib/careerCoach";
import {
  Brain,
  AlertTriangle,
  Target,
  Heart,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CATEGORY_CONFIG: Record<
  CoachingInsight["category"],
  { icon: typeof Brain; bg: string; border: string; text: string; accent: string }
> = {
  strategy: {
    icon: Target,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    accent: "text-blue-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-900",
    accent: "text-red-600",
  },
  encouragement: {
    icon: Heart,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    accent: "text-emerald-600",
  },
  action: {
    icon: Zap,
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-900",
    accent: "text-violet-600",
  },
};

export default function CareerCoachCard({ state }: { state: UserState }) {
  const insights = generateCoachingInsights(state);
  const [expandedId, setExpandedId] = useState<string | null>(
    insights.length > 0 ? insights[0].id : null
  );

  if (insights.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100">
          <Brain className="w-4 h-4 text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Your coach says</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => {
          const config = CATEGORY_CONFIG[insight.category];
          const Icon = config.icon;
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-full bg-white/80 flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${config.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${config.text}`}>
                    {insight.title}
                  </p>
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${config.accent} mt-0.5 inline-block`}>
                    {insight.category}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className={`w-4 h-4 ${config.accent} flex-shrink-0 mt-1`} />
                ) : (
                  <ChevronDown className={`w-4 h-4 ${config.accent} flex-shrink-0 mt-1`} />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 -mt-1">
                  <p className={`text-sm leading-relaxed ${config.text} opacity-80 pl-10`}>
                    {insight.body}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
