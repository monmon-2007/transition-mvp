"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchLayoffIntake } from "@/lib/api/layoffIntake";

export default function Onboarding() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    async function redirectIfCompleted() {
      try {
        const intake = await fetchLayoffIntake();
        if (intake?.status === "completed") {
          router.replace("/onboarding/layoff/tasks");
        }
      } catch (err) {
        console.error("Unable to check onboarding status:", err);
      }
    }

    redirectIfCompleted();
  }, [router, session, sessionStatus]);

  const options = [
    {
      title: "Recently laid off",
      desc: "Get help with next steps, benefits, and applications.",
      href: "/onboarding/layoff",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      hoverShadow: "hover:shadow-blue-200/50",
      comingSoon: false,
    },
    {
      title: "Looking for my first job",
      desc: "Build a focused plan to start your career.",
      href: "/onboarding/layoff",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422M12 14v6" />
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      hoverShadow: "hover:shadow-emerald-200/50",
      comingSoon: true,
    },
    {
      title: "Changing careers",
      desc: "Explore transferable skills and new pathways.",
      href: "/onboarding/layoff",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12m-12 5h12M3 7h.01M3 12h.01M3 17h.01" />
          <circle cx="3" cy="7" r="1" fill="currentColor" />
          <circle cx="3" cy="12" r="1" fill="currentColor" />
          <circle cx="3" cy="17" r="1" fill="currentColor" />
        </svg>
      ),
      gradient: "from-purple-500 to-pink-600",
      bgGradient: "from-purple-50 to-pink-50",
      hoverShadow: "hover:shadow-purple-200/50",
      comingSoon: true,
    },
    {
      title: "Exploring better opportunities",
      desc: "Compare roles, companies, and compensation.",
      href: "/onboarding/layoff",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      hoverShadow: "hover:shadow-amber-200/50",
      comingSoon: true,
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            What brings you here today?
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Choose the option that best describes your situation. We'll create a personalized roadmap to help you succeed.
          </p>

          <p className="text-sm text-slate-500">
            Your plan is built around your specific situation — not a generic checklist.
          </p>
        </div>

        {/* Options Grid */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {options.map((option, index) =>
              option.comingSoon ? (
                /* ── Disabled / Coming Soon tile ── */
                <div
                  key={option.title}
                  className={`relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-gradient-to-br ${option.bgGradient} p-6 opacity-45 cursor-not-allowed select-none`}
                  aria-disabled="true"
                >
                  {/* Coming Soon Badge */}
                  <div className="absolute top-4 left-4 px-2.5 py-1 bg-slate-400 text-white text-xs font-semibold rounded-full z-20">
                    Coming Soon
                  </div>

                  {/* Content — greyed, no hover effects */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white shadow-sm grayscale`}>
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-500 mb-1">{option.title}</h3>
                        <p className="text-sm text-slate-400">{option.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-4">
                      <span className="text-sm text-slate-400">Available soon</span>
                    </div>
                  </div>

                  {/* Number badge */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-sm font-bold text-slate-400">
                    {index + 1}
                  </div>
                </div>
              ) : (
                /* ── Active tile ── */
                <a
                  key={option.title}
                  href={option.href}
                  className={`group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br ${option.bgGradient} p-6 transition-all duration-300 hover:border-transparent hover:scale-[1.02] ${option.hoverShadow} hover:shadow-2xl`}
                >
                  {/* Animated background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-white transition-colors duration-300 mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-slate-600 group-hover:text-white/90 transition-colors duration-300">
                          {option.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-4">
                      <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition-colors duration-300">
                        <span className="text-sm font-medium">Get started</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Number badge */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-slate-700 group-hover:bg-white group-hover:text-slate-900 transition-colors duration-300">
                    {index + 1}
                  </div>
                </a>
              )
            )}
          </div>

          {/* Skip option */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500 mb-3">Not sure yet? You can always come back to this.</p>
            <a
              href="/onboarding/layoff"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-all duration-200"
            >
              <span>Continue to intake form</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">Your Progress</span>
            <span className="text-sm text-slate-500">Step 1 of 6</span>
          </div>
          <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full w-1/6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" />
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 max-w-2xl mx-auto text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            This tool helps you organize and plan your transition. It does not provide legal, financial, or career advice. Results vary based on individual circumstances.
          </p>
        </div>
      </div>
    </main>
  );
}