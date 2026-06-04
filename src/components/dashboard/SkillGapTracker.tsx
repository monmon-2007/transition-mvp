"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Target, BookOpen, Check, Plus, X, ChevronDown, ChevronUp, Sparkles, TrendingUp, Loader2, RefreshCw } from "lucide-react";

type SkillEntry = {
  id: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  source: "resume" | "manual";
};

type GapEntry = {
  id: string;
  skill: string;
  importance: "required" | "preferred" | "nice-to-have";
  status: "gap" | "learning" | "acquired";
  resource?: string;
};

type TrendingSuggestion = {
  skill: string;
  category: "technical" | "tool" | "soft-skill" | "framework" | "methodology";
  demand: "high" | "medium";
  reason: string;
};

type CachedSuggestions = {
  suggestions: TrendingSuggestion[];
  generatedAt: string;
  role: string;
};

const STORAGE_KEY_SKILLS = "novapivots:skills";
const STORAGE_KEY_GAPS = "novapivots:skill-gaps";
const STORAGE_KEY_TRENDING = "novapivots:trending-skills";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default function SkillGapTracker({
  resumeSkills,
  targetJobSkills,
  targetRole,
}: {
  resumeSkills?: string[];
  targetJobSkills?: string[];
  targetRole?: string;
}) {
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [gaps, setGaps] = useState<GapEntry[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddGap, setShowAddGap] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", level: "intermediate" as SkillEntry["level"] });
  const [newGap, setNewGap] = useState({ skill: "", importance: "required" as GapEntry["importance"], resource: "" });
  const [expandedSection, setExpandedSection] = useState<"skills" | "gaps" | "trending" | null>("gaps");
  const [trendingSuggestions, setTrendingSuggestions] = useState<TrendingSuggestion[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingCachedAt, setTrendingCachedAt] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedSkills = localStorage.getItem(STORAGE_KEY_SKILLS);
      if (storedSkills) setSkills(JSON.parse(storedSkills));
      const storedGaps = localStorage.getItem(STORAGE_KEY_GAPS);
      if (storedGaps) setGaps(JSON.parse(storedGaps));
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SKILLS, JSON.stringify(skills));
  }, [skills]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GAPS, JSON.stringify(gaps));
  }, [gaps]);

  // Auto-populate from resume skills
  useEffect(() => {
    if (resumeSkills && resumeSkills.length > 0 && skills.length === 0) {
      setSkills(resumeSkills.map((s) => ({
        id: `resume-${s.toLowerCase().replace(/\s+/g, "-")}`,
        name: s,
        level: "intermediate",
        source: "resume" as const,
      })));
    }
  }, [resumeSkills]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect gaps from target job skills
  useEffect(() => {
    if (targetJobSkills && targetJobSkills.length > 0 && gaps.length === 0) {
      const mySkillNames = new Set(skills.map((s) => s.name.toLowerCase()));
      const detectedGaps = targetJobSkills
        .filter((s) => !mySkillNames.has(s.toLowerCase()))
        .map((s) => ({
          id: `gap-${s.toLowerCase().replace(/\s+/g, "-")}`,
          skill: s,
          importance: "required" as const,
          status: "gap" as const,
        }));
      if (detectedGaps.length > 0) setGaps(detectedGaps);
    }
  }, [targetJobSkills, skills]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load cached trending suggestions
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_TRENDING);
      if (cached) {
        const parsed: CachedSuggestions = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.generatedAt).getTime();
        if (age < TWO_WEEKS_MS && parsed.role === (targetRole || "")) {
          setTrendingSuggestions(parsed.suggestions);
          setTrendingCachedAt(parsed.generatedAt);
        }
      }
    } catch { /* ignore */ }
  }, [targetRole]);

  const fetchTrendingSuggestions = useCallback(async (force = false) => {
    const role = targetRole;
    if (!role) return;

    // Check cache unless forced
    if (!force) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY_TRENDING);
        if (cached) {
          const parsed: CachedSuggestions = JSON.parse(cached);
          const age = Date.now() - new Date(parsed.generatedAt).getTime();
          if (age < TWO_WEEKS_MS && parsed.role === role) return;
        }
      } catch { /* ignore */ }
    }

    setTrendingLoading(true);
    try {
      const res = await fetch("/api/skills/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          existingSkills: skills.map((s) => s.name),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTrendingSuggestions(data.suggestions);
        setTrendingCachedAt(data.generatedAt);
        localStorage.setItem(STORAGE_KEY_TRENDING, JSON.stringify({
          suggestions: data.suggestions,
          generatedAt: data.generatedAt,
          role,
        }));
      }
    } catch { /* ignore */ }
    setTrendingLoading(false);
  }, [targetRole, skills]);

  // Auto-fetch on mount if no cache
  useEffect(() => {
    if (targetRole && trendingSuggestions.length === 0 && !trendingLoading) {
      fetchTrendingSuggestions();
    }
  }, [targetRole]); // eslint-disable-line react-hooks/exhaustive-deps

  function addTrendingToGaps(suggestion: TrendingSuggestion) {
    const id = `gap-trending-${suggestion.skill.toLowerCase().replace(/\s+/g, "-")}`;
    if (gaps.some((g) => g.skill.toLowerCase() === suggestion.skill.toLowerCase())) return;
    setGaps((prev) => [...prev, {
      id,
      skill: suggestion.skill,
      importance: suggestion.demand === "high" ? "required" : "preferred",
      status: "gap",
    }]);
  }

  function trendingAge(): string {
    if (!trendingCachedAt) return "";
    const days = Math.floor((Date.now() - new Date(trendingCachedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Updated today";
    if (days === 1) return "Updated yesterday";
    return `Updated ${days}d ago`;
  }

  const gapStats = useMemo(() => ({
    total: gaps.length,
    learning: gaps.filter((g) => g.status === "learning").length,
    acquired: gaps.filter((g) => g.status === "acquired").length,
    remaining: gaps.filter((g) => g.status === "gap").length,
  }), [gaps]);

  const levelColors = {
    beginner: "bg-red-100 text-red-700 border-red-200",
    intermediate: "bg-amber-100 text-amber-700 border-amber-200",
    advanced: "bg-emerald-100 text-emerald-700 border-emerald-200",
    expert: "bg-violet-100 text-violet-700 border-violet-200",
  };

  const importanceColors = {
    required: "bg-red-100 text-red-700",
    preferred: "bg-amber-100 text-amber-700",
    "nice-to-have": "bg-gray-100 text-gray-600",
  };

  const statusColors = {
    gap: "text-red-600",
    learning: "text-amber-600",
    acquired: "text-emerald-600",
  };

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {gaps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-900">Skill Gap Progress</h4>
            <span className="text-xs text-gray-500">
              {gapStats.acquired}/{gapStats.total} skills acquired
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: gapStats.total > 0 ? `${(gapStats.acquired / gapStats.total) * 100}%` : "0%" }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" /> {gapStats.remaining} gaps
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> {gapStats.learning} learning
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" /> {gapStats.acquired} acquired
            </span>
          </div>
        </div>
      )}

      {/* Your Skills */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "skills" ? null : "skills")}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-900">Your Skills ({skills.length})</span>
          </div>
          {expandedSection === "skills" ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {expandedSection === "skills" && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 mt-3">
              {skills.map((skill) => (
                <div key={skill.id} className={`flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full ${levelColors[skill.level]}`}>
                  {skill.name}
                  <button
                    onClick={() => setSkills((prev) => prev.filter((s) => s.id !== skill.id))}
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {!showAddSkill && (
                <button
                  onClick={() => setShowAddSkill(true)}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium px-2.5 py-1 rounded-full border border-dashed border-violet-300 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add skill
                </button>
              )}
            </div>
            {showAddSkill && (
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="Skill name"
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as any })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  onClick={() => {
                    if (!newSkill.name.trim()) return;
                    setSkills((prev) => [...prev, { id: `manual-${Date.now()}`, name: newSkill.name, level: newSkill.level, source: "manual" }]);
                    setNewSkill({ name: "", level: "intermediate" });
                    setShowAddSkill(false);
                  }}
                  className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Add
                </button>
                <button onClick={() => setShowAddSkill(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skill Gaps */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === "gaps" ? null : "gaps")}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-900">Skills to Learn ({gapStats.remaining})</span>
          </div>
          {expandedSection === "gaps" ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {expandedSection === "gaps" && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {gaps.length === 0 ? (
              <p className="text-xs text-gray-400 mt-3">No skill gaps tracked yet. Add skills you need to learn for your target roles.</p>
            ) : (
              <div className="flex flex-col gap-2 mt-3">
                {gaps.map((gap) => (
                  <div key={gap.id} className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => {
                        const next = gap.status === "gap" ? "learning" : gap.status === "learning" ? "acquired" : "gap";
                        setGaps((prev) => prev.map((g) => g.id === gap.id ? { ...g, status: next as any } : g));
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        gap.status === "acquired" ? "bg-emerald-500 border-emerald-500 text-white"
                        : gap.status === "learning" ? "bg-amber-100 border-amber-400"
                        : "border-gray-300"
                      }`}
                    >
                      {gap.status === "acquired" && <Check className="w-3 h-3" />}
                      {gap.status === "learning" && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </button>
                    <span className={`font-medium flex-1 ${gap.status === "acquired" ? "line-through text-gray-400" : statusColors[gap.status]}`}>
                      {gap.skill}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${importanceColors[gap.importance]}`}>
                      {gap.importance}
                    </span>
                    {gap.resource && (
                      <a href={gap.resource} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate max-w-[120px]">
                        resource
                      </a>
                    )}
                    <button
                      onClick={() => setGaps((prev) => prev.filter((g) => g.id !== gap.id))}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!showAddGap ? (
              <button
                onClick={() => setShowAddGap(true)}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium mt-3 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add skill gap
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={newGap.skill}
                  onChange={(e) => setNewGap({ ...newGap, skill: e.target.value })}
                  placeholder="Skill name"
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <select
                  value={newGap.importance}
                  onChange={(e) => setNewGap({ ...newGap, importance: e.target.value as any })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                  <option value="nice-to-have">Nice to have</option>
                </select>
                <button
                  onClick={() => {
                    if (!newGap.skill.trim()) return;
                    setGaps((prev) => [...prev, { id: `gap-${Date.now()}`, skill: newGap.skill, importance: newGap.importance, status: "gap", resource: newGap.resource || undefined }]);
                    setNewGap({ skill: "", importance: "required", resource: "" });
                    setShowAddGap(false);
                  }}
                  className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Add
                </button>
                <button onClick={() => setShowAddGap(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trending Skills (AI-powered) */}
      {targetRole && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === "trending" ? null : "trending")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-gray-900">Trending Skills for {targetRole}</span>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full leading-none">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </div>
            {expandedSection === "trending" ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSection === "trending" && (
            <div className="px-4 pb-4 border-t border-gray-100">
              {trendingLoading ? (
                <div className="flex items-center gap-2 py-6 justify-center text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing market trends...
                </div>
              ) : trendingSuggestions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400 mb-3">Get AI-powered skill suggestions based on current market trends.</p>
                  <button
                    onClick={() => fetchTrendingSuggestions(true)}
                    className="text-xs bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" /> Generate suggestions
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mt-3 mb-3">
                    <span className="text-xs text-gray-400">{trendingAge()} &middot; Refreshes every 2 weeks</span>
                    <button
                      onClick={() => fetchTrendingSuggestions(true)}
                      disabled={trendingLoading}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {trendingSuggestions.map((s) => {
                      const alreadyTracked = gaps.some((g) => g.skill.toLowerCase() === s.skill.toLowerCase()) ||
                        skills.some((sk) => sk.name.toLowerCase() === s.skill.toLowerCase());
                      return (
                        <div key={s.skill} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-gray-900">{s.skill}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                s.demand === "high"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {s.demand === "high" ? "High demand" : "Growing"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
                                {s.category.replace("-", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{s.reason}</p>
                          </div>
                          {alreadyTracked ? (
                            <span className="text-xs text-emerald-600 font-medium shrink-0 mt-1">
                              <Check className="w-3.5 h-3.5 inline" /> Tracked
                            </span>
                          ) : (
                            <button
                              onClick={() => addTrendingToGaps(s)}
                              className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors shrink-0 mt-1 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Track
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
