"use client";

import React, { useState } from "react";
import {
  getLinkedInSuggestions,
  COMMON_SUBSCRIPTIONS,
  auditSubscriptions,
  getCareerPivots,
  PIVOT_MAP,
  type LinkedInSuggestion,
  type SubscriptionAudit,
} from "@/lib/linkedinOptimizer";
import { ROLE_CATEGORIES } from "@/lib/salaryIntelligence";
import { formatCurrency } from "@/lib/runway";
import {
  Linkedin,
  CreditCard,
  Compass,
  X,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type Tab = "linkedin" | "subscriptions" | "pivot";

export default function CareerToolsPanel({
  onClose,
  defaultRole,
  monthlyBurn,
}: {
  onClose: () => void;
  defaultRole?: string;
  monthlyBurn?: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("linkedin");

  const tabs: { id: Tab; label: string; icon: typeof Linkedin }[] = [
    { id: "linkedin", label: "LinkedIn", icon: Linkedin },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { id: "pivot", label: "Career Pivots", icon: Compass },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900">Career Tools</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === "linkedin" && <LinkedInTab />}
          {activeTab === "subscriptions" && <SubscriptionTab monthlyBurn={monthlyBurn} />}
          {activeTab === "pivot" && <PivotTab defaultRole={defaultRole} />}
        </div>
      </div>
    </div>
  );
}

// ── LinkedIn Tab ──

function LinkedInTab() {
  const suggestions = getLinkedInSuggestions({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  function toggleComplete(id: string) {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...suggestions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        {completedIds.size}/{suggestions.length} optimizations done.
        These changes can 5x your profile views.
      </p>

      <div className="space-y-3">
        {sorted.map((s) => {
          const isDone = completedIds.has(s.id);
          return (
            <div
              key={s.id}
              className={`border rounded-xl p-4 transition-all ${
                isDone ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(s.id)}
                  className={`flex items-center justify-center w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 transition-colors ${
                    isDone ? "bg-emerald-600 border-emerald-600" : "border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {isDone && <Check className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      {s.section}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      s.priority === "high" ? "text-red-500" : s.priority === "medium" ? "text-amber-500" : "text-gray-400"
                    }`}>
                      {s.priority}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${isDone ? "text-emerald-700 line-through" : "text-gray-900"}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.suggestion}</p>
                  {s.example && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Example</p>
                      <p className="text-xs text-gray-600 whitespace-pre-line">{s.example}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Subscription Tab ──

function SubscriptionTab({ monthlyBurn }: { monthlyBurn?: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [audit, setAudit] = useState<SubscriptionAudit | null>(null);

  function toggleSub(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAudit(null);
  }

  function handleAudit() {
    setAudit(auditSubscriptions(Array.from(selected), monthlyBurn));
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Select the subscriptions you currently have. We&apos;ll show you how much you could save and how it impacts your runway.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {COMMON_SUBSCRIPTIONS.map((sub, i) => {
          const id = String(i);
          const isSelected = selected.has(id);
          return (
            <button
              key={i}
              onClick={() => toggleSub(id)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                isSelected
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
              }`}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{sub.name}</p>
                <p className="text-[10px] text-gray-400">${sub.typicalCost}/mo</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleAudit}
        disabled={selected.size === 0}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-sm py-3 rounded-xl transition-colors"
      >
        Audit my subscriptions
      </button>

      {audit && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Monthly total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(audit.totalMonthly)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Annual total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(audit.totalAnnual)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-600">Potential savings</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(audit.potentialSavings)}/mo</p>
            </div>
          </div>

          {audit.runwayExtensionDays > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-emerald-700">
                Cutting non-essential subscriptions would extend your runway by{" "}
                <span className="font-bold">~{audit.runwayExtensionDays} days</span>.
              </p>
            </div>
          )}

          {audit.savingsItems.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Consider pausing:</p>
              <div className="flex flex-wrap gap-1.5">
                {audit.savingsItems.map((name) => (
                  <span key={name} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-gray-300 mt-3">
            LinkedIn Premium is marked essential — it&apos;s the one subscription worth keeping during job search.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Pivot Tab ──

function PivotTab({ defaultRole }: { defaultRole?: string }) {
  const [roleCategory, setRoleCategory] = useState(defaultRole || "software-engineer");
  const pivots = getCareerPivots(roleCategory);

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-700",
    moderate: "bg-amber-100 text-amber-700",
    stretch: "bg-red-100 text-red-700",
  };

  const availableCategories = Object.keys(PIVOT_MAP);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Explore adjacent roles that leverage your existing skills. These aren&apos;t downgrades — they&apos;re lateral moves that can open new doors.
      </p>

      <select
        value={roleCategory}
        onChange={(e) => setRoleCategory(e.target.value)}
        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
      >
        {ROLE_CATEGORIES.filter((r) => availableCategories.includes(r.id)).map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </select>

      {pivots.length === 0 ? (
        <div className="text-center py-8">
          <Compass className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No pivot suggestions for this role yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pivots.map((pivot, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-400">{pivot.fromRole}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-sm font-bold text-gray-900">{pivot.toRole}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColors[pivot.difficulty]}`}>
                  {pivot.difficulty}
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-3">{pivot.reasoning}</p>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                    You already have
                  </p>
                  {pivot.transferableSkills.map((s) => (
                    <div key={s} className="flex items-center gap-1 mb-0.5">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs text-gray-600">{s}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                    Skills to build
                  </p>
                  {pivot.gapSkills.map((s) => (
                    <div key={s} className="flex items-center gap-1 mb-0.5">
                      <ChevronRight className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-gray-600">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-gray-400">
                Estimated transition time: {pivot.timeEstimate}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
