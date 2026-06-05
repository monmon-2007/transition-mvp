"use client";

import React, { useState } from "react";
import { patchIntakeFields } from "@/lib/api/layoffIntake";
import { useDashboard } from "@/app/onboarding/layoff/shared/DashboardContext";
import { UserCircle, Calendar, DollarSign, Heart, ArrowRight, Loader2, CheckCircle2, X } from "lucide-react";
import Link from "next/link";

type PromptType = "termination-date" | "severance" | "health" | "full-profile";

function getNextPrompt(intake: any): PromptType | null {
  if (!intake) return "termination-date";
  if (!intake.terminationDate) return "termination-date";
  if (!intake.severanceOffered) return "severance";
  if (!intake.healthActive) return "health";
  // Check if enough fields filled to skip full-profile prompt
  const fields = [intake.employer, intake.jobTitle, intake.location, intake.employmentType, intake.activelyLooking];
  const filled = fields.filter(Boolean).length;
  if (filled < 3) return "full-profile";
  return null;
}

const DISMISS_KEY = "novapivots:profile-prompt-dismissed";

export default function ProfilePromptCard() {
  const { intake, refreshIntake, profileCompleteness } = useDashboard();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [value, setValue] = useState("");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "true";
  });

  const prompt = getNextPrompt(intake);
  if (!prompt) return null;
  if (prompt === "full-profile" && dismissed) return null;

  async function handleSave(fields: Record<string, string | null>) {
    setSaving(true);
    try {
      await patchIntakeFields(fields);
      await refreshIntake();
      setSaved(true);
      setValue("");
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // fail silently — user can retry
    } finally {
      setSaving(false);
    }
  }

  if (prompt === "full-profile") {
    return (
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 relative">
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(DISMISS_KEY, "true");
          }}
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <UserCircle className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Complete your profile</h3>
          <span className="text-xs font-medium text-violet-600 bg-violet-100 rounded-full px-2 py-0.5">
            {profileCompleteness}% done
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Fill in the rest of your details for a fully personalized action plan with deadlines and dollar amounts.
        </p>
        <Link
          href="/onboarding?edit=true"
          className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
        >
          Complete intake form <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const configs: Record<string, { icon: React.ReactNode; label: string; placeholder: string; field: string; type: string }> = {
    "termination-date": {
      icon: <Calendar className="w-5 h-5 text-indigo-600" />,
      label: "When was your last day?",
      placeholder: "",
      field: "terminationDate",
      type: "date",
    },
    severance: {
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      label: "Were you offered severance?",
      placeholder: "",
      field: "severanceOffered",
      type: "yesno",
    },
    health: {
      icon: <Heart className="w-5 h-5 text-rose-600" />,
      label: "Is your health insurance still active?",
      placeholder: "",
      field: "healthActive",
      type: "yesno",
    },
  };

  const cfg = configs[prompt];

  if (saved) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-800">Saved! Your plan has been updated.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        {cfg.icon}
        <h3 className="font-semibold text-gray-900">{cfg.label}</h3>
      </div>

      {cfg.type === "date" && (
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm"
          />
          <button
            onClick={() => handleSave({ [cfg.field]: value })}
            disabled={!value || saving}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </button>
        </div>
      )}

      {cfg.type === "yesno" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave({ [cfg.field]: "yes" })}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes"}
          </button>
          <button
            onClick={() => handleSave({ [cfg.field]: "no" })}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
          >
            No
          </button>
          <button
            onClick={() => handleSave({ [cfg.field]: "unsure" })}
            disabled={saving}
            className="px-4 py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Not sure
          </button>
        </div>
      )}
    </div>
  );
}
