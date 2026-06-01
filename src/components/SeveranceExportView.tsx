"use client";

import React, { useRef } from "react";
import type { FairnessResult } from "@/lib/severanceBenchmark";
import type { LayoffIntakeApiResponse } from "@/lib/api/layoffIntake";
import { Printer, Download } from "lucide-react";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function SeveranceExportView({
  intake,
  fairness,
  onClose,
}: {
  intake: LayoffIntakeApiResponse;
  fairness: FairnessResult | null;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Severance Analysis — ${intake.employer || "Confidential"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.6; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h2 { font-size: 16px; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
            .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
            .field-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .field-value { font-size: 14px; font-weight: 600; }
            .score-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .score-box .rating { font-size: 18px; font-weight: 700; }
            .score-box .detail { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .insight { font-size: 13px; color: #4b5563; margin: 6px 0; padding-left: 12px; border-left: 2px solid #d1d5db; }
            .flag { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-top: 4px; }
            .flag-warn { background: #fef3c7; color: #92400e; }
            .flag-info { background: #ede9fe; color: #5b21b6; }
            .disclaimer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>${content.innerHTML}
          <div class="disclaimer">
            Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            This summary is for informational purposes only and does not constitute legal advice.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-gray-900">Export for your lawyer</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div ref={printRef} className="px-6 py-6">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Severance Package Analysis
          </h1>
          <p className="subtitle" style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
            {intake.employer || "Employer"}{intake.jobTitle ? ` — ${intake.jobTitle}` : ""}
          </p>

          {/* Fairness Score */}
          {fairness && (
            <div className="score-box" style={{ background: "#f3f4f6", borderRadius: 8, padding: 16, margin: "16px 0" }}>
              <div className="rating" style={{ fontSize: 18, fontWeight: 700 }}>
                {fairness.percentile}th percentile — {fairness.rating === "below" ? "Below Typical" : fairness.rating === "fair" ? "Fair" : fairness.rating === "above" ? "Above Typical" : "Well Above Typical"}
              </div>
              <div className="detail" style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                Package equals ~{fairness.userWeeks} weeks of pay vs. {fairness.medianWeeks}-week median for this profile.
                Estimated annual salary basis: ${fairness.annualSalaryEstimate.toLocaleString()}.
              </div>
              {fairness.insights.map((insight, i) => (
                <div key={i} className="insight" style={{ fontSize: 13, color: "#4b5563", margin: "6px 0", paddingLeft: 12, borderLeft: "2px solid #d1d5db" }}>
                  {insight}
                </div>
              ))}
            </div>
          )}

          {/* Key Terms */}
          <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 6 }}>
            Key Terms
          </h2>
          <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Severance Amount</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{intake.severanceAmount || "Not specified"}</div>
            </div>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Payment Type</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>
                {intake.severancePaymentType === "lump-sum" ? "Lump sum" : intake.severancePaymentType === "continued-payroll" ? "Continued payroll" : intake.severancePaymentType || "—"}
              </div>
            </div>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Sign Deadline</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(intake.severanceSignDeadline)}</div>
            </div>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Termination Date</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(intake.terminationDate)}</div>
            </div>
          </div>

          {/* Restrictions & Obligations */}
          <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 6 }}>
            Restrictions &amp; Obligations
          </h2>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {intake.releaseRequired === "yes" && (
              <div>
                <span className="flag flag-warn" style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>
                  Release of Claims Required
                </span>
                <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
                  Signing waives your right to pursue legal claims against the employer.
                </p>
              </div>
            )}
            {intake.nonCompete === "yes" && (
              <div>
                <span className="flag flag-warn" style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>
                  Non-Compete Clause
                </span>
                <p style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>
                  {intake.nonCompeteDuration ? `Duration: ${intake.nonCompeteDuration}. ` : ""}
                  Restricts future employment with competing companies.
                </p>
              </div>
            )}
            {intake.nonSolicit === "yes" && (
              <div>
                <span className="flag flag-info" style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#ede9fe", color: "#5b21b6" }}>
                  Non-Solicitation Clause
                </span>
              </div>
            )}
            {intake.nonDisparagement === "yes" && (
              <div>
                <span className="flag flag-info" style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#ede9fe", color: "#5b21b6" }}>
                  Non-Disparagement Clause
                </span>
              </div>
            )}
            {intake.confidentialityObligation === "yes" && (
              <div>
                <span className="flag flag-info" style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#ede9fe", color: "#5b21b6" }}>
                  Confidentiality Obligation
                </span>
              </div>
            )}
            {!intake.releaseRequired && !intake.nonCompete && !intake.nonSolicit && !intake.nonDisparagement && !intake.confidentialityObligation && (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No restrictive clauses identified in intake data.</p>
            )}
          </div>

          {/* Benefits */}
          <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 6 }}>
            Benefits &amp; Compensation
          </h2>
          <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Health Insurance Ends</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(intake.healthEndDate)}</div>
            </div>
            <div>
              <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>COBRA Mentioned</div>
              <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{intake.cobraMentioned === "yes" ? "Yes" : "No"}</div>
            </div>
            {intake.equityType && (
              <div>
                <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Equity</div>
                <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>
                  {intake.equityType}{intake.exerciseDeadline ? ` — exercise by ${formatDate(intake.exerciseDeadline)}` : ""}
                </div>
              </div>
            )}
            {intake.outplacementProvided === "yes" && (
              <div>
                <div className="field-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Outplacement</div>
                <div className="field-value" style={{ fontSize: 14, fontWeight: 600 }}>{intake.outplacementDetails || "Provided"}</div>
              </div>
            )}
          </div>

          {/* Governing Law */}
          {intake.governingLaw && (
            <>
              <h2 style={{ fontSize: 16, marginTop: 28, marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 6 }}>
                Governing Law
              </h2>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{intake.governingLaw}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
