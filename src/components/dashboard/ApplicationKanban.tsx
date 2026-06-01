"use client";

import React, { useState } from "react";
import type { JobApplication } from "@/app/onboarding/layoff/shared/types";
import { Wand2 } from "lucide-react";

type ColumnId = "saved" | "applied" | "interviewing" | "offer" | "rejected";

const COLUMNS: { id: ColumnId; label: string; color: string; bg: string }[] = [
  { id: "saved", label: "Saved", color: "text-gray-600", bg: "bg-gray-50" },
  { id: "applied", label: "Applied", color: "text-blue-600", bg: "bg-blue-50" },
  { id: "interviewing", label: "Interview", color: "text-violet-600", bg: "bg-violet-50" },
  { id: "offer", label: "Offer", color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "rejected", label: "Rejected", color: "text-red-500", bg: "bg-red-50" },
];

export default function ApplicationKanban({
  applications,
  onUpdate,
}: {
  applications: JobApplication[];
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  function handleDrop(e: React.DragEvent, columnId: ColumnId) {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedId) {
      onUpdate(draggedId, { status: columnId });
      setDraggedId(null);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
      {COLUMNS.map((column) => {
        const columnApps = applications.filter((a) => a.status === column.id);
        const isOver = dragOverColumn === column.id;
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-56 rounded-xl border transition-colors ${
              isOver
                ? "border-violet-300 bg-violet-50/50"
                : "border-gray-200 bg-gray-50/50"
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-gray-200/60">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${column.color}`}>{column.label}</span>
                <span className="text-xs text-gray-400 font-medium">{columnApps.length}</span>
              </div>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {columnApps.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, app.id)}
                  className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${
                    draggedId === app.id ? "opacity-50" : ""
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900 truncate">{app.role}</p>
                  <p className="text-[11px] text-gray-500 truncate">{app.company}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {app.tailored && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
                        <Wand2 className="w-2 h-2" /> Tailored
                      </span>
                    )}
                    {app.dateApplied && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(app.dateApplied).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {columnApps.length === 0 && (
                <p className="text-[11px] text-gray-300 text-center py-4">Drop here</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
