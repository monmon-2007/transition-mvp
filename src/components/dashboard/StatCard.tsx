import React from "react";

export function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
      <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
        {sub && <span className="text-sm font-normal text-gray-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export default StatCard;
