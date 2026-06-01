"use client";

import React, { useState } from "react";
import {
  estimateGriefStage,
  getDailyPrompt,
  getExercisesForContext,
  GRIEF_STAGES,
  WIN_CATEGORIES,
  type GriefStage,
  type Win,
  type MindfulnessExercise,
} from "@/lib/emotionalJourney";
import {
  Heart,
  PenLine,
  Trophy,
  Wind,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
} from "lucide-react";

const STAGE_COLORS: Record<GriefStage, { bg: string; border: string; text: string; dot: string }> = {
  shock:       { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-700",   dot: "bg-slate-400" },
  anger:       { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     dot: "bg-red-400" },
  bargaining:  { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-400" },
  sadness:     { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-400" },
  acceptance:  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400" },
};

type Tab = "stage" | "journal" | "wins" | "mindful";

export default function EmotionalJourneyCard({
  weeksSinceLayoff,
  daysSinceLayoff,
}: {
  weeksSinceLayoff: number;
  daysSinceLayoff: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("stage");
  const [expanded, setExpanded] = useState(true);
  const [wins, setWins] = useState<Win[]>([]);
  const [showAddWin, setShowAddWin] = useState(false);
  const [winText, setWinText] = useState("");
  const [winCategory, setWinCategory] = useState<Win["category"]>("personal");
  const [journalEntry, setJournalEntry] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const griefStage = estimateGriefStage(weeksSinceLayoff);
  const stageInfo = GRIEF_STAGES.find((s) => s.id === griefStage)!;
  const colors = STAGE_COLORS[griefStage];
  const dailyPrompt = getDailyPrompt(daysSinceLayoff, griefStage);
  const exercises = getExercisesForContext("general");

  function addWin() {
    if (!winText.trim()) return;
    const win: Win = {
      id: `win-${Date.now()}`,
      text: winText.trim(),
      date: new Date().toISOString(),
      category: winCategory,
    };
    setWins((prev) => [win, ...prev]);
    setWinText("");
    setShowAddWin(false);
  }

  function saveJournal() {
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 3000);
    // In a real app, persist to backend
  }

  const tabs: { id: Tab; label: string; icon: typeof Heart }[] = [
    { id: "stage", label: "Where you are", icon: Heart },
    { id: "journal", label: "Journal", icon: PenLine },
    { id: "wins", label: "Wins", icon: Trophy },
    { id: "mindful", label: "Breathe", icon: Wind },
  ];

  return (
    <section>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-4 w-full text-left"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-pink-100">
          <Heart className="w-4 h-4 text-pink-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 flex-1">How you're doing</h2>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-indigo-600 border-b-2 border-indigo-600"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {/* Stage tab */}
            {activeTab === "stage" && (
              <div>
                {/* Stage indicator */}
                <div className="flex items-center gap-3 mb-4">
                  {GRIEF_STAGES.map((s) => {
                    const c = STAGE_COLORS[s.id];
                    const isCurrent = s.id === griefStage;
                    return (
                      <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-3 h-3 rounded-full transition-all ${c.dot} ${
                            isCurrent ? "ring-2 ring-offset-2 ring-current scale-125" : "opacity-40"
                          }`}
                        />
                        <span className={`text-[9px] font-medium ${isCurrent ? c.text : "text-gray-300"}`}>
                          {s.label.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Current stage card */}
                <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mb-4`}>
                  <h4 className={`text-sm font-bold ${colors.text} mb-1`}>{stageInfo.label}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{stageInfo.description}</p>
                </div>

                {/* Normalizations */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">This is normal</p>
                  {stageInfo.normalizations.map((n, i) => (
                    <p key={i} className="text-sm text-gray-600 leading-relaxed pl-3 border-l-2 border-gray-200">
                      {n}
                    </p>
                  ))}
                </div>

                {/* Tips */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What might help</p>
                  {stageInfo.tips.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
                      <p className="text-sm text-gray-600">{t}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-gray-300 mt-4">
                  Everyone processes differently — these stages aren&apos;t linear or universal.
                </p>
              </div>
            )}

            {/* Journal tab */}
            {activeTab === "journal" && (
              <div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                    Today&apos;s prompt
                  </p>
                  <p className="text-sm font-medium text-indigo-900">{dailyPrompt.prompt}</p>
                </div>

                <textarea
                  value={journalEntry}
                  onChange={(e) => { setJournalEntry(e.target.value); setJournalSaved(false); }}
                  placeholder="Write freely. This stays private..."
                  className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />

                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-gray-300">Your journal entries stay on your device.</p>
                  <button
                    onClick={saveJournal}
                    disabled={!journalEntry.trim()}
                    className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
                      journalSaved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                    }`}
                  >
                    {journalSaved ? <Check className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
                    {journalSaved ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Wins tab */}
            {activeTab === "wins" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    {wins.length === 0
                      ? "Track your wins — big and small. They add up."
                      : `${wins.length} win${wins.length !== 1 ? "s" : ""} recorded`}
                  </p>
                  <button
                    onClick={() => setShowAddWin(true)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add win
                  </button>
                </div>

                {showAddWin && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <input
                      value={winText}
                      onChange={(e) => setWinText(e.target.value)}
                      placeholder="What went well today?"
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                    />
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {WIN_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setWinCategory(cat.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            winCategory === cat.id
                              ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {cat.emoji} {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addWin}
                        disabled={!winText.trim()}
                        className="text-xs font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                      >
                        Save win
                      </button>
                      <button
                        onClick={() => setShowAddWin(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Win list */}
                <div className="space-y-2">
                  {wins.map((win) => {
                    const cat = WIN_CATEGORIES.find((c) => c.id === win.category);
                    return (
                      <div
                        key={win.id}
                        className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5"
                      >
                        <span className="text-sm">{cat?.emoji || "⭐"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-emerald-900">{win.text}</p>
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            {new Date(win.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {wins.length === 0 && !showAddWin && (
                    <div className="text-center py-6">
                      <Trophy className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Your wins will show up here.</p>
                      <p className="text-xs text-gray-300 mt-1">
                        Applied to a job? Had a good conversation? That counts.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mindfulness tab */}
            {activeTab === "mindful" && (
              <div className="space-y-3">
                {exercises.length === 0 && (
                  <p className="text-sm text-gray-400">No exercises available.</p>
                )}
                {GRIEF_STAGES.length > 0 &&
                  [...getExercisesForContext("general"), ...getExercisesForContext("anxiety"), ...getExercisesForContext("pre-interview"), ...getExercisesForContext("motivation")]
                    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
                    .map((exercise) => {
                      const isOpen = exerciseId === exercise.id;
                      return (
                        <div
                          key={exercise.id}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setExerciseId(isOpen ? null : exercise.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{exercise.title}</p>
                              <p className="text-xs text-gray-400">{exercise.duration}</p>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 space-y-2">
                              {exercise.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
