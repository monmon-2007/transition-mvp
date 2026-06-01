"use client";

import React, { useMemo, Suspense } from "react";
import Link from "next/link";
import { useDashboard } from "../shared/DashboardContext";
import { buildAttentionItems } from "../shared/attentionItems";
import { formatCurrency } from "@/lib/runway";
import TimelineBanner from "@/components/dashboard/TimelineBanner";
import ProfilePromptCard from "@/components/dashboard/ProfilePromptCard";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  FileText,
  Briefcase,
  ClipboardList,
  Shield,
  FileCheck,
  Zap,
  Sparkles,
  TrendingUp,
  Scale,
} from "lucide-react";
import { computeFairnessScore, inferRoleLevel } from "@/lib/severanceBenchmark";
import SeveranceFairnessScore from "@/components/SeveranceFairnessScore";
import { parseDollarAmount } from "@/lib/runway";
import { getDailyFocus } from "@/lib/dailyFocus";
import TodaysFocusCard from "@/components/dashboard/TodaysFocusCard";
import SocialProofBanner from "@/components/SocialProofBanner";
import CareerCoachCard from "@/components/dashboard/CareerCoachCard";
import type { UserState } from "@/lib/careerCoach";
import EmotionalJourneyCard from "@/components/dashboard/EmotionalJourneyCard";
import { createApplication as apiCreateApplication } from "@/lib/api/applications";
import { apiAppToLocal } from "../shared/types";

// Lazy-load modals and heavy components
const LegalRightsPanel = React.lazy(() => import("@/components/LegalRightsPanel"));
const CareerToolsPanel = React.lazy(() => import("@/components/CareerToolsPanel"));
const JobSuggestionsCard = React.lazy(() => import("@/components/dashboard/JobSuggestionsCard"));

export default function DashboardPage() {
  const [showLegalRights, setShowLegalRights] = React.useState(false);
  const [showCareerTools, setShowCareerTools] = React.useState(false);
  const {
    intake,
    runway,
    weeksSinceLayoff,
    applications,
    setApplications,
    contacts,
    resumes,
    progress,
    nextBestAction,
    jobSearchInsights,
    displayTasks,
    isQuickStart,
    isGeneralSearch,
    timelinePhase,
  } = useDashboard();

  // Fairness score from intake data
  const fairnessScore = useMemo(() => {
    if (!intake?.severanceAmount) return null;
    const amt = parseDollarAmount(intake.severanceAmount);
    if (!amt) return null;
    return computeFairnessScore({
      severanceAmount: amt,
      roleLevel: inferRoleLevel(intake.jobTitle),
      industry: "technology",
      state: intake.governingLaw?.toUpperCase().trim().slice(0, 2) || undefined,
      hasNonCompete: intake.nonCompete === "yes",
      hasReleaseOfClaims: intake.releaseRequired === "yes",
    });
  }, [intake?.severanceAmount, intake?.jobTitle, intake?.governingLaw, intake?.nonCompete, intake?.releaseRequired]);

  // Daily focus
  const daysSinceLayoff = weeksSinceLayoff * 7;
  const dailyFocus = useMemo(
    () => getDailyFocus(daysSinceLayoff, timelinePhase, displayTasks),
    [daysSinceLayoff, timelinePhase, displayTasks]
  );

  const highAttention = useMemo(() => {
    const items = intake ? buildAttentionItems(intake) : [];
    return items
      .filter((i) => i.urgency === "critical" || i.urgency === "high")
      .slice(0, 4);
  }, [intake]);

  const runwayWarning = runway && runway.riskLevel === "high";
  const interviewCount = useMemo(
    () => applications.filter((a) => a.status === "interviewing").length,
    [applications]
  );
  const appliedCount = useMemo(
    () => applications.filter((a) => a.status !== "saved").length,
    [applications]
  );
  const highInsights = useMemo(
    () => jobSearchInsights.filter((i) => i.severity === "high"),
    [jobSearchInsights]
  );
  const urgentTaskCount = useMemo(
    () => displayTasks.filter(
      (t) => t.priority === "high" && t.status !== "Done" && t.status !== "Skipped"
    ).length,
    [displayTasks]
  );

  // Career coach state
  const coachState: UserState = useMemo(() => ({
    weeksSinceLayoff,
    timelinePhase,
    runwayMonths: runway?.runwayMonths,
    runwayRisk: runway?.riskLevel,
    applicationCount: appliedCount,
    interviewCount,
    offerCount: applications.filter((a) => a.status === "offer").length,
    contactCount: contacts.length,
    tasksCompleted: displayTasks.filter((t) => t.status === "Done").length,
    totalTasks: displayTasks.length,
    hasSeverance: !!intake?.severanceAmount,
    hasResume: resumes.length > 0,
    resumeCount: resumes.length,
    fairnessRating: fairnessScore?.rating,
    recentApplicationDays: (() => {
      const applied = applications.filter((a) => a.status !== "saved" && a.dateApplied);
      if (applied.length === 0) return undefined;
      const latest = Math.max(...applied.map((a) => new Date(a.dateApplied!).getTime()));
      return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
    })(),
    recentContactDays: (() => {
      if (contacts.length === 0) return undefined;
      const latest = Math.max(
        ...contacts.map((c) => new Date(c.lastContact || Date.now()).getTime())
      );
      return Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
    })(),
  }), [weeksSinceLayoff, timelinePhase, runway, appliedCount, interviewCount, applications, contacts, displayTasks, intake?.severanceAmount, resumes.length, fairnessScore?.rating]);

  return (
    <div className="space-y-10">
      {/* ── Today's Focus ── */}
      <TodaysFocusCard focus={dailyFocus} />

      {/* ── Timeline (layoff-specific) ── */}
      {!isGeneralSearch && (
        <TimelineBanner weeksSinceLayoff={weeksSinceLayoff} timelinePhase={timelinePhase} />
      )}

      {/* ── Severance Fairness Score (layoff-specific) ── */}
      {!isGeneralSearch && fairnessScore && (
        <Link href="/onboarding/layoff/severance">
          <SeveranceFairnessScore result={fairnessScore} compact />
        </Link>
      )}

      {/* ── Profile prompt for quick-start users ── */}
      {isQuickStart && !isGeneralSearch && <ProfilePromptCard />}

      {/* ── Status Board ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Runway */}
        <Link href="/onboarding/layoff/runway" className="group">
          <div
            className={`relative overflow-hidden rounded-2xl p-5 h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl ${
              !runway
                ? "bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm"
                : runway.riskLevel === "high"
                ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-200"
                : runway.riskLevel === "medium"
                ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200"
                : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200"
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <div className={`flex items-center gap-1.5 mb-3 ${runway ? "text-white/80" : "text-slate-500"}`}>
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Runway</span>
            </div>
            <p className={`text-3xl font-extrabold ${runway ? "text-white" : "text-slate-400"}`}>
              {runway ? `${runway.runwayMonths.toFixed(1)}` : "—"}
            </p>
            <p className={`text-sm mt-0.5 ${runway ? "text-white/70" : "text-slate-400"}`}>
              {runway ? `${formatCurrency(runway.totalCash)} total` : "Set up runway"}
            </p>
          </div>
        </Link>

        {/* Applications */}
        <Link href="/onboarding/layoff/applications" className="group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 p-5 shadow-lg shadow-purple-200 h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-1.5 mb-3 text-white/80">
              <Briefcase className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Applied</span>
            </div>
            <p className="text-3xl font-extrabold text-white">{appliedCount}</p>
            <p className="text-sm text-white/70 mt-0.5">
              {interviewCount > 0 ? `${interviewCount} interviewing` : "applications"}
            </p>
          </div>
        </Link>

        {/* Progress */}
        <Link href="/onboarding/layoff/tasks" className="group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg shadow-slate-300 h-full transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
            <div className="flex items-center gap-1.5 mb-3 text-slate-400">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Progress</span>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-extrabold text-white">{progress}%</p>
              {/* Mini ring */}
              <div className="relative w-9 h-9 mb-0.5">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-700" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 0.88} 88`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#6ee7b7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {urgentTaskCount > 0 ? `${urgentTaskCount} urgent` : "on track"}
            </p>
          </div>
        </Link>
      </section>

      {/* ── What Needs Attention ── */}
      {(highAttention.length > 0 || runwayWarning) && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Needs attention</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {runwayWarning && (
              <AttentionCard
                title="Financial runway is critical"
                description={`${runway!.runwayMonths.toFixed(1)} months remaining. Review expenses and explore ways to extend.`}
                urgency="critical"
                href="/onboarding/layoff/runway"
              />
            )}
            {highAttention.map((item) => (
              <AttentionCard key={item.id} {...item} />
            ))}
          </div>
        </section>
      )}

      {/* ── What's Next ── */}
      {nextBestAction && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100">
              <Zap className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">What to do next</h2>
          </div>
          <div className="space-y-3">
            {/* Hero action */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 shadow-lg shadow-violet-200">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 text-violet-200 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Recommended
                </div>
                <p className="font-bold text-white text-lg mb-1">{nextBestAction.title}</p>
                <p className="text-sm text-violet-100/90 mb-4 leading-relaxed">{nextBestAction.description}</p>
                {nextBestAction.action && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors">
                    {nextBestAction.action.label} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
            {/* Insight chips */}
            {highInsights.slice(0, 2).map((insight) => (
              <div
                key={insight.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 hover:border-amber-200 hover:bg-amber-50/30 transition-colors"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{insight.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{insight.description}</p>
                </div>
              </div>
            ))}
            <Link
              href="/onboarding/layoff/tasks"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              See full action plan <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Job Suggestions ── */}
      {intake?.activelyLooking !== "not_yet" && (
        <section>
          <Suspense fallback={<div className="h-48 bg-gray-50 rounded-2xl animate-pulse" />}>
            <JobSuggestionsCard
              onSave={async (job) => {
                try {
                  const created = await apiCreateApplication({
                    company: job.company,
                    role: job.role,
                    jobLink: job.jobLink,
                    status: "saved",
                  });
                  setApplications((prev) => [...prev, apiAppToLocal(created)]);
                } catch (err) {
                  console.error("Failed to save job suggestion:", err);
                }
              }}
            />
          </Suspense>
        </section>
      )}

      {/* ── Career Coach ── */}
      <CareerCoachCard state={coachState} />

      {/* ── Emotional Journey (layoff-specific) ── */}
      {!isGeneralSearch && (
        <EmotionalJourneyCard weeksSinceLayoff={weeksSinceLayoff} daysSinceLayoff={daysSinceLayoff} />
      )}

      {/* ── Your Tools ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Your tools</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ToolCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Financial Runway"
            description="Calculate how long your savings and severance will last."
            href="/onboarding/layoff/runway"
            accentFrom="from-emerald-500"
            accentTo="to-teal-500"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            hoverBorder="hover:border-emerald-300"
            hoverShadow="hover:shadow-emerald-100"
            badge={
              runway
                ? runway.riskLevel === "high"
                  ? "At risk"
                  : runway.riskLevel === "medium"
                  ? "Moderate"
                  : "Stable"
                : undefined
            }
            badgeClass={
              runway?.riskLevel === "high"
                ? "bg-red-100 text-red-700"
                : runway?.riskLevel === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }
          />
          <ToolCard
            icon={<FileText className="w-5 h-5" />}
            title="Resumes"
            description="Build and tailor resumes for specific roles."
            href="/onboarding/layoff/resumes"
            accentFrom="from-blue-500"
            accentTo="to-cyan-500"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            hoverBorder="hover:border-blue-300"
            hoverShadow="hover:shadow-blue-100"
            badge={resumes.length > 0 ? `${resumes.length}` : undefined}
            badgeClass="bg-blue-100 text-blue-700"
          />
          <ToolCard
            icon={<Briefcase className="w-5 h-5" />}
            title="Applications"
            description="Track every application, interview, and follow-up."
            href="/onboarding/layoff/applications"
            accentFrom="from-purple-500"
            accentTo="to-fuchsia-500"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            hoverBorder="hover:border-purple-300"
            hoverShadow="hover:shadow-purple-100"
            badge={appliedCount > 0 ? `${appliedCount}` : undefined}
            badgeClass="bg-purple-100 text-purple-700"
          />
          {!isGeneralSearch && (
            <ToolCard
              icon={<Shield className="w-5 h-5" />}
              title="Severance Review"
              description="Review your severance agreement clause by clause."
              href="/onboarding/layoff/severance"
              accentFrom="from-rose-500"
              accentTo="to-pink-500"
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
              hoverBorder="hover:border-rose-300"
              hoverShadow="hover:shadow-rose-100"
            />
          )}
          {!isGeneralSearch && (
            <button
              onClick={() => setShowLegalRights(true)}
              className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 transition-all duration-300 hover:border-amber-300 hover:shadow-amber-100 hover:shadow-lg hover:-translate-y-0.5 text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 transition-transform duration-300 group-hover:scale-110">
                  <Scale className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 group-hover:text-gray-800">Know Your Rights</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Wrongful termination, non-compete, PTO, and WARN Act tools.</p>
            </button>
          )}
          <button
            onClick={() => setShowCareerTools(true)}
            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 transition-all duration-300 hover:border-cyan-300 hover:shadow-cyan-100 hover:shadow-lg hover:-translate-y-0.5 text-left"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 transition-transform duration-300 group-hover:scale-110">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-gray-800">Career Tools</h3>
            <p className="text-sm text-gray-500 leading-relaxed">LinkedIn optimizer, subscription audit, and career pivot ideas.</p>
          </button>
          {!isGeneralSearch && (
            <ToolCard
              icon={<FileCheck className="w-5 h-5" />}
              title="Situation Summary"
              description="Review your full intake and attention items."
              href="/onboarding/layoff/summary"
              accentFrom="from-slate-500"
              accentTo="to-gray-500"
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              hoverBorder="hover:border-slate-300"
              hoverShadow="hover:shadow-slate-100"
            />
          )}
        </div>
      </section>

      {/* Lazy-loaded modals */}
      <Suspense fallback={null}>
        {showLegalRights && <LegalRightsPanel onClose={() => setShowLegalRights(false)} />}
        {showCareerTools && (
          <CareerToolsPanel
            onClose={() => setShowCareerTools(false)}
            defaultRole={intake?.jobTitle ? undefined : undefined}
            monthlyBurn={runway?.monthlyExpenses}
          />
        )}
      </Suspense>

      {/* ── Social Proof ── */}
      <SocialProofBanner variant="compact" />
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function AttentionCard({
  title,
  description,
  urgency,
  href,
}: {
  title: string;
  description: string;
  urgency: string;
  href?: string;
}) {
  const isCritical = urgency === "critical";
  const content = (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-md ${
        isCritical
          ? "border-red-200 bg-gradient-to-r from-red-50 to-white"
          : "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
      }`}
    >
      <div className="flex">
        {/* Color stripe */}
        <div
          className={`w-1.5 flex-shrink-0 ${
            isCritical
              ? "bg-gradient-to-b from-red-500 to-rose-400"
              : "bg-gradient-to-b from-amber-400 to-orange-400"
          }`}
        />
        <div className="flex items-start gap-3 p-4">
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${
              isCritical ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isCritical ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isCritical ? "text-red-900" : "text-amber-900"}`}>
              {title}
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${isCritical ? "text-red-600/80" : "text-amber-600/80"}`}>
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function ToolCard({
  icon,
  title,
  description,
  href,
  accentFrom,
  accentTo,
  iconBg,
  iconColor,
  hoverBorder,
  hoverShadow,
  badge,
  badgeClass = "bg-gray-100 text-gray-600",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  accentFrom: string;
  accentTo: string;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  hoverShadow: string;
  badge?: string;
  badgeClass?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-5 transition-all duration-300 ${hoverBorder} ${hoverShadow} hover:shadow-lg hover:-translate-y-0.5`}
    >
      {/* Top gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentFrom} ${accentTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
