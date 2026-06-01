"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import SkillGapTracker from "@/components/dashboard/SkillGapTracker";

export default function SkillsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <div>
        <div className="mb-8">
          <Link
            href="/onboarding/layoff/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Skill Gap Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your skills and identify gaps for your target roles.
          </p>
        </div>
        <SkillGapTracker />
      </div>
    </Suspense>
  );
}
