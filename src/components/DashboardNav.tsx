"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  ClipboardList,
  DollarSign,
  FileSearch,
  Calendar,
  Target,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/onboarding/layoff/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "violet" },
  { href: "/onboarding/layoff/resumes", label: "Resumes", icon: FileText, color: "blue" },
  { href: "/onboarding/layoff/applications", label: "Applications", icon: Briefcase, color: "purple" },
  { href: "/onboarding/layoff/runway", label: "Runway", icon: DollarSign, color: "emerald" },
  { href: "/onboarding/layoff/calendar", label: "Calendar", icon: Calendar, color: "cyan" },
  { href: "/onboarding/layoff/skills", label: "Skills", icon: Target, color: "amber" },
  { href: "/onboarding/layoff/tasks", label: "Tasks", icon: ClipboardList, color: "slate" },
] as const;

const ACTIVE_STYLES: Record<string, string> = {
  violet: "text-violet-700 bg-violet-50 ring-1 ring-violet-200",
  blue: "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  purple: "text-purple-700 bg-purple-50 ring-1 ring-purple-200",
  emerald: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
  cyan: "text-cyan-700 bg-cyan-50 ring-1 ring-cyan-200",
  amber: "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
  slate: "text-slate-700 bg-slate-100 ring-1 ring-slate-200",
};

export default function DashboardNav({
  role,
  company,
  weeksSinceLayoff,
  progress,
  isQuickStart,
  isGeneralSearch,
}: {
  role?: string;
  company?: string;
  weeksSinceLayoff: number;
  progress: number;
  isQuickStart?: boolean;
  isGeneralSearch?: boolean;
}) {
  const pathname = usePathname();

  // Progress ring math
  const circumference = 2 * Math.PI * 12;
  const strokeDash = (progress / 100) * circumference;

  return (
    <nav className="sticky top-[57px] z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top info bar */}
        <div className="flex items-center justify-between py-2.5 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 text-sm">
              {isGeneralSearch ? "Job Search" : "Transition Plan"}
            </span>
            {(role || company) && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-gray-400 truncate max-w-[200px]">
                  {role}{role && company ? " @ " : ""}{company}
                </span>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-4" aria-label="Status indicators">
            {isQuickStart && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Quick Start
              </span>
            )}
            {weeksSinceLayoff > 0 && !isGeneralSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                Week {weeksSinceLayoff}
              </span>
            )}
            {/* Progress ring */}
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7">
                <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="12" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                  <circle
                    cx="14"
                    cy="14"
                    r="12"
                    fill="none"
                    stroke="url(#navProgressGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="navProgressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="font-bold text-gray-700">{progress}%</span>
            </div>
            <Link
              href="/onboarding/layoff/summary"
              className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700 font-medium transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5" />
              Summary
            </Link>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 overflow-x-auto py-1.5 -mb-px scrollbar-none" role="tablist" aria-label="Dashboard navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
            const isActive =
              pathname === href ||
              (href !== "/onboarding/layoff/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={isActive}
                aria-label={`${label} page`}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? ACTIVE_STYLES[color]
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">{label}</span>
                <span className="xs:hidden sm:hidden" aria-hidden="true"><Icon className="w-4 h-4" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
