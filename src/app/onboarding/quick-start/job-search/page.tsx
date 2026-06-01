"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStartIntake } from "@/lib/api/layoffIntake";
import { Briefcase, Building2, ArrowRight, Loader2, AlertTriangle } from "lucide-react";

export default function JobSearchQuickStart() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, string | null> = {};
      if (jobTitle.trim()) fields.jobTitle = jobTitle.trim();
      if (employer.trim()) fields.employer = employer.trim();
      await saveQuickStartIntake(fields, "job-search");
      router.push("/onboarding/layoff/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Let&apos;s get you started</h1>
      <p className="text-gray-500 mb-8">
        Two quick questions so we can set up your resume builder and application tracker.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your most recent role
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Last company
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              placeholder="e.g. Meta"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={saving}
        className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-violet-200/50"
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
        You can update these anytime. We&apos;ll pre-fill your resume builder with this info.
      </p>
    </div>
  );
}
