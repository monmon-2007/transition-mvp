"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Task, PhaseId, Status } from "@/app/onboarding/layoff/shared/types";
import { PHASES } from "@/app/onboarding/layoff/shared/types";
import { GUIDED_ACTIONS, daysUntil } from "@/app/onboarding/layoff/shared/utils";
import { DeadlineBadge } from "./DeadlineBadge";
import { CheckCircle2, Circle, Clock, ChevronDown, ChevronUp, ArrowRight, StickyNote, AlertTriangle } from "lucide-react";

// Contextual runway lines for key tasks only
const RUNWAY_CONTEXT_LINES: Record<string, Record<"high" | "medium" | "stable", string | null>> = {
  "apply-first-batch": {
    high: "With limited runway, getting applications out now is your highest priority.",
    medium: "Consistent application flow will help you hit your timeline.",
    stable: "You have time to be selective — focus quality over volume.",
  },
  "networking-list": {
    high: "Warm introductions close faster than cold applications — this matters now.",
    medium: "Building your network now creates options over the next few months.",
    stable: "Networking while you have runway gives you access to unpublished opportunities.",
  },
  "master-resume": {
    high: "Get a strong version out quickly — you can refine it as you learn what works.",
    medium: "A polished master resume lets you move fast when opportunities arise.",
    stable: null,
  },
  "linkedin-update": {
    high: "Recruiters are your fastest path to interviews — make your profile ready this week.",
    medium: "Update LinkedIn while you have time to do it well.",
    stable: null,
  },
};

export function TaskCard({
  task,
  phaseConfig,
  onStatusChange,
  onAddNote,
  onNavigate,
  runwayRiskLevel,
}: {
  task: Task;
  phaseConfig: { border: string; badge: string; dot: string; label: string; description: string };
  onStatusChange: (s: Status) => void;
  onAddNote: (note: string) => void;
  onNavigate: (tab: string) => void;
  runwayRiskLevel?: "high" | "medium" | "stable";
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");

  const isDone = task.status === "Done";
  const isSkipped = task.status === "Skipped";
  const isInactive = isDone || isSkipped;

  const statusColors: Record<Status, string> = {
    "Not started": "text-gray-500 bg-gray-50 border-gray-200",
    "In progress": "text-amber-700 bg-amber-50 border-amber-200",
    "Done": "text-emerald-700 bg-emerald-50 border-emerald-200",
    "Skipped": "text-gray-400 bg-gray-50 border-gray-200",
  };

  const guidedActions = GUIDED_ACTIONS[task.id] || [];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl border-l-4 ${phaseConfig.border} transition-colors ${isInactive ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <button
            onClick={() => onStatusChange(isDone ? "Not started" : "Done")}
            className="mt-0.5 shrink-0 text-gray-300 hover:text-emerald-500 transition-colors"
            title={isDone ? "Mark not started" : "Mark done"}
          >
            {isDone
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <Circle className="w-5 h-5" />}
          </button>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <DeadlineBadge deadline={task.deadline} />
              {task.optional && (
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            <h4 className={`text-base font-semibold leading-snug ${isInactive ? "line-through text-gray-400" : "text-gray-900"}`}>
              {task.title}
            </h4>
            {task.estimatedTime && (
              <p className="text-xs text-gray-400 mt-1">{task.estimatedTime}</p>
            )}
            {/* Runway context line — shown only for key tasks when runway is known */}
            {!isInactive && runwayRiskLevel && RUNWAY_CONTEXT_LINES[task.id]?.[runwayRiskLevel] && (
              <p className="text-xs text-blue-600 mt-1.5 leading-snug">
                {RUNWAY_CONTEXT_LINES[task.id][runwayRiskLevel]}
              </p>
            )}
          </div>

          {/* Status dropdown */}
          <select
            value={task.status}
            onChange={(e) => onStatusChange(e.target.value as Status)}
            className={`text-xs font-medium border rounded-lg px-2 py-1.5 cursor-pointer shrink-0 ${statusColors[task.status]}`}
          >
            <option>Not started</option>
            <option>In progress</option>
            <option>Done</option>
            <option>Skipped</option>
          </select>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 ml-8 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 ml-8">
          {/* Explanation */}
          <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line mb-4">
            {task.explanation}
          </div>

          {/* Why */}
          <div className="text-sm text-gray-500 italic mb-4">
            <span className="font-medium not-italic text-gray-600">Why this matters: </span>
            {task.why}
          </div>

          {/* Guided actions */}
          {guidedActions.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Key steps</p>
              <div className="flex flex-col gap-2.5">
                {guidedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 ${action.href ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600"}`}>
                      {i + 1}
                    </div>
                    <div>
                      {/* Route link */}
                      {action.href ? (
                        <Link
                          href={action.href}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 leading-snug"
                        >
                          {action.label} <ArrowRight className="w-3 h-3 shrink-0" />
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-800 font-medium leading-snug">{action.label}</p>
                      )}
                      {action.note && <p className="text-xs text-gray-500 mt-0.5">{action.note}</p>}
                      {/* Tab navigation button */}
                      {!action.href && action.tab && (
                        <button
                          onClick={() => onNavigate(action.tab!)}
                          className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {action.tab === "resumes" ? "Open resume builder" : action.tab === "applications" ? "Open applications" : "Open network tracker"} <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing notes */}
          {task.notes && task.notes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
              <div className="flex flex-col gap-2">
                {task.notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-gray-700">{note.text}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{new Date(note.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add note */}
          {!showNoteInput ? (
            <button
              onClick={() => setShowNoteInput(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
              Add a note
            </button>
          ) : (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Track your progress, questions, or blockers..."
                className="w-full min-h-20 p-3 text-sm border border-gray-200 rounded-lg resize-y text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (noteText.trim()) { onAddNote(noteText.trim()); setNoteText(""); setShowNoteInput(false); }
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save note
                </button>
                <button
                  onClick={() => { setShowNoteInput(false); setNoteText(""); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskCard;
