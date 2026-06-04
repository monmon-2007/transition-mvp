"use client";

import React from "react";
import type { TimelinePhase } from "@/app/onboarding/layoff/shared/types";

const PHASE_CONFIG: Record<TimelinePhase, { label: string; advice: string; color: string }> = {
  stabilize: {
    label: "Stabilize",
    advice: "Focus on severance, benefits, and finances",
    color: "from-red-500 to-orange-500",
  },
  prepare: {
    label: "Prepare",
    advice: "Get your resume ready and start networking",
    color: "from-violet-500 to-indigo-500",
  },
  execute: {
    label: "Execute",
    advice: "Apply aggressively, prep for interviews",
    color: "from-blue-500 to-cyan-500",
  },
  persist: {
    label: "Persist",
    advice: "Stay consistent. Refine based on what's working",
    color: "from-emerald-500 to-teal-500",
  },
};

const PHASES_ORDER: TimelinePhase[] = ["stabilize", "prepare", "execute", "persist"];

export default function TimelineBanner({
  weeksSinceLayoff,
  timelinePhase,
}: {
  weeksSinceLayoff: number;
  timelinePhase: TimelinePhase;
}) {
  const config = PHASE_CONFIG[timelinePhase];
  const activeIndex = PHASES_ORDER.indexOf(timelinePhase);

  // Progress percentage along 12-week timeline (capped at 12 for display)
  const progressPercent = Math.min(100, (weeksSinceLayoff / 12) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-semibold shadow-sm`}>
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            Week {weeksSinceLayoff || 1}
          </span>
          <span className="text-sm text-gray-600">{config.advice}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mt-2 mb-3">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all duration-700`}
            style={{ width: `${Math.max(progressPercent, 4)}%` }}
          />
        </div>
        {/* Marker dot with glow */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-400 shadow-md transition-all duration-700 animate-pulse-glow"
          style={{ left: `calc(${Math.max(progressPercent, 2)}% - 8px)` }}
        />
      </div>

      {/* Phase labels */}
      <div className="flex justify-between">
        {PHASES_ORDER.map((phase, i) => {
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <span
              key={phase}
              className={`text-xs font-medium transition-colors ${
                isActive
                  ? "text-gray-900"
                  : isPast
                  ? "text-gray-400"
                  : "text-gray-300"
              }`}
            >
              {PHASE_CONFIG[phase].label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
