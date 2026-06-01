"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake } from "@/lib/api/layoffIntake";
import { Shield, Calculator, Search, Compass, ArrowRight, Loader2, Rocket } from "lucide-react";
import SocialProofBanner from "@/components/SocialProofBanner";

const CONCERNS = [
  {
    id: "severance" as const,
    title: "Understand my severance",
    desc: "Upload your severance letter and get an instant breakdown of what you're being offered, key deadlines, and what's negotiable.",
    icon: Shield,
    href: "/onboarding/quick-start/severance",
    gradient: "from-violet-500 to-indigo-600",
    bgGradient: "from-violet-50 to-indigo-50",
    iconBg: "bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    ring: "ring-violet-200",
  },
  {
    id: "finances" as const,
    title: "Figure out my finances",
    desc: "Calculate exactly how many months of runway you have, and see how severance, savings, and expenses stack up.",
    icon: Calculator,
    href: "/onboarding/quick-start/finances",
    gradient: "from-emerald-500 to-teal-600",
    bgGradient: "from-emerald-50 to-teal-50",
    iconBg: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    ring: "ring-emerald-200",
  },
  {
    id: "job-search" as const,
    title: "I was laid off",
    desc: "Get the full toolkit: severance review, financial planning, legal rights, emotional support, and job search — all in one place.",
    icon: Search,
    href: "/onboarding/quick-start/job-search",
    gradient: "from-blue-500 to-cyan-600",
    bgGradient: "from-blue-50 to-cyan-50",
    iconBg: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    ring: "ring-blue-200",
  },
  {
    id: "general-search" as const,
    title: "I'm actively job searching",
    desc: "Resume builder, application tracker, interview prep, salary data, cover letters, and networking tools — no layoff context needed.",
    icon: Rocket,
    href: "/onboarding/quick-start/general-search",
    gradient: "from-rose-500 to-pink-600",
    bgGradient: "from-rose-50 to-pink-50",
    iconBg: "bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
    ring: "ring-rose-200",
  },
  {
    id: "explore" as const,
    title: "Just explore",
    desc: "Not sure where to start? That's fine. See what's available and fill in details at your own pace.",
    icon: Compass,
    href: "/onboarding/quick-start/explore",
    gradient: "from-amber-500 to-orange-600",
    bgGradient: "from-amber-50 to-orange-50",
    iconBg: "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
    ring: "ring-amber-200",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") setChecking(false);
      return;
    }

    async function redirectIfReturning() {
      try {
        const intake = await fetchLayoffIntake();
        if (intake && (intake.status === "completed" || intake.status === "quick-start")) {
          router.replace("/onboarding/layoff/dashboard");
          return;
        }
      } catch {
        // continue to show page
      }
      setChecking(false);
    }

    redirectIfReturning();
  }, [router, sessionStatus]);

  if (checking && sessionStatus === "authenticated") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl mb-5 shadow-lg shadow-violet-200/50">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            What&apos;s your most urgent concern?
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Pick what matters most right now. You&apos;ll be on your dashboard in under 60 seconds.
          </p>
        </div>

        {/* Concern cards */}
        <div className="flex flex-col gap-3">
          {CONCERNS.map((concern) => {
            const Icon = concern.icon;
            return (
              <a
                key={concern.id}
                href={concern.href}
                className={`group relative flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200 hover:border-transparent hover:ring-2 ${concern.ring} hover:shadow-lg transition-all duration-200`}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${concern.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{concern.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{concern.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 mt-1 flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5" />
              </a>
            );
          })}
        </div>

        {/* Social proof */}
        <div className="mt-8">
          <SocialProofBanner />
        </div>

        {/* Full intake option */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-2">Want to give us the full picture up front?</p>
          <a
            href="/onboarding/layoff"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            Complete the detailed intake form
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Disclaimer */}
        <p className="mt-10 text-center text-xs text-gray-400 leading-relaxed max-w-lg mx-auto">
          This tool helps you organize and plan your transition. It does not provide legal, financial, or career advice.
        </p>
      </div>
    </main>
  );
}
