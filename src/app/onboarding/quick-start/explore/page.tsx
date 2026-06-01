"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStartIntake } from "@/lib/api/layoffIntake";
import { Loader2 } from "lucide-react";

export default function ExploreQuickStart() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        await saveQuickStartIntake({}, "explore");
        router.replace("/onboarding/layoff/dashboard");
      } catch (err: any) {
        setError(err.message || "Failed to set up. Please try again.");
      }
    }
    setup();
  }, [router]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/onboarding" className="text-violet-600 hover:text-violet-700 font-medium">
          Go back
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      <p className="text-sm text-gray-400 font-medium">Setting up your dashboard...</p>
    </div>
  );
}
