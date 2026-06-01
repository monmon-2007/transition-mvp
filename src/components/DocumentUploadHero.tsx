"use client";

import React, { useState, useCallback } from "react";
import { analyzeDocuments, validateFiles, type DocumentAnalysisResponse } from "@/lib/api/documentAnalysis";
import SeveranceAnalysisResults from "./SeveranceAnalysisResults";
import { Upload, FileText, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function DocumentUploadHero({
  onAnalysisComplete,
}: {
  onAnalysisComplete?: (result: DocumentAnalysisResponse) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResponse | null>(null);
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
      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (analysis) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="font-semibold text-gray-900">Severance Analysis</h2>
        </div>
        {analysis.summary?.shortSummary && (
          <p className="text-sm text-gray-600 mb-4">{analysis.summary.shortSummary}</p>
        )}
        <SeveranceAnalysisResults analysis={analysis} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload your severance letter</h2>
      <p className="text-sm text-gray-500 mb-4">
        Get an instant breakdown of what you&apos;re being offered, key deadlines, and what&apos;s negotiable.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
          dragOver
            ? "border-violet-400 bg-violet-50"
            : files.length > 0
            ? "border-violet-300 bg-violet-50/50"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        {files.length > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-violet-500" />
            {files.map((f) => (
              <p key={f.name} className="text-sm font-medium text-gray-700">{f.name}</p>
            ))}
            <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-gray-600">
              Change file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">Drop your file here or click to browse</p>
            <p className="text-xs text-gray-400">PDF, DOCX, or TXT (max 10MB)</p>
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
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-200/50"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze document"
          )}
        </button>
      )}
    </div>
  );
}
