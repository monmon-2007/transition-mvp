"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboard } from "./shared/DashboardContext";
import DashboardNav from "@/components/DashboardNav";
import { Loader2 } from "lucide-react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { intake, weeksSinceLayoff, progress, loading, isQuickStart, isGeneralSearch } = useDashboard();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-violet-100" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <DashboardNav
        role={intake?.jobTitle ?? undefined}
        company={intake?.employer ?? undefined}
        weeksSinceLayoff={weeksSinceLayoff}
        progress={progress}
        isQuickStart={isQuickStart}
        isGeneralSearch={isGeneralSearch}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </>
  );
}

export default function LayoffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Intake form page — no nav, no context provider
  if (pathname === "/onboarding/layoff") {
    return <>{children}</>;
  }

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <DashboardShell>{children}</DashboardShell>
      </div>
    </DashboardProvider>
  );
}
