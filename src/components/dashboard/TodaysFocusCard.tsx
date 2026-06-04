"use client";

import React from "react";
import Link from "next/link";
import type { DailyFocus } from "@/lib/dailyFocus";
import { Target, ArrowRight, AlertCircle, Lightbulb, Rocket } from "lucide-react";

const CATEGORY_CONFIG = {
  urgent: {
    bg: "bg-gradient-to-r from-red-50 to-orange-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    icon: AlertCircle,
    label: "Priority",
    labelColor: "text-red-600",
  },
  important: {
    bg: "bg-gradient-to-r from-violet-50 to-indigo-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    icon: Target,
    label: "Today's Focus",
    labelColor: "text-violet-600",
  },
  growth: {
    bg: "bg-gradient-to-r from-emerald-50 to-teal-50",
    border: "border-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    icon: Rocket,
    label: "Growth",
    labelColor: "text-emerald-600",
  },
};

export default function TodaysFocusCard({ focus }: { focus: DailyFocus }) {
  const config = CATEGORY_CONFIG[focus.category];
  const Icon = config.icon;

  const content = (
    <div className={`group ${config.bg} ${config.border} border rounded-2xl p-5 transition-all duration-300 hover:shadow-lg animate-fade-in-up`}>
      <div className="flex items-start gap-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${config.iconBg} ${config.iconColor} flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${config.labelColor}`}>
              {config.label}
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ color: 'inherit' }} />
          </div>
          <h3 className="font-bold text-gray-900 text-base mb-1">{focus.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{focus.description}</p>
        </div>
        {focus.href && (
          <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-all duration-300 group-hover:text-violet-500 group-hover:translate-x-1" />
        )}
      </div>
    </div>
  );

  if (focus.href) {
    return <Link href={focus.href}>{content}</Link>;
  }
  return content;
}
