"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  Coffee,
  Briefcase,
  MoreHorizontal,
  Copy,
  Info,
} from "lucide-react";
import type { InterviewEvent } from "@/app/onboarding/layoff/calendar/page";
import AvailabilityGenerator from "./AvailabilityGenerator";

// ── Types ──

export type BlockType = "interview-prep" | "study" | "relax" | "other";

export interface ScheduleBlock {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: BlockType;
  title: string;
  linkedApplicationId?: string;
}

export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

// ── Constants ──

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am–8pm
const BLOCK_COLORS: Record<BlockType, { bg: string; border: string; text: string }> = {
  "interview-prep": { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  study: { bg: "bg-indigo-100", border: "border-indigo-300", text: "text-indigo-800" },
  relax: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  other: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700" },
};
const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  "interview-prep": Briefcase,
  study: BookOpen,
  relax: Coffee,
  other: MoreHorizontal,
};

const STORAGE_KEY_BLOCKS = "novapivots:calendar:blocks";
const STORAGE_KEY_AVAIL = "novapivots:calendar:availability";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ── Component ──

export default function CalendarView({ interviewEvents }: { interviewEvents: InterviewEvent[] }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [mode, setMode] = useState<"schedule" | "availability">("schedule");
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [availSlots, setAvailSlots] = useState<AvailabilitySlot[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [showAvailGen, setShowAvailGen] = useState(false);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formType, setFormType] = useState<BlockType>("study");
  const [formTitle, setFormTitle] = useState("");
  const [formError, setFormError] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BLOCKS);
      if (stored) setBlocks(JSON.parse(stored));
    } catch {}
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AVAIL);
      if (stored) setAvailSlots(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist blocks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BLOCKS, JSON.stringify(blocks));
  }, [blocks]);

  // Persist availability
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AVAIL, JSON.stringify(availSlots));
  }, [availSlots]);

  // Week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const today = formatDate(new Date());

  // Navigation
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => setWeekStart(getMonday(new Date()));

  // Check if two time ranges overlap (times as "HH:mm" strings on the same date)
  function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  function findCollision(date: string, startTime: string, endTime: string, excludeBlockId?: string): string | null {
    // Check against existing schedule blocks
    for (const b of blocks) {
      if (b.date !== date) continue;
      if (excludeBlockId && b.id === excludeBlockId) continue;
      if (timesOverlap(startTime, endTime, b.startTime, b.endTime)) {
        return `Conflicts with "${b.title}" (${b.startTime}–${b.endTime})`;
      }
    }
    // Check against interview events
    for (const ev of interviewEvents) {
      const evDate = formatDate(new Date(ev.date));
      if (evDate !== date) continue;
      const evHour = new Date(ev.date).getHours();
      const evStart = `${String(evHour).padStart(2, "0")}:00`;
      const evEnd = `${String(evHour + 1).padStart(2, "0")}:00`;
      if (timesOverlap(startTime, endTime, evStart, evEnd)) {
        return `Conflicts with interview at ${ev.company} (${evStart}–${evEnd})`;
      }
    }
    return null;
  }

  // CRUD for schedule blocks
  function openAddForm(date?: string, hour?: number) {
    setFormDate(date || formatDate(weekDays[0]));
    setFormStart(hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : "09:00");
    setFormEnd(hour !== undefined ? `${String(hour + 1).padStart(2, "0")}:00` : "10:00");
    setFormType("study");
    setFormTitle("");
    setFormError("");
    setEditingBlock(null);
    setShowAddForm(true);
  }

  function openEditForm(block: ScheduleBlock) {
    setFormDate(block.date);
    setFormStart(block.startTime);
    setFormEnd(block.endTime);
    setFormType(block.type);
    setFormTitle(block.title);
    setFormError("");
    setEditingBlock(block);
    setShowAddForm(true);
  }

  function saveBlock() {
    if (!formDate || !formTitle.trim()) return;
    if (formStart >= formEnd) {
      setFormError("End time must be after start time.");
      return;
    }
    const collision = findCollision(formDate, formStart, formEnd, editingBlock?.id);
    if (collision) {
      setFormError(collision);
      return;
    }
    if (editingBlock) {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === editingBlock.id
            ? { ...b, date: formDate, startTime: formStart, endTime: formEnd, type: formType, title: formTitle.trim() }
            : b
        )
      );
    } else {
      const newBlock: ScheduleBlock = {
        id: crypto.randomUUID(),
        date: formDate,
        startTime: formStart,
        endTime: formEnd,
        type: formType,
        title: formTitle.trim(),
      };
      setBlocks((prev) => [...prev, newBlock]);
    }
    setShowAddForm(false);
    setEditingBlock(null);
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  // Availability toggle
  function toggleAvailSlot(date: string, hour: number) {
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
    const existing = availSlots.findIndex(
      (s) => s.date === date && s.startTime === startTime
    );
    if (existing >= 0) {
      setAvailSlots((prev) => prev.filter((_, i) => i !== existing));
    } else {
      setAvailSlots((prev) => [...prev, { date, startTime, endTime }]);
    }
  }

  function isAvailSlot(date: string, hour: number): boolean {
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    return availSlots.some((s) => s.date === date && s.startTime === startTime);
  }

  // Get events for a specific day and hour
  const getBlocksForSlot = useCallback(
    (date: string, hour: number) => {
      return blocks.filter((b) => {
        if (b.date !== date) return false;
        const bStart = parseInt(b.startTime.split(":")[0]);
        const bEnd = parseInt(b.endTime.split(":")[0]);
        return hour >= bStart && hour < bEnd;
      });
    },
    [blocks]
  );

  const getInterviewsForSlot = useCallback(
    (date: string, hour: number) => {
      return interviewEvents.filter((e) => {
        const d = new Date(e.date);
        return formatDate(d) === date && d.getHours() === hour;
      });
    },
    [interviewEvents]
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setMode("schedule")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "schedule" ? "bg-cyan-50 text-cyan-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Schedule
            </button>
            <button
              onClick={() => setMode("availability")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === "availability" ? "bg-cyan-50 text-cyan-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Availability
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "schedule" && (
            <button
              onClick={() => openAddForm()}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Block
            </button>
          )}
          {mode === "availability" && availSlots.length > 0 && (
            <button
              onClick={() => setShowAvailGen(true)}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" /> Generate Message
            </button>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="text-sm font-medium text-gray-700">
          {weekDays[0].toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Availability mode hint */}
      {mode === "availability" && (
        <div className="mb-3 bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-2.5 text-xs text-cyan-700">
          Click time slots to mark your availability. Then generate a message to send to recruiters.
          {availSlots.length > 0 && (
            <span className="ml-2 font-semibold">{availSlots.length} slot{availSlots.length !== 1 ? "s" : ""} selected</span>
          )}
        </div>
      )}

      {/* localStorage notice */}
      {blocks.length === 0 && availSlots.length === 0 && interviewEvents.length === 0 && (
        <div className="mb-4 bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <Calendar className="w-8 h-8 text-cyan-400 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Your calendar is empty</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-4">
            Schedule interview prep, study sessions, and mark your availability for recruiters.
          </p>
          <button
            onClick={() => openAddForm()}
            className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add your first block
          </button>
        </div>
      )}

      {(blocks.length > 0 || availSlots.length > 0) && (
        <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>Schedule data is saved locally on this device. It won&apos;t sync across devices or survive cache clears.</span>
        </div>
      )}

      {/* Weekly grid */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-8 min-w-[640px] border-b border-gray-200">
          <div className="p-2 text-xs text-gray-400 text-center border-r border-gray-100" />
          {weekDays.map((d) => {
            const dateStr = formatDate(d);
            const isToday = dateStr === today;
            return (
              <div
                key={dateStr}
                className={`p-2 text-center border-r border-gray-100 last:border-r-0 ${
                  isToday ? "bg-cyan-50" : ""
                }`}
              >
                <div className={`text-xs font-medium ${isToday ? "text-cyan-700" : "text-gray-600"}`}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    isToday
                      ? "bg-cyan-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                      : "text-gray-900"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 min-w-[640px] border-b border-gray-100 last:border-b-0 min-h-[52px]">
              {/* Time label */}
              <div className="p-1.5 text-[11px] text-gray-400 text-right pr-2 border-r border-gray-100 flex items-start justify-end pt-1">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>

              {/* Day cells */}
              {weekDays.map((d) => {
                const dateStr = formatDate(d);
                const isToday = dateStr === today;
                const slotBlocks = getBlocksForSlot(dateStr, hour);
                const slotInterviews = getInterviewsForSlot(dateStr, hour);
                const isAvail = isAvailSlot(dateStr, hour);

                return (
                  <div
                    key={`${dateStr}-${hour}`}
                    onClick={() => {
                      if (mode === "availability") {
                        toggleAvailSlot(dateStr, hour);
                      } else if (slotBlocks.length === 0 && slotInterviews.length === 0) {
                        openAddForm(dateStr, hour);
                      }
                    }}
                    className={`border-r border-gray-100 last:border-r-0 p-0.5 cursor-pointer transition-colors relative ${
                      isToday ? "bg-cyan-50/30" : ""
                    } ${
                      mode === "availability" && isAvail
                        ? "bg-cyan-100 ring-1 ring-inset ring-cyan-300"
                        : mode === "schedule" && slotBlocks.length === 0 && slotInterviews.length === 0
                        ? "hover:bg-gray-50"
                        : ""
                    }`}
                  >
                    {/* Interview events (non-editable) */}
                    {slotInterviews.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-violet-100 border border-violet-300 rounded px-1.5 py-0.5 mb-0.5"
                      >
                        <div className="text-[10px] font-semibold text-violet-800 truncate">
                          {ev.company}
                        </div>
                        <div className="text-[9px] text-violet-600 truncate">{ev.role}</div>
                      </div>
                    ))}

                    {/* Schedule blocks */}
                    {slotBlocks
                      .filter((b) => parseInt(b.startTime.split(":")[0]) === hour)
                      .map((block) => {
                        const colors = BLOCK_COLORS[block.type];
                        const Icon = BLOCK_ICONS[block.type];
                        return (
                          <div
                            key={block.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (mode === "schedule") openEditForm(block);
                            }}
                            className={`${colors.bg} border ${colors.border} rounded px-1.5 py-0.5 mb-0.5 group relative`}
                          >
                            <div className={`text-[10px] font-semibold ${colors.text} truncate flex items-center gap-0.5`}>
                              <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                              {block.title}
                            </div>
                            <div className="text-[9px] text-gray-500">
                              {block.startTime}–{block.endTime}
                            </div>
                            {mode === "schedule" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlock(block.id);
                                }}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-violet-100 border border-violet-300" />
          Interview
        </div>
        {(Object.entries(BLOCK_COLORS) as [BlockType, typeof BLOCK_COLORS[BlockType]][]).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`} />
            {type === "interview-prep" ? "Prep" : type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
        {mode === "availability" && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-100 ring-1 ring-cyan-300" />
            Available
          </div>
        )}
      </div>

      {/* Add/Edit block form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={editingBlock ? "Edit schedule block" : "Add schedule block"} onClick={() => setShowAddForm(false)} onKeyDown={(e) => { if (e.key === "Escape") setShowAddForm(false); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {editingBlock ? "Edit Block" : "Add Schedule Block"}
            </h3>
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Study system design"
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as BlockType)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="interview-prep">Interview Prep</option>
                  <option value="study">Study</option>
                  <option value="relax">Relax</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => { setFormDate(e.target.value); setFormError(""); }}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => { setFormStart(e.target.value); setFormError(""); }}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => { setFormEnd(e.target.value); setFormError(""); }}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={saveBlock}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {editingBlock ? "Save Changes" : "Add Block"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability generator modal */}
      {showAvailGen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Availability message" onClick={() => setShowAvailGen(false)} onKeyDown={(e) => { if (e.key === "Escape") setShowAvailGen(false); }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <AvailabilityGenerator slots={availSlots} onClose={() => setShowAvailGen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
