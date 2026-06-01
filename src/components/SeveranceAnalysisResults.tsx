"use client";

import React from "react";
import type { DocumentAnalysisResponse, ExtractedField } from "@/lib/api/documentAnalysis";
import { DollarSign, Clock, Scale, AlertTriangle } from "lucide-react";

function ConfidenceDot({ confidence }: { confidence: ExtractedField["confidence"] }) {
  if (!confidence) return null;
  const colors = {
    high: "bg-emerald-400",
    medium: "bg-amber-400",
    low: "bg-red-400",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${colors[confidence]}`}
      title={`${confidence} confidence`}
    />
  );
}

function daysRemaining(dateStr: string): number | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function urgencyColor(days: number | null): string {
  if (days === null) return "text-gray-600";
  if (days < 7) return "text-red-600";
  if (days < 14) return "text-amber-600";
  return "text-emerald-600";
}

export default function SeveranceAnalysisResults({
  analysis,
}: {
  analysis: DocumentAnalysisResponse;
}) {
  const ef = analysis.extractedFields;
  const summary = analysis.summary;

  // Money on the Table
  const moneyItems: { label: string; value: string; confidence: ExtractedField["confidence"] }[] = [];
  if (ef?.severanceAmount?.value) moneyItems.push({ label: "Severance", value: ef.severanceAmount.value, confidence: ef.severanceAmount.confidence });
  if (ef?.ptoPayoutAmount?.value) moneyItems.push({ label: "PTO Payout", value: ef.ptoPayoutAmount.value, confidence: ef.ptoPayoutAmount.confidence });
  if (ef?.bonusAmount?.value) moneyItems.push({ label: "Bonus", value: ef.bonusAmount.value, confidence: ef.bonusAmount.confidence });
  if (ef?.commissionsAmount?.value) moneyItems.push({ label: "Commissions", value: ef.commissionsAmount.value, confidence: ef.commissionsAmount.confidence });
  if (ef?.proRatedBonusAmount?.value) moneyItems.push({ label: "Pro-Rated Bonus", value: ef.proRatedBonusAmount.value, confidence: ef.proRatedBonusAmount.confidence });

  // Key Deadlines
  const deadlines: { label: string; date: string; days: number | null }[] = [];
  if (ef?.severanceSignDeadline?.value) {
    deadlines.push({ label: "Sign severance", date: ef.severanceSignDeadline.value, days: daysRemaining(ef.severanceSignDeadline.value) });
  }
  if (ef?.benefitsEndDate?.value) {
    deadlines.push({ label: "Benefits end", date: ef.benefitsEndDate.value, days: daysRemaining(ef.benefitsEndDate.value) });
  }
  if (ef?.exerciseDeadline?.value) {
    deadlines.push({ label: "Exercise equity", date: ef.exerciseDeadline.value, days: daysRemaining(ef.exerciseDeadline.value) });
  }
  if (ef?.returnEquipmentDeadline?.value) {
    deadlines.push({ label: "Return equipment", date: ef.returnEquipmentDeadline.value, days: daysRemaining(ef.returnEquipmentDeadline.value) });
  }
  deadlines.sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  // Negotiable items
  const negotiable: string[] = [];
  if (ef?.severanceAmount?.value) negotiable.push("Severance amount — counter-offers are common and often accepted");
  if (ef?.nonCompeteMentioned?.value) negotiable.push(`Non-compete clause${ef.nonCompeteDuration?.value ? ` (${ef.nonCompeteDuration.value})` : ""} — request removal or narrower scope`);
  if (ef?.releaseRequired?.value) negotiable.push("Release of claims — may justify a higher package");
  if (ef?.cobraMentioned?.value) negotiable.push("COBRA contributions — ask for employer-paid months");
  if (ef?.outplacementMentioned?.value) negotiable.push("Outplacement services — request extended duration or cash equivalent");

  // Watch out for
  const warnings: string[] = [...(analysis.warnings || [])];
  if (ef?.nonDisparagement?.value) warnings.push("Non-disparagement clause limits what you can say publicly");
  if (ef?.confidentialityMentioned?.value) warnings.push("Confidentiality obligation — review what's covered");
  if (summary?.missingImportantInfo?.length) {
    summary.missingImportantInfo.forEach((m) => warnings.push(`Missing: ${m}`));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Money on the Table */}
      {moneyItems.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Money on the Table</h3>
          </div>
          <div className="space-y-2">
            {moneyItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  {item.label}
                  <ConfidenceDot confidence={item.confidence} />
                </span>
                <span className="text-sm font-semibold text-emerald-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Deadlines */}
      {deadlines.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-900">Key Deadlines</h3>
          </div>
          <div className="space-y-2.5">
            {deadlines.map((d) => (
              <div key={d.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{d.label}</span>
                <span className={`text-sm font-semibold ${urgencyColor(d.days)}`}>
                  {d.days !== null ? (d.days <= 0 ? "PAST DUE" : `${d.days}d left`) : d.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What's Negotiable */}
      {negotiable.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-violet-600" />
            <h3 className="font-semibold text-gray-900">What&apos;s Negotiable</h3>
          </div>
          <ul className="space-y-2">
            {negotiable.map((item, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-violet-400 mt-0.5 flex-shrink-0">&#8226;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Watch Out For */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Watch Out For</h3>
          </div>
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
