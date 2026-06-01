"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { saveQuickStartIntake } from "@/lib/api/layoffIntake";
import { analyzeDocuments, validateFiles, type DocumentAnalysisResponse } from "@/lib/api/documentAnalysis";
import { Upload, FileText, Loader2, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { computeFairnessScore, inferRoleLevel, type FairnessResult } from "@/lib/severanceBenchmark";
import SeveranceFairnessScore from "@/components/SeveranceFairnessScore";
import { parseDollarAmount } from "@/lib/runway";
import PrivacyBadge from "@/components/PrivacyBadge";

export default function SeveranceQuickStart() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validation = validateFiles(fileArray);
    if (!validation.valid) {
      setError(validation.error || "Invalid files");
      return;
    }
    setError(null);
    setFiles(fileArray);
  }, []);

  async function handleAnalyze() {
    if (files.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeDocuments(files);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleContinue() {
    setSaving(true);
    try {
      const fields: Record<string, string | null> = {};
      if (analysis?.extractedFields) {
        const ef = analysis.extractedFields;
        if (ef.employerName?.value) fields.employer = ef.employerName.value;
        if (ef.jobTitle?.value) fields.jobTitle = ef.jobTitle.value;
        if (ef.terminationDate?.value) fields.terminationDate = ef.terminationDate.value;
        if (ef.severanceOffered?.value) fields.severanceOffered = ef.severanceOffered.value === "true" ? "yes" : ef.severanceOffered.value;
        if (ef.severanceAmount?.value) fields.severanceAmount = ef.severanceAmount.value;
        if (ef.severanceSignDeadline?.value) fields.severanceSignDeadline = ef.severanceSignDeadline.value;
        if (ef.releaseRequired?.value) fields.releaseRequired = ef.releaseRequired.value === "true" ? "yes" : ef.releaseRequired.value;
        if (ef.nonCompeteMentioned?.value) fields.nonCompete = ef.nonCompeteMentioned.value === "true" ? "yes" : ef.nonCompeteMentioned.value;
        if (ef.nonCompeteDuration?.value) fields.nonCompeteDuration = ef.nonCompeteDuration.value;
        if (analysis.summary?.documentSummary) fields.documentSummary = analysis.summary.documentSummary;
      }
      await saveQuickStartIntake(fields, "severance");
      router.push("/onboarding/layoff/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await saveQuickStartIntake({}, "severance");
      router.push("/onboarding/layoff/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload your severance letter</h1>
      <p className="text-gray-500 mb-8">
        We&apos;ll instantly analyze it and show you what matters: money, deadlines, and what&apos;s negotiable.
      </p>

      {!analysis ? (
        <>
          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
              dragOver
                ? "border-violet-400 bg-violet-50"
                : files.length > 0
                ? "border-violet-300 bg-violet-50/50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {files.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-violet-600" />
                </div>
                {files.map((f) => (
                  <p key={f.name} className="text-sm font-medium text-gray-700">{f.name}</p>
                ))}
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Remove and choose different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Drop your severance letter here</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || analyzing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-200/50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze document
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleSkip}
            disabled={saving}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            {saving ? "Setting up..." : "Skip — I'll upload later"}
          </button>

          <PrivacyBadge className="mt-4 justify-center" />
        </>
      ) : (
        <>
          {/* Fairness Score */}
          {(() => {
            const amt = parseDollarAmount(analysis.extractedFields?.severanceAmount?.value ?? null);
            const title = analysis.extractedFields?.jobTitle?.value ?? null;
            const fairness = amt ? computeFairnessScore({
              severanceAmount: amt,
              roleLevel: inferRoleLevel(title),
              industry: "technology",
              hasNonCompete: analysis.extractedFields?.nonCompeteMentioned?.value === "true",
              hasReleaseOfClaims: analysis.extractedFields?.releaseRequired?.value === "true",
            }) : null;
            return fairness ? (
              <div className="mb-6">
                <SeveranceFairnessScore result={fairness} />
              </div>
            ) : null;
          })()}

          {/* Analysis results summary */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-gray-900">Analysis Complete</h2>
            </div>

            {analysis.summary && (
              <p className="text-sm text-gray-600 mb-4">{analysis.summary.shortSummary}</p>
            )}

            {/* Key findings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analysis.extractedFields?.severanceAmount?.value && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-emerald-600 mb-1">Severance Amount</p>
                  <p className="text-lg font-bold text-emerald-800">{analysis.extractedFields.severanceAmount.value}</p>
                </div>
              )}
              {analysis.extractedFields?.severanceSignDeadline?.value && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-red-600 mb-1">Sign By</p>
                  <p className="text-lg font-bold text-red-800">{analysis.extractedFields.severanceSignDeadline.value}</p>
                </div>
              )}
              {analysis.extractedFields?.nonCompeteMentioned?.value && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-amber-600 mb-1">Non-Compete</p>
                  <p className="text-sm font-semibold text-amber-800">
                    {analysis.extractedFields.nonCompeteDuration?.value || "Included in agreement"}
                  </p>
                </div>
              )}
              {analysis.extractedFields?.releaseRequired?.value && (
                <div className="bg-violet-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-violet-600 mb-1">Release of Claims</p>
                  <p className="text-sm font-semibold text-violet-800">Required</p>
                </div>
              )}
            </div>

            {analysis.summary?.keyDeadlines && analysis.summary.keyDeadlines.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Key Deadlines</p>
                <ul className="space-y-1">
                  {analysis.summary.keyDeadlines.map((d, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">&#8226;</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-amber-600 mb-2">Watch Out For</p>
                <ul className="space-y-1">
                  {analysis.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-violet-200/50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up your dashboard...
              </>
            ) : (
              <>
                Go to your dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            You&apos;ll see a full breakdown and action plan on your dashboard.
          </p>
        </>
      )}
    </div>
  );
}
