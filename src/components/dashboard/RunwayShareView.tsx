"use client";

import React, { useRef } from "react";
import { type RunwayResult, formatCurrency } from "@/lib/runway";
import { Printer, Link2, Check } from "lucide-react";

export default function RunwayShareView({
  runway,
  onClose,
}: {
  runway: RunwayResult;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Runway Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; line-height: 1.6; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
            .big-number { font-size: 32px; font-weight: 800; margin: 16px 0 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
            .card { background: #f9fafb; border-radius: 8px; padding: 12px 16px; }
            .card-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
            .card-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
            .risk { display: inline-block; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
            .risk-high { background: #fef2f2; color: #dc2626; }
            .risk-medium { background: #fffbeb; color: #d97706; }
            .risk-stable { background: #ecfdf5; color: #059669; }
            .disclaimer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
          </style>
        </head>
        <body>${content.innerHTML}
          <div class="disclaimer">
            Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
            This is an estimate based on user-provided data. Actual runway may vary.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  function handleCopyLink() {
    // Encode runway data in URL params for shareable link
    const params = new URLSearchParams({
      m: String(runway.runwayMonths.toFixed(1)),
      t: String(Math.round(runway.totalCash)),
      e: String(Math.round(runway.monthlyExpenses)),
      r: runway.riskLevel,
    });
    runway.components.forEach((c, i) => {
      params.set(`c${i}`, `${c.label}:${Math.round(c.amount)}`);
    });
    const url = `${window.location.origin}/onboarding/layoff/runway?share=${btoa(params.toString())}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const riskClass = runway.riskLevel === "high" ? "risk-high" : runway.riskLevel === "medium" ? "risk-medium" : "risk-stable";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-gray-900">Share Runway</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
              {linkCopied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
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
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Financial Runway</h1>
          <p className="subtitle" style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
            How long current funds will last
          </p>

          <div className="big-number" style={{ fontSize: 32, fontWeight: 800, margin: "16px 0 4px" }}>
            {runway.runwayMonths < 1
              ? `~${Math.round(runway.runwayMonths * 4)} weeks`
              : `~${runway.runwayMonths.toFixed(1)} months`}
          </div>
          <span className={`risk ${riskClass}`} style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 20,
            background: runway.riskLevel === "high" ? "#fef2f2" : runway.riskLevel === "medium" ? "#fffbeb" : "#ecfdf5",
            color: runway.riskLevel === "high" ? "#dc2626" : runway.riskLevel === "medium" ? "#d97706" : "#059669",
          }}>
            {runway.riskLevel === "high" ? "High Risk" : runway.riskLevel === "medium" ? "Moderate" : "Stable"}
          </span>

          <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>
            {runway.components.map((c) => (
              <div key={c.label} className="card" style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
                <div className="card-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const }}>{c.label}</div>
                <div className="card-value" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatCurrency(c.amount)}</div>
              </div>
            ))}
            <div className="card" style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
              <div className="card-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const }}>Monthly Expenses</div>
              <div className="card-value" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatCurrency(runway.monthlyExpenses)}/mo</div>
            </div>
            <div className="card" style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px" }}>
              <div className="card-label" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const }}>Total Available</div>
              <div className="card-value" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{formatCurrency(runway.totalCash)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
