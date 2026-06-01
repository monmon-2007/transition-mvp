"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStartIntake } from "@/lib/api/layoffIntake";
import { Briefcase, MapPin, Target, ArrowRight, Loader2, AlertTriangle } from "lucide-react";

const URGENCY_OPTIONS = [
  { value: "actively-searching", label: "Actively searching", desc: "I'm applying now" },
  { value: "casually-looking", label: "Casually looking", desc: "Open to the right opportunity" },
  { value: "planning-to-leave", label: "Planning to leave", desc: "I want to be ready when I start" },
];

export default function GeneralSearchQuickStart() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const fields: Record<string, string | null> = {
        activelyLooking: "yes",
        desiredUrgency: urgency || "actively-searching",
      };
      if (targetRole.trim()) fields.jobTitle = targetRole.trim();
      if (location.trim()) fields.location = location.trim();
      await saveQuickStartIntake(fields, "general-search");
      router.push("/onboarding/layoff/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your job search</h1>
      <p className="text-gray-500 mb-8">
        A few quick details so we can personalize your tools. Skip anything you&apos;re not sure about.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            What role are you targeting?
          </label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Preferred location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Remote, San Francisco, New York"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            How urgent is your search?
          </label>
          <div className="grid gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  urgency === opt.value
                    ? "border-rose-400 bg-rose-50 ring-2 ring-rose-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  urgency === opt.value ? "border-rose-500" : "border-gray-300"
                }`}>
                  {urgency === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </button>
            ))}
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
        className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-semibold rounded-xl hover:from-rose-700 hover:to-pink-700 disabled:opacity-60 transition-all duration-200 shadow-lg shadow-rose-200/50"
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
        You can update these anytime from your dashboard.
      </p>
    </div>
  );
}
