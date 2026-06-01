"use client";

import React, { useState } from "react";
import {
  analyzeOffer,
  compareOffers,
  type OfferInput,
  type OfferAnalysis,
  type OfferComparison,
} from "@/lib/offerComparison";
import { formatCurrency } from "@/lib/runway";
import { Plus, Trash2, Scale, ArrowRight, X } from "lucide-react";

function emptyOffer(): OfferInput {
  return { company: "", role: "", baseSalary: 0 };
}

function OfferForm({
  offer,
  index,
  onChange,
  onRemove,
}: {
  offer: OfferInput;
  index: number;
  onChange: (o: OfferInput) => void;
  onRemove?: () => void;
}) {
  function set<K extends keyof OfferInput>(key: K, value: OfferInput[K]) {
    onChange({ ...offer, [key]: value });
  }

  function setNum(key: keyof OfferInput, raw: string) {
    const n = parseFloat(raw.replace(/[$,\s]/g, ""));
    set(key, isNaN(n) ? 0 : n);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Offer {index + 1}</h4>
        {onRemove && (
          <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Company</label>
          <input value={offer.company} onChange={(e) => set("company", e.target.value)} placeholder="Acme Corp"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Role</label>
          <input value={offer.role} onChange={(e) => set("role", e.target.value)} placeholder="Sr. Engineer"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Base salary *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input type="text" inputMode="numeric" value={offer.baseSalary || ""} onChange={(e) => setNum("baseSalary", e.target.value)} placeholder="150,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Signing bonus</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input type="text" inputMode="numeric" value={offer.signingBonus || ""} onChange={(e) => setNum("signingBonus", e.target.value)} placeholder="20,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bonus target %</label>
          <input type="text" inputMode="numeric" value={offer.bonusTargetPercent || ""} onChange={(e) => setNum("bonusTargetPercent", e.target.value)} placeholder="15"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Equity total value</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input type="text" inputMode="numeric" value={offer.equityValue || ""} onChange={(e) => setNum("equityValue", e.target.value)} placeholder="200,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Equity type</label>
          <select value={offer.equityType || "rsu"} onChange={(e) => set("equityType", e.target.value as OfferInput["equityType"])}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="rsu">RSUs</option>
            <option value="options">Options</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Vesting years</label>
          <input type="text" inputMode="numeric" value={offer.vestingYears || ""} onChange={(e) => setNum("vestingYears", e.target.value)} placeholder="4"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">401(k) match/yr</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
            <input type="text" inputMode="numeric" value={offer.retirement401kMatch || ""} onChange={(e) => setNum("retirement401kMatch", e.target.value)} placeholder="10,000"
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">PTO weeks</label>
          <input type="text" inputMode="numeric" value={offer.ptoWeeks || ""} onChange={(e) => setNum("ptoWeeks", e.target.value)} placeholder="4"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Remote policy</label>
          <select value={offer.remotePolicy || "hybrid"} onChange={(e) => set("remotePolicy", e.target.value as OfferInput["remotePolicy"])}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Commute (min one-way)</label>
          <input type="text" inputMode="numeric" value={offer.commuteMinutes || ""} onChange={(e) => setNum("commuteMinutes", e.target.value)} placeholder="30"
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ analysis, offer }: { analysis: OfferAnalysis; offer: OfferInput }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h4 className="font-bold text-gray-900 mb-1">{offer.company || "Offer"}</h4>
      <p className="text-xs text-gray-500 mb-4">{offer.role}</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <p className="text-xs text-indigo-600 mb-0.5">Year 1 Total</p>
          <p className="text-base font-bold text-indigo-900">{formatCurrency(analysis.totalCompYear1)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-xs text-emerald-600 mb-0.5">Annual (avg)</p>
          <p className="text-base font-bold text-emerald-900">{formatCurrency(analysis.totalCompAnnualized)}</p>
        </div>
        <div className="bg-violet-50 rounded-lg p-3 text-center">
          <p className="text-xs text-violet-600 mb-0.5">Monthly net</p>
          <p className="text-base font-bold text-violet-900">~{formatCurrency(analysis.monthlyTakeHome)}</p>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="space-y-1.5 mb-3">
        {analysis.components.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{c.label}</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(c.amount)}
              {c.note && <span className="text-gray-400 ml-1">({c.note})</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {analysis.insights.map((insight, i) => (
            <p key={i} className="text-xs text-gray-500">{insight}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfferComparisonCalc({ onClose }: { onClose: () => void }) {
  const [offers, setOffers] = useState<OfferInput[]>([emptyOffer()]);
  const [comparison, setComparison] = useState<OfferComparison | null>(null);

  function updateOffer(index: number, offer: OfferInput) {
    setOffers((prev) => prev.map((o, i) => (i === index ? offer : o)));
    setComparison(null);
  }

  function addOffer() {
    setOffers((prev) => [...prev, emptyOffer()]);
    setComparison(null);
  }

  function removeOffer(index: number) {
    setOffers((prev) => prev.filter((_, i) => i !== index));
    setComparison(null);
  }

  function handleCompare() {
    const valid = offers.filter((o) => o.baseSalary > 0);
    if (valid.length === 0) return;
    setComparison(compareOffers(valid));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900">Offer Comparison</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Offer forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {offers.map((offer, i) => (
              <OfferForm
                key={i}
                offer={offer}
                index={i}
                onChange={(o) => updateOffer(i, o)}
                onRemove={offers.length > 1 ? () => removeOffer(i) : undefined}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            {offers.length < 3 && (
              <button
                onClick={addOffer}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Add another offer
              </button>
            )}
            <button
              onClick={handleCompare}
              disabled={!offers.some((o) => o.baseSalary > 0)}
              className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-6 py-2 rounded-lg transition-colors"
            >
              <Scale className="w-4 h-4" />
              {offers.length > 1 ? "Compare offers" : "Analyze offer"}
            </button>
          </div>

          {/* Results */}
          {comparison && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {comparison.offers.map((analysis, i) => (
                  <AnalysisCard key={i} analysis={analysis} offer={offers[i]} />
                ))}
              </div>

              {comparison.recommendation && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4">
                  <p className="text-sm font-medium text-indigo-900">{comparison.recommendation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
