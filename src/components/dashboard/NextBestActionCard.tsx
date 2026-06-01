import React from "react";
import { ArrowRight } from "lucide-react";
import type { NextBestAction } from "@/lib/jobSearchInsights";

export function NextBestActionCard({
  nba,
  onAction,
}: {
  nba: NextBestAction;
  onAction: (action: string) => void;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl px-6 py-5 text-white shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200 mb-2">
        Your next best move
      </p>
      <p className="text-[17px] font-semibold leading-snug mb-1">{nba.title}</p>
      <p className="text-sm text-blue-100 leading-relaxed mb-4">{nba.description}</p>
      {nba.action && (
        <button
          onClick={() => onAction(nba.action!.type)}
          className="inline-flex items-center gap-1.5 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {nba.action.label} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default NextBestActionCard;
