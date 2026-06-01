"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, X } from "lucide-react";
import type { AvailabilitySlot } from "./CalendarView";

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function mergeAdjacentSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const merged: AvailabilitySlot[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].startTime === last.endTime) {
      last.endTime = sorted[i].endTime;
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

export default function AvailabilityGenerator({
  slots,
  onClose,
}: {
  slots: AvailabilitySlot[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const generatedMessage = useMemo(() => {
    // Group by date
    const byDate: Record<string, AvailabilitySlot[]> = {};
    slots.forEach((s) => {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    });

    const sortedDates = Object.keys(byDate).sort();
    const lines = sortedDates.map((date) => {
      const merged = mergeAdjacentSlots(byDate[date]);
      const times = merged
        .map((s) => `${formatTime12(s.startTime)} - ${formatTime12(s.endTime)}`)
        .join(", ");
      return `- ${formatDateLong(date)}: ${times}`;
    });

    return [
      "Thank you for reaching out! I'm available at the following times:",
      "",
      ...lines,
      "",
      "Please let me know which time works best for you.",
      "I'm flexible and happy to adjust if needed.",
    ].join("\n");
  }, [slots]);

  const [messageText, setMessageText] = useState(generatedMessage);

  function handleCopy() {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Availability Message</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Edit the message below, then copy and send it to the recruiter.
      </p>
      <textarea
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-lg p-3 resize-none h-48 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        spellCheck
      />
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            copied
              ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              : "bg-cyan-600 hover:bg-cyan-700 text-white"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" /> Copy to clipboard
            </>
          )}
        </button>
        <button
          onClick={() => setMessageText(generatedMessage)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Reset to original
        </button>
      </div>
    </div>
  );
}
