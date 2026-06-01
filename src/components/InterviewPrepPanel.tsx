"use client";

import React, { useState } from "react";
import {
  generateInterviewQuestions,
  DEFAULT_STAR,
  type InterviewQuestion,
  type StarAnswer,
} from "@/lib/interviewPrep";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Target,
  Zap,
  Save,
  Check,
} from "lucide-react";

const CATEGORY_ICONS = {
  behavioral: MessageSquare,
  technical: Zap,
  situational: Target,
  "role-specific": BookOpen,
};

const CATEGORY_COLORS = {
  behavioral: "text-violet-600 bg-violet-50 border-violet-200",
  technical: "text-blue-600 bg-blue-50 border-blue-200",
  situational: "text-amber-600 bg-amber-50 border-amber-200",
  "role-specific": "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export default function InterviewPrepPanel({
  jobDescription,
  roleTitle,
  resumeGaps,
  onClose,
}: {
  jobDescription: string;
  roleTitle: string;
  resumeGaps?: string[];
  onClose: () => void;
}) {
  const [questions] = useState<InterviewQuestion[]>(() =>
    generateInterviewQuestions({ jobDescription, roleTitle, resumeGaps })
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, StarAnswer>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function updateAnswer(qId: string, field: keyof StarAnswer, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        questionId: qId,
        [field]: value,
      },
    }));
  }

  function handleSave(qId: string) {
    setSavedIds((prev) => new Set(prev).add(qId));
    // In a real app, persist to backend
  }

  const answeredCount = Object.keys(answers).filter(
    (id) => answers[id].situation || answers[id].action
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Interview Prep</h3>
            <p className="text-indigo-100 text-sm mt-0.5">
              {questions.length} questions for {roleTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-indigo-200">
              {answeredCount}/{questions.length} prepared
            </span>
            <button
              onClick={onClose}
              className="text-indigo-200 hover:text-white text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-indigo-100">
        <div
          className="h-full bg-indigo-400 transition-all duration-500"
          style={{ width: `${(answeredCount / questions.length) * 100}%` }}
        />
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-100">
        {questions.map((q) => {
          const Icon = CATEGORY_ICONS[q.category];
          const isExpanded = expandedId === q.id;
          const isSaved = savedIds.has(q.id);
          const answer = answers[q.id];
          const starPrompt = q.starPrompt || DEFAULT_STAR;

          return (
            <div key={q.id} className="px-6">
              {/* Question row */}
              <button
                onClick={() => toggleExpand(q.id)}
                className="w-full flex items-start gap-3 py-4 text-left"
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg border flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[q.category]}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${CATEGORY_COLORS[q.category].split(" ")[0]}`}>
                      {q.category}
                    </span>
                    {isSaved && (
                      <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Prepared
                      </span>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                )}
              </button>

              {/* Expanded STAR builder */}
              {isExpanded && (
                <div className="pb-5">
                  {/* Why this question */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-4">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">{q.why}</p>
                  </div>

                  {/* STAR fields */}
                  <div className="space-y-3">
                    {(["situation", "task", "action", "result"] as const).map((field) => (
                      <div key={field}>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                            {field[0].toUpperCase()}
                          </span>
                          {field}
                        </label>
                        <p className="text-[11px] text-gray-400 mb-1.5">{starPrompt[field]}</p>
                        <textarea
                          value={answer?.[field] || ""}
                          onChange={(e) => updateAnswer(q.id, field, e.target.value)}
                          placeholder={`Your ${field}...`}
                          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSave(q.id)}
                    className={`mt-3 flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
                      isSaved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaved ? "Saved" : "Save answer"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
