"use client";

import React, { useState } from "react";
import {
  WRONGFUL_TERM_QUESTIONS,
  assessWrongfulTermination,
  getNonCompeteInfo,
  calculatePTOPayout,
  checkWARNAct,
  type WrongfulTermAssessment,
  type PTOPayoutResult,
  type WARNResult,
} from "@/lib/legalRights";
import { formatCurrency } from "@/lib/runway";
import {
  Scale,
  X,
  AlertTriangle,
  Shield,
  DollarSign,
  Building,
  ChevronRight,
  Check,
} from "lucide-react";

type Tool = "wrongful" | "noncompete" | "pto" | "warn";

export default function LegalRightsPanel({ onClose }: { onClose: () => void }) {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);

  const tools: { id: Tool; label: string; description: string; icon: typeof Scale }[] = [
    { id: "wrongful", label: "Wrongful Termination Check", description: "Red-flag questionnaire to assess if your termination may be unlawful.", icon: AlertTriangle },
    { id: "noncompete", label: "Non-Compete Enforceability", description: "See how enforceable your non-compete is in your state.", icon: Shield },
    { id: "pto", label: "PTO Payout Calculator", description: "Calculate what you're owed for unused PTO.", icon: DollarSign },
    { id: "warn", label: "WARN Act Checker", description: "Check if your employer violated the WARN Act notice requirements.", icon: Building },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900">
              {activeTool ? tools.find((t) => t.id === activeTool)?.label : "Know Your Rights"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeTool && (
              <button
                onClick={() => setActiveTool(null)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {!activeTool && (
            <>
              <p className="text-sm text-gray-500 mb-5">
                These tools provide general information to help you understand your rights.
                They are not legal advice. Consult an employment attorney for your specific situation.
              </p>
              <div className="space-y-3">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-left group"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{tool.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeTool === "wrongful" && <WrongfulTermTool />}
          {activeTool === "noncompete" && <NonCompeteTool />}
          {activeTool === "pto" && <PTOTool />}
          {activeTool === "warn" && <WARNTool />}
        </div>
      </div>
    </div>
  );
}

// ── Wrongful Termination Tool ──

function WrongfulTermTool() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<WrongfulTermAssessment | null>(null);

  function toggle(id: string) {
    setAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
    setResult(null);
  }

  function handleAssess() {
    const yesIds = Object.entries(answers).filter(([, v]) => v).map(([k]) => k);
    setResult(assessWrongfulTermination(yesIds));
  }

  const levelColors = {
    low: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    moderate: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Answer these questions about your termination. This helps identify potential legal red flags.
      </p>

      <div className="space-y-3 mb-6">
        {WRONGFUL_TERM_QUESTIONS.map((q) => (
          <button
            key={q.id}
            onClick={() => toggle(q.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              answers[q.id]
                ? "border-indigo-300 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`flex items-center justify-center w-5 h-5 rounded-md border flex-shrink-0 mt-0.5 ${
              answers[q.id] ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
            }`}>
              {answers[q.id] && <Check className="w-3 h-3 text-white" />}
            </div>
            <div>
              <p className="text-sm text-gray-900">{q.question}</p>
              <p className="text-xs text-gray-400 mt-0.5">{q.explanation}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleAssess}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-3 rounded-xl transition-colors"
      >
        Assess my situation
      </button>

      {result && (
        <div className={`mt-4 ${levelColors[result.level].bg} ${levelColors[result.level].border} border rounded-xl p-5`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-bold uppercase ${levelColors[result.level].text}`}>
              {result.level} concern
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{result.recommendation}</p>
        </div>
      )}

      <p className="text-[10px] text-gray-300 mt-4 text-center">
        This is informational only — not legal advice. Consult an attorney for your specific situation.
      </p>
    </div>
  );
}

// ── Non-Compete Tool ──

function NonCompeteTool() {
  const [state, setState] = useState("");
  const info = state ? getNonCompeteInfo(state) : null;

  const enfColors = {
    banned: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Banned" },
    "very-limited": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Very Limited" },
    limited: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Limited" },
    enforceable: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "Enforceable" },
    "strongly-enforceable": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Strongly Enforceable" },
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Select your state to see how enforceable non-compete agreements are.
      </p>
      <select
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
      >
        <option value="">Select your state...</option>
        {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
          .map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {info && (
        <div>
          <div className={`${enfColors[info.enforceability].bg} ${enfColors[info.enforceability].border} border rounded-xl p-4 mb-4`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${enfColors[info.enforceability].text}`}>
              {enfColors[info.enforceability].label}
            </span>
            <p className="text-sm text-gray-700 mt-1">{info.summary}</p>
          </div>

          <div className="space-y-2">
            {info.keyFacts.map((fact, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">{fact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-300 mt-4 text-center">
        State laws change. This reflects information as of early 2025.
      </p>
    </div>
  );
}

// ── PTO Tool ──

function PTOTool() {
  const [salary, setSalary] = useState("");
  const [days, setDays] = useState("");
  const [state, setState] = useState("");
  const [result, setResult] = useState<PTOPayoutResult | null>(null);

  function handleCalc() {
    const sal = parseFloat(salary.replace(/[$,\s]/g, ""));
    const d = parseFloat(days);
    if (isNaN(sal) || isNaN(d) || !state) return;
    setResult(calculatePTOPayout(sal, d, state));
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Calculate what you&apos;re owed for unused PTO based on your salary and state.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Annual salary</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={salary}
              onChange={(e) => { setSalary(e.target.value); setResult(null); }}
              placeholder="120,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Unused PTO days</label>
          <input
            type="text"
            inputMode="numeric"
            value={days}
            onChange={(e) => { setDays(e.target.value); setResult(null); }}
            placeholder="12"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">State</label>
          <select
            value={state}
            onChange={(e) => { setState(e.target.value); setResult(null); }}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select...</option>
            {["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]
              .map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <button
        onClick={handleCalc}
        disabled={!salary || !days || !state}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-sm py-3 rounded-xl transition-colors"
      >
        Calculate payout
      </button>

      {result && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Daily rate</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(result.dailyRate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total PTO payout</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(result.totalPayout)}</p>
            </div>
          </div>
          <div className={`rounded-lg p-3 ${result.isRequired ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <p className={`text-xs font-semibold mb-0.5 ${result.isRequired ? "text-emerald-700" : "text-amber-700"}`}>
              {result.isRequired ? "Payout required by law" : "Not required by state law"}
            </p>
            <p className="text-xs text-gray-600">{result.stateNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WARN Act Tool ──

function WARNTool() {
  const [companySize, setCompanySize] = useState("");
  const [layoffCount, setLayoffCount] = useState("");
  const [noticeDays, setNoticeDays] = useState("");
  const [result, setResult] = useState<WARNResult | null>(null);

  function handleCheck() {
    const cs = parseInt(companySize);
    const lc = parseInt(layoffCount);
    const nd = parseInt(noticeDays);
    if (isNaN(cs) || isNaN(lc) || isNaN(nd)) return;
    setResult(checkWARNAct(cs, lc, nd));
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        The WARN Act requires employers to give 60 days notice before mass layoffs. Check if it applies to your situation.
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Approximate company size (employees)</label>
          <input
            type="text"
            inputMode="numeric"
            value={companySize}
            onChange={(e) => { setCompanySize(e.target.value); setResult(null); }}
            placeholder="500"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">How many people were laid off? (estimate)</label>
          <input
            type="text"
            inputMode="numeric"
            value={layoffCount}
            onChange={(e) => { setLayoffCount(e.target.value); setResult(null); }}
            placeholder="100"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">How many days notice did you receive?</label>
          <input
            type="text"
            inputMode="numeric"
            value={noticeDays}
            onChange={(e) => { setNoticeDays(e.target.value); setResult(null); }}
            placeholder="14"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <button
        onClick={handleCheck}
        disabled={!companySize || !layoffCount || !noticeDays}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-sm py-3 rounded-xl transition-colors"
      >
        Check WARN Act
      </button>

      {result && (
        <div className={`mt-4 rounded-xl border p-5 ${
          result.likelyApplies ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
        }`}>
          <p className={`text-sm font-semibold mb-2 ${result.likelyApplies ? "text-amber-800" : "text-gray-700"}`}>
            {result.likelyApplies ? "WARN Act likely applies" : "WARN Act may not apply"}
          </p>
          <p className="text-sm text-gray-600 mb-3">{result.explanation}</p>

          {result.requirements.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Requirements</p>
              {result.requirements.map((r, i) => (
                <p key={i} className="text-xs text-gray-600 mb-1 pl-3 border-l-2 border-gray-200">{r}</p>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Action items</p>
            {result.actionItems.map((a, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-300 mt-4 text-center">
        State mini-WARN Acts may have different thresholds. This checks the federal WARN Act.
      </p>
    </div>
  );
}
